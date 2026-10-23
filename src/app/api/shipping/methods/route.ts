import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db, isDatabaseConfigured } from "@/db";
import { shippingMethods } from "@/db/schema";
import { clientKey, rateLimit, rateLimitedResponse } from "@/lib/security";

/**
 * GET /api/shipping/methods — روش‌های ارسال واقعی از دیتابیس (CRO ج۳۷).
 * عمومی و فقط-خواندنی؛ همان داده‌ای که ثبت سفارش با آن اعتبارسنجی می‌کند.
 */
export async function GET(req: Request) {
  const limited = rateLimit(clientKey(req, "shipping-methods"), 30, 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);
  if (!isDatabaseConfigured) return NextResponse.json({ ok: false, methods: [] }, { status: 200 });

  try {
    const rows = await db
      .select({ code: shippingMethods.code, label: shippingMethods.label, description: shippingMethods.description, estimatedTime: shippingMethods.estimatedTime, price: shippingMethods.price })
      .from(shippingMethods)
      .where(eq(shippingMethods.isActive, true))
      .orderBy(asc(shippingMethods.sortOrder));
    return NextResponse.json({ ok: true, methods: rows });
  } catch {
    return NextResponse.json({ ok: false, methods: [] }, { status: 200 });
  }
}
