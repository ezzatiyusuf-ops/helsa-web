import { adminErrorResponse, requireAdminApi } from "@/lib/admin";
import { assertSameOrigin, clientKey, csrfRejectedResponse, rateLimit, rateLimitedResponse } from "@/lib/security";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, payments } from "@/db/schema";
import { finalizePaidOrder } from "@/lib/payments";

/**
 * POST /api/admin/orders/[id]/collect — تأیید دریافت وجه COD/کارت‌به‌کارت (Part G).
 * فقط ادمین؛ ردیف پرداخت pending → paid + فاکتور + اعلان + لاگ (اتمیک).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!assertSameOrigin(req)) return csrfRejectedResponse();
  const _rl = rateLimit(clientKey(req, "admin-api"), 60, 60_000);
  if (!_rl.ok) return rateLimitedResponse(_rl.retryAfterSec);
  try {
    const admin = await requireAdminApi();
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id < 1) return Response.json({ ok: false, message: "شناسه نامعتبر است." }, { status: 400 });

    const order = (await db.select().from(orders).where(eq(orders.id, id)).limit(1))[0];
    if (!order) return Response.json({ ok: false, message: "سفارش یافت نشد" }, { status: 404 });
    if (order.paymentMethod !== "cod" && order.paymentMethod !== "card") {
      return Response.json({ ok: false, message: "تأیید دستی وجه فقط برای پرداخت در محل / کارت‌به‌کارت مجاز است." }, { status: 400 });
    }
    if (order.paymentStatus === "paid") return Response.json({ ok: false, message: "این سفارش قبلاً پرداخت‌شده است." }, { status: 409 });

    const result = await finalizePaidOrder(order.code, {
      provider: "manual",
      method: order.paymentMethod,
      ref: `COLLECT-${order.code}`,
      manualBy: admin.email,
    });
    if (result.state === "success" || result.state === "duplicate") {
      return Response.json({ ok: true, state: result.state, invoice: result.invoiceNumber, message: `دریافت وجه ثبت شد؛ فاکتور ${result.invoiceNumber ?? "—"} صادر گردید.` });
    }
    return Response.json({ ok: false, message: "ثبت دریافت وجه انجام نشد؛ ردیف پرداخت را بررسی کنید." }, { status: 409 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
