"use client";

/**
 * لایهٔ تحلیل هلسا (Analytics) — سبک، بدون وابستگی خارجی، سازگار با GTM/Matomo/umami.
 * رویدادها به dataLayer اضافه می‌شوند؛ اگر مانِیجر تحلیل (مثل GTM) بعداً متصل شود،
 * همین رویدادها خودکار فعال می‌شوند. هیچ دادهٔ شخصی (نام/تلفن/آدرس) ارسال نمی‌شود.
 *
 * رویدادهای استاندارد:
 * page_view · search · product_view · add_to_cart · remove_from_cart ·
 * begin_checkout · coupon_apply · maze_builder_complete · corporate_lead ·
 * podcast_play · wishlist_add
 */

type EventParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function trackEvent(event: string, params: EventParams = {}) {
  if (typeof window === "undefined") return;
  try {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({ event, ...params });
  } catch {
    /* analytics must never break the app */
  }
}
