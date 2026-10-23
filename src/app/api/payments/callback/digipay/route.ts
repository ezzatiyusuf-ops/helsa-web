import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db";
import { orders, payments } from "@/db/schema";
import { clientKey, rateLimit, rateLimitedResponse } from "@/lib/security";
import { finalizePaidOrder, logPayment, markPaymentOutcome, resolveProvider } from "@/lib/payments";

/**
 * POST /api/payments/callback/digipay — بازگشت کاربر از درگاه دیجی‌پی (Part F).
 * دیجی‌پی نتیجه را با فرم-پست به callbackUrl پذیرنده می‌فرستد:
 *   { amount, providerId(=کد سفارش ما), trackingCode, rrn?, result: SUCCESS|FAILURE, type }
 *
 * امنیت — این نقطهٔ پایانی از مرورگرِ درگاه صدا زده می‌شود (same-origin نیست)؛
 * اصالت از این مسیرها تأمین می‌شود (نه از ورودی):
 *   1) providerId باید به سفارش واقعی + ردیف pending دیجی‌پی بخورد؛
 *   2) مبلغ ورودی با مبلغ DB تطبیق داده می‌شود (ضد tampering)؛
 *   3) حقیقت نهایی فقط از purchases/verify سرور-به-سرور پذیرفته می‌شود.
 */
async function handle(req: Request) {
  if (!isDatabaseConfigured) return NextResponse.json({ ok: false, message: "سرویس پرداخت در دسترس نیست." }, { status: 503 });
  const limited = rateLimit(clientKey(req, "pay-cb-digipay"), 30, 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);

  // فرم-پست درگاه یا JSON — هر دو پذیرفته می‌شود
  let payload: Record<string, unknown> = {};
  try {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) payload = (await req.json()) as Record<string, unknown>;
    else payload = Object.fromEntries((await req.formData()).entries());
  } catch {
    return NextResponse.json({ ok: false, message: "داده نامعتبر است" }, { status: 400 });
  }

  const providerId = String(payload.providerId ?? "").trim().slice(0, 40);
  const trackingCode = String(payload.trackingCode ?? "").trim().slice(0, 80);
  const amount = Number(payload.amount ?? 0);
  const result = String(payload.result ?? "").toUpperCase();

  if (!providerId || !trackingCode) return NextResponse.json({ ok: false, message: "پارامترهای بازگشت ناقص است." }, { status: 400 });

  const order = (await db.select().from(orders).where(eq(orders.code, providerId)).limit(1))[0];
  if (!order) return NextResponse.json({ ok: false, message: "سفارش یافت نشد" }, { status: 404 });

  const payRow = (
    await db
      .select()
      .from(payments)
      .where(and(eq(payments.orderId, order.id), eq(payments.status, "pending")))
      .orderBy(desc(payments.id))
      .limit(1)
  )[0];
  if (!payRow || payRow.provider !== "digipay") {
    await logPayment("callback_provider_mismatch", { orderId: order.id, method: order.paymentMethod, detail: { expected: "digipay" } });
    return NextResponse.redirect(new URL(`/payment/failed?code=${encodeURIComponent(order.code)}`, req.url), 303);
  }

  // ضد دستکاری مبلغ: مبلغ اعلامی درگاه باید با سفارش DB بخواند
  if (amount && amount !== order.total) {
    await logPayment("callback_amount_mismatch", {
      paymentId: payRow.id,
      orderId: order.id,
      provider: "digipay",
      method: payRow.method,
      amount: order.total,
      authority: trackingCode,
      detail: { claimed: amount },
    });
    return NextResponse.redirect(new URL(`/payment/failed?code=${encodeURIComponent(order.code)}`, req.url), 303);
  }

  if (order.paymentStatus === "paid") {
    return NextResponse.redirect(new URL(`/payment/success?code=${encodeURIComponent(order.code)}&state=success`, req.url), 303);
  }

  // تأیید نهایی فقط از verify سرور-به-سرور
  const provider = resolveProvider("digipay");
  if (!provider) {
    return NextResponse.redirect(new URL(`/payment/failed?code=${encodeURIComponent(order.code)}`, req.url), 303);
  }
  const verified = await provider.verify(
    { id: order.id, code: order.code, amount: order.total, method: "digipay", mobile: (order.customer as { mobile?: string } | null)?.mobile },
    payRow.authority ?? trackingCode,
  );

  if (verified.state === "success") {
    const fin = await finalizePaidOrder(order.code, {
      provider: "digipay",
      method: "digipay",
      ref: verified.ref ?? trackingCode,
      authority: payRow.authority,
    });
    if (fin.state === "success" || fin.state === "duplicate") {
      return NextResponse.redirect(new URL(`/payment/success?code=${encodeURIComponent(order.code)}&state=success`, req.url), 303);
    }
  }

  if (result === "FAILURE" || verified.state === "failed") {
    await markPaymentOutcome(order.code, "failed", { provider: "digipay", method: "digipay", authority: payRow.authority, detail: { trackingCode } });
  }
  return NextResponse.redirect(new URL(`/payment/failed?code=${encodeURIComponent(order.code)}`, req.url), 303);
}

export async function POST(req: Request) {
  return handle(req);
}
