import type { MetadataRoute } from "next";
import { getGiftPackages } from "@/services/gifts";
import { SITE } from "@/config/site";

/** Gift package sitemap (personal + corporate) with image entries. */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? SITE.url;
  const gifts = await getGiftPackages();
  return gifts.map((g) => ({
    url: `${base}/gifts/${g.kind === "corporate" ? "corporate" : "personal"}/${g.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
    images: g.image ? [g.image.startsWith("http") ? g.image : `${base}${g.image}`] : undefined,
  }));
}
