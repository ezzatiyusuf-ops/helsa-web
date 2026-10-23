-- ═══ بازرسی یکپارچگی دادهٔ فروشگاه (بدون تغییر داده) ═══
-- اجرا: psql "$DATABASE_URL" -f scripts/data-integrity.sql
-- هر ردیف خروجی = یک نقض واقعی که باید رفع شود. خروجی خالی = سالم.
\pset footer off
\echo '── ۱) قیمت قبل از تخفیف باید بزرگ‌تر از قیمت فعلی باشد (نشان تخفیف واقعی) ──'
SELECT slug, name, price, old_price, discount
FROM products
WHERE old_price IS NOT NULL AND old_price <= price;

\echo '── ۲) percent تخفیف باید با (old-price)/old هم‌خوان باشد (±۲ نمره) ──'
SELECT slug, price, old_price, discount,
       round((old_price - price)::numeric * 100 / old_price) AS implied
FROM products
WHERE old_price IS NOT NULL AND old_price > price
  AND abs(discount - round((old_price - price)::numeric * 100 / old_price)) > 2;

\echo '── ۳) محصولِ فعالِ بدون تصویر یا با مسیر خالی ──'
SELECT slug FROM products WHERE is_active AND (image IS NULL OR image = '');

\echo '── ۴) گالری شامل تصویر اصلی نیست (ناهم‌خوانی کارت/PDP) ──'
SELECT slug FROM products
WHERE is_active AND jsonb_array_length(gallery) > 0 AND NOT gallery ? image;

\echo '── ۵) موجودی منفی یا وضعیت ناسازگار ──'
SELECT slug, stock, stock_status FROM products
WHERE stock < 0 OR (stock = 0 AND stock_status = 'in_stock') OR (stock > 0 AND stock_status = 'out_of_stock');

\echo '── ۶) اسلاگ تکراری/خالی (کلید یکتای مسیر) ──'
SELECT slug, count(*) FROM products GROUP BY slug HAVING count(*) > 1 OR slug = '';

\echo '── ۷) تولیدکنندهٔ روزیته با وضعیت نامعتبر ──'
SELECT slug, status FROM producers WHERE status NOT IN ('submitted','approved','published','unavailable');
