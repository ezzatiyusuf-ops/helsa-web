import "server-only";
/** روزیته — خواندن مستقیم از DB برای صفحات سروری (SSR/SEO). فقط published. */
import { and, asc, eq } from "drizzle-orm";
import { db, isDatabaseConfigured } from "@/db";
import { producers, products } from "@/db/schema";

export interface PublicProducer {
  slug: string; displayName: string; region: string; craft: string; bio: string; story: string;
  socialImpact: string; certifications: string[]; avatarImage: string; coverImage: string; publishedAt: string | null;
}
export interface ProducerProduct {
  id: number; name: string; slug: string; price: number; image: string; imageAlt: string;
  weight: string; stock: number; stockStatus: string;
}
const toPublic = (r: typeof producers.$inferSelect): PublicProducer => ({
  slug: r.slug, displayName: r.displayName, region: r.region, craft: r.craft,
  bio: r.bio, story: r.story, socialImpact: r.socialImpact, certifications: r.certifications,
  avatarImage: r.avatarImage, coverImage: r.coverImage,
  publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
});

export async function listPublishedProducers(): Promise<PublicProducer[]> {
  if (!isDatabaseConfigured) return [];
  try {
    const rows = await db.select().from(producers).where(eq(producers.status, "published"))
      .orderBy(asc(producers.displayName)).limit(200);
    return rows.map(toPublic);
  } catch { return []; }
}

export async function getPublishedProducer(slug: string): Promise<{ producer: PublicProducer; products: ProducerProduct[] } | null> {
  if (!isDatabaseConfigured) return null;
  try {
    const row = (await db.select().from(producers)
      .where(and(eq(producers.slug, slug), eq(producers.status, "published"))).limit(1))[0];
    if (!row) return null;
    const items = await db.select({
      id: products.id, name: products.name, slug: products.slug, price: products.price,
      image: products.image, imageAlt: products.imageAlt, weight: products.weight,
      stock: products.stock, stockStatus: products.stockStatus,
    }).from(products)
      .where(and(eq(products.producerId, row.id), eq(products.isActive, true), eq(products.isVisible, true)))
      .orderBy(asc(products.name)).limit(60);
    return { producer: toPublic(row), products: items };
  } catch { return null; }
}
