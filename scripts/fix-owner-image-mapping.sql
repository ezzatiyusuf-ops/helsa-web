-- ═══ نگاشت صحیح عکس‌های مالک (ویرایش ۲۰۲۶-۱۰-۱۹) ═══
-- idempotent — بعد از هر restore اجرا شود (restore-db.sh).
--
-- علت: نگاشت قبلی ۳ عکس را اشتباه به «خرما بار» داده بود:
--   date-bar   ← عکس گردو (06-1)  ·  date-bar-2 ← 13-tg1 (سرو چای)  ·  date-bar-3 ← 15-tg3 (سرو چای)
-- بازبینی محتوایی ۱۵ عکس مالک:
--   ۰۱–۰۵ شکلات خرما · ۰۶/۰۸/۰۹ گردو · ۰۷ انجیر خشک · ۱۰/۱۱ کشمش سبز · ۱۲–۱۵ چای سیاه
-- فقط همین ۶ محصول عکس واقعی دارند؛ باقی کاتالوگ منتظر عکاسی مالک است.

BEGIN;

-- شکلات دست‌ساز خرما (۰۱ اصلی + ۰۲/۰۳/۰۵ گالری)
UPDATE products SET
  image   = '/images/opt/handmade-date-chocolate.jpg',
  gallery = to_jsonb(ARRAY['/images/opt/handmade-date-chocolate.jpg',
                           '/images/opt/handmade-date-chocolate-2.jpg',
                           '/images/opt/handmade-date-chocolate-3.jpg',
                           '/images/opt/handmade-date-chocolate-4.jpg']),
  image_alt = 'شکلات دست‌ساز خرما — هلسا'
WHERE slug = 'handmade-date-chocolate';

-- شکلات خرما با مغز گردو (۰۴ — برش ترافل با مغز گردو)
UPDATE products SET
  image   = '/images/opt/date-chocolate-walnut.jpg',
  gallery = to_jsonb(ARRAY['/images/opt/date-chocolate-walnut.jpg']),
  image_alt = 'شکلات خرما با مغز گردو — هلسا'
WHERE slug = 'date-chocolate-walnut';

-- مغز گردو (۰۹ اصلی + ۰۸/۰۶ گالری)
UPDATE products SET
  image   = '/images/opt/walnut-kernels.jpg',
  gallery = to_jsonb(ARRAY['/images/opt/walnut-kernels.jpg',
                           '/images/opt/walnut-kernels-2.jpg',
                           '/images/opt/walnut-kernels-3.jpg']),
  image_alt = 'مغز گردوی چهارپره — هلسا'
WHERE slug = 'walnut-kernels';

-- کشمش سبز (۱۰ اصلی + ۱۱ گالری)
UPDATE products SET
  image   = '/images/opt/golden-raisins.jpg',
  gallery = to_jsonb(ARRAY['/images/opt/golden-raisins.jpg',
                           '/images/opt/golden-raisins-2.jpg']),
  image_alt = 'کشمش سبز طلایی — هلسا'
WHERE slug = 'golden-raisins';

-- انجیر خشک (۰۷)
UPDATE products SET
  image   = '/images/opt/dried-figs.jpg',
  gallery = to_jsonb(ARRAY['/images/opt/dried-figs.jpg']),
  image_alt = 'انجیر خشک استهبان — هلسا'
WHERE slug = 'dried-figs';

-- چای سیاه لاهیجان (۱۲ اصلی + ۱۳/۱۴/۱۵ گالری)
UPDATE products SET
  image   = '/images/opt/lahijan-black-tea.jpg',
  gallery = to_jsonb(ARRAY['/images/opt/lahijan-black-tea.jpg',
                           '/images/opt/lahijan-black-tea-2.jpg',
                           '/images/opt/lahijan-black-tea-3.jpg',
                           '/images/opt/lahijan-black-tea-4.jpg']),
  image_alt = 'چای سیاه لاهیجان — هلسا'
WHERE slug = 'lahijan-black-tea';

-- «خرما بار»: عکس گردو/چای که اشتباهاً روی این محصول بود حذف می‌شود.
-- عکس واقعی این محصول توسط مالک گرفته نشده؛ تا آن زمان عکس دستهٔ خرما.
UPDATE products SET
  image   = '/images/opt/medjool-dates.jpg',
  gallery = to_jsonb(ARRAY['/images/opt/medjool-dates.jpg']),
  image_alt = 'خرما بار — هلسا (عکس موقت دستهٔ خرما؛ در انتظار عکاسی)'
WHERE slug = 'date-bar';

COMMIT;

