# مستندات سایت برای AI (AI-SITE-DOCUMENTATION)

> نقشهٔ کامل پروژه برای هر عامل/توسعه‌دهندهٔ AI که ادامه می‌دهد: چه چیزی کجاست، چه تصمیمهایی چرا گرفته شده، و چه چیزهایی **قفل** است.

## هویت محصول

**هلسا ایرانیان** (تولید بازرگانی) — فروشگاه آنلاین خرما، آجیل، خشکبار، شکلات دست‌ساز خرمایی، عسل، زعفران و **سینی‌های مزه**. تمام‌فارسی، RTL، سبک «Luxury Minimal Iranian». پوزیشن برند: **تولید + فرآوری + فروش** (مزرعه‌محض نیست).

## پشتهٔ فنی (قفل — rebuild/تعویض معماری ممنوع)

- Next.js **16.3.5** App Router · TypeScript strict · Tailwind v4 · Framer Motion · Zustand(persist) · Zod
- PostgreSQL + **Drizzle** · نشست jose (JWT کوکی HttpOnly)
- بیلد: **`next build --webpack`** (Turbopack روی باکس‌های کم‌حافظه OOM — پین را برندار)
- استقرار: **Cloudflare Workers + OpenNext** (`docs/CLOUDFLARE.md`)؛ static export ممنوع (SSR می‌شکند)

## نقشهٔ دایرکتوری

```
src/app/            App Router — صفحات + API routes
  (store)           ویترین/محصول/سبد/تسویه — UI قفل: فقط باگ/امنیت/نقص
  admin/            پنل ادمین (کاتالوگ، سفارش‌ها، انبار، کمپین، پست‌ها)
  api/              auth (login/otp/google/apple) · orders · identity · payment · admin/* · products · health
  campaigns/ mazeh/ gifts/ blog/
src/components/     home/ product/ cart/ checkout/ auth/ mazeh/ gifts/ layout/ ui/ seo/
src/lib/            auth.ts · seo.ts · gtm.ts · identity.ts · db→src/db
src/db/             index.ts (LazyPool) · schema.ts
scripts/            inventory-stress.py · backup-db.sh · verify-production.sh · regen-image-variants.mjs
qa-*.cjs            ۱۴ سوئیت Playwright (docs/TESTING.md)
docs/               مستندات مرجع (این پوشه)
```

## منطق‌های حساس (قبل از دست‌زدن بخوانید)

1. **موجودی**: تراکنش SQL با گارد `stock >= qty`؛ لغو سفارش → بازگردانی. تست: `scripts/inventory-stress.py` (15/15).
2. **قیمت**: سمت سرور از DB کمپاین/تخفیف محاسبه می‌شود؛ payload کلاینت بازقیمت‌گذاری می‌شود.
3. **هویت سفارش**: `IDENTITY_REQUIRED=1` → سفارش بدون توکن احراز (کد ملی+موبایل) رد (401). این الزام قانونی است؛ حذف نکنید.
4. **پرداخت**: آداپتر شاپرکی/اسنپ‌پی/دیجی‌پی؛ پیکربندی‌نشده → 503. شبیه‌ساز فقط dev (`PAYMENTS_SANDBOX`).
5. **دیتابیس**: `resolveDatabaseUrl` فقط env؛ LazyPool با کش globalThis؛ migrations هرگز از Worker.
6. **UI**: طراحی/فیچرها قفل — پوزیشن‌ها، سینی مزه، هدیه‌ساز، B2B/عمده حفظ شوند. فیلدهای قانونی ثبت‌نام (نام/موبایل) حذف نمی‌شوند.
7. **بج اعتماد**: Enamad/Samandehi/درگاه فقط با کد واقعی — بج فیک/خالی ممنوع.
8. **عکس هیرو**: عکس واقعی محصول از کاتالوگ (اسلاید ۱و۲) + مفهومی Pexels (اسلاید ۳) — نهایی و پذیرفته‌شده؛ عکس AI برای هیرو/برند ممنوع.

## دستورات پرکاربرد

```bash
NODE_OPTIONS=--max-old-space-size=1100 npm run build   # بیلد محلی
npm run start                                          # سرور (بدون standalone)
NODE_OPTIONS=--max-old-space-size=3000 npx eslint .    # lint (heap لازم)
npm run test:unit && node qa-j37-cart.cjs              # تست‌ها
npm run cf:build:local                                 # زنجیرهٔ Cloudflare
HELSA_BASE=http://localhost:3001 python3 scripts/inventory-stress.py  # استرس (IDENTITY_REQUIRED=0)
```

## گیت‌های کیفیت (همه باید سبز بمانند)

ESLint 0/0 · tsc ✓ · بیلد ۱۸۴ پیش‌رندر · OpenNext + wrangler dry-run ✓ · QA ۳۳۸/۳۳۸ · استرس انبار 15/15.

## تاریخچهٔ تصمیم‌های مهندسی

- **چرا webpack؟** Turbopack روی 2GB OOM (تست‌شده چند بار).
- **چرا standalone مشروط؟** `next start` با standalone ناسازگار است → env `NEXT_OUTPUT_STANDALONE`.
- **چرا LazyPool؟** محدودیت اتصال Workers؛ کش globalThis مانع اتصال stale در isolateهای دوباره‌استفاده‌شده می‌شود.
- **چرا secret اپل فایل جدا؟** Next 16.3.5 صادرات اضافی از route.ts را نمی‌پذیرد.
- **چرا بیلد بدون DB هم باید سبز باشد؟** CI محلی بدون PostgreSQL بالا می‌آید؛ صفحات استاتیک با دیتای seed.

## داده‌های تست محلی

DB `127.0.0.1:5432/helsa_db` (۱۸۴ محصول) · ادمین `owner@helsa.dev/Owner#2026` · کاربر QA سارا `09125556677/SaraQa#2026` · کوپن `HELSA10` · آستانه ارسال رایگان ۲٬۰۰۰٬۰۰۰ / هزینه ۸۵٬۰۰۰ (تأیید نهایی مشتری باز است).

## انتظار از عامل بعدی

ادعا فقط با اجرای واقعی؛ خطا پنهان نشود؛ SECRET چاپ نشود؛ fake fix و «NS papers» ممنوع؛ هر وصله بلافاصله verify شود. گزاره‌های این مستندات همگی از اجرای واقعی ۱۴ سوئیت + استرس + زنجیرهٔ بیلد آمده‌اند.
