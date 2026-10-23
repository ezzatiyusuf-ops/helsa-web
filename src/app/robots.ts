import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";
import { allowIndexing } from "@/lib/seo";

/** Evaluated per request so the production env (ALLOW_INDEXING=1) takes effect at runtime. */
export const dynamic = "force-dynamic";

/** Public pages are indexable only in production; private / transactional paths never are. */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? SITE.url;
  if (!allowIndexing) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/cart",
          "/checkout",
          "/payment",
          "/payment/success",
          "/payment/failed",
          "/login",
          "/register",
          "/forgot-password",
          "/verify",
          "/account",
          "/account/",
          "/wishlist",
          "/compare",
          "/track",
          "/offline",
          "/admin",
          "/admin/",
          "/wholesale/dashboard",
          "/wholesale/register",
          "/gifts/corporate/inquiry",
        ],
      },
      // AI answer engines — explicitly welcomed (AEO)
      {
        userAgent: ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "anthropic-ai", "Claude-Web", "PerplexityBot", "Perplexity-User", "Google-Extended", "Bingbot", "CopilotBot"],
        allow: "/",
        disallow: ["/api/", "/account", "/admin", "/checkout", "/payment", "/wholesale/dashboard"],
      },
    ],
    sitemap: [`${base}/sitemap.xml`, `${base}/products/sitemap.xml`, `${base}/mazeh-trays/sitemap.xml`, `${base}/gifts/sitemap.xml`, `${base}/blog/sitemap.xml`],
    host: base,
  };
}
