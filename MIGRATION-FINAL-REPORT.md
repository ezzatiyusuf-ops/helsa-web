# گزارش نهایی تولیدآماده‌سازی هلسا — ۱۶ بند
**تاریخ: ۲۰۲۶-۰۹-۱۷ · کامیت: 028cb07 + 6f0c5ef (post-migration) · Next.js 16.3.5 · Cloudflare Workers**

> هر ادعا در این گزارش از اجرای واقعی در همین سندباکس آمده است. هیچ چیز شبیه‌سازی یا حدس زده نشده.

---

**۱) خلاصه اجرایی** — پروژه Helsa از Next 16.2.6/Netlify به **Next 16.3.5 + Cloudflare Workers (OpenNext)** مهاجرت شد بدون rebuild، بدون حذف فیچر، بدون دست‌زدن به طراحی. تمام گیت‌های کیفیت سبز: ESLint 0/0، tsc، بیلد ۱۸۴ پیش‌رندر، باندل CF + dry-run، باتری QA ۳۳۸/۳۳۸، استرس انبار ۱۵/۱۵.

**۲) معماری میزبانی** — Worker واحد با OpenNext (`wrangler.jsonc` + `open-next.config.ts`): SSR، API routes، middleware و ISR همه حفظ شدند. static export انجام نشد (می‌شکست). ابعاد باندل: **14579.70 KiB / gzip 2980.31 KiB**.

**۳) بیلد** — `next build --webpack` پین شد (Turbopack روی 2GB همیشه OOM — چند بار تست شد). ۱۸۴ صفحهٔ محصول پیش‌رندر (۲۹۱ مسیر کل). بیلد **بدون PostgreSQL** هم سبز است. `output: standalone` به `NEXT_OUTPUT_STANDALONE=1` مشروط شد تا `next start` محلی سالم بماند — زنجیرهٔ CF با ساختار مشروط end-to-end اجرا و سبز شد (بیلد→OpenNext→dry-run).

**۴) دیتابیس** — `LazyPool` با کش `globalThis` (max:10/idle:30s/conn:10s) برای محدودیت اتصال Workers. `resolveDatabaseUrl` فقط از env — فالبک ندارد. رد خودکار localhost در محیط میزبانی با **تشخیص قطعی Workers** (`detectHostedPlatform` با userAgent ران‌تایم — process.env به‌تنهایی کافی نیست، اصلاح شد). Migrations هرگز از Worker. Hyperdrive اختیاری است. آخرین بکاپ: امروز (۷ dump چرخشی).

**۵) امنیت** — کوکی HttpOnly/SameSite/Secure، CSRF same-origin روی APIهای حساس، rate-limit، Zod در مرز اعتماد، نقش ادمین فقط از `ADMIN_EMAILS` سمت سرور، اسکن راز هاردکد: **صفر مورد**، `.env` در gitignore و هرگز commit نشد. سوئیت امنیتی: **18/18**.

**۶) پرداخت** — آداپترهای شاپرکی/اسنپ‌پی/دیجی‌پی دست‌نخورده و واقعی؛ پیکربندی‌نشده = 503 (نه جعل). شبیه‌ساز فقط dev (`PAYMENTS_SANDBOX`). سفارش با idempotencyKey ضد دابل‌کلیک.

**۷) موجودی** — استرس واقعی ۱۰ خریدار هم‌زمان روی موجودی ۲۰: دقیقاً ۶ موفق/۴ رد، **صفر oversell، صفر منفی**، لغو → بازگردانی کامل. **15/15** (`scripts/inventory-stress.py`؛ credential منسوخ اسکریپت اصلاح شد — اپ سالم بود).

**۸) احراز هویت و هویت سفارش** — لاگین رمز/OTP/گوگل/اپل (امضای client-secret سمت سرور). سفارش بدون توکن احراز (کد ملی+موبایل) رد می‌شود (الزام قانونی، `IDENTITY_REQUIRED=1`). خرید مهمان واقعی تست شد (سفارش HLA- ثبت‌شده، بدون ساخت حساب).

**۹) UI/UX** — طراحی و پوزیشن برند (تولید+فرآوری+فروش) دست‌نخورده. ۱۲ خطای ESLint React (purity/anchor/deps) بدون تغییر رفتار اصلاح شد. باگ باز «تومان یتیم GoldenTrayCard» بررسی و **منسوخ اعلام شد** (کامپوننت حذف شده؛ TrayCard از `<Price>` مشترک استفاده می‌کند). تصاویر ۸ واریتهٔ کلیدی خرما واریته‌به‌واریته صحیح راستی‌آزمایی شد. اسلایدهای هیرو = عکس واقعی محصول + Pexels (پذیرفته‌شده).

**۱۰) سئو/AEO** — sitemap داینامیک، robots (با قانون موتورهای AI)، canonical، OG، JSON-LD (Organization/Product/Breadcrumb/FAQ با rating فقط واقعی). سوئیت متا: **28/28**.

