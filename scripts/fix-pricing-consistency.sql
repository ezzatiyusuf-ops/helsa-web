-- ═══ یکسان‌سازی قیمت و نشان تخفیف (idempotent) ═══
-- ۲۰۲۶-۱۰-۲۲ — یافتهٔ بازرسی: نشان «٪ تخفیف» از ستون discount خوانده می‌شد ولی
-- قیمت خط‌خورده از old_price؛ دو منبع برای یک واقعیت. نمونه‌های واقعی:
--   dried-figs   price=500,000  old_price=495,000  discount=13   ← تخفیف جعلی (قیمت قبل کمتر است)
--   walnut-kernels price=495,000 old_price=690,000 discount=10   ← نشان ۱۰٪ ولی کاهش واقعی ۲۸٪
-- قاعدهٔ جدید (منبع واحد): discount همیشه = round((old-price)*100/old)؛
-- اگر old_price <= price باشد، تخفیفی وجود ندارد و old_price پاک می‌شود.
BEGIN;

-- ۱) تخفیفِ نامعتبر → حذف قیمت قبل (هیچ نشان تخفیفی نمایش داده نمی‌شود)
UPDATE products
SET old_price = NULL, discount = 0
WHERE old_price IS NOT NULL AND old_price <= price AND discount <> 0;

UPDATE products
SET old_price = NULL
WHERE old_price IS NOT NULL AND old_price <= price;

-- ۲) درصد تخفیف = محاسبهٔ واقعی از قیمت‌ها
UPDATE products
SET discount = round((old_price - price)::numeric * 100 / old_price)
WHERE old_price IS NOT NULL AND old_price > price
  AND discount IS DISTINCT FROM round((old_price - price)::numeric * 100 / old_price);

-- ۳) محصولی که discount دارد ولی old_price ندارد → نشان بدون پشتوانه
UPDATE products SET discount = 0 WHERE discount <> 0 AND (old_price IS NULL OR old_price <= price);

COMMIT;

\echo '── پس از اصلاح: باید صفر ردیف باشد ──'
SELECT count(*) AS fake_discount FROM products WHERE old_price IS NOT NULL AND old_price <= price AND discount <> 0;
SELECT count(*) AS mismatch FROM products
WHERE old_price IS NOT NULL AND old_price > price
  AND abs(discount - round((old_price - price)::numeric * 100 / old_price)) > 0;
