-- ─────────────────────────────────────────────────────────────
-- HELSA — نگاشت عکس‌های واقعی ۱۴۰۵/۰۶/۰۶ (2026-09-28)
-- این فایل منبع حقیقتِ نگاشت عکس‌های «واقعی + placeholder صادقانه» است.
-- بعد از هر restore دیتابیس اجرا شود:
--   psql -h 127.0.0.1 -U helsa -d helsa_db -f scripts/image-fixes-20260928.sql
-- (PGPASSWORD=helsa_dev_pw)
-- سپس dump تازه گرفته شود تا این فایل مقدم بر dump قدیمی باشد.
-- ─────────────────────────────────────────────────────────────

-- خرماهای واقعی (هر نوع، عکس خودش)
UPDATE products SET image='/images/opt/piaram-dates.jpg', image_alt='خرما پیارم هلسا — عکس واقعی', image_status='admin_selected', gallery='["/images/opt/piaram-dates.jpg"]'::jsonb WHERE id=1;
UPDATE products SET image='/images/opt/kabkab-dates.jpg', image_alt='خرما کبکاب هلسا — عکس واقعی', image_status='admin_selected', gallery='["/images/opt/kabkab-dates.jpg"]'::jsonb WHERE id=3;
UPDATE products SET image='/images/opt/zahedi-dates.jpg', image_alt='خرما زاهدی هلسا — عکس واقعی', image_status='admin_selected', gallery='["/images/opt/zahedi-dates.jpg"]'::jsonb WHERE id=4;

-- نبات (عکس واقعی نبات سفید) + قند خرما (بلور قند) + ارده (عکس واقعی ارده)
UPDATE products SET image='/images/opt/rock-candy.jpg', image_alt='نبات هلسا — عکس واقعی', image_status='admin_selected', gallery='["/images/opt/rock-candy.jpg"]'::jsonb WHERE id IN (64,65,66,67);
UPDATE products SET image='/images/opt/date-sugar.jpg', image_alt='قند خرما هلسا — عکس واقعی', image_status='admin_selected', gallery='["/images/opt/date-sugar.jpg"]'::jsonb WHERE id IN (9,169);
UPDATE products SET image='/images/opt/tahini.jpg', image_alt='ارده کنجدی هلسا — عکس واقعی', image_status='admin_selected', gallery='["/images/opt/tahini.jpg"]'::jsonb WHERE id IN (29,145,147);

-- محصولات بدون عکس مناسب: placeholder صادقانه (به‌جای عکس گمراه‌کننده)
UPDATE products SET image='/images/placeholder.svg', image_status='seed_reference' WHERE id IN (63,75,76,77,78,79,113,123,124,126,148,149,150);
