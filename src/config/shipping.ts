import { faDigits, formatToman } from "@/lib/format";

/**
 * Central shipping config (brief 2.2) — the ONLY source for every delivery
 * promise: product pages, shipping page, FAQ, tray pages, cart, checkout.
 * Times/feeds are the store's current real policy; update here, not in copy.
 */
export const SHIPPING = {
  /** orders at or above this subtotal ship free (after coupon discount) */
  freeThreshold: 2_000_000,
  /** flat nationwide fee below the threshold */
  flatFee: 85_000,
  /** Tehran lead time */
  tehranEta: "۲۴ تا ۴۸ ساعته",
  /** other cities lead time */
  citiesEta: "۲ تا ۴ روز کاری",
  /** orders placed before this hour are processed the same day */
  cutoffHour: 14,
  cutoffLabel: "۱۴",
  /** Mazeh trays: delivery area + lead time (brief 2.3) — identical text everywhere */
  trayArea: "تهران",
  trayLead: "۲۴ تا ۴۸ ساعت پیش از زمان مورد نظر شما، با هماهنگی تلفنی",
  trayVehicle: "خودرو یخچال‌دار",
} as const;

/** Canonical free-shipping phrase — one wording everywhere (was inconsistent). */
export const freeShippingPhrase = `ارسال رایگان سفارش‌های ${formatToman(SHIPPING.freeThreshold)} و بالاتر`;

/** General delivery sentence for product/cart surfaces. */
export const deliveryEstimatePhrase = `تهران ${SHIPPING.tehranEta} · سایر شهرها ${SHIPPING.citiesEta}`;

/** Unified tray delivery sentence (brief 2.3) — same text on every tray surface. */
export const trayDeliveryPhrase =
  `تحویل سینی‌های مزه فقط در ${SHIPPING.trayArea}، ${SHIPPING.trayLead}، با ${SHIPPING.trayVehicle} و هماهنگی ساعت تحویل.`;

/** Cutoff sentence for shipping page / FAQ. */
export const cutoffPhrase = `سفارش‌های ثبت‌شده تا ساعت ${SHIPPING.cutoffLabel} همان روز پردازش می‌شوند.`;

export const cutoffHourFa = faDigits(SHIPPING.cutoffHour);
