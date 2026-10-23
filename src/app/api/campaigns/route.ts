import { NextResponse } from "next/server";
import { getCampaigns } from "@/services/catalog";
import { clientKey, rateLimit, rateLimitedResponse } from "@/lib/security";

/**
 * GET /api/campaigns — فهرست عمومی کمپین‌ها برای کلاینت‌های هلسا (وب/اندروید).
 * فقط دادهٔ عمومی کمپین (عنوان/تاریخ/تخفیف) — بدون هیچ دادهٔ مدیریتی.
 * §47 بریف اندروید: تنها تغییر بک‌اندِ لازم‌شده برای اپ.
 */
export async function GET(req: Request) {
  const limited = rateLimit(clientKey(req, "public-campaigns"), 30, 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);
  const campaigns = await getCampaigns();
  return NextResponse.json(
    { ok: true, campaigns },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
  );
}
