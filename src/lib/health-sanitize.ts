/**
 * پاک‌سازی پیام خطا برای پاسخ‌های سلامت (S-06).
 * پیام خام درایور PostgreSQL می‌تواند میزبان، کاربر و حتی گذرواژه را حمل کند.
 * این تابع هیچ‌گاه به‌جای متن اصلی «تأیید» نمی‌دهد؛ فقط اطلاعات حساس را حذف می‌کند.
 */
export function sanitizeHealthMessage(message: string): string {
  return String(message ?? "")
    .replace(/postgres(ql)?:\/\/[^\s]+/gi, "[redacted-url]")
    .replace(/for\s+user\s+"?[^"\s,;]+"?/gi, "for user [redacted]")
    .replace(/\b(password|passwd|pwd)\b[^ \n,;]*/gi, "[redacted]")
    .replace(/\b(user|host|port|database|dbname)\s*[=:]\s*[^\s,;]+/gi, "$1=[redacted]")
    .replace(/\b\d{1,3}(\.\d{1,3}){3}(:\d+)?\b/g, "[redacted-host]")
    .slice(0, 200);
}
