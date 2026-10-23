import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { paymentReceiptFiles, paymentReceipts } from "@/db/schema";
import { adminErrorResponse, requireAdminApi } from "@/lib/admin";
import { clientKey, rateLimit, rateLimitedResponse } from "@/lib/security";

/** GET /api/admin/receipts/[id]/file — تنها مسیر دسترسی به فایل رسید (فقط ادمین). */
const ALLOWED: Record<string, string> = {
  "image/jpeg": "image/jpeg", "image/png": "image/png",
  "image/webp": "image/webp", "application/pdf": "application/pdf",
};

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const _rl = rateLimit(clientKey(req, "admin-receipt-file"), 120, 60_000);
  if (!_rl.ok) return rateLimitedResponse(_rl.retryAfterSec);
  try {
    await requireAdminApi();
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id < 1) return NextResponse.json({ ok: false, message: "شناسهٔ نامعتبر." }, { status: 400 });

    const meta = (await db.select({ mime: paymentReceipts.mimeType, fileName: paymentReceipts.fileName })
      .from(paymentReceipts).where(eq(paymentReceipts.id, id)).limit(1))[0];
    if (!meta) return NextResponse.json({ ok: false, message: "رسید یافت نشد." }, { status: 404 });

    const file = (await db.select({ data: paymentReceiptFiles.data })
      .from(paymentReceiptFiles).where(eq(paymentReceiptFiles.receiptId, id)).limit(1))[0];
    if (!file?.data) return NextResponse.json({ ok: false, message: "فایل رسید موجود نیست." }, { status: 404 });

    const mime = ALLOWED[meta.mime] ?? "application/octet-stream";
    const name = (meta.fileName || `receipt-${id}`).replace(/["\\\r\n]/g, "");
    return new Response(new Uint8Array(file.data), {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `inline; filename="${name}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
