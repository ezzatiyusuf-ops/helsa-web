-- ═══ یکسان‌سازی گالری محصول: تصویر اصلی همیشه اولین عضو گالری (idempotent) ═══
-- ۲۰۲۶-۱۰-۲۲ — یافتهٔ بازرسی: در ۱۲۶ محصول فعال، مسیر `image` عضو `gallery` نبود؛
-- نتیجه: در PDP تصویر اصلی در بین تصاویر گالری غایب بود و شمارش «تصویر ۱..n»
-- با کارت محصول ناهم‌خوان می‌شد.
BEGIN;

UPDATE products p
SET gallery = (
  SELECT jsonb_agg(g ORDER BY ord)
  FROM (
    SELECT p.image AS g, 0 AS ord
    UNION ALL
    SELECT DISTINCT val AS g, 1 AS ord
    FROM jsonb_array_elements_text(p.gallery) AS val
    WHERE val <> p.image
  ) s
)
WHERE jsonb_array_length(p.gallery) > 0
  AND NOT p.gallery ? p.image
  AND p.image <> '';

COMMIT;

\echo '── پس از اصلاح: باید صفر باشد ──'
SELECT count(*) AS gallery_missing_main
FROM products
WHERE is_active AND jsonb_array_length(gallery) > 0 AND NOT gallery ? image;
