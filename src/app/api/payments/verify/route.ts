import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db, isDatabaseConfigured } from "@/db";
import { customers, orders, payments } from "@/db/schema";
import { assertSameOrigin, clientKey, csrfRejectedResponse, rateLimit, rateLimitedResponse } from "@/lib/security";
import { readSession } from "@/lib/session";
import { finalizePaidOrder, logPayment, markPaymentOutcome, resolveProvider } from "@/lib/payments";
import { orderOwnedBySession } from "@/lib/order-access";
import type { GatewayOrder } from "@/lib/payments";

const postSchema = z.object({
  code: z.string().min(4).max(40),
  method: z.enum(["online", "snappay", "digipay", "card", "cod", "wallet"]).optional(),
  remoteRef: z.string().max(160).optional(),
});

/**
 * POST /api/payments/verify — تأیید سرور-به-سرور پس از بازگشت از درگاه (Part D).
 * مبلغ همیشه از DB؛ authority با ردیف پرداخت تطبیق داده می‌شود؛
 * نهایی‌سازی اتمیک (جلوگیری از دوباره‌پرداخت) + فاکتور + لاگ.
 */
export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return csrfRejectedResponse();
  const limited = rateLimit(clientKey(req, "pay-verify"), 20, 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);
  if (!isDatabaseConfigured) return NextResponse.json({ ok: false, message: "سرویس پرداخت در دسترس نیست." }, { status: 503 });

  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "داده نامعتبر است" }, { status: 400 });

  const session = await readSession();
  if (!session) return NextResponse.json({ ok: false, message: "برای تأیید پرداخت وارد شوید." }, { status: 401 });

  const orderRow = (await db.select().from(orders).where(eq(orders.code, parsed.data.code)).limit(1))[0];
  if (!orderRow) return NextResponse.json({ ok: false, message: "سفارش یافت نشد" }, { status: 404 });
  // فقط صاحب سفارش — fail-closed (S-01)
  let ownerCustomer: { email: string | null; phone: string | null } | null = null;
  if (orderRow.customerId != null) {
    const row = (await db.select({ email: customers.email, phone: customers.phone }).from(customers).where(eq(customers.id, orderRow.customerId)).limit(1))[0];
    ownerCustomer = row ? { email: row.email, phone: row.phone } : null;
  }
  const owned = orderOwnedBySession({
    session, orderCustomerId: orderRow.customerId,
    customerEmail: ownerCustomer?.email, customerPhone: ownerCustomer?.phone,
    snapshot: orderRow.customer as Record<string, unknown> | null,
  });
  if (!owned) {
    await logPayment("verify_ownership_denied", { orderId: orderRow.id, method: orderRow.paymentMethod });
    return NextResponse.json({ ok: false, message: "این سفارش متعلق به شما نیست." }, { status: 403 });
  }

  // قبلاً پرداخت شده؟ → وضعیت موجود (idempotent، بدون دوباره‌اجرای اثر)
  if (orderRow.paymentStatus === "paid") {
    return NextResponse.json({ ok: true, state: "success", duplicate: true, amount: orderRow.total });
  }

  const method = (parsed.data.method || orderRow.paymentMethod || "online") as GatewayOrder["method"];
  const order: GatewayOrder = { id: orderRow.id, code: orderRow.code, amount: orderRow.total, method };

  // authority برگشتی باید با ردیف پرداختِ همین سفارش مطابقت داشته باشد (ضد جعل)
  if (parsed.data.remoteRef) {
    const payRow = (await db.select().from(payments)
      .where(eq(payments.orderId, orderRow.id)).orderBy(desc(payments.id)).limit(1))[0];
    if (payRow?.authority && payRow.authority !== parsed.data.remoteRef) {
      await logPayment("verify_authority_mismatch", { paymentId: payRow.id, orderId: orderRow.id, provider: payRow.provider, method: payRow.method, authority: parsed.data.remoteRef });
      return NextResponse.json({ ok: true, state: "failed", message: "شناسهٔ تراکنش نامعتبر است." });
    }
    if (payRow && payRow.expiresAt && payRow.expiresAt.getTime() < Date.now() && payRow.status === "pending") {
      await db.update(payments).set({ status: "expired", updatedAt: new Date() }).where(eq(payments.id, payRow.id));
      await logPayment("payment_expired", { paymentId: payRow.id, orderId: orderRow.id, provider: payRow.provider, method: payRow.method, amount: payRow.amount });
      return NextResponse.json({ ok: true, state: "failed", message: "مهلت پرداخت گذشته است؛ دوباره تلاش کنید." });
    }
  }

  const provider = resolveProvider(method);
  if (method === "card" || method === "cod") {
    return NextResponse.json({ ok: true, state: "pending" }); // تسویهٔ دستی کارشناس
  }
  if (!provider) return NextResponse.json({ ok: true, state: "unconfigured" });
  if (!parsed.data.remoteRef) return NextResponse.json({ ok: true, state: "pending" });

  const result = await provider.verify(order, parsed.data.remoteRef);

  if (result.state === "success") {
    const fin = await finalizePaidOrder(orderRow.code, {
      provider: provider.id,
      method,
      ref: result.ref,
      authority: parsed.data.remoteRef,
    });
    return NextResponse.json({ ok: true, state: fin.state === "duplicate" ? "success" : fin.state, duplicate: fin.state === "duplicate", ref: result.ref, amount: orderRow.total });
  }

  if (result.state === "failed" && parsed.data.remoteRef) {
    await markPaymentOutcome(orderRow.code, "failed", { provider: provider.id, method, authority: parsed.data.remoteRef });
  } else if (result.state === "cancelled") {
    await markPaymentOutcome(orderRow.code, "cancelled", { provider: provider.id, method, authority: parsed.data.remoteRef });
  }

  return NextResponse.json({ ok: true, state: result.state, ref: result.ref, amount: orderRow.total });
}

