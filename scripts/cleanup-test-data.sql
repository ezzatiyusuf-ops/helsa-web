-- ═══ پاک‌سازی دادهٔ آزمون از پایگاه‌داده ═══
-- ۲۰۲۶-۱۰-۲۲ — آماده‌شده برای اجرا روی **تولید، فقط با تأیید صریح مالک**.
-- روی محیط توسعه اجرا و تست شد (بخش «dry-run» نتیجهٔ صفر داشت چون دادهٔ آزمون نبود).
--
-- قاعده: هیچ ردیف واقعی مشتری حذف نمی‌شود. فقط سه دسته:
--   ۱) تولیدکنندهٔ نمونهٔ آزمون روزیته (slug = 'کارگاه-نمونه-آزمون')
--   ۲) حساب‌های آزمون qa-…@helsa.test و سفارش‌هایشان
--   ۳) جشنواره/بنر آزمون با slug شروع‌شده از 'test-'
--
-- روش: فایل در حالت پیش‌فرض فقط **گزارش** می‌دهد؛ برای اجرای واقعی، متغیر
--        APPLY=1 را ست کنید:
--          psql "$DATABASE_URL" -v APPLY=1 -f scripts/cleanup-test-data.sql
-- ترتیب حذف، وابستگی‌های کلید خارجی را رعایت می‌کند.

\set ON_ERROR_STOP on
\if :{?APPLY}
\else
  \set APPLY 0
\endif

BEGIN;

-- ── ۰) گزارش ───────────────────────────────────────────────
\echo '── گزارش دادهٔ آزمون ──'
SELECT 'producers' AS t, count(*) FROM producers WHERE slug = 'کارگاه-نمونه-آزمون'
UNION ALL SELECT 'customers(qa)', count(*) FROM customers WHERE email LIKE 'qa-%@helsa.test'
UNION ALL SELECT 'orders(qa)', count(*) FROM orders o
  JOIN customers c ON c.id = o.customer_id WHERE c.email LIKE 'qa-%@helsa.test'
UNION ALL SELECT 'campaigns(test)', count(*) FROM campaigns WHERE slug LIKE 'test-%'
UNION ALL SELECT 'banners(test)', count(*) FROM banners WHERE href LIKE '%test-%';

-- ── ۱) سفارش‌های آزمون (پرداخت/رسید/آیتم سپس سفارش) ────────
CREATE TEMP TABLE _qa_orders ON COMMIT DROP AS
SELECT o.id FROM orders o JOIN customers c ON c.id = o.customer_id
WHERE c.email LIKE 'qa-%@helsa.test';

DELETE FROM payment_receipt_files WHERE receipt_id IN (SELECT id FROM payment_receipts WHERE order_id IN (SELECT id FROM _qa_orders));
DELETE FROM payment_receipts WHERE order_id IN (SELECT id FROM _qa_orders);
DELETE FROM payment_logs     WHERE payment_id IN (SELECT id FROM payments WHERE order_id IN (SELECT id FROM _qa_orders));
DELETE FROM payments         WHERE order_id IN (SELECT id FROM _qa_orders);
DELETE FROM inventory_movements WHERE reference_type = 'order' AND reference_id IN (SELECT id::text FROM _qa_orders);
DELETE FROM order_items      WHERE order_id IN (SELECT id FROM _qa_orders);
DELETE FROM invoices         WHERE order_id IN (SELECT id FROM _qa_orders);
DELETE FROM orders           WHERE id IN (SELECT id FROM _qa_orders);

-- ── ۲) تولیدکنندهٔ نمونهٔ روزیته ────────────────────────────
DELETE FROM producers WHERE slug = 'کارگاه-نمونه-آزمون';

-- ── ۳) محتوای آزمون ────────────────────────────────────────
DELETE FROM campaigns WHERE slug LIKE 'test-%';
DELETE FROM banners   WHERE href LIKE '%test-%';

-- ── ۴) حساب‌های آزمون (بعد از حذف سفارش‌ها) ────────────────
DELETE FROM addresses      WHERE customer_id IN (SELECT id FROM customers WHERE email LIKE 'qa-%@helsa.test');
DELETE FROM auth_challenges WHERE identifier LIKE '%@helsa.test';
DELETE FROM customers      WHERE email LIKE 'qa-%@helsa.test';

\if :APPLY
  COMMIT;
  \echo '✅ حذف اجرا شد (COMMIT)'
\else
  ROLLBACK;
  \echo 'ℹ️  حالت گزارش: هیچ تغییری ذخیره نشد. برای اجرا: -v APPLY=1'
\endif
