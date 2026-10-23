# گزارش ممیزی هلسا — دور سوم (V3)
**تاریخ:** ۲۰۲۶-۱۰-۱۸ · **کامیت‌های این دور:** `623aa22` (رفکتور منبع واحد + تست‌ها) → `c89f57e` (S-01)
**دامنهٔ این دور:** تک‌منبعی منطق واریانت و توابع پولی · اعتبارسنجی کامل دادهٔ کاتالوگ DB · فازهای باز (مسیرها/امنیت/ادمین) — موارد F-01..F-08 و عکس‌ها در دورهای قبل رفع و راستی‌آزمایی شده‌اند و تکرار نشده‌اند.

---

## الف) خلاصهٔ وضعیت

| محور | وضعیت | شواهد این دور |
|---|---|---|
| کاتالوگ (۱۸۴ محصول در DB) | ✅ سالم | ۱۸۴/۱۸۴ فعال+مرئو · ۰ SKU تکراری · ۰ slug نامعتبر · ۰ قیمت نامعتبر (سطح/واریانت) · ۰ موجودی منفی · ۰ عکس/alt گم‌شده · ۰ تناقض موجودی سطح↔واریانت |
| سبد خرید و ارسال | ✅ سالم | `shippingFee(…, items.length)` → سبد خالی همیشه صفر (تست یونیت) · pre-check + کاهش اتمیک `gte(stock,qty)` + `returning()` داخل tx برای products/product_variants/trays/gift_packages |
| منبع واحد منطق واریانت | ✅ کامل شد این دور | `src/lib/variants.ts` (activeVariants/firstActiveVariant/cheapestAvailableVariant) — PDP و ProductCard هر دو مصرف‌کننده · تابع محلی PDP حذف شد |
| منبع واحد توابع پولی | ✅ کامل شد این دور | `src/lib/money.ts` (cartSubtotal/couponDiscount/shippingFee) — از store.ts منتقل و re-export شد (هیچ importی نشکست) · واحد: تومان صحیح |
| تست‌ها | ✅ ۱۴/۱۴ | ۷ تست جدید (واریانت×۳ + پول×۴) · tsc ✓ · eslint ✓ · build ۲۹۵/۲۹۵ ✓ · verify-production 18 PASS/0 FAIL |
| هدرهای امنیتی | ✅ | nosniff · Referrer-Policy strict-origin-when-cross-origin · X-Frame-Options DENY · HSTS preload · Permissions-Policy · COOP · CSP |
| محافظت ادمین | ✅ | `/admin` بدون کوکی → 307 (ریدایرکت لاگین) · `/api/admin/orders` بدون کوکی → 401 |
| راز در کد | ✅ اصلاح این دور | تنها یافته: رمز آزمایشی QA (حساب تستی تصادفیِ localhost) → به `QA_TEST_PASSWORD` env منتقل شد (c89f57e) |

## ب) یافته‌های باز (نیازمند تصمیم/اقدام مالک)

| کد | شرح | شدت | اقدام لازم |
|---|---|---|---|
| **B-01** | rosebuds: قیمت سطح ۴۵۰٬۰۰۰ با هیچ واریانتی نمی‌خواند (واریانت‌ها ۱۰۷/۱۹۵/۳۷۱ هزار تومان) | متوسط | مالک تعیین کند قیمت صحیح کدام است؛ اصلاح در DB |
| **L-01** | Render بدون `DATABASE_URL` — سفارش زنده/OTP/ادمین/کوپن سروری خاموش (سایت با کاتالگ آفلاین products.ts کار می‌کند) | بالا | تنظیم env در Render + اجرای `scripts/fix-product-images.sql` |
| L-02 | رازهای `AUTH_SECRET`/`ADMIN_EMAILS`/`NEXT_PUBLIC_SITE_URL` روی Render تنظیم نشده‌اند | بالا | همراه L-01 |
| O-01 | GTM واقعی · SMS · درگاه پرداخت — همه حالت شبیه‌ساز/غیرفعال | اطلاعات | ادعا فقط پس از تست واقعی |