/**
 * GET /api/payments/verify?code=… — ساخت لینک پرداخت (initiate).
 * مبلغ فقط از DB؛ authority واقعی در ردیف payments ذخیره می‌شود (برای تطبیق callback).
 */
export async function GET(req: Request) {
  const limited = rateLimit(clientKey(req, "pay-redirect"), 20, 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);
  if (!isDatabaseConfigured) return NextResponse.json({ ok: false, message: "سرویس پرداخت در دسترس نیست." }, { status: 503 });

  const url = new URL(req.url);
  const code = url.searchParams.get("code") ?? "";
  if (!code) return NextResponse.json({ ok: false, message: "سفارش نامعتبر است" }, { status: 400 });
  const orderRow = (await db.select().from(orders).where(eq(orders.code, code)).limit(1))[0];
  if (!orderRow) return NextResponse.json({ ok: false, message: "سفارش یافت نشد" }, { status: 404 });
  if (orderRow.paymentStatus === "paid") return NextResponse.json({ ok: false, message: "این سفارش قبلاً پرداخت شده است." }, { status: 409 });

  const method = (orderRow.paymentMethod ?? "online") as GatewayOrder["method"];
  const provider = resolveProvider(method);
  if (!provider) return NextResponse.json({ ok: false, message: "درگاه این روش پرداخت پیکربندی نشده است." }, { status: 503 });

  const cust = orderRow.customer as { mobile?: string } | null;
  const order: GatewayOrder = { id: orderRow.id, code: orderRow.code, amount: orderRow.total, method, mobile: cust?.mobile };

  const callbackUrl = `${url.origin}/payment?code=${encodeURIComponent(orderRow.code)}`;
  const initiated = await provider.initiate(order, callbackUrl);
  if (!initiated.ok) return NextResponse.json({ ok: false, message: initiated.error }, { status: 502 });

  // ردیف پرداخت تازه با authority واقعی (retry = ردیف جدید؛ ردیف‌های قبلی pending منقضی می‌شوند)
  await db.update(payments)
    .set({ status: "expired", updatedAt: new Date() })
    .where(and(eq(payments.orderId, orderRow.id), eq(payments.status, "pending")));
  const inserted = (await db.insert(payments).values({
    orderId: orderRow.id,
    provider: initiated.provider,
    method,
    amount: orderRow.total,
    status: "pending",
    authority: initiated.authority,
    expiresAt: initiated.expiresAt ?? new Date(Date.now() + 15 * 60_000),
  }).returning({ id: payments.id }))[0];

  await logPayment("payment_initiated", {
    paymentId: inserted?.id,
    orderId: orderRow.id,
    provider: initiated.provider,
    method,
    amount: orderRow.total,
    authority: initiated.authority,
  });

  return NextResponse.json({ ok: true, url: initiated.url });
}
