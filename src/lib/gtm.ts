/**
 * Google Tag Manager — فعال‌سازی اختیاری با متغیر محیطی NEXT_PUBLIC_GTM_ID.
 * اگر ID تنظیم نشده باشد، هیچ اسکریپتی تزریق نمی‌شود (رفتار پیش‌فرض).
 * رویدادها از قبل از طریق src/lib/analytics.ts (trackEvent → window.dataLayer)
 * با نام‌های استاندارد push می‌شوند؛ GTM فقط همان dataLayer را مصرف می‌کند.
 */

/** شناسهٔ کانتینر GTM — فرمت استاندارد GTM-XXXXXXX (build-time inline). */
export const GTM_ID = (process.env.NEXT_PUBLIC_GTM_ID ?? "").trim();

export function gtmEnabled(): boolean {
  return /^GTM-[A-Za-z0-9_-]{4,}$/.test(GTM_ID);
}
