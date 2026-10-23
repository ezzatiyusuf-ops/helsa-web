/** ابزارهای کارت بانکی — کلاینت‌امن (بدون راز). */
export function normalizeDigits(input: string): string {
  return (input ?? "")
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}
export function normalizeCardNumber(input: string): string {
  return normalizeDigits(input).replace(/\D/g, "");
}
export function isCardNumber(input: string): boolean {
  const n = normalizeCardNumber(input);
  if (n.length !== 16) return false;
  let sum = 0;
  for (let i = 0; i < 16; i += 1) {
    let d = Number(n[15 - i]);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}
export function last4(input: string): string {
  return normalizeCardNumber(input).slice(-4);
}
export function formatCardNumber(input: string, separator = " "): string {
  return normalizeCardNumber(input).replace(/(.{4})/g, `$1${separator}`).trim();
}
export function cardNumberFa(input: string): string {
  return formatCardNumber(input, "\u200c").replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!);
}
export function isTransferTracking(input: string): boolean {
  const v = normalizeDigits(input).replace(/\s|-/g, "");
  return /^\d{4,24}$/.test(v);
}
export function cleanTransferDate(input: string): string {
  return normalizeDigits(input).replace(/[<>\u0000-\u001f]/g, "").trim().slice(0, 40);
}