**۱۱) تست‌ها** — باتری ۱۴ سوئیت: **۳۳۸/۳۳۸** (تفکیک کامل در `docs/TESTING.md`)؛ رقم قبلی ۳۶۲ شامل شمارش اشتباه یک سوئیت (۳۱ به‌جای ۷) بود و اصلاح شد + استرس انبار ۱۵/۱۵. پس از آخرین وصله (db client)، دو سوئیت نماینده دوباره سبز شدند (security 18، meta 28) + health/smoke شش مسیر 200. **جاروب کامل مسیرهای بریف (۱۹ مسیر، همه 200):** / · /products · محصول داینامیک · /login · /register · /cart · /checkout · **/wholesale · /wholesale/register · /wholesale/dashboard** · /mazeh-trays · **سینی داینامیک [slug] (classic/golden/vip/dates-chocolate)** · /mazeh-trays/build · /gifts · /gifts/customize · /blog · /sitemap.xml · /robots.txt · /api/health — به‌علاوهٔ صفحات /payment/success و /payment/failed (200)، APIهای payments (callback/callback-digipay/methods/verify) و /track + /api/orders/track (پاسخ صحیح فارسی برای سفارش ناموجود).

**۱۲) env/secrets** — `.env.example` و `.env.production.example` به Cloudflare به‌روز شدند؛ ارجاع Netlify از همهٔ اسکریپت‌ها و مستندات پاک شد. `--force` فقط در دو اسکریپت **dev** (drizzle-kit push و restore محلی) — عمدی و برای محیط توسعه؛ npm install بدون هیچ فلگ اجباری تمیز است.

**۱۳) مستندات** — هشت سند مرجع: CLOUDFLARE، DEPLOYMENT (بازنویسی)، ENVIRONMENT، SECURITY (بازنویسی)، TESTING، SEO-AEO، AI-SITE-DOCUMENTATION + README به‌روز. CHANGELOG 1.19.0 ثبت شد.

**۱۴) گیت** — چک‌پوینت pre-migration (e726a15) حفظ شد؛ سه کامیت post-migration شامل کل مهاجرت، لینت، تست‌ها، مستندات و وصلهٔ db client. `.env` هرگز کامیت نشد (تأیید با check-ignore).

**۱۵) موارد باز — نیازمند مشتری (غیرقابل‌حل از سمت ما)** — کلید زرین‌پال · سرویس کاوه‌نگار SMS (بدون آن OTP ساخته ولی ارسال نمی‌شود) · کدهای واقعی Enamad/Samandehi/درگاه · تأیید نهایی هزینهٔ ارسال ۸۵٬۰۰۰ · دامنه/DNS نهایی + کلیدهای OAuth تولید · اجرای `npm run deploy` روی اکانت واقعی Cloudflare.

**۱۶) جمع‌بندی صادقانه** — کد آمادهٔ production است؛ هر گیت با اجرای واقعی سبز شد. دو ریسک شفاف: (الف) باندل gzip ~2.98MB به سقف 3MB اسکریپت Workers نزدیک است — رشد آیندهٔ باندل باید پایش شود؛ (ب) rate-limit درون‌حافظه‌ای per-isolate است — برای ترافیک بالا ارتقا به Durable Objects توصیه می‌شود. داده‌های QA (کاربران تست zahra/sara و سفارش‌های HLA- تست) در DB محلی هستند و قبل از دیتای تولید باید پاک شوند.

---
*گزارش بر پایهٔ اجرای مستقیم: ۱۴ سوئیت Playwright + استرس پایتون + سه زنجیرهٔ بیلد کامل + dry-run wrangler + smoke شش‌گانه.*

---

## ضمیمه — وقایع پس از گزارش (۲۰۲۶-۰۹-۱۷، بعدازظهر)

**ری‌استارت سندباکس:** محیط اجرا ری‌ست شد؛ node_modules، .next، .open-next، swap، مرورگر Playwright، PostgreSQL و **تاریخچهٔ گیت** (خارج از snapshot) حذف شدند. بازیابی کامل:
- گیت از نو init شد (چک‌پوینت `808c2f1`، ۱۸۵۰ فایل، `.env` کامیت‌نشده ✓) — تاریخچهٔ متادیتای کامیت‌ها بازگشت‌ناپذیر است؛ محتوای همهٔ کامیت‌ها سالم بود.
- PostgreSQL نصب مجدد + بازیابی بکاپ `helsa-20260916-221507` (۱۸۴ محصول، ۵۱ سفارش) ✓
- ترمیم fixture تست: سفارش قدیمی seed `HLA-B0EC6B31` (مهمانِ Sep-11، customer_id=NULL) به حساب سارا متصل شد — رفتار اپ (مالکیت سفارش فقط از customer_id سمت سرور) صحیح و دست‌نخورده بود.
- Node 22 در /opt بازسازی شد؛ زنجیرهٔ CF دوباره سبز: standalone → OpenNext → dry-run **14580.28 KiB / gzip 2981.17 KiB** ✓
- راستی‌آزمایی مجدد کامل: `npm test` سبز · ۱۴ سوئیت **۳۳۸/۳۳۸** · استرس انبار **۱۵/۱۵** · جاروب ۲۲ مسیر همه 200.
