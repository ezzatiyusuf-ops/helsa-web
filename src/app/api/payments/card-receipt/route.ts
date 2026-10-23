import { createHash } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db";
import { adminNotifications, customers, orders, paymentLogs, paymentReceiptFiles, paymentReceipts, payments } from "@/db/schema";
import { orderOwnedBySession } from "@/lib/order-access";
import { cardTransferSettings } from "@/config/card-transfer";
import { canStartNewReceipt, displayStateForReceipts, type CardReceiptState } from "@/lib/card-payment";
import { cleanTransferDate, isTransferTracking, last4, normalizeDigits } from "@/lib/card";
import { formatBytes, maxReceiptBytes, safeFileName, sniffReceiptFile } from "@/lib/receipt-file";
import { assertSameOrigin, clientKey, csrfRejectedResponse, rateLimit, rateLimitedResponse } from "@/lib/security";
import { readSession } from "@/lib/session";

/**
 * POST /api/payments/card-receipt — ارسال رسید کارت‌به‌کارت (multipart).
 * این مسیر هیچ تغییری در orders.paymentStatus یا payments.status نمی‌دهد.
 */
const str = (fd: FormData, key: string, max = 200): string => {
  const v = fd.get(key);
  return typeof v === "string" ? v.replace(/[<>\u0000-\u001f]/g, "").trim().slice(0, max) : "";
};

