/**
 * منطق مشترک نمایش واریانت‌ها — «منبع واحد» قیمت/وزنِ نمایشی محصول (F-02/F-03).
 * کارت محصول، صفحهٔ جزئیات، متادیتا و JSON-LD همگی از همین توابع تغذیه می‌شوند؛
 * افزودن منطق واریانتِ موازی در کامپوننت‌ها ممنوع (تکثیر منبع حقیقت).
 */
import type { Product, ProductVariant } from "@/types";

type VariantContainer = Pick<Product, "variants">;

/** واریانت‌های فعال، مرتب‌شده بر اساس sortOrder (منبع ترتیبِ نمایش) */
export function activeVariants(product: VariantContainer): ProductVariant[] {
  return (product.variants ?? [])
    .filter((v) => v.isActive !== false)
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

/** واریانت پیش‌فرضِ نمایش (اولین فعال) — قیمت/وزن اولیهٔ PDP، متا و دادهٔ ساختاریافته */
export function firstActiveVariant(product: VariantContainer): ProductVariant | null {
  const list = activeVariants(product);
  return list.length ? list[0]! : null;
}

/**
 * ارزان‌ترین واریانتِ فعالِ «موجود» — قیمتِ «از …» روی کارت محصول.
 * اگر همه ناموجود باشند null برمی‌گردد (کارت به قیمت سطح محصول برمی‌گردد
 * و چون محصول بدون موجودی است، دکمهٔ خرید غیرفعال می‌ماند).
 */
export function cheapestAvailableVariant(product: VariantContainer): ProductVariant | null {
  const list = activeVariants(product).filter((v) => v.stock > 0);
  if (!list.length) return null;
  return list.reduce((a, b) => (a.price <= b.price ? a : b));
}
