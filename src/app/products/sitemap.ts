import type { MetadataRoute } from "next";
import { getProducts } from "@/services/catalog";
import { SITE } from "@/config/site";

/** Product sitemap with image entries (image SEO). */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? SITE.url;
  const products = await getProducts();
  return products.map((p) => ({
    url: `${base}/products/${p.slug}`,
    lastModified: new Date(p.createdAt),
    changeFrequency: "daily" as const,
    priority: 0.9,
    images: p.image ? [p.image.startsWith("http") ? p.image : `${base}${p.image}`] : undefined,
  }));
}
