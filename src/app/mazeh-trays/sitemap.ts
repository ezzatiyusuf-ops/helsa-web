import type { MetadataRoute } from "next";
import { getTrays } from "@/services/catalog";
import { SITE } from "@/config/site";

/** Mazeh tray sitemap with image entries. */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? SITE.url;
  const trays = await getTrays();
  return trays.map((t) => ({
    url: `${base}/mazeh-trays/${t.slug}`,
    lastModified: new Date(t.createdAt),
    changeFrequency: "weekly" as const,
    priority: 0.9,
    images: t.image ? [t.image.startsWith("http") ? t.image : `${base}${t.image}`] : undefined,
  }));
}
