/**
 * HELSA corporate gifts — category configuration.
 *
 * A gift package belongs to a corporate category when any of its `occasions`
 * matches the category's `match` list. This keeps categorization data-driven
 * (stored on the package) instead of adding a new DB column.
 */
export interface CorporateGiftCategory {
  id: string;
  label: string;
  desc: string;
  match: string[];
}

export const CORPORATE_GIFT_CATEGORIES: CorporateGiftCategory[] = [
  { id: "staff", label: "تقدیر کارکنان", desc: "هدیه یکدست برای همکاران؛ از کیت خوش‌آمد تا تقدیر پایان سال", match: ["تقدیر سازمانی", "شروع همکاری", "رویداد داخلی"] },
  { id: "clients", label: "مشتریان و شرکا", desc: "هدیه حرفه‌ای برای مشتریان، شرکای تجاری و افتتاحیه‌ها", match: ["تقدیر مشتری", "افتتاحیه"] },
  { id: "events", label: "رویداد و همایش", desc: "پذیرایی و هدیه فردی برای همایش‌ها و رخدادهای سازمانی", match: ["رویداد رسمی", "همایش"] },
  { id: "executive", label: "مدیریتی و VIP", desc: "انتخاب فاخر برای مدیران و مهمانان ویژه", match: ["مدیریتی", "مهمان ویژه"] },
  { id: "yalda", label: "یلدای سازمانی", desc: "سینی و جعبه یلدا با انار، خرما و آجیل برای تیم‌ها", match: ["یلدا", "یلدای سازمانی"] },
  { id: "norooz", label: "نوروز سازمانی", desc: "بسته نوروزی شرکتی با تحویل قبل از تعطیلات", match: ["نوروز", "نوروز سازمانی", "پایان سال"] },
  { id: "custom", label: "سفارشی کامل", desc: "محتوا و بسته‌بندی کاملاً اختصاصی با مشاوره کارشناس", match: ["سفارشی", "مناسبت شرکتی"] },
];

export function corporateCategoryOf(id: string): CorporateGiftCategory | undefined {
  return CORPORATE_GIFT_CATEGORIES.find((c) => c.id === id);
}

/** Filter packages for a category id (undefined → all). */
export function filterCorporatePackages<T extends { occasions: string[] }>(packages: T[], cat?: string): T[] {
  const category = cat ? corporateCategoryOf(cat) : undefined;
  if (!category) return packages;
  return packages.filter((p) => p.occasions.some((o) => category.match.includes(o)));
}

/** Corporate order workflow shown on the section pages. */
export const CORPORATE_WORKFLOW = [
  { step: 1, title: "ثبت درخواست", desc: "فرم استعلام سازمانی را با تعداد، مناسبت و نیازمندی برندینگ پر می‌کنید." },
  { step: 2, title: "بررسی کارشناسی", desc: "کارشناس هلسا محتوا، بسته‌بندی و زمان‌بندی را با شما نهایی می‌کند." },
  { step: 3, title: "پیش‌فاکتور رسمی", desc: "پیش‌فاکتور شفاف با قیمت نهایی صادر می‌شود؛ هیچ هزینه پنهانی نیست." },
  { step: 4, title: "تولید و تحویل", desc: "تولید با تیراژ دقیق و تحویل هماهنگ در محل و زمان موردنظر شما." },
] as const;