-- ── گسترش به خط محصول «شکلات خرمایی هلسا» (همان محصولِ عکاسی‌شده) ──
-- این چهار محصول عضو همان مجموعهٔ شکلات خرمای دست‌ساز هستند؛ عکس مالک
-- دقیقاً همین محصول را نشان می‌دهد (ترافل خرما، برش با مغز گردو، پایهٔ چوبی).
-- برای تنوع بصری، هر محصول عکس اصلی متفاوتی از همان ست می‌گیرد.
UPDATE products SET
  image = '/images/opt/handmade-date-chocolate-2.jpg',
  gallery = to_jsonb(ARRAY['/images/opt/handmade-date-chocolate-2.jpg',
                           '/images/opt/handmade-date-chocolate.jpg',
                           '/images/opt/handmade-date-chocolate-3.jpg',
                           '/images/opt/date-chocolate-walnut.jpg']),
  image_alt = 'شکلات دست‌ساز هلسا (ترافل خرما) — عکس مالک'
WHERE slug = 'helsa-handmade-chocolate';

UPDATE products SET
  image = '/images/opt/handmade-date-chocolate-3.jpg',
  gallery = to_jsonb(ARRAY['/images/opt/handmade-date-chocolate-3.jpg',
                           '/images/opt/handmade-date-chocolate.jpg',
                           '/images/opt/handmade-date-chocolate-4.jpg']),
  image_alt = 'شکلات خرمایی ویژه هلسا — عکس مالک'
WHERE slug = 'helsa-signature-date-chocolate';

UPDATE products SET
  image = '/images/opt/date-chocolate-walnut.jpg',
  gallery = to_jsonb(ARRAY['/images/opt/date-chocolate-walnut.jpg',
                           '/images/opt/handmade-date-chocolate-4.jpg',
                           '/images/opt/handmade-date-chocolate.jpg']),
  image_alt = 'شکلات خرمایی مغزدار (مغز گردو) — عکس مالک'
WHERE slug = 'filled-date-chocolate';

UPDATE products SET
  image = '/images/opt/handmade-date-chocolate-4.jpg',
  gallery = to_jsonb(ARRAY['/images/opt/handmade-date-chocolate-4.jpg',
                           '/images/opt/handmade-date-chocolate-2.jpg',
                           '/images/opt/date-chocolate-walnut.jpg']),
  image_alt = 'شکلات خرمایی — عکس مالک'
WHERE slug = 'date-chocolate';

-- ── توت خشک طبیعت (عکس‌های مالک ۲۰۲۶-۱۰-۱۹ — IMG_3574/3575/3577/3580) ──
-- قالب استاندارد عکس محصول (product-photo.mjs): کارت شناور روی بوم کرم #FAF7F0.
-- اصلی: نمای ظرف + بستهٔ برند (IMG_3575) · گالری: ۳ نمای دیگر.
UPDATE products SET
  image   = '/images/opt/dried-mulberries.jpg',
  gallery = to_jsonb(ARRAY['/images/opt/dried-mulberries.jpg',
                           '/images/opt/dried-mulberries-2.jpg',
                           '/images/opt/dried-mulberries-3.jpg',
                           '/images/opt/dried-mulberries-4.jpg']),
  image_alt = 'توت خشک طبیعت — هلسا'
WHERE slug = 'dried-mulberries';

-- ═══ ۲۰۲۶-۱۰-۲۲ — نشانه‌گذاری وضعیت عکس + تضمین «هیچ عکس استوک/فیک» ═══
-- دستور مالک: «برای محصولاتی که عکس هاشون رو فرستادم، عکس استوک و فیک نذار».
-- این بخش idempotent است: هم وضعیت را برای بازرسی ثبت می‌کند و هم تایید می‌کند که
-- هیچ مسیر گالری خارج از ست عکس مالک باقی نمانده باشد (گالری کامل بازنویسی شد).
UPDATE products SET image_status = 'owner_photo'
WHERE slug IN ('handmade-date-chocolate','date-chocolate-walnut','walnut-kernels','dried-figs',
               'golden-raisins','lahijan-black-tea',
               'helsa-handmade-chocolate','helsa-signature-date-chocolate',
               'filled-date-chocolate','date-chocolate','dried-mulberries');

-- بازرسی: هر ردیف «owner_photo» باید فقط مسیرهای ست مالک داشته باشد.
DO $$
DECLARE bad integer;
BEGIN
  SELECT count(*) INTO bad FROM products
  WHERE image_status = 'owner_photo'
    AND image NOT LIKE '/images/opt/%';
  IF bad > 0 THEN
    RAISE EXCEPTION 'عکس محصولات مالک خارج از /images/opt است: % ردیف', bad;
  END IF;
END $$;
