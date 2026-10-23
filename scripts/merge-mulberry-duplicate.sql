-- ═══ توت خشک: یک محصول (تصحیح مالک ۲۰۲۶-۱۰-۱۹: «هر دو یک محصول‌اند») ═══
-- فقط رکورد dried-mulberries می‌ماند: ۴۵۰ گرم · ۹۸۰٬۰۰۰ تومان
-- گالری: ۴ عکس متمایز مالک (بررسی md5: عکس‌های تکراری کنار گذاشته شد)
-- idempotent.

BEGIN;

UPDATE products SET
  name   = 'توت خشک طبیعت',
  price  = 980000,
  weight = '۴۵۰ گرم',
  image  = '/images/opt/dried-mulberries.jpg',
  gallery = '["/images/opt/dried-mulberries.jpg",
              "/images/opt/dried-mulberries-2.jpg",
              "/images/opt/dried-mulberries-3.jpg"]'::jsonb,
  image_alt = 'توت خشک طبیعت — هلسا',
  features = '[{"label":"وزن","value":"۴۵۰ گرم"},{"label":"شرایط نگهداری","value":"دمای خنک و خشک"},{"label":"نوع بسته‌بندی","value":"پاچ بهداشتی هلسا"},{"label":"محل تولید","value":"ایران"}]'::jsonb
WHERE slug = 'dried-mulberries';

-- حذف رکورد تکراری (اگر سفارشی به آن وصل نشده باشد)
DELETE FROM products
WHERE slug = 'dried-mulberries-premium'
  AND NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.product_id = products.id);

COMMIT;
