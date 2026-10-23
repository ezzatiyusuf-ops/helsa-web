import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/data/content";
import { SITE } from "@/config/site";

/** Blog article sitemap with image entries. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? SITE.url;
  return BLOG_POSTS.map((b) => ({
    url: `${base}/blog/${b.slug}`,
    lastModified: new Date(b.date),
    changeFrequency: "monthly" as const,
    priority: 0.6,
    images: [b.image.startsWith("http") ? b.image : `${base}${b.image}`],
  }));
}
