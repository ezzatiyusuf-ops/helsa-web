import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db";
import { producers, products } from "@/db/schema";
import { clientKey, rateLimit, rateLimitedResponse } from "@/lib/security";

/** GET /api/rooziteh/[slug] — پروفایل عمومی تولیدکنندهٔ منتشرشده + محصولاتش. */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const limited = rateLimit(clientKey(req, "rooziteh-detail"), 60, 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);
  if (!isDatabaseConfigured) return NextResponse.json({ ok: false, message: "کاتالوگ در دسترس نیست." }, { status: 503 });

  const slug = decodeURIComponent((await params).slug).slice(0, 120);
  const row = (await db.select().from(producers)
    .where(and(eq(producers.slug, slug), eq(producers.status, "published"))).limit(1))[0];
  if (!row) return NextResponse.json({ ok: false, message: "تولیدکننده یافت نشد." }, { status: 404 });

  const items = await db.select({
    id: products.id, name: products.name, slug: products.slug, price: products.price,
    image: products.image, imageAlt: products.imageAlt, weight: products.weight,
    stock: products.stock, stockStatus: products.stockStatus,
  }).from(products)
    .where(and(eq(products.producerId, row.id), eq(products.isActive, true), eq(products.isVisible, true)))
    .orderBy(asc(products.name)).limit(60);

  return NextResponse.json({
    ok: true,
    producer: {
      slug: row.slug, displayName: row.displayName, region: row.region, craft: row.craft,
      bio: row.bio, story: row.story, socialImpact: row.socialImpact,
      certifications: row.certifications, avatarImage: row.avatarImage, coverImage: row.coverImage,
      publishedAt: row.publishedAt,
    },
    products: items,
  });
}
