import type { GiftPackage } from "@/types";
import { formatToman } from "@/lib/format";

/**
 * موتور پیشنهاد هدیه هلسا — قطعی (deterministic) و داده‌محور، بدون ادعای هوش مصنوعی.
 * امتیاز = تطابق مناسبت + تطابق گیرنده + تطابق بودجه (+ امتیاز «پیشنهاد هلسا»).
 * همهٔ داده‌ها از بسته‌های واقعی هدیه (DB) می‌آیند؛ هیچ پیشنهاد جعلی وجود ندارد.
 */

export type GiftOccasion = { id: string; label: string; icon: string; keywords: string[]; corporate?: boolean };

export const GIFT_OCCASIONS: GiftOccasion[] = [
  { id: "birthday", label: "تولد", icon: "🎂", keywords: ["تولد"] },
  { id: "anniversary", label: "سالگرد", icon: "❤️", keywords: ["سالگرد", "مناسبت خاص"] },
  { id: "thanks", label: "تشکر", icon: "🎁", keywords: ["تشکر", "تقدیر"] },
  { id: "corporate", label: "هدیه سازمانی", icon: "🏢", keywords: ["سازمانی", "شرکتی", "مدیریتی", "همایش", "رویداد", "پایان سال"], corporate: true },
  { id: "yalda", label: "یلدا", icon: "🌙", keywords: ["یلدا"] },
  { id: "nowruz", label: "نوروز", icon: "🌱", keywords: ["نوروز", "عیدی"] },
  { id: "party", label: "مهمانی", icon: "👨‍👩‍👧‍👦", keywords: ["دید و بازدید", "مهمان"] },
  { id: "iranian", label: "هدیه ایرانی", icon: "🇮🇷", keywords: [] },
];

export type GiftRecipient = { id: string; label: string; kind: "personal" | "corporate" | null; keywords: string[]; premium?: boolean };

export const GIFT_RECIPIENTS: GiftRecipient[] = [
  { id: "family", label: "خانواده", kind: "personal", keywords: ["خانوادگی"] },
  { id: "friend", label: "دوست", kind: "personal", keywords: ["دوستانه"] },
  { id: "colleague", label: "همکار", kind: "corporate", keywords: ["رویداد داخلی"] },
  { id: "manager", label: "مدیر", kind: "corporate", keywords: ["مدیریتی", "تقدیر ویژه"], premium: true },
  { id: "customer", label: "مشتری", kind: "corporate", keywords: ["تقدیر مشتری"] },
  { id: "partner", label: "شریک تجاری", kind: "corporate", keywords: ["شروع همکاری"] },
  { id: "guest", label: "مهمان", kind: "personal", keywords: ["دید و بازدید", "مهمان ویژه"] },
  { id: "self", label: "خودم", kind: null, keywords: [] },
];

/** بازه‌های بودجه به‌صورت داینامیک از قیمت واقعی بسته‌ها (سه‌یک‌های توزیع قیمت) */
export type BudgetBand = { id: string; label: string; min: number; max: number };

const round100 = (n: number) => Math.round(n / 100_000) * 100_000;

export function giftBudgetBands(gifts: GiftPackage[]): BudgetBand[] {
  const prices = gifts.map((g) => g.basePrice).filter((p) => p > 0).sort((a, b) => a - b);
  if (prices.length < 4) return [];
  const q1 = round100(prices[Math.floor(prices.length / 3)]);
  const q2 = round100(prices[Math.floor((prices.length * 2) / 3)]);
  if (q1 <= 0 || q2 <= q1) return [];
  return [
    { id: "low", label: `تا ${formatToman(q1)}`, min: 0, max: q1 },
    { id: "mid", label: `${formatToman(q1)} تا ${formatToman(q2)}`, min: q1, max: q2 },
    { id: "high", label: `بالای ${formatToman(q2)}`, min: q2, max: Infinity },
  ];
}

export type GiftPrefs = { occasion?: string; recipient?: string; budget?: string };

/** امتیاز یک بستهٔ هدیه بر اساس ترجیحات کاربر — قواعد شفاف و قابل نگهداشت */
export function scoreGift(gift: GiftPackage, prefs: GiftPrefs, bands: BudgetBand[], all: GiftPackage[]): number {
  if (!gift.isActive) return -Infinity;
  let score = 0;

  const occ = GIFT_OCCASIONS.find((o) => o.id === prefs.occasion);
  if (occ) {
    if (occ.id === "iranian") {
      if (gift.kind === "personal") score += 2;
    } else if (occ.corporate) {
      score += gift.kind === "corporate" ? 4 : 0;
    } else {
      score += gift.occasions.some((o) => occ.keywords.some((k) => o.includes(k))) ? 4 : 0;
    }
  }

  const rec = GIFT_RECIPIENTS.find((r) => r.id === prefs.recipient);
  if (rec) {
    if (rec.kind) score += gift.kind === rec.kind ? 3 : -2;
    if (rec.keywords.length && gift.occasions.some((o) => rec.keywords.some((k) => o.includes(k)))) score += 1;
    if (rec.premium) {
      // مدیر → ترجیح گزینه‌های بالای میانهٔ قیمت بسته‌های سازمانی
      const corp = all.filter((g) => g.kind === "corporate").map((g) => g.basePrice).sort((a, b) => a - b);
      const mid = corp.length ? corp[Math.floor(corp.length / 2)] : Infinity;
      if (gift.kind === "corporate" && gift.basePrice >= mid) score += 1;
    }
  }

  const band = bands.find((b) => b.id === prefs.budget);
  if (band) {
    if (gift.basePrice >= band.min && gift.basePrice <= band.max) score += 3;
    else {
      // مجاورت بازه: نزدیک‌ترین بازه بعدی
      const idx = bands.indexOf(band);
      const near = bands[idx + (gift.basePrice > band.max ? 1 : -1)];
      if (near && gift.basePrice >= near.min && gift.basePrice <= near.max) score += 1;
    }
  }

  if (gift.isFeatured) score += 0.5; // تعیین واقعی merchandising در داده
  return score;
}

/** پیشنهاد هلسا: یک گزینهٔ اصلی + دو جایگزین — بدون هیچ دادهٔ جعلی */
export function recommendGifts(
  gifts: GiftPackage[],
  prefs: GiftPrefs,
): { primary: GiftPackage | null; alternatives: GiftPackage[]; filtered: boolean } {
  const bands = giftBudgetBands(gifts);
  const filtered = Boolean(prefs.occasion || prefs.recipient || prefs.budget);
  const pool = gifts.filter((g) => g.isActive && g.stock > 0);
  const ranked = [...pool]
    .map((g) => ({ g, s: scoreGift(g, prefs, bands, gifts) }))
    .sort((a, b) => b.s - a.s || a.g.basePrice - b.g.basePrice);
  const [primary, ...rest] = ranked.map((r) => r.g);
  return { primary: primary ?? null, alternatives: rest.slice(0, 2), filtered };
}
