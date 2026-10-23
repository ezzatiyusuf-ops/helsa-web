-- ═══ افزودن محصول «مویز ممتاز ازبک» ═══
-- منبع عکس: مالک — uploads/IMG_3606, IMG_3608, IMG_3609 (۲۰۲۶-۱۰-۱۹)
-- پردازش: scripts/product-photo.mjs → قالب کارت شناور برند (بوم #FAF7F0)
--
-- قیمت و موجودی اعلام‌شدهٔ مالک (۲۰۲۶-۱۰-۱۹): بستهٔ ۵۰۰ گرمی — ۱٬۲۵۰٬۰۰۰ تومان — موجودی ۱۵ عدد.
--
-- idempotent: اجرای دوباره رکورد تکراری نمی‌سازد.

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
  'مویز ممتاز ازبک', 'moiz-uzbek', 'dried-fruits', 'HLA-0036', 'هلسا ایرانیان',
  'مویز ممتاز ازبک، درشت و پرمغز؛ مناسب مصرف روزانه و پذیرایی.', 'مویز ممتاز ازبک، درشت و پرمغز؛ مناسب مصرف روزانه و پذیرایی.',
  1250000, 0, 'TOMAN',
  15, 'in_stock', 5, 1,
  '۵۰۰ گرم', 'بسته', '',
  'مویز ازبک', 'ازبکستان', 'دمای خنک و خشک',
  '/images/opt/moiz-uzbek.jpg', 'مویز ممتاز ازبک — هلسا', 'admin_selected',
  '["/images/opt/moiz-uzbek.jpg","/images/opt/moiz-uzbek-2.jpg","/images/opt/moiz-uzbek-3.jpg"]'::jsonb,
  '["مویز","خشکبار"]'::jsonb,
  '[{"label":"شرایط نگهداری","value":"دمای خنک و خشک"},{"label":"نوع بسته‌بندی","value":"پاچ بهداشتی هلسا"},{"label":"محل تولید","value":"ازبکستان"}]'::jsonb,
  0, 0,
  true, false, true
)
ON CONFLICT (slug) DO NOTHING;

-- اگر رکورد از قبل هست، فقط عکس‌ها را هم‌گام کن (بدون دست‌زدن به قیمت/موجودی)
UPDATE products SET
  image   = '/images/opt/moiz-uzbek.jpg',
  gallery = '["/images/opt/moiz-uzbek.jpg","/images/opt/moiz-uzbek-2.jpg","/images/opt/moiz-uzbek-3.jpg"]'::jsonb,
  image_alt = 'مویز ممتاز ازبک — هلسا'
WHERE slug = 'moiz-uzbek';

-- قیمت/وزن/موجودی/فعال‌سازی (منبع: اعلام مالک ۲۰۲۶-۱۰-۱۹)
UPDATE products SET
  price = 1250000,
  weight = '۵۰۰ گرم',
  stock = 15,
  stock_status = 'in_stock',
  is_active = true,
  is_visible = true,
  features = '[{"label":"وزن","value":"۵۰۰ گرم"},{"label":"شرایط نگهداری","value":"دمای خنک و خشک"},{"label":"نوع بسته‌بندی","value":"پاچ بهداشتی هلسا"},{"label":"محل تولید","value":"ازبکستان"}]'::jsonb
WHERE slug = 'moiz-uzbek';

COMMIT;
