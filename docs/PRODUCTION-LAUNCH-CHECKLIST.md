# چک‌لیست انتشار هلسا روی helsairanian.ir

سند مرجع زیرساخت تولید — ۱۱ حوزه. هر مورد یا **آماده (اثبات‌شده)** است یا **قابل‌اجرا با کلید/تنظیم بیرونی**. گیت خودکار: `bash scripts/verify-production.sh`

---

## ۱. پرداخت آنلاین
- **کد کامل:** درایورهای zarinpal (REST v4 + verify سرور-به-سرور)، snappay، digipay + اتمی‌سازی پرداخت (payments→paid فقط از pending؛ جلوگیری از replay) + فاکتور یکتا + لاگ بدون دادهٔ حساس.
- **برای فعال‌سازی:** `GATEWAY_PROVIDER=zarinpal` + `GATEWAY_API_KEY=<مرچنت>` + `PAYMENTS_SANDBOX=0` + `GATEWAY_SANDBOX=0` → تست یک تراکنش واقعی کوچک و یک تراکنش لغوشده.
- بدون کلید: شبیه‌ساز صادقانه (`sandbox:true`) + COD/کارت‌به‌کارت واقعی.

## ۲. ثبت‌نام / ورود
- **آماده (اثبات‌شده):** ثبت‌نام واقعی (scrypt+salt+timingSafeEqual) · سشن امضاشده jose در کوکی httpOnly/SameSite/Secure · پیام خطای ضد-شمارش · dummy-verify · محافظت مسیرها (401/403 سرور).
- بعد از استقرار: اولین ثبت‌نام با ایمیل داخل `ADMIN_EMAILS` = دسترسی پنل مدیریت.

## ۳. دیتابیس
- PostgreSQL + Drizzle · ۳۹ جدول، ۲۳ FK، ایندکس‌ها (idempotency یکتا و…) · بازیابی: `npm run db:restore` · **مهاجرت نسخه‌دار:** `npm run db:migrate` (پوشهٔ `drizzle/` — دیپلوی تازه از این مسیر برود؛ دیتابیس موجود از قبل هم‌سطح است).
- رشتهٔ اتصال تولید را از `.env.production.example` بردارید.

