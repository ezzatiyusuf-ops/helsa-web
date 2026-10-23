import { NextResponse } from "next/server";
import { getInstagramStories } from "@/services/instagram";
import { clientKey, rateLimit, rateLimitedResponse } from "@/lib/security";

/** استوری‌های فعال — live (۲۴ ساعت اخیر اینستاگرام) یا استوری‌های منتخب پنل. */
export async function GET(req: Request) {
  const limited = rateLimit(clientKey(req, "ig-stories"), 30, 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);
  const { source, stories } = await getInstagramStories();
  return NextResponse.json(
    { ok: true, source, stories },
    { headers: { "Cache-Control": "public, max-age=120, stale-while-revalidate=300" } },
  );
}
