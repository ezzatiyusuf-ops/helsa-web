import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";
import { getCampaigns } from "@/services/catalog";
import { listPublishedProducers } from "@/services/rooziteh";
import { allowIndexing } from "@/lib/seo";

/** Static/landing pages sitemap. Next.js merges multiple sitemap.ts files
 *  into a sitemap index automatically served at /sitemap.xml. */
export const dynamic = "force-dynamic";

/** Indexing is production-only (brief 1.5) — empty sitemap elsewhere. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!allowIndexing) return [];
  return buildSitemap();
}

async function buildSitemap(): Promise<MetadataRoute.Sitemap> {
  // صفحات جشنواره از دادهٔ واقعی (وضعیت ENDED هم ایندکس‌شدنی است — محتوای آرشیوی معتبر)
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? SITE.url;
  const pages: [string, number][] = [
    ["", 1], ["/products", 0.9], ["/experience", 0.7], ["/instagram", 0.6], ["/mazeh", 0.8],
    ["/mazeh-trays", 0.9], ["/mazeh-trays/build", 0.8], ["/mehmani", 0.7],
    ["/campaigns", 0.6], ["/offers", 0.6], ["/gifts", 0.8], ["/gifts/personal", 0.8],
    ["/gifts/corporate", 0.8], ["/wholesale", 0.8], ["/blog", 0.7],
    ["/health-center", 0.9], ["/health-center/mental-health", 0.8], ["/guides", 0.8],
    ["/founder", 0.6],
    ["/rooziteh", 0.7], ["/rooziteh/apply", 0.4],
    ["/about", 0.5], ["/contact", 0.5], ["/faq", 0.6], ["/privacy", 0.3],
    ["/terms", 0.3], ["/shipping", 0.4], ["/refund", 0.4],
  ];
  const campaigns = await getCampaigns().catch(() => []);
  const campaignPages: [string, number][] = campaigns.map((c) => [`/campaigns/${c.slug}`, 0.6] as [string, number]);
  // روزیته: فقط پروفایل‌های منتشرشده در نقشهٔ سایت (منبع: خودِ DB، نه فهرست دستی)
  const producers = await listPublishedProducers().catch(() => []);
  const producerPages: [string, number][] = producers.map((p) => [`/rooziteh/${p.slug}`, 0.6] as [string, number]);
  return [...pages, ...campaignPages, ...producerPages].map(([path, priority]) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority,
  }));
}
