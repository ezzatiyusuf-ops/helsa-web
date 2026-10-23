-- ═══ گارد تکمیل تصاویر (بریف مالک: همهٔ محصولات عکس داشته باشند) ═══
-- idempotent: هر بار restore اجرا شود دوباره اعمال می‌شود.
BEGIN;
-- ۳۶ محصول placeholder → عکس واقعی دسته (موجود در /images/opt)
UPDATE products SET image='/images/opt/candy.jpg',              image_alt='آبناط ساده هلسا'      WHERE slug='plain-candy'        AND image LIKE '%placeholder%';
UPDATE products SET image='/images/opt/saffron-candy.jpg',      image_alt='آبنبات زعفرانی هلسا' WHERE slug='saffron-candy'      AND image LIKE '%placeholder%';
UPDATE products SET image='/images/opt/candy.jpg',              image_alt='آبنبات میوه‌ای هلسا'  WHERE slug='fruit-candy'        AND image LIKE '%placeholder%';
UPDATE products SET image='/images/opt/candy.jpg',              image_alt='آبنبات مغزدار هلسا'  WHERE slug='filled-candy'       AND image LIKE '%placeholder%';
UPDATE products SET image='/images/opt/candy.jpg',              image_alt='آبنبات ویژه هلسا'    WHERE slug='helsa-candy'        AND image LIKE '%placeholder%';
UPDATE products SET image='/images/opt/bidmeshk-distillate.jpg',image_alt='عرق بیدمشک هلسا'     WHERE slug='bidmeshk-distillate' AND image LIKE '%placeholder%';
UPDATE products SET image='/images/opt/distillate.jpg',         image_alt='عرق نعناع هلسا'      WHERE slug='mint-distillate'    AND image LIKE '%placeholder%';
UPDATE products SET image='/images/opt/distillate.jpg',         image_alt='عرق کاسنی هلسا'      WHERE slug='chicory-distillate' AND image LIKE '%placeholder%';
UPDATE products SET image='/images/opt/distillate.jpg',         image_alt='عرق بهارنارنج هلسا'  WHERE slug='orange-blossom-distillate' AND image LIKE '%placeholder%';
UPDATE products SET image='/images/opt/distillate.jpg',         image_alt='عرق گل محمدی هلسا'   WHERE slug='rose-distillate'    AND image LIKE '%placeholder%';
UPDATE products SET image='/images/opt/distillate.jpg',         image_alt='عرق شاتره هلسا'      WHERE slug='fumitory-distillate' AND image LIKE '%placeholder%';
UPDATE products SET image='/images/opt/distillate.jpg',         image_alt='عرق رازیانه هلسا'    WHERE slug='fennel-distillate'  AND image LIKE '%placeholder%';
UPDATE products SET image='/images/opt/halva-arde.jpg',         image_alt='حلوا ارده ساده هلسا' WHERE slug='plain-halva-tahini' AND image LIKE '%placeholder%';
UPDATE products SET image='/images/opt/halva-arde.jpg',         image_alt='حلوا ارده پسته‌ای هلسا' WHERE slug='pistachio-halva-tahini' AND image LIKE '%placeholder%';
UPDATE products SET image='/images/opt/halva-arde.jpg',         image_alt='حلوا ارده ویژه هلسا' WHERE slug='helsa-halva-tahini' AND image LIKE '%placeholder%';
UPDATE products SET image='/images/opt/herbal-tea.jpg',         image_alt='دمنوش گل محمدی هلسا' WHERE slug='rose-herbal-tea'    AND image LIKE '%placeholder%';
UPDATE products SET image='/images/opt/herbal-tea.jpg',         image_alt='دمنوش بهارنارنج هلسا' WHERE slug='orange-blossom-tea' AND image LIKE '%placeholder%';
UPDATE products SET image='/images/opt/herbal-tea-borage.jpg',  image_alt='دمنوش آرامش هلسا'    WHERE slug='calm-herbal-tea'    AND image LIKE '%placeholder%';
UPDATE products SET image='/images/opt/herbal-tea.jpg',         image_alt='دمنوش ترکیبی هلسا'   WHERE slug='helsa-herbal-blend' AND image LIKE '%placeholder%';
UPDATE products SET image='/images/opt/fruit-tea.jpg',          image_alt='دمنوش میوه‌ای هلسا'  WHERE slug='helsa-fruit-tea'    AND image LIKE '%placeholder%';
UPDATE products SET image='/images/opt/herbal-tea.jpg',         image_alt='دمنوش ویژه پذیرایی هلسا' WHERE slug='hospitality-herbal-tea' AND image LIKE '%placeholder%';
UPDATE products SET image='/images/opt/red-beans.jpg',          image_alt='لوبیا قرمز هلسا'     WHERE slug='red-beans'          AND image LIKE '%placeholder%';
UPDATE products SET image='/images/opt/pinto-beans.jpg',        image_alt='لوبیا چیتی هلسا'     WHERE slug='pinto-beans'        AND image LIKE '%placeholder%';
UPDATE products SET image='/images/opt/mung-beans.jpg',         image_alt='ماش هلسا'            WHERE slug='mung-beans'         AND image LIKE '%placeholder%';
UPDATE products SET image='/images/opt/saffron-noghl.jpg',      image_alt='نقل زعفرانی هلسا'   WHERE slug='saffron-noghl'      AND image LIKE '%placeholder%';
UPDATE products SET image='/images/opt/saffron-rock-candy.jpg', image_alt='نبات زعفرانی هلسا'  WHERE slug='saffron-rock-candy' AND image LIKE '%placeholder%';
UPDATE products SET image='/images/opt/rosebuds.jpg',           image_alt='گل محمدی خشک هلسا'   WHERE slug='dried-rose'         AND image LIKE '%placeholder%';
UPDATE products SET image='/images/opt/rosebuds.jpg',           image_alt='غنچه گل محمدی ویژه هلسا' WHERE slug='helsa-rosebuds' AND image LIKE '%placeholder%';
UPDATE products SET image='/images/opt/pumpkin-seeds.jpg',      image_alt='تخمه کدو هلسا'      WHERE slug='pumpkin-seeds'      AND image LIKE '%placeholder%';
UPDATE products SET image='/images/opt/pumpkin-seeds.jpg',      image_alt='تخمه کدو گوشتی هلسا' WHERE slug='meaty-pumpkin-seeds' AND image LIKE '%placeholder%';
UPDATE products SET image='/images/opt/sunflower-seeds.jpg',    image_alt='تخمه آفتابگردان هلسا' WHERE slug='sunflower-seeds'  AND image LIKE '%placeholder%';
UPDATE products SET image='/images/opt/japanese-seeds.jpg',     image_alt='تخمه ژاپنی (پپیتای سبز) هلسا' WHERE slug='japanese-seeds' AND image LIKE '%placeholder%';
UPDATE products SET image='/images/opt/watermelon-seeds.jpg',   image_alt='تخمه هندوانه هلسا'  WHERE slug='watermelon-seeds'   AND image LIKE '%placeholder%';
UPDATE products SET image='/images/opt/mixed-seeds.jpg',        image_alt='تخمه شور هلسا'      WHERE slug='salted-seeds'       AND image LIKE '%placeholder%';
UPDATE products SET image='/images/opt/mixed-seeds.jpg',        image_alt='تخمه بوداده هلسا'   WHERE slug='roasted-seeds'      AND image LIKE '%placeholder%';
UPDATE products SET image='/images/opt/mixed-seeds.jpg',        image_alt='تخمه طعم‌دار ویژه هلسا' WHERE slug='helsa-flavored-seeds' AND image LIKE '%placeholder%';
-- مسیر zahedi که در dump قدیمی شکسته بود
UPDATE products SET image='/images/opt/dates-zahedi.jpg',       image_alt=COALESCE(NULLIF(image_alt,''),'خرمای زاهدی هلسا') WHERE slug='zahedi-dates' AND image NOT LIKE '/images/opt/dates-zahedi%';
-- گالری: فقط تصویر اصلی معتبر (کپی‌های -2/-3 ناموجود حذف)
UPDATE products SET gallery = to_jsonb(ARRAY[image]) WHERE slug IN ('walnut-kernels','golden-raisins','dried-figs','rosebuds') AND jsonb_array_length(gallery) > 1;
-- خرما بار: عکس‌های واقعی ادیت‌شدهٔ مالک (استودیو هلسا v2) — اصلی + ۲ گالری
UPDATE products SET
  image = '/images/opt/date-bar.jpg',
  gallery = to_jsonb(ARRAY['/images/opt/date-bar.jpg','/images/opt/date-bar-2.jpg','/images/opt/date-bar-3.jpg']),
  image_alt = name || ' — هلسا مارکت'
