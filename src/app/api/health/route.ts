import { NextResponse } from "next/server";
import { checkDatabase, isDatabaseConfigured } from "@/db";
import { onlineGatewayEnabled } from "@/config/payments";
import { authSecretRaw } from "@/lib/secrets";
import { requireAdminApi } from "@/lib/admin";
import { clientKey, rateLimit, rateLimitedResponse } from "@/lib/security";
import { sanitizeHealthMessage } from "@/lib/health-sanitize";

/**
 * GET /api/health — liveness
 *
 * یافتهٔ S-06: نسخهٔ قبلی «صادقانه» همهٔ پرچم‌های پیکربندی (وجود راز نشست،
 * گوگل/اپل، درگاه) و پیام خام خطای درایور PostgreSQL را بی‌احراز و عمومی
 * برمی‌گرداند. پیام خام خطای pg معمولاً نام کاربری/میزبان/پورت و گاهی متن
 * «password authentication failed for user …» را در خود دارد → افشای اطلاعات.
 *
 * سیاست تازه:
 *  - پاسخ عمومی: فقط `ok`، `status`، و `database.ok` (بولین) — بدون جزئیات.
 *  - `?detail=1`: فقط برای ادمین؛ پیام‌ها هم پاک‌سازی می‌شوند (بدون میزبان/کاربر).
 */
export async function GET(req: Request) {
  const limited = rateLimit(clientKey(req, "health"), 60, 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);

  const db = await checkDatabase();
  const publicBody = {
    ok: db.ok,
    status: db.ok ? "healthy" : "degraded",
    database: { configured: isDatabaseConfigured, reachable: db.ok },
  };

  const wantsDetail = new URL(req.url).searchParams.get("detail") === "1";
  if (!wantsDetail) return NextResponse.json(publicBody);

  try {
    const admin = await requireAdminApi();
    return NextResponse.json({
      ...publicBody,
      checks: {
        database: { configured: isDatabaseConfigured, ok: db.ok, message: db.ok ? "اتصال پایگاه داده برقرار است." : sanitizeHealthMessage(db.message) },
        auth: {
          sessionSecret: Boolean(authSecretRaw()),
          google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
          apple: Boolean(process.env.APPLE_CLIENT_ID && process.env.APPLE_PRIVATE_KEY),
        },
        payment: { onlineGateway: onlineGatewayEnabled() },
      },
      viewer: admin.email,
    });
  } catch {
    // بدون نشست ادمین: همان پاسخ عمومی — وجود/نبود جزئیات افشا نمی‌شود
    return NextResponse.json(publicBody);
  }
}