async function ownerOf(orderRow: typeof orders.$inferSelect, session: { sub: string; email?: string | null; phone?: string | null }) {
  let owner: { email: string | null; phone: string | null } | null = null;
  if (orderRow.customerId != null) {
    const row = (await db.select({ email: customers.email, phone: customers.phone }).from(customers).where(eq(customers.id, orderRow.customerId)).limit(1))[0];
    owner = row ?? null;
  }
  return orderOwnedBySession({
    session, orderCustomerId: orderRow.customerId,
    customerEmail: owner?.email, customerPhone: owner?.phone,
    snapshot: orderRow.customer as Record<string, unknown> | null,
  });
}

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return csrfRejectedResponse();
  const limited = rateLimit(clientKey(req, "card-receipt"), 6, 10 * 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);
  if (!isDatabaseConfigured) return NextResponse.json({ ok: false, message: "سرویس پرداخت در دسترس نیست." }, { status: 503 });

  const settings = cardTransferSettings();
  if (!settings.enabled) return NextResponse.json({ ok: false, message: settings.disabledReason ?? "کارت‌به‌کارت فعال نیست." }, { status: 503 });

  const session = await readSession();
  if (!session) return NextResponse.json({ ok: false, message: "برای ارسال رسید وارد حساب شوید." }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ ok: false, message: "دادهٔ ارسالی نامعتبر است." }, { status: 400 });

  const orderCode = str(form, "orderCode", 40);
  if (!orderCode) return NextResponse.json({ ok: false, message: "کد سفارش الزامی است." }, { status: 400 });

  const orderRow = (await db.select().from(orders).where(eq(orders.code, orderCode)).limit(1))[0];
  if (!orderRow) return NextResponse.json({ ok: false, message: "سفارش یافت نشد." }, { status: 404 });
  if (!(await ownerOf(orderRow, session))) return NextResponse.json({ ok: false, message: "این سفارش متعلق به شما نیست." }, { status: 403 });

  if (orderRow.paymentMethod !== "card") return NextResponse.json({ ok: false, message: "این سفارش با روش کارت‌به‌کارت ثبت نشده است." }, { status: 400 });
  if (orderRow.paymentStatus === "paid") return NextResponse.json({ ok: false, message: "این سفارش قبلاً پرداخت‌شده است؛ نیازی به ارسال رسید نیست." }, { status: 409 });

  const priorReceipts = await db
    .select({ id: paymentReceipts.id, status: paymentReceipts.status, fileSha256: paymentReceipts.fileSha256 })
    .from(paymentReceipts).where(eq(paymentReceipts.orderId, orderRow.id))
    .orderBy(desc(paymentReceipts.id)).limit(5);

  const current: CardReceiptState = displayStateForReceipts(priorReceipts.map((r) => r.status as CardReceiptState));
  if (!canStartNewReceipt(current)) {
    return NextResponse.json({ ok: false, message: "رسید این سفارش در حال بررسی است یا قبلاً ثبت شده؛ ارسال دوباره مجاز نیست." }, { status: 409 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, message: "تصویر رسید را انتخاب کنید." }, { status: 400 });
  const limit = maxReceiptBytes();
  if (file.size <= 0) return NextResponse.json({ ok: false, message: "فایل خالی است." }, { status: 400 });
  if (file.size > limit) return Response.json({ ok: false, message: `حجم فایل باید کمتر از ${formatBytes(limit)} باشد.` }, { status: 413 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const sniff = sniffReceiptFile(bytes);
  if (!sniff.ok || !sniff.mime || !sniff.ext) return NextResponse.json({ ok: false, message: sniff.reason ?? "فایل نامعتبر است." }, { status: 415 });
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (priorReceipts.some((r) => r.fileSha256 && r.fileSha256 === sha256)) {
    return NextResponse.json({ ok: false, message: "همین تصویر قبلاً برای این سفارش ثبت شده است." }, { status: 409 });
  }

  const amountDeclared = Math.max(0, Math.min(Number(normalizeDigits(str(form, "amount", 20)).replace(/\D/g, "")) || 0, 1_000_000_000));
  const transferDate = cleanTransferDate(str(form, "transferDate", 40));
  const trackingRaw = normalizeDigits(str(form, "trackingNumber", 64)).replace(/\s|-/g, "");
  if (trackingRaw && !isTransferTracking(trackingRaw)) return NextResponse.json({ ok: false, message: "شمارهٔ پیگیری واریز باید ۴ تا ۲۴ رقم باشد." }, { status: 400 });
  const payerName = str(form, "payerName", 120);
  const payerCard = last4(str(form, "payerCard", 32));
  const fileName = safeFileName(file.name, sniff.ext);

  const paymentRow = (await db.select({ id: payments.id }).from(payments)
    .where(and(eq(payments.orderId, orderRow.id), eq(payments.status, "pending")))
    .orderBy(desc(payments.id)).limit(1))[0];

  const created = await db.transaction(async (tx) => {
    const receipt = (await tx.insert(paymentReceipts).values({
      orderId: orderRow.id, paymentId: paymentRow?.id ?? null, status: "receipt_submitted",
      amountDeclared, transferDate, trackingNumber: trackingRaw, payerCardLast4: payerCard, payerName,
      fileName, mimeType: sniff.mime!, fileSize: bytes.length, fileSha256: sha256,
      submittedBySub: session.sub.slice(0, 80), updatedAt: new Date(),
    }).returning({ id: paymentReceipts.id }))[0];

    await tx.insert(paymentReceiptFiles).values({ receiptId: receipt.id, data: bytes });
    await tx.insert(paymentLogs).values({
      paymentId: paymentRow?.id ?? null, orderId: orderRow.id, event: "card_receipt_submitted",
      provider: "manual", method: "card", amount: amountDeclared || null,
      detail: { receiptId: receipt.id, sha256: sha256.slice(0, 16), size: bytes.length, mime: sniff.mime },
    });
    await tx.insert(adminNotifications).values({
      kind: "card_receipt",
      title: `رسید کارت‌به‌کارت برای سفارش ${orderRow.code}`,
      body: `مبلغ اعلامی ${amountDeclared ? amountDeclared.toLocaleString("fa-IR") : "—"} تومان · در انتظار بازبینی`,
      href: "/admin/receipts",
    });
    return receipt.id;
  });

  return NextResponse.json({
    ok: true, receiptId: created, state: "receipt_submitted",
    message: "رسید شما ثبت شد و در صف بررسی قرار گرفت. سفارش پس از تأیید واریز توسط هلسا پرداخت‌شده می‌شود.",
  });
}

/** GET /api/payments/card-receipt?code=ORDER — وضعیت گردش رسید برای صاحب سفارش. */
export async function GET(req: Request) {
  const limited = rateLimit(clientKey(req, "card-receipt-get"), 30, 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);
  if (!isDatabaseConfigured) return NextResponse.json({ ok: false, message: "سرویس پرداخت در دسترس نیست." }, { status: 503 });

  const session = await readSession();
  if (!session) return NextResponse.json({ ok: false, message: "برای مشاهدهٔ وضعیت رسید وارد حساب شوید." }, { status: 401 });

  const code = (new URL(req.url).searchParams.get("code") ?? "").trim().slice(0, 40);
  if (!code) return NextResponse.json({ ok: false, message: "کد سفارش الزامی است." }, { status: 400 });

  const orderRow = (await db.select().from(orders).where(eq(orders.code, code)).limit(1))[0];
  if (!orderRow) return NextResponse.json({ ok: false, message: "سفارش یافت نشد." }, { status: 404 });
  if (!(await ownerOf(orderRow, session))) return NextResponse.json({ ok: false, message: "سفارش یافت نشد." }, { status: 404 });

  const rows = await db.select({
    id: paymentReceipts.id, status: paymentReceipts.status, amountDeclared: paymentReceipts.amountDeclared,
    submittedAt: paymentReceipts.submittedAt, decidedAt: paymentReceipts.decidedAt, decisionReason: paymentReceipts.decisionReason,
  }).from(paymentReceipts).where(eq(paymentReceipts.orderId, orderRow.id))
    .orderBy(desc(paymentReceipts.id)).limit(10);

  const settings = cardTransferSettings();
  return NextResponse.json({
    ok: true,
    state: displayStateForReceipts(rows.map((r) => r.status as CardReceiptState)),
    orderPaid: orderRow.paymentStatus === "paid",
    order: { code: orderRow.code, total: orderRow.total, paymentMethod: orderRow.paymentMethod },
    card: settings.enabled ? { number: settings.number, holder: settings.holder, bank: settings.bank } : null,
    cardDisabledReason: settings.enabled ? null : settings.disabledReason ?? null,
    receipts: rows,
  });
}