WHERE slug = 'date-bar';

-- F-07/F-08: کوپن‌ها — ستون «فقط اولین خرید» + اصلاح برچسب SEFID100 (مقدار ۱۰۰٬۰۰۰ است نه ۱۰ هزار)
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS first_order_only boolean NOT NULL DEFAULT false;
UPDATE coupons SET first_order_only = true WHERE code = 'HELSA10' AND first_order_only = false;
UPDATE coupons SET label = '۱۰۰ هزار تومان تخفیف مستقیم' WHERE code = 'SEFID100' AND label = '۱۰ هزار تومان تخفیف مستقیم';

-- F-06: هم‌ترازی برچسب وزنِ سطح محصول با واریانتِ هم‌قیمت (فقط موارد اثبات‌پذیر)
-- الگوی باگ: price سطح محصول دقیقاً قیمت واریانت ۵۰۰گرمی است ولی weight چیز دیگری می‌گوید
-- (مثل پیرامز: ۴۸۵٬۰۰۰ = قیمت ۵۰۰ گرم، برچسب «۱ کیلوگرم»). هیچ قیمتی تغییر نمی‌کند؛
-- فقط برچسب توصیفی با واریانتِ هم‌قیمت هم‌تراز می‌شود. rosebuds (قیمت سطح با هیچ واریانتی
-- نمی‌خواند) عمداً دست‌نخورده می‌ماند → نیازمند تصمیم کسب‌وکار (در گزارش ممیزی).
UPDATE products p SET weight = '۵۰۰ گرم'
WHERE EXISTS (
  SELECT 1 FROM product_variants v
  WHERE v.product_id = p.id AND v.is_active = true AND v.price = p.price
    AND v.weight = 500 AND v.unit = 'گرم'
) AND p.weight IS DISTINCT FROM '۵۰۰ گرم';

