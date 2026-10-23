/**
 * محاسبهٔ خالص بخش‌های شمارش معکوس — بدون وابستگی به React (قابل تست واحد).
 * خروجی: {d,h,m,s} یا null وقتی تاریخ نامعتبر/گذشته است.
 * (کامپوننت Countdown در ui/primitives از همین تابع استفاده می‌کند و
 * در حالت null خودش را مخفی می‌کند — هرگز «۰۰:۰۰:۰۰:۰۰» دروغین نمایش داده نمی‌شود.)
 */
export function countdownParts(
  until: string,
  now: Date = new Date(),
): { d: number; h: number; m: number; s: number } | null {
  const t = new Date(until).getTime();
  if (!Number.isFinite(t)) return null; // تاریخ غیرقابل تجزیه (مثلاً رشتهٔ شمسی خام)
  const diff = t - now.getTime();
  if (diff <= 0) return null; // منقضی
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor(diff / 3600000) % 24,
    m: Math.floor(diff / 60000) % 60,
    s: Math.floor(diff / 1000) % 60,
  };
}
