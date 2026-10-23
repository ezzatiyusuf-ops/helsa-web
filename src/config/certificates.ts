/**
 * Trust certificates (brief 3.1) — SINGLE source for every credential display.
 * All fields are empty until the owner provides REAL documents/numbers.
 * The footer renders this section ONLY when at least one field is filled —
 * no placeholder badges, no fabricated trust marks.
 */
export const CERTIFICATES = {
  /** شمارهٔ مجوز/پروانهٔ بهداشت کسب‌وکار */
  healthLicenseNo: "",
  /** نشانی صفحهٔ تأیید اینماد (مثال: https://trustseal.enamad.ir/...؟id=...) */
  enamadUrl: "",
  /** شناسهٔ ساماندهی */
  samandehiUrl: "",
  /** نشانی گزارش آزمایشگاه (PDF/صفحهٔ معتبر) */
  labReportUrl: "",
  /** توضیح یک‌خطی گواهی — اختیاری، فقط با سند */
  labReportLabel: "",
} as const;

/** True when any real credential exists — gates the footer section. */
export const hasCertificates = Object.values(CERTIFICATES).some((v) => v.trim().length > 0);
