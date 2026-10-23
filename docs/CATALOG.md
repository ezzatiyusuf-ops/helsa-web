# کاتالوگ واقعی هلسا

## جریان داده

```
PostgreSQL → src/services/catalog.ts → Server/API → UI
```

کامپوننت‌ها قیمت، stock و محتوا را تولید نمی‌کنند. seed arrays قدیمی فقط fallback توسعه در نبود DB هستند.

## seed افزایشی

```bash
npx tsx --env-file=.env scripts/seed-catalog.ts
```

ویژگی‌ها:
- حذف نمی‌کند؛ category/product را با slug upsert می‌کند.
- variant را با SKU upsert می‌کند.
- تصویر اصلی را در `product_images` ثبت می‌کند.
- حرکت اولیه موجودی را فقط اگر قبلاً وجود ندارد ثبت می‌کند.
- سینی‌های موجود را با SKU/stock/SEO کامل می‌کند.

قیمت‌ها و stockهای seed **مقادیر اولیه محیط توسعه** هستند و باید قبل تولید در `/admin` تأیید شوند.
عکس‌های خارجی seed reference هستند و در `product_images.requiresReplacement=true` علامت می‌خورند.

## افزودن دسته آینده

دسته در `/admin/categories` ساخته می‌شود. سپس محصول در `/admin/products/new` به آن متصل می‌گردد. به دلیل DB-driven بودن `getCategories/getProducts/search/sitemap`، بدون تغییر React در فیلتر محصولات، جستجو و sitemap ظاهر می‌شود.

## Variant

`product_variants` شامل name/SKU/price/compareAtPrice/costPrice/stock/weight/unit/flavor/isActive/sortOrder است. Quick Preview و جزئیات محصول فقط variantهای واقعی DB را نشان می‌دهند؛ وزن نصف/دوبرابر ساختگی وجود ندارد.

## تصاویر

`product_images`: URL, alt, primary, sortOrder, requiresReplacement. آپلود فایل NOT IMPLEMENTED تا storage provider واقعی انتخاب شود.
