import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { adminAuditLogs, orders, paymentLogs, paymentReceipts } from "@/db/schema";
import { adminErrorResponse, requireAdminApi } from "@/lib/admin";
import { checkAdminTransition, type AdminAction, type CardReceiptState } from "@/lib/card-payment";
import { finalizePaidOrder } from "@/lib/payments";
import { assertSameOrigin, clientKey, csrfRejectedResponse, rateLimit, rateLimitedResponse } from "@/lib/security";

/** PATCH /api/admin/receipts/[id] — تصمیم ادمین؛ verify تنها مسیر پرداخت‌شدن. */
const schema = z.object({
  action: z.enum(["claim", "verify", "reject", "request_info", "refund"]),
  reason: z.string().trim().max(1000).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!assertSameOrigin(req)) return csrfRejectedResponse();
  const _rl = rateLimit(clientKey(req, "admin-api"), 60, 60_000);
  if (!_rl.ok) return rateLimitedResponse(_rl.retryAfterSec);
  try {
    const admin = await requireAdminApi();
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id < 1) return NextResponse.json({ ok: false, message: "شناسهٔ نامعتبر." }, { status: 400 });

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ ok: false, message: "درخواست نامعتبر است." }, { status: 400 });
    const action = parsed.data.action as AdminAction;
    const reason = (parsed.data.reason ?? "").trim();

    const receipt = (await db.select().from(paymentReceipts).where(eq(paymentReceipts.id, id)).limit(1))[0];
    if (!receipt) return NextResponse.json({ ok: false, message: "رسید یافت نشد." }, { status: 404 });

    const from = receipt.status as CardReceiptState;
    const check = checkAdminTransition(from, action, reason);
    if (!check.ok) return NextResponse.json({ ok: false, message: check.message }, { status: 409 });

    const updated = await db.update(paymentReceipts).set({
      status: check.to, updatedAt: new Date(),
      ...(action === "claim" ? { reviewStartedAt: new Date(), reviewedBy: admin.email } : {}),
      ...(action !== "claim" ? { decidedAt: new Date(), reviewedBy: admin.email, decisionReason: reason } : {}),
    }).where(eq(paymentReceipts.id, id)).returning({ id: paymentReceipts.id });
    if (!updated.length) return NextResponse.json({ ok: false, message: "رسید یافت نشد." }, { status: 404 });

    let invoiceNumber: string | undefined;
    if (action === "verify") {
      const order = (await db.select().from(orders).where(eq(orders.id, receipt.orderId)).limit(1))[0];
      if (!order) return NextResponse.json({ ok: false, message: "سفارش مرتبط یافت نشد." }, { status: 404 });
      const ref = receipt.trackingNumber ? `C2C-${receipt.trackingNumber}` : `C2C-R${receipt.id}`;
      const fin = await finalizePaidOrder(order.code, { provider: "manual", method: "card", ref, manualBy: admin.email });
      if (fin.state !== "success" && fin.state !== "duplicate") {
        await db.update(paymentReceipts).set({ status: "pending_verification", updatedAt: new Date() }).where(eq(paymentReceipts.id, id));
        return NextResponse.json({ ok: false, message: "ثبت پرداخت انجام نشد؛ ردیف پرداخت سفارش یا وضعیت سفارش را بررسی کنید." }, { status: 409 });
      }
      invoiceNumber = fin.invoiceNumber;
    }

    await db.insert(adminAuditLogs).values({
      adminEmail: admin.email, action: `card_receipt_${action}`, entityType: "payment_receipt", entityId: String(id),
      before: { status: from }, after: { status: check.to, reason: reason || null, orderId: receipt.orderId },
    });
    await db.insert(paymentLogs).values({
      paymentId: receipt.paymentId, orderId: receipt.orderId, event: `card_receipt_${action}`,
      provider: "manual", method: "card", amount: receipt.amountDeclared || null,
      detail: { receiptId: id, by: admin.email.slice(0, 80), to: check.to },
    });

    const messages: Record<AdminAction, string> = {
      claim: "بازبینی رسید شروع شد.",
      verify: `واریز تأیید و سفارش پرداخت‌شده شد${invoiceNumber ? `؛ فاکتور ${invoiceNumber} صادر گردید` : ""}.`,
      reject: "رسید رد شد؛ دلیل برای مشتری ثبت شد.",
      request_info: "درخواست اطلاعات بیشتر ثبت شد.",
      refund: "بازگشت وجه ثبت شد.",
    };
    return NextResponse.json({ ok: true, state: check.to, invoice: invoiceNumber, message: messages[action] });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
