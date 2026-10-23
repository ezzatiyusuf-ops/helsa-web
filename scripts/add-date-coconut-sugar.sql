-- ═══ افزودن محصول «قند خرما نارگیلی هلسا» ═══
-- منبع عکس: مالک — uploads/IMG_3587..IMG_3590.jpeg (۲۰۲۶-۱۰-۱۹)
-- پردازش: scripts/product-photo.mjs → بازبینی استودیویی final-v3/edited/date-coconut-sugar-1..4.png
--          → مستر ۱۴۰۰px در public/images/gen/ + واریانت ۴۸۰/۷۶۸/۱۰۸۰ در public/images/opt/
--
-- دادهٔ اعلام‌شدهٔ مالک (۲۰۲۶-۱۰-۱۹): ۳۵۰٬۰۰۰ تومان · بستهٔ ۳۵۰ گرمی · موجودی ۳۰ عدد.
-- idempotent: اجرای دوباره رکورد تکراری نمی‌سازد (ON CONFLICT).
-- تفکیک از محصولات موجود: «قند خرما» (date-sugar) و «قند خرما ویژه هلسا» (helsa-date-sugar)
-- و «شکلات خرمایی نارگیلی» (coconut-date-chocolate) — این یکی قند خرمای پوشش نارگیل است.

BEGIN;

INSERT INTO products (
  name, slug, category, sku, brand,
  short_description, description,
  price, discount, currency,
  stock, stock_status, low_stock_threshold, min_order_qty,
  weight, unit, packaging, ingredients, origin, storage,
  image, image_alt, image_status, gallery,
  tags, features,
  rating, reviews,
  is_active, is_featured, is_visible
) VALUES (
  'قند خرما نارگیلی هلسا', 'date-coconut-sugar', 'date-sugar', 'HLA-0037', 'هلسا ایرانیان',
  'قند خرما نارگیلی هلسا؛ تکه‌های قند خرما با پوشش نارگیل رنده‌شده، مناسب پذیرایی و مصرف روزانه.',
  'قند خرما نارگیلی هلسا از خرماهای منتخب تهیه و با نارگیل رنده‌شده پوشش داده می‌شود. بافت نسبتاً نرم و طعم شیرین ملایم با عطر نارگیل دارد و برای پذیرایی در کنار چای و دمنوش مناسب است. در بستهٔ بهداشتی هلسا عرضه می‌شود و باید در جای خشک و خنک، دور از نور مستقیم آفتاب نگهداری شود.',
  350000, 0, 'TOMAN',
  30, 'in_stock', 5, 1,
  '۳۵۰ گرم', 'بسته', 'بسته‌بندی بهداشتی هلسا',
  'خرما، نارگیل رنده‌شده', 'ایران', 'دمای خنک و خشک',
  '/images/opt/date-coconut-sugar.jpg', 'قند خرما نارگیلی هلسا — عکس محصول', 'admin_selected',
  '["/images/opt/date-coconut-sugar.jpg","/images/opt/date-coconut-sugar-2.jpg","/images/opt/date-coconut-sugar-3.jpg","/images/opt/date-coconut-sugar-4.jpg"]'::jsonb,
  '["قند خرما","نارگیل","خشکبار","پذیرایی"]'::jsonb,
  '[{"label":"وزن","value":"۳۵۰ گرم"},{"label":"شرایط نگهداری","value":"دمای خنک و خشک"},{"label":"نوع بسته‌بندی","value":"بستهٔ بهداشتی هلسا"},{"label":"محل تولید","value":"ایران"}]'::jsonb,
  0, 0,
  true, false, true
)
ON CONFLICT (slug) DO NOTHING;

-- اگر رکورد از قبل هست، فقط عکس‌ها را هم‌گام کن (بدون دست‌زدن به قیمت/موجودی)
UPDATE products SET
  image     = '/images/opt/date-coconut-sugar.jpg',
  gallery   = '["/images/opt/date-coconut-sugar.jpg","/images/opt/date-coconut-sugar-2.jpg","/images/opt/date-coconut-sugar-3.jpg","/images/opt/date-coconut-sugar-4.jpg"]'::jsonb,
  image_alt = 'قند خرما نارگیلی هلسا — عکس محصول'
WHERE slug = 'date-coconut-sugar';

-- قیمت/وزن/موجودی/فعال‌سازی (منبع: اعلام مالک ۲۰۲۶-۱۰-۱۹)
UPDATE products SET
  price = 350000,
  weight = '۳۵۰ گرم',
  stock = 30,
  stock_status = 'in_stock',
  is_active = true,
  is_visible = true
WHERE slug = 'date-coconut-sugar';

COMMIT;
