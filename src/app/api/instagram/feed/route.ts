import { NextResponse } from "next/server";
import { getInstagramFeed } from "@/services/instagram";
import { clientKey, rateLimit, rateLimitedResponse } from "@/lib/security";

/** فید اینستاگرام — live (Graph API) یا پست‌های منتخب. */
export async function GET(req: Request) {
  const limited = rateLimit(clientKey(req, "ig-feed"), 30, 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);
  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 8) || 8, 1), 48);
  const { source, posts } = await getInstagramFeed(limit);
  return NextResponse.json(
    { ok: true, source, posts },
    { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" } },
  );
}
