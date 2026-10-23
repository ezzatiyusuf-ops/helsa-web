/**
 * تصویر بصری سینی — تصویرِ خودِ همان سینی (DB یا دادهٔ fallback) مرجع است.
 * تاریخچه: قبلاً یک نگاشت دستی چند سینی را به دو عکس مشترک (tray-classic/tray-vip)
 * می‌بست که باعث می‌شد SKUهای مختلفِ پولی عکس یکسان داشته باشند (یافتهٔ #۱۳ ممیزی).
 * تابع صرفاً برای سازگاری امضا باقی مانده و همیشه fallback برمی‌گرداند.
 */
export function trayVisual(_slug: string, fallback: string): string {
  return fallback;
}
