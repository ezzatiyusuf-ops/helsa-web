import { SITE } from "@/config/site";

/**
 * پیش‌فرض‌های Open Graph — منبع واحد.
 * ─────────────────────────────────────────────────────────────────────────────
 * چرا: در Next، وقتی صفحه‌ای `openGraph` خودش را تعریف می‌کند، فیلدهای تعریف‌نشده
 * از ریشه ارث نمی‌رسند (merge سطحی است). نتیجه: ۱۳ صفحه og:image/og:type نداشتند
 * و اشتراک‌گذاری در شبکه‌های اجتماعی بدون تصویر و با نوع نامعلوم نمایش داده می‌شد.
 * حالا هر صفحه‌ای که تصویر اختصاصی ندارد، این پیش‌فرض‌ها را با spread می‌گیرد.
 */
export const OG_IMAGE = {
  url: "/images/og-default.jpg",
  width: 1200,
  height: 630,
  alt: SITE.storeName,
} as const;

export const defaultOpenGraph = {
  type: "website" as const,
  locale: "fa_IR",
  siteName: SITE.storeName,
  images: [OG_IMAGE],
};
