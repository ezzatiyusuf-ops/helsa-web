const faNumber = new Intl.NumberFormat("fa-IR");

/** Convert any value to Persian digits */
export function faDigits(value: number | string): string {
  return String(value).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

export function formatNumber(value: number): string {
  return faNumber.format(value);
}

/** Price in Toman, Persian formatted */
export function formatToman(value: number): string {
  return `${faNumber.format(Math.round(value))} تومان`;
}

export function formatPriceShort(value: number): string {
  return faNumber.format(Math.round(value));
}

export function discountPercent(price: number, oldPrice: number | null): number {
  if (!oldPrice || oldPrice <= price) return 0;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

export function faDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fa-IR", { dateStyle: "long" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function clampQty(q: number, max = 99): number {
  return Math.min(Math.max(1, Math.floor(q || 1)), max);
}

/** Normalize Persian/Arabic digits & ye/ke for search */
export function normalizeFa(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Current Jalali date as "YYYY/MM/DD" with English digits — batch expiry checks. */
export function todayJalali(): string {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", { year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}/${get("month").padStart(2, "0")}/${get("day").padStart(2, "0")}`;
}
