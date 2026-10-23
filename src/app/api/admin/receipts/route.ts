import { desc, eq, and, type SQL } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders, paymentReceipts } from "@/db/schema";
import { adminErrorResponse, requireAdminApi } from "@/lib/admin";
import { CARD_RECEIPT_STATES, type CardReceiptState } from "@/lib/card-payment";
import { clientKey, rateLimit, rateLimitedResponse } from "@/lib/security";

/** GET /api/admin/receipts?status= — صف رسیدهای کارت‌به‌کارت (فقط متادیتا). */
export async function GET(req: Request) {
  const _rl = rateLimit(clientKey(req, "admin-api"), 60, 60_000);
  if (!_rl.ok) return rateLimitedResponse(_rl.retryAfterSec);
  try {
    await requireAdminApi();
    const status = new URL(req.url).searchParams.get("status") ?? "";
    const where: SQL | undefined =
      status && (CARD_RECEIPT_STATES as readonly string[]).includes(status)
        ? eq(paymentReceipts.status, status as CardReceiptState)
        : eq(paymentReceipts.status, "receipt_submitted");

    const rows = await db.select({
      id: paymentReceipts.id, status: paymentReceipts.status, amountDeclared: paymentReceipts.amountDeclared,
      transferDate: paymentReceipts.transferDate, trackingNumber: paymentReceipts.trackingNumber,
      payerName: paymentReceipts.payerName, payerCardLast4: paymentReceipts.payerCardLast4,
      fileName: paymentReceipts.fileName, mimeType: paymentReceipts.mimeType, fileSize: paymentReceipts.fileSize,
      submittedAt: paymentReceipts.submittedAt, reviewStartedAt: paymentReceipts.reviewStartedAt,
      reviewedBy: paymentReceipts.reviewedBy, decidedAt: paymentReceipts.decidedAt, decisionReason: paymentReceipts.decisionReason,
      orderCode: orders.code, orderTotal: orders.total, orderPaymentStatus: orders.paymentStatus, orderStatus: orders.status,
    }).from(paymentReceipts).innerJoin(orders, eq(paymentReceipts.orderId, orders.id))
      .where(where).orderBy(desc(paymentReceipts.id)).limit(100);

    return NextResponse.json({ ok: true, receipts: rows });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
