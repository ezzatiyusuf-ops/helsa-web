import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db";
import { producers } from "@/db/schema";
import { clientKey, rateLimit, rateLimitedResponse } from "@/lib/security";

/** GET /api/rooziteh — فهرست عمومی تولیدکنندگان روزیته (فقط published). */
export async function GET(req: Request) {
  const limited = rateLimit(clientKey(req, "rooziteh-list"), 60, 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);
  if (!isDatabaseConfigured) return NextResponse.json({ ok: true, producers: [], unavailable: true });

  const rows = await db
    .select({
      slug: producers.slug, displayName: producers.displayName, region: producers.region, craft: producers.craft,
      bio: producers.bio, avatarImage: producers.avatarImage, coverImage: producers.coverImage,
      certifications: producers.certifications, publishedAt: producers.publishedAt,
    })
    .from(producers).where(eq(producers.status, "published"))
    .orderBy(asc(producers.displayName)).limit(200);

  return NextResponse.json({ ok: true, producers: rows, count: rows.length });
}
