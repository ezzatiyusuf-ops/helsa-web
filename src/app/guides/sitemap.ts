import type { MetadataRoute } from "next";
import { PRODUCT_GUIDES } from "@/data/product-guides";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://helsairanian.ir";
  return PRODUCT_GUIDES.map((g) => ({
    url: `${base}/guides/${g.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));
}
