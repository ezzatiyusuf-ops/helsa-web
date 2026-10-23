import "server-only";
/** تنظیمات متمرکز کارت‌به‌کارت — شمارهٔ کارت هرگز در کامپوننت کلاینت نیست. */
export interface CardTransferSettings { number: string; holder: string; bank: string; enabled: boolean; disabledReason?: string }
const DEFAULT_NUMBER = "6219861920298014";
const DEFAULT_HOLDER = "یوسف عزتی آذر";
const DEFAULT_BANK = "بلو بانک";
const normalize = (raw: string) => raw.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/\D/g, "");

export function cardTransferSettings(): CardTransferSettings {
  const number = normalize(process.env.CARD_TRANSFER_NUMBER?.trim() || DEFAULT_NUMBER);
  const holder = (process.env.CARD_TRANSFER_HOLDER?.trim() || DEFAULT_HOLDER).slice(0, 120);
  const bank = (process.env.CARD_TRANSFER_BANK?.trim() || DEFAULT_BANK).slice(0, 80);
  if (process.env.CARD_TRANSFER_ENABLED === "0") return { number, holder, bank, enabled: false, disabledReason: "پرداخت کارت‌به‌کارت موقتاً غیرفعال است." };
  if (number.length !== 16) return { number: "", holder, bank, enabled: false, disabledReason: "شمارهٔ کارت مقصد پیکربندی نشده است؛ فعلاً از روش دیگری استفاده کنید." };
  return { number, holder, bank, enabled: true };
}
export function publicCardTransferDetails(): { number: string; holder: string; bank: string } {
  const s = cardTransferSettings();
  return { number: s.number, holder: s.holder, bank: s.bank };
}
