/**
 * ابزار مشترک پول — منبع واحد محاسبات نمایشی سمت کلاینت (Phase Four).
 * ⚠ مرجع نهایی مبالغ همیشه سرور است (api/orders بازمحاسبه می‌کند)؛
 * این توابع فقط برای نمایش صادقانهٔ هم‌راستا با سرورند.
 * واحد پایه: تومان، اعداد صحیح (integer) — هیچ float/ریال اینجا راه ندارد.
 * تبدیل تومان→ریال فقط در لایهٔ دادهٔ ساختاریافته (seo.ts، مرز ISO-4217) انجام می‌شود.
 */
import type { CartItem, Coupon } from "@/types";
import { SITE } from "@/config/site";

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.price * i.qty, 0);
}

export function couponDiscount(subtotal: number, coupon: Coupon | null): number {
  if (!coupon) return 0;
  if (subtotal < coupon.minimumPurchase) return 0;
  const raw = coupon.type === "percent" ? (subtotal * coupon.value) / 100 : coupon.value;
  return Math.min(Math.round(raw), coupon.maximumDiscount ?? raw);
}

export function shippingFee(subtotal: number, itemCount: number): number {
  if (itemCount === 0) return 0;
  return subtotal >= SITE.freeShippingThreshold ? 0 : SITE.shippingFee;
}

/** جمع نهایی سفارش — منبع واحد کلاینت و آینهٔ محاسبهٔ سرور. */
export function orderTotal(input: { subtotal: number; discount: number; shipping: number; support?: number }): number {
  const support = Math.max(0, Math.trunc(input.support ?? 0));
  return Math.max(0, input.subtotal - input.discount) + Math.max(0, input.shipping) + support;
}
/** بخش «فروش» = جمع منهای مشارکت (مبنای SALE در حسابداری) */
export function salesAmount(total: number, support: number): number {
  return Math.max(0, total - Math.max(0, Math.trunc(support || 0)));
}
