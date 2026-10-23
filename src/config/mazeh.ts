/**
 * HELSA MAZEH TRAY — server-side pricing & option configuration.
 * Prices are ONLY trusted from the server (see /api/mazeh/quote).
 */
export const TRAY_SIZES = [
  { id: "small", label: "کوچک", guests: "۲ تا ۴ نفر", base: 950_000, factor: 1 },
  { id: "medium", label: "متوسط", guests: "۴ تا ۸ نفر", base: 1_650_000, factor: 1.35 },
  { id: "large", label: "بزرگ", guests: "۸ تا ۱۲ نفر", base: 2_450_000, factor: 1.8 },
  { id: "vip", label: "VIP", guests: "۱۲ تا ۲۰ نفر", base: 3_900_000, factor: 2.6 },
] as const;

export const TRAY_BASES = [
  { id: "wood", label: "چوب طبیعی", price: 0, note: "امضای کلاسیک هلسا" },
  { id: "stone", label: "سنگی", price: 180_000, note: "سنگ مرمر مشکی" },
  { id: "ceramic", label: "سرامیکی", price: 140_000, note: "لعاب کرم دست‌ساز" },
  { id: "acrylic", label: "اکریلیک لوکس", price: 320_000, note: "شفاف با لبه طلاکوب" },
] as const;

export interface MazehOption {
  id: string;
  label: string;
  price: number;
  group: "savory" | "sweet" | "nuts" | "fruit";
}

export const MAZEH_OPTIONS: MazehOption[] = [
  { id: "cheese", label: "پنیر", price: 220_000, group: "savory" },
  { id: "olive", label: "زیتون", price: 140_000, group: "savory" },
  { id: "deli", label: "کالباس / فرآورده‌های گوشتی", price: 320_000, group: "savory" },
  { id: "pickle", label: "خیارشور", price: 90_000, group: "savory" },
  { id: "veggie", label: "سبزیجات", price: 110_000, group: "savory" },
  { id: "dip", label: "دیپ", price: 130_000, group: "savory" },
  { id: "cracker", label: "کراکر", price: 95_000, group: "savory" },
  { id: "dates", label: "خرما", price: 210_000, group: "sweet" },
  { id: "datechoc", label: "شکلات خرمایی", price: 260_000, group: "sweet" },
  { id: "driedfruit", label: "میوه خشک", price: 170_000, group: "sweet" },
  { id: "sweets", label: "شیرینی", price: 190_000, group: "sweet" },
  { id: "honey", label: "عسل", price: 160_000, group: "sweet" },
  { id: "jam", label: "مربا", price: 120_000, group: "sweet" },
  { id: "pistachio", label: "پسته", price: 340_000, group: "nuts" },
  { id: "almond", label: "بادام", price: 190_000, group: "nuts" },
  { id: "walnut", label: "گردو", price: 240_000, group: "nuts" },
  { id: "hazelnut", label: "فندق", price: 260_000, group: "nuts" },
  { id: "cashew", label: "بادام هندی", price: 310_000, group: "nuts" },
  { id: "grape", label: "انگور", price: 120_000, group: "fruit" },
  { id: "strawberry", label: "توت‌فرنگی", price: 150_000, group: "fruit" },
  { id: "apple", label: "سیب", price: 90_000, group: "fruit" },
  { id: "orange", label: "پرتقال", price: 100_000, group: "fruit" },
  { id: "fig", label: "انجیر", price: 160_000, group: "fruit" },
  { id: "seasonal", label: "سایر میوه‌های فصل", price: 140_000, group: "fruit" },
];

export const GUEST_OPTIONS = [2, 4, 6, 10, 15, 20, 30];

export const OCCASIONS = [
  "دورهمی",
  "مهمانی خانوادگی",
  "تولد",
  "عروسی",
  "شب یلدا",
  "نوروز",
  "رمضان",
  "جلسه کاری",
  "پذیرایی VIP",
  "هدیه",
];

export const DECORATION_FEE = 150_000; // مدالیون هلسا + چیدمان گل
export const DELIVERY_FEE = 120_000; // ارسال یخچال‌دار تهران

/** Configurable party-size recommendation rules */
export const PARTY_RULES: { max: number; traySlug: string; title: string; note: string }[] = [
  { max: 4, traySlug: "doromi", title: "سینی مزه کلاسیک / دورهمی", note: "یک سینی کوچک برای عصرهای صمیمی" },
  { max: 8, traySlug: "classic", title: "سینی مزه کلاسیک", note: "تعادل کامل شور و شیرین" },
  { max: 12, traySlug: "party", title: "سینی مزه مهمانی", note: "تنوع ۱۴ قلم برای میز بزرگ" },
  { max: 20, traySlug: "vip", title: "سینی مزه VIP", note: "چیدمان چندلایه با مدالیون طلا" },
  { max: 999, traySlug: "vip", title: "پذیرایی سازمانی هلسا", note: "چند سینی هماهنگ + تیم چیدمان در محل" },
];

export function recommendForGuests(guests: number) {
  const rule = PARTY_RULES.find((r) => guests <= r.max) ?? PARTY_RULES[PARTY_RULES.length - 1];
  const qty = guests > 20 ? Math.ceil(guests / 16) : 1;
  return { ...rule, qty };
}
