/**
 * HELSA — Persian/National ID utilities.
 * کد ملی ایرانی ۱۰ رقمی با الگوریتم رسمی رقم کنترل اعتبارسنجی می‌شود.
 * هیچ‌جا log نمی‌شود (حریم خصوصی).
 */

/** تبدیل ارقام فارسی/عربی به لاتین */
export function toEnglishDigits(v: string): string {
  return v
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

/** کد ملی معتبر؟ (الگوریتم رسمی رقم کنترل) */
export function isValidNationalId(raw: string): boolean {
  const code = toEnglishDigits(String(raw ?? "")).replace(/[\s-]/g, "");
  if (!/^\d{10}$/.test(code)) return false;
  // کدهای هم‌رقم (۰۰۰۰۰۰۰۰۰۰، ۱۱۱۱۱۱۱۱۱۱ و…) نامعتبرند
  if (/^(\d)\1{9}$/.test(code)) return false;
  const check = Number(code[9]);
  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += Number(code[i]) * (10 - i);
  const rem = sum % 11;
  const expected = rem < 2 ? rem : 11 - rem;
  return expected === check;
}

/** نسخهٔ نمایشی امن: فقط ۳ رقم آخر + نقاط */
export function maskNationalId(raw: string): string {
  const code = toEnglishDigits(String(raw ?? "")).replace(/\D/g, "");
  if (code.length !== 10) return "••••••••••";
  return `••••••${code.slice(-4)}`;
}

/** شمارهٔ موبایل ایرانی معتبر؟ */
export function isValidIranMobile(raw: string): boolean {
  const m = toEnglishDigits(String(raw ?? "")).replace(/[\s-]/g, "");
  return /^09\d{9}$/.test(m);
}
