# HELSA IRANIAN — راهنمای جامع توسعه‌دهنده

> **هلسا؛ طعم طبیعت، هنر پذیرایی ایرانی**
> «چون شما لایق بهترین‌ها هستید ...»

این سند مرجع اصلی توسعه‌دهندگان پروژه فروشگاه اینترنتی **هلسا ایرانیان** است.

---

## فهرست

1. [معماری پروژه](#۱-معماری-پروژه)
2. [نصب](#۲-نصب)
3. [متغیرهای محیطی](#۳-متغیرهای-محیطی)
4. [راه‌اندازی پایگاه داده](#۴-راه‌اندازی-پایگاه-داده)
5. [مهاجرت‌ها](#۵-مهاجرتها)
6. [داده اولیه](#۶-داده-اولیه-seed)
7. [API](#۷-api)
8. [احراز هویت](#۸-احراز-هویت)
9. [ورود با گوگل](#۹-ورود-با-گوگل)
10. [ورود با اپل](#۱۰-ورود-با-اپل)
11. [OTP](#۱۱-otp)
12. [بازیابی رمز عبور](#۱۲-بازیابی-رمز-عبور)
13. [سبد خرید](#۱۳-سبد-خرید)
14. [تسویه حساب](#۱۴-تسویه-حساب)
15. [یکپارچه‌سازی پرداخت](#۱۵-یکپارچهسازی-پرداخت)
16. [تأیید پرداخت](#۱۶-تأیید-پرداخت)
17. [محصولات](#۱۷-محصولات)
18. [سینی‌های مزه](#۱۸-سینیهای-مزه)
19. [کوپن‌ها](#۱۹-کوپنها)
20. [سفارش‌ها](#۲۰-سفارشها)
21. [سئو](#۲۱-سئو)
22. [جستجوی گوگل](#۲۲-جستجوی-گوگل)
23. [بهینه‌سازی برای هوش مصنوعی](#۲۳-بهینهسازی-برای-هوش-مصنوعی)
24. [Sitemap](#۲۴-sitemap)
25. [Robots](#۲۵-robots)
26. [استقرار](#۲۶-استقرار)
27. [افزودن محصول جدید](#۲۷-افزودن-محصول-جدید)
28. [افزودن سینی جدید](#۲۸-افزودن-سینی-جدید)
29. [افزودن دسته‌بندی جدید](#۲۹-افزودن-دستهبندی-جدید)
30. [افزودن درگاه پرداخت](#۳۰-افزودن-درگاه-پرداخت)
31. [رفع اشکال](#۳۱-رفع-اشکال)
32. [نقشه راه آینده](#۳۲-نقشه-راه-آینده)
33. [چک‌لیست تولید](#۳۳-چکلیست-تولید)

---

## ۱. معماری پروژه

| لایه | فناوری |
| --- | --- |
| فریم‌ورک | Next.js ۱۶ (App Router) |
| زبان | TypeScript (strict) |
| استایل | Tailwind CSS v4 با توکن‌های معنایی |
| انیمیشن | Framer Motion (۲۰۰–۵۰۰ms) |
| آیکون | lucide-react |
| وضعیت کلاینت | Zustand + persist |
| اعتبارسنجی | Zod |
| پایگاه داده | PostgreSQL |
| ORM | Drizzle ORM |
| نشست | jose (JWT HS256، کوکی HttpOnly) |
| زبان/جهت | فارسی · RTL |
| فونت | Vazirmatn |

ساختار پوشه‌ها در [`docs/DEVELOPMENT.md`](./docs/DEVELOPMENT.md) توضیح داده شده است.

---

## ۲. نصب

### راه سریع (پیشنهادی)

```bash
npm install
./scripts/dev-setup.sh    # PostgreSQL + دیتابیس + .env + اسکیما + همه seedها
npm run dev
```

`dev-setup.sh` شامل idempotent است — دوباره اجرایش بی‌خطر است و فقط بخش‌های ناقص را تکمیل می‌کند.

### راه دستی

```bash
npm install
cp .env.example .env      # مقادیر را تکمیل کنید
npx drizzle-kit push
npx tsx --env-file=.env scripts/seed.ts
npm run dev
```

اسکریپت‌های موجود: `dev` · `build` · `start` · `lint` · `typecheck`

> **تصاویر:** توسعه کاملاً offline است — همه تصاویر در `public/images/` لوکال‌اند
> و هیچ تصویر شکسته‌ای نمایش داده نمی‌شود. جزئیات: [`docs/IMAGES.md`](./docs/IMAGES.md)

---

## ۳. متغیرهای محیطی

کامل‌ترین مرجع: [`.env.example`](./.env.example)

| متغیر | الزامی؟ | کاربرد |
| --- | --- | --- |
| `DATABASE_URL` | بله | اتصال PostgreSQL |
| `NEXT_PUBLIC_SITE_URL` | توصیه‌شده | canonical، sitemap، JSON-LD |
| `AUTH_SECRET` | برای ورود | امضای کوکی نشست |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | اختیاری | ورود با گوگل |
| `APPLE_CLIENT_ID` / `APPLE_TEAM_ID` / `APPLE_KEY_ID` / `APPLE_PRIVATE_KEY` | اختیاری | ورود با اپل |
| `GATEWAY_PROVIDER` / `GATEWAY_API_KEY` | اختیاری | درگاه پرداخت آنلاین |
| `SMS_PROVIDER` / `SMS_API_KEY` | اختیاری | ارسال واقعی OTP |

**هیچ متغیری در کد hardcode نشده و هیچ رازی به کلاینت نمی‌رسد.**

---

## ۴. راه‌اندازی پایگاه داده

جزئیات کامل: [`docs/DATABASE.md`](./docs/DATABASE.md)

```bash
npx drizzle-kit push
```

اگر `DATABASE_URL` نباشد، اپلیکیشن کرش نمی‌کند: پیام روشن توسعه‌دهنده چاپ می‌شود،
ویترین از داده seed استفاده می‌کند و `/api/health` وضعیت را گزارش می‌دهد.

---

## ۵. مهاجرت‌ها

```bash
npx drizzle-kit push       # اعمال مستقیم اسکیما
npx drizzle-kit generate   # تولید فایل مهاجرت
```

---

## ۶. داده اولیه (Seed)

```bash
npx tsx --env-file=.env scripts/seed.ts
```

خروجی: ۳۴ محصول، ۸ سینی مزه (+ اقلام)، کوپن‌ها، جشنواره‌ها، اندازه‌ها، مناسبت‌ها، آلرژن‌ها.

---

## ۷. API

مرجع کامل با نمونه درخواست/پاسخ: [`docs/API.md`](./docs/API.md)

خلاصه نقاط پایانی پیاده‌سازی‌شده:

```
GET  /api/products                 GET  /api/products/[slug]
GET  /api/categories               GET  /api/search?q=
GET  /api/trays                    GET  /api/trays/[slug]
POST /api/mazeh/quote
POST /api/orders                   GET  /api/orders    GET /api/orders/[id]
POST /api/coupons/validate
GET  /api/payments/verify          POST /api/payments/verify
GET  /api/auth/google              GET  /api/auth/google/callback
GET  /api/auth/apple               POST /api/auth/apple/callback
GET  /api/auth/session             POST /api/auth/logout    POST /api/auth/reset
POST /api/reviews                  POST /api/contact
GET  /api/health
```

### نمونه: دریافت محصولات

```bash
curl "http://localhost:3000/api/products?cat=dates"
```

### نمونه: دریافت سینی‌ها

```bash
curl http://localhost:3000/api/trays
curl http://localhost:3000/api/trays/classic
```

### نمونه: ایجاد سفارش

```bash
curl -X POST http://localhost:3000/api/orders \
  -H 'Content-Type: application/json' \
  -d '{
    "customer": {"firstName":"سارا","lastName":"محمدی","mobile":"09123456789"},
    "items": [{"key":"p-1","name":"خرما پیارم هلسا","price":485000,"qty":1,"image":"..."}],
    "subtotal": 485000, "discount": 0, "shipping": 85000, "total": 570000,
    "paymentMethod": "card"
  }'
# → { "ok": true, "code": "HLA-1234567", "payState": "pending" }
```

### نمونه: اعتبارسنجی کوپن

```bash
curl -X POST http://localhost:3000/api/coupons/validate \
  -H 'Content-Type: application/json' \
  -d '{"code":"HELSA10","subtotal":3000000}'
```

### اتصال فرانت‌اند خارجی

همه نقاط پایانی JSON برمی‌گردانند و بدون حالت (به‌جز کوکی نشست) هستند.
یک اپ موبایل یا فرانت‌اند مستقل می‌تواند مستقیماً `GET /api/products`،
`GET /api/trays` و `POST /api/orders` را مصرف کند. برای مسیرهای نیازمند کاربر،
کوکی `helsa_session` را ارسال کنید (`credentials: "include"`).

---

## ۸. احراز هویت

مرجع: [`docs/AUTHENTICATION.md`](./docs/AUTHENTICATION.md)

نشست: JWT امضاشده با `AUTH_SECRET` در کوکی `helsa_session`
(`httpOnly`, `secure`, `sameSite=lax`, ۷ روز).

## ۹. ورود با گوگل

Redirect URI: `{NEXT_PUBLIC_SITE_URL}/api/auth/google/callback`
تبادل کد کاملاً سمت سرور انجام می‌شود. بدون کلید → `/login?social=unconfigured`.

## ۱۰. ورود با اپل

`client_secret` به‌صورت JWT/ES256 در سرور ساخته می‌شود و `id_token`
با JWKS رسمی اپل اعتبارسنجی می‌گردد.

## ۱۱. OTP

کادر ۶ رقمی با پرش خودکار. بدون `SMS_PROVIDER` مسیر OTP به‌صورت پیکربندی‌نشده اعلام می‌شود و فقط با `ALLOW_DEV_OTP_HINT=1` در توسعه ممکن است کد تست برگردد؛
این موضوع روی صفحه اعلام می‌شود.

## ۱۲. بازیابی رمز عبور

مسیر `/forgot-password` — چهار گام (شناسه → کد ۶ رقمی با شمارنده ۰۰:۵۹ → رمز جدید → موفقیت)
که به `POST /api/auth/reset` متصل است.

---

## ۱۳. سبد خرید

Zustand + `localStorage` (کلید `helsa-store-v2`).
توابع: `addItem`, `setQty`, `removeItem`, `clearCart`, `setCoupon`.
محاسبات: `cartSubtotal()`, `couponDiscount()`, `shippingFee()`.
سبد مهمان پایدار است و پس از ورود حفظ می‌شود.

## ۱۴. تسویه حساب

`/checkout` — شش گام: سبد → گیرنده → آدرس → ارسال → پرداخت → تأیید.
پشتیبانی از **خرید بدون ثبت‌نام**، آدرس‌های ذخیره‌شده، و بازگشت به مقصد پس از ورود.

## ۱۵. یکپارچه‌سازی پرداخت

مرجع: [`docs/PAYMENT.md`](./docs/PAYMENT.md)

```
PaymentProvider ├── OnlineGateway ├── CardToCard ├── CashOnDelivery └── Wallet
```

روش آنلاین تنها وقتی نمایش داده می‌شود که `GATEWAY_PROVIDER` و `GATEWAY_API_KEY` تنظیم باشند.

## ۱۶. تأیید پرداخت

`POST /api/payments/verify` → `verifyPaymentServerSide()`.
سفارش **فقط** با تأیید سرور به سرور «پرداخت شده» می‌شود؛
پارامتر URL یا وضعیت کلاینت هرگز ملاک نیست.

---

## ۱۷. محصولات

مدل: `src/types/index.ts` → `Product`
داده seed: `src/data/products.ts` · جدول: `products`

## ۱۸. سینی‌های مزه

مدل: `MazehTray` + `TrayContentItem`
داده seed: `src/data/trays.ts` · جدول‌ها: `mazeh_trays`, `mazeh_tray_items`
صفحات: `/mazeh`, `/mazeh-trays`, `/mazeh-trays/[slug]`, `/mazeh-trays/build`

سینی‌ها **محصول درجه‌یک** هستند: `TrayCard` دقیقاً همان سیستم بصری `ProductCard`
را دارد (تصویر، بج، نام، توضیح کوتاه، تعداد مهمان، پیش‌نمایش محتویات، قیمت،
علاقه‌مندی، «پیش‌نمایش» و «افزودن به سبد خرید»).

### سازنده سینی پیشرفته (`/mazeh-trays/build`)

کانفیگ: `src/config/tray-builder.ts` (اندازه‌ها، پایه‌ها، ۱۰ دسته اقلام، تزئین، بسته‌بندی هدیه)
API: `POST /api/tray-builder/quote` — قیمت‌گذاری سرور-محور با ثبت در `tray_quotes`
UI: `src/components/mazeh/TrayBuilderClient.tsx` — چهار گام، قیمت زنده (برآورد کلاینت + quote سرور debounced)،
پیش‌نمایش بصری، ذخیره پیکربندی در مرورگر (`helsa-tray-drafts-v1`)
سبد: کلید `custom-quote-{id}`؛ در `POST /api/orders` قیمت **فقط از DB** خوانده می‌شود.

### هدایا

جدول‌ها: `gift_packages`, `gift_quotes`, `corporate_gift_requests`
صفحات شخصی: `/gifts/personal`, `/gifts/personal/[slug]`
صفحات سازمانی: `/gifts/corporate` (گرید + ۷ دسته‌بندی), `/gifts/corporate/[slug]`, `/gifts/corporate/inquiry`
کانفیگ دسته‌بندی سازمانی: `src/config/corporate-gifts.ts`
Seed: `npx tsx --env-file=.env scripts/seed-gifts.ts` (۱۲ پکیج: ۴ شخصی + ۸ سازمانی)

## ۱۹. کوپن‌ها

جدول `coupons`؛ اعتبارسنجی سمت سرور در `POST /api/coupons/validate`
(نوع درصدی/مبلغی، حداقل خرید، سقف تخفیف، بازه تاریخ، فعال بودن).

## ۲۰. سفارش‌ها

چرخه: `pending → paid → preparing → shipped → transit → delivered`
(و `cancelled` / `refunded`).
پیگیری عمومی: `/track` · جزئیات: `/account/orders/[id]` · فاکتور قابل چاپ فارسی.

---

## ۲۱. سئو

مرجع: [`docs/SEO.md`](./docs/SEO.md)
Metadata API، canonical، OpenGraph، و Schemaهای Organization / WebSite+SearchAction /
Product / BreadcrumbList / FAQPage.

## ۲۲. جستجوی گوگل

`/robots.txt` و `/sitemap.xml` به‌صورت پویا تولید می‌شوند؛
صفحات خصوصی (سبد، پرداخت، حساب، ورود) ایندکس نمی‌شوند.

## ۲۳. بهینه‌سازی برای هوش مصنوعی

HTML معنایی، سلسله‌مراتب صحیح عناوین، نام‌گذاری یکدست موجودیت‌ها،
توضیحات کامل محصول (وزن، مواد اولیه، مبدأ، بسته‌بندی، نگهداری، آلرژن)،
لینک‌دهی داخلی هدفمند و داده ساختاریافته معتبر.

## ۲۴. Sitemap

`src/app/sitemap.ts` — صفحات عمومی + همه محصولات + همه سینی‌ها + مقالات.

## ۲۵. Robots

`src/app/robots.ts` — `disallow` برای `/api/`, `/cart`, `/checkout`, `/payment*`,
`/login`, `/register`, `/forgot-password`, `/verify`, `/account*`, `/wishlist`, `/compare`, `/track`.

## ۲۶. استقرار

مرجع: [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md)

---

## ۲۷. افزودن محصول جدید

**روش پیشنهادی (پایگاه داده):**

```sql
INSERT INTO products (name, slug, category, sku, price, old_price, discount, weight,
                      image, gallery, description, rating, reviews, stock, badge, tags,
                      features, nutrition, storage, allergens)
VALUES ('خرما ربی هلسا', 'rabbi-dates', 'dates', 'HLA-0035', 350000, NULL, 0, '۱ کیلوگرم',
        'https://...', '["https://..."]'::jsonb, 'توضیح فارسی کامل محصول', 4.7, 0, 20,
        'جدید', '["خرما ربی"]'::jsonb,
        '[{"label":"وزن","value":"۱ کیلوگرم"}]'::jsonb,
        '[{"label":"انرژی","value":"۲۸۰ کیلوکالری"}]'::jsonb,
        'مکان خنک و خشک', '[]'::jsonb);
```

صفحه محصول و sitemap به‌صورت خودکار در دسترس قرار می‌گیرند (`/products/rabbi-dates`).

**روش seed (توسعه):** یک ورودی `p({...})` در `src/data/products.ts` اضافه و seed را دوباره اجرا کنید.

## ۲۸. افزودن سینی جدید

```sql
INSERT INTO mazeh_trays (name, slug, short_description, description, image, base_price,
                         size, serves_min, serves_max, featured, active,
                         allergens, pairings, occasions, contents, storage, freshness)
VALUES ('سینی مزه هلسا عصرانه', 'asrane', 'ترکیب سبک برای عصرانه', 'توضیح کامل...',
        'https://...', 1250000, 'کوچک', 2, 4, false, true,
        '["مغزها","لبنیات"]'::jsonb, '["چای سیاه"]'::jsonb, '["دورهمی"]'::jsonb,
        '[{"title":"پنیر","section":"SAVORY","qty":"۲۰۰ گرم"}]'::jsonb,
        'یخچال', 'مصرف تا ۲۴ ساعت');
```

سینی بلافاصله در `/mazeh-trays`، دسته‌بندی مناسب و `/mazeh-trays/asrane` ظاهر می‌شود.

## ۲۹. افزودن دسته‌بندی جدید

```sql
INSERT INTO categories (name, slug, description, image, icon, subs, sort_order)
VALUES ('حبوبات', 'legumes', 'توضیح دسته', 'https://...', 'leaf', '["عدس","لوبیا"]'::jsonb, 6);
```

سپس در صورت نیاز، کاشی تصویری آن را به `MEGA_TILES` در
`src/components/layout/Header.tsx` اضافه کنید.

## ۳۰. افزودن درگاه پرداخت

۱. مقدار جدید `GATEWAY_PROVIDER` را در `src/config/payments.ts` بپذیرید.
۲. در `src/lib/payment.ts`:
   - `buildGatewayRedirect()` → ساخت تراکنش و بازگرداندن URL درگاه.
   - `verifyPaymentServerSide()` → فراخوانی endpoint تأیید و **مقایسه مبلغ**؛
     تنها در صورت تطابق `state: "success"`.
۳. UI نیازی به تغییر ندارد.

## PWA و سرویس‌ورکر

مرجع کامل: [`docs/PWA.md`](./docs/PWA.md)

- Manifest: `src/app/manifest.ts` → `/manifest.webmanifest` (فارسی، RTL، standalone)
- آیکون‌ها: `public/icons/` — ۱۹۲، ۵۱۲، maskable، apple-touch، favicon
- سرویس‌ورکر: `public/sw.js` — کش دارایی‌های ثابت، آفلاین برای ناوبری،
  و **عدم کش** مسیرهای `/api/*`, `/account*`, `/checkout`, `/payment*`, `/login`, `/register`, `/track`
- مدیریت: `src/components/pwa/PwaManager.tsx` (ثبت + پرامپت نصب/به‌روزرسانی)
- صفحه آفلاین: `src/app/offline/page.tsx`

⚠️ **نصب در تولید نیازمند HTTPS است.**

## دکمه شناور پشتیبانی

`src/components/layout/SupportButton.tsx` — آیکون هدست برند هلسا،
tooltip «پشتیبانی هلسا»، و کشوی گزینه‌ها: تماس با هلسا · واتس‌اپ ·
پیام‌رسان‌ها · سوالات متداول · تماس با ما. موقعیت با `env(safe-area-inset-bottom)`
تنظیم شده تا با ناوبری موبایل، بنر کوکی و نوار خرید چسبان تداخل نکند.

## ۳۱. رفع اشکال

مرجع: [`docs/TROUBLESHOOTING.md`](./docs/TROUBLESHOOTING.md)

## ۳۲. نقشه راه آینده

- پنل مدیریت (محصولات، سفارش‌ها، کوپن‌ها، بنرها، جشنواره‌ها) — معماری آماده است.
- همگام‌سازی سبد خرید کاربر واردشده با پایگاه داده.
- کیف پول و پرداخت اقساطی.
- پیش‌نمایش سه‌بعدی سینی مزه.
- چندزبانه (fa/en) با مسیرهای محلی‌سازی‌شده.
- اعلان‌های پیامکی/ایمیلی چرخه سفارش.

## ۳۳. چک‌لیست تولید

- [ ] `DATABASE_URL` پیکربندی شده
- [ ] `AUTH_SECRET` پیکربندی شده
- [ ] Google OAuth پیکربندی شده
- [ ] Apple OAuth پیکربندی شده
- [ ] درگاه پرداخت پیکربندی شده
- [ ] دامنه تولید تنظیم شده (`NEXT_PUBLIC_SITE_URL`)
- [ ] HTTPS فعال است
- [ ] Sitemap بررسی شده
- [ ] Robots بررسی شده
- [ ] داده ساختاریافته تست شده
- [ ] داده محصولات بررسی شده
- [ ] قیمت‌ها بررسی شده
- [ ] روش‌های ارسال پیکربندی شده
- [ ] ایمیل/پیامک (در صورت استفاده) پیکربندی شده
- [ ] پایش خطا پیکربندی شده
- [ ] `npm run build` موفق

---

**تولید بازرگانی هلسا ایرانیان**
تهران، نیاوران، خیابان شهید باهنر، قبل از چهارراه مژده
تلفن: ۰۲۱-۵۶۱۳۰۸۵۸ · همراه: ۰۹۳۷-۹۱۰۵۱۳۳ · helsairanian.ir