## ۴. SSL / HTTPS
- ترمینیشن SSL روی میزبان (Netlify خودکار؛ سرور شخصی: Let's Encrypt/certbot یا CDN).
- **کد آماده:** HSTS (preload, 1 سال) در بیلد production · کوکی Secure خودکار · **ریدایرکت http→https (308)** در `src/middleware.ts` — فقط وقتی هاست = دامنهٔ پیکربندی‌شده؛ localhost/preview اثر نمی‌پذیرد.
- بعد از استقرار: `curl -I http://helsairanian.ir` باید 308 بدهد و هدر HSTS دیده شود.

## ۵. احراز هویت (Checkout)
- سشن حساب واقعی + توکن هویت امضاشدهٔ کوتاه‌مدت برای ثبت سفارش (Part A/B) · گزینهٔ هویت شبیه‌سازی مستند (`IDENTITY_PROVIDER`).
- بدون SMS، مسیر مهمان قفل است (صادقانه) — با کلید کاوه‌نگار باز می‌شود (بند ۹ِ همین سند نیست؛ بند SMS را ببینید).

## ۶. سبد خرید و Checkout
- **آماده (۱۰۸/۱۰۸ تست سبز):** سلامت سبد از سرور (قیمت/موجودی/maxQty) · کراس‌سل قطعی · کوپن DB · ارسال از DB · جمع نهایی سرور-بازمحاسبه (اثبات با سفارش واقعی) · idempotency key ضد دوبله · یادداشت سفارش و هدیه end-to-end.

## ۷. پنل مدیریت
- `/admin` + ۶۶ API با گیت سرور (`requireAdminApi`) · مدیریت محصول/سفارش/مشتری/کمپین/کوپن/انبار/حسابداری/عمده.
- **پیش از انتشار:** `ADMIN_EMAILS` را در `.env` بگذارید و رمز قوی برای آن حساب (2FA در نقشهٔ راه بعدی).

## ۸. سرعت
- اندازه‌گیری‌شده (بیلد تولید، همین پروژه): لود کامل ۳۲۹ms · TTFB ۲۶ms · JS فشرده ۲۷۶KB (۱۵ فایل) · کش immutable تصاویر/فونت (۱ سال) · lazy-load گالری‌ها.
- روی میزبان: CDN تصاویر + HTTP/2 یا HTTP/3 فعال باشد؛ تصاویر از قبل webp/avif با ۴ عرض تولید شده‌اند.

## ۹. SEO / AEO
- canonical/OG/sitemap/robots → از `NEXT_PUBLIC_SITE_URL` (الان: helsairanian.ir) · schema جامع: Organization/WebSite/LocalBusiness/Product/BreadcrumbList/FAQPage · noindex صفحات تراکنشی · ۴۰۴ واقعی روی اسلاج ناموجود · sitemap داینامیک (محصولات/بلاگ/راهنما/کمپین/هدیه/سینی).
- بعد از اتصال دامنه: در Search Console ثبت و sitemap را submit کنید.

## ۱۰. امنیت
- CSP کامل · X-Frame-Options DENY · nosniff · Referrer-Policy · Permissions-Policy · COOP · HSTS · بدون X-Powered-By
- CSRF same-origin روی همهٔ POSTها · rate-limit per-IP · open-redirect گارد (`safeNextPath`) · OTP فقط هش SHA-256 تک‌بارمصرف · zod + پاک‌سازی ورودی · لاگ بدون دادهٔ حساس
- **نشان‌های اعتماد (Enamad/Samandehi/درگاه)**: در فوتر و صفحهٔ سبد/چک‌اوت فقط با کد رسمی از env رندر می‌شوند — `ENAMAD_ID` · `SAMANDEHI_ID` + `SAMANDEHI_P` · `GATEWAY_NAME` + `GATEWAY_LOGO_URL`. بدون کد، هیچ نشان جعلی نمایش داده نمی‌شود. ثبت‌نام: enamad.ir و samandehi.ir؛ لوگوی رسمی درگاه را پس از قرارداد بگیرید.
- **Netlify**: تگ `<meta name="netlify-deploy">` از Snippet injection نتفلای می‌آید (در سورس نیست) — از Site settings → Snippet injection حذفش کنید. `netlify.toml` پروژه پیکربندی بیلد را قفل کرده؛ `NEXT_PUBLIC_SITE_URL` هر استقرار = آدرس همان استقرار (staging دمو ≠ تولید).
- **GTM (اختیاری)**: `NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX` را در env تولید بگذارید — تزریق و CSP خودکار. رویدادها (page_view/add_to_cart/begin_checkout/purchase) از قبل به dataLayer می‌روند؛ در GTM فقط تگ‌ها/تریگرها را بسازید. بدون ID، هیچ درخواست خارجی ارسال نمی‌شود.
- **ISR**: صفحات محصول و خانه با `revalidate=60` کش می‌شوند؛ محصول جدید بلافاصله (اولین بازدید) و محصول حذف‌شده حداکثر ۶۰ ثانیه بعد 404 می‌شود. لیست `/products` با فیلترها داینامیک می‌ماند (سرچ).
- **ریکاوری سندباکس**: بعد از env-reset فقط `bash scripts/env-recovery.sh` را اجرا کنید (PG+DB از آخرین بکاپ، npm، chromium، بازتولید تصاویر، بیلد). ⚠️ سقف snapshot سندباکس ~۱۲۸MB است — دیتابیس را داخل workspace نگه ندارید.
- **پرچم OTP_TEST_HINT=1 فقط برای محیط تست/استیجینگ است** — کد OTP را با برچسب «محیط تست» در UI نشان می‌دهد؛ با تنظیم SMS واقعی (SMS_PROVIDER) خودکار خاموش می‌شود و گیت `verify-production` در تولید به‌خاطر آن NO-GO می‌دهد. قبل از انتشار حذف شود.
- تک‌نود: کافی. multi-node → Redis برای rate-limit (مستند در `src/lib/security.ts`).

## ۱۱. بکاپ
- `npm run db:backup` → pg_dump فشرده + چک‌سام + `pg_restore --list` تأیید + نگهداری ۷ نسخه.
- **cron پیشنهادی تولید (روی سرور):** `0 3 * * * cd /path/to/helsa && npm run db:backup >> backups/cron.log 2>&1`
- بکاپ را روزانه به فضای بیرونی (S3/درایو) کپی کنید — اسکریپت فقط نسخهٔ محلی می‌سازد.

---

## ترتیب اجرای انتشار (۵ دقیقه)
1. سرور/میزبان آماده + دامنه متصل + SSL فعال
2. کد را بگذارید → `npm ci` → `.env` را از `.env.production.example` بسازید (حداقل: DATABASE_URL, AUTH_SECRET, NEXT_PUBLIC_SITE_URL, ADMIN_EMAILS + کلیدها اگر هست)
3. `npm run db:migrate` (دیپلوی تازه) یا بازیابی بکاپ
4. `npm run build && npm start`
5. `bash scripts/verify-production.sh` → باید 🟢 GO بدهد
6. تست دودی: ثبت‌نام → سفارش COD → پیگیری → پنل ادمین
