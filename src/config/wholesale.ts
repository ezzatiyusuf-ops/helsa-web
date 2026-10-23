/**
 * HELSA wholesale (B2B) portal configuration.
 *
 * Pricing policy: approved businesses get a per-business cooperation discount
 * (percent) applied SERVER-SIDE on catalog prices. The client never computes
 * a trusted wholesale price — see /api/wholesale/orders.
 */

export type WholesaleBusinessType = "supermarket" | "restaurant" | "cafe" | "hotel" | "distributor" | "corporate";

export const WHOLESALE_TYPES: { id: WholesaleBusinessType; label: string; desc: string }[] = [
  { id: "supermarket", label: "سوپرمارکت و فروشگاه", desc: "قفسه‌بندی پرفروش با پکیج‌های مصرفی" },
  { id: "restaurant", label: "رستوران", desc: "خرما، آجیل و عسل خامِ آشپزخانه" },
  { id: "cafe", label: "کافه", desc: "شکلات دست‌ساز، خرما و آجیل منو" },
  { id: "hotel", label: "هتل", desc: "پذیرایی صبحانه و اتاق با کیفیت پایدار" },
  { id: "distributor", label: "توزیع‌کننده", desc: "تیراژ بالا با زمان‌بندی منظم" },
  { id: "corporate", label: "خریدار سازمانی", desc: "پذیرایی دفتر و هدایای سازمانی" },
];

export const WHOLESALE_BUSINESS_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  WHOLESALE_TYPES.map((t) => [t.id, t.label]),
);

export const WHOLESALE_STATUS_LABEL: Record<string, string> = {
  pending: "در انتظار تأیید",
  approved: "تأییدشده",
  rejected: "رد‌شده",
  suspended: "معلق",
};

/** Minimum order subtotal (تومان) for a wholesale order. */
export const WHOLESALE_MIN_SUBTOTAL = 5_000_000;
/** Minimum quantity per product line in wholesale orders. */
export const WHOLESALE_MIN_ITEM_QTY = 2;
/** Maximum distinct lines per wholesale order. */
export const WHOLESALE_MAX_LINES = 60;
/** Default cooperation discount applied on approval (admin-adjustable per business). */
export const WHOLESALE_DEFAULT_DISCOUNT = 12;

export const WHOLESALE_BENEFITS = [
  { title: "قیمت همکاری شفاف", desc: "درصد تخفیف اختصاصی شما پس از تأیید، روی قیمت روز کاتالوگ اعمال می‌شود — بدون عدد پنهان." },
  { title: "حداقل سفارش مشخص", desc: `حداقل جمع سفارش عمده ${WHOLESALE_MIN_SUBTOTAL.toLocaleString("fa-IR")} تومان و حداقل ${WHOLESALE_MIN_ITEM_QTY.toLocaleString("fa-IR")} عدد از هر کالاست.` },
  { title: "فاکتور رسمی", desc: "برای هر سفارش، فاکتور قابل چاپ با مشخصات کسب‌وکار شما صادر می‌شود." },
  { title: "سفارش تکراری", desc: "سفارش‌های قبلی با یک کلیک قابل تکرارند؛ مناسب خرید دوره‌ای." },
  { title: "تحویل هماهنگ", desc: "زمان‌بندی ارسال منظم هفتگی یا ماهانه با هماهنگی کارشناس B2B." },
  { title: "پشتیبانی اختصاصی", desc: "کارشناس عمده هلسا از ثبت‌نام تا تحویل پاسخ‌گوی شماست." },
] as const;

export const WHOLESALE_WORKFLOW = [
  { step: 1, title: "ثبت‌نام کسب‌وکار", desc: "فرم ثبت‌نام عمده را با اطلاعات کسب‌وکار کامل می‌کنید؛ حساب کاربری هلسا هم‌زمان ساخته می‌شود." },
  { step: 2, title: "بررسی و تأیید", desc: "کارشناس B2B هلسا اطلاعات را بررسی و حساب شما را با درصد تخفیف همکاری تأیید می‌کند." },
  { step: 3, title: "خرید از پنل عمده", desc: "در پنل، قیمت‌های همکاری را می‌بینید، سبد عمده می‌سازید و سفارش ثبت می‌کنید." },
  { step: 4, title: "فاکتور و تحویل", desc: "فاکتور رسمی صادر و ارسال با زمان‌بندی توافق‌شده انجام می‌شود." },
] as const;

export function wholesalePrice(price: number, discountPercent: number): number {
  if (discountPercent <= 0) return price;
  return Math.round((price * (100 - Math.min(discountPercent, 60))) / 100 / 1000) * 1000;
}
