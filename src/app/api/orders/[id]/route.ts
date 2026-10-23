import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db";
import { customers, orders } from "@/db/schema";
import { readSession } from "@/lib/session";
import { toOwnerOrderDto } from "@/lib/order-dto";
import { clientKey, rateLimit, rateLimitedResponse } from "@/lib/security";

/** GET /api/orders/[id] — owner-only order lookup by public code */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(clientKey(req, "order-get"), 30, 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);

  const { id } = await params;
  const code = decodeURIComponent(id);
  if (!isDatabaseConfigured) {
    return NextResponse.json({ ok: false, message: "سرویس سفارش‌ها در دسترس نیست؛ پیکربندی پایگاه داده لازم است." }, { status: 503 });
  }

  const session = await readSession();
  if (!session) return NextResponse.json({ ok: false, message: "برای مشاهده سفارش وارد شوید." }, { status: 401 });

  try {
    const rows = await db.select().from(orders).where(eq(orders.code, code)).limit(1);
    if (!rows.length) return NextResponse.json({ ok: false, message: "سفارش یافت نشد" }, { status: 404 });
    const order = rows[0];

    // Ownership: session email/phone must match customer record or order snapshot.
    let owned = false;
    if (order.customerId) {
      const customer = (await db.select().from(customers).where(eq(customers.id, order.customerId)).limit(1))[0];
      if (customer) {
        owned = Boolean(
          (session.email && customer.email && customer.email.toLowerCase() === session.email.toLowerCase()) ||
          (session.phone && customer.phone && customer.phone === session.phone) ||
          (session.sub === `customer:${customer.id}`),
        );
      }
    }
    if (!owned) {
      const snap = order.customer as Record<string, unknown>;
      const snapEmail = typeof snap.email === "string" ? snap.email.toLowerCase() : "";
      const snapMobile = typeof snap.mobile === "string" ? snap.mobile : "";
      owned = Boolean(
        (session.email && snapEmail && snapEmail === session.email.toLowerCase()) ||
        (session.phone && snapMobile && snapMobile === session.phone),
      );
    }
    if (!owned) return NextResponse.json({ ok: false, message: "سفارش یافت نشد" }, { status: 404 });

    // S-04: فهرست سفید فیلدها — کد ملی/idempotencyKey/ستون‌های داخلی بیرون نمی‌روند
    return NextResponse.json(toOwnerOrderDto(order as unknown as Record<string, unknown>));
  } catch {
    return NextResponse.json({ ok: false, message: "خطا در دریافت سفارش" }, { status: 500 });
  }
}