-- انجیر خشک استهبان: عکس واقعی ادیت‌شدهٔ مالک (استودیو هلسا v2)
UPDATE products SET
  image = '/images/opt/dried-figs.jpg',
  gallery = to_jsonb(ARRAY['/images/opt/dried-figs.jpg']),
  image_alt = name || ' — هلسا مارکت'
WHERE slug = 'dried-figs';

-- کشمش سبز: عکس‌های واقعی ادیت‌شدهٔ مالک (استودیو هلسا v2) — اصلی + گالری
UPDATE products SET
  image = '/images/opt/golden-raisins.jpg',
  gallery = to_jsonb(ARRAY['/images/opt/golden-raisins.jpg','/images/opt/golden-raisins-2.jpg']),
  image_alt = name || ' — هلسا مارکت'
WHERE slug = 'golden-raisins';

-- مغز گردو: عکس‌های واقعی ادیت‌شدهٔ مالک (استودیو هلسا v2) — اصلی + گالری
UPDATE products SET
  image = '/images/opt/walnut-kernels.jpg',
  gallery = to_jsonb(ARRAY['/images/opt/walnut-kernels.jpg','/images/opt/walnut-kernels-2.jpg']),
  image_alt = name || ' — هلسا مارکت'
WHERE slug = 'walnut-kernels';

-- شکلات دست‌ساز خرما: عکس‌های واقعی ادیت‌شدهٔ مالک (استودیو هلسا v2) — ۱ اصلی + ۴ گالری
UPDATE products SET
  image = '/images/opt/handmade-date-chocolate.jpg',
  gallery = to_jsonb(ARRAY[
    '/images/opt/handmade-date-chocolate.jpg',
    '/images/opt/handmade-date-chocolate-2.jpg',
    '/images/opt/handmade-date-chocolate-3.jpg',
    '/images/opt/handmade-date-chocolate-4.jpg',
    '/images/opt/handmade-date-chocolate-5.jpg'
  ]),
  image_alt = name || ' — هلسا مارکت'
WHERE slug = 'handmade-date-chocolate';

-- چای ایرانی: عکس‌های واقعی ادیت‌شدهٔ مالک (استودیو هلسا v2)
UPDATE products SET
  image = '/images/opt/lahijan-black-tea.jpg',
  gallery = to_jsonb(ARRAY['/images/opt/lahijan-black-tea.jpg','/images/opt/lahijan-black-tea-2.jpg']),
  image_alt = name || ' — هلسا مارکت'
WHERE slug = 'lahijan-black-tea';

-- alt خالی هرگز نماند
UPDATE products SET image_alt = name || ' — هلسا مارکت' WHERE image_alt IS NULL OR image_alt = '';
COMMIT;