## پ) آزمون‌های انجام‌شده این دور (شواهد)

1. **تست یونیت (node --test):** ۱۴/۱۴ پاس — شامل: غیرفعال‌ها حذف و sortOrder حفظ می‌شود؛ اولین فعال = پیش‌فرض PDP؛ ارزان‌ترینِ «موجود» (ناموجود هرگز قیمت کارت نمی‌سازد)؛ سبد خالی = ارسال صفر؛ آستانهٔ ارسال رایگان؛ کوپن درصد/ثابت/سقف/حداقل؛ خروجی همیشه integer.
2. **رفتاری روی سرور محلی (بیلد جدید):** PDP پیرامز JSON-LD `"priceCurrency":"IRR","price":2670000` (واریانت اول ×۱۰) ✓ · FAQ سه وزن ✓ · `/checkout` خالی «سبد خرید شما خالی است» ✓ · صفحات /، /products، PDP، checkout همگی ۲۰۰ ✓.
3. **عکس‌های مالک از سرور:** ۱۵/۱۵ پیکسلی == final-v2 (RMSE < ۳۰۰۰ در ۱۲۸×۱۲۸). *نکتهٔ فنی کشف‌شده:* Next.js موجودیت فایل‌های static را از زمان build/start کش می‌کند — پس از هر regen عکس، سرور باید ری‌استارت شود (این نوبت دو بار دیباگ شد).
4. **امنیت:** هدرها ✓ · ادمین 307/401 ✓ · گrep راز در src/ و scripts/ → تنها یک مورد QA که اصلاح شد.

## ت) مسیرها (فهرست کامل — ۷۱ API + ~۹۰ صفحه)

- **عمومی:** / · /about · /blog · /campaigns · /cart · /checkout · /compare · /contact · /experience · /faq · /founder · /gifts (+corporate/personal/customize) · /guides · /health-center · /instagram · /login · /mazeh · /mazeh-trays (+tray-builder) · /mehmani · /offers · /payment (+success/failed/simulator) · /podcast · /privacy · /products/[slug] · /refund · /register · /search · /shipping · /terms · /track · /verify · /videocast · /wholesale (+dashboard/register) · /wishlist · /forgot-password · /account/* · /offline
- **API عمومی:** products/featured/cross-sell · categories · search · cart/check · coupons/validate · orders (+track) · payments (callback/digipay/verify/methods) · auth (login/register/otp/reset/session/apple/google) · identity/verify · newsletter · contact · reviews · campaigns · trays · gifts (+corporate/quote) · mazeh/quote · tray-builder/quote · wholesale · instagram · health
- **ادمین (محافظت‌شده):** /admin/* ×۱۴ صفحه + ۲۳ API (همه 401/307 بدون احراز)

## ث) توصیه‌ها
۱. اجرای L-01/L-02 (تنظیم env روی Render) — تنها بلاکر راه‌اندازی کامل زنده. ۲. تصمیم B-01 (rosebuds). ۳. پوشِ این دور به گیت‌هاب (کامیت‌های 623aa22+c89f57e محلی‌اند؛ اسکریپت push خودترمیم‌شونده است). ۴. پس از اتصال DB: اجرای fix-product-images.sql و تست E2E سفارش روی محیط staging.

## ج) جمع‌بندی
**کد: ۹/۱۰ — READY** (منبع واحد واریانت/پول کامل، تست‌شده، بدون راز هاردکد). **زنده: NOT READY** — تنها به دلیل L-01/L-02 (env روی Render) و تصمیم B-01. هیچ ادعای «رفع‌شده» بدون شواهد این دور ثبت نشده است.

---
*ممیزی مبتنی بر شواهد · هر ادعا با شمارهٔ تست/کامیت/خروجی مستند · اسکور هرگز security critical را بازنمی‌کند.*
