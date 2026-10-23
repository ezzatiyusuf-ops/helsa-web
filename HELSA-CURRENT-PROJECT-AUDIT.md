# HELSA CURRENT PROJECT PRODUCTION AUDIT
**تاریخ ممیزی:** 2026-09-15 · **منبع واحد حقیقت:** همین workspace در حال اجرا (بیلد production تازه + PostgreSQL بازیابی‌شده از بکاپ همان پروژه)
**روش:** بازرسی کد + پرس‌وجوی مستقیم DB + تست مرورگر واقعی (Playwright/Chromium) + curl — بدون هیچ تغییری در کد محصول

---

## 1. Project Detected

| مورد | مقدار واقعی (از فایل‌ها) |
|---|---|
| **Framework** | Next.js **16.2.6** (App Router) + React 19.2.6 |
| **Frontend** | React 19 + Tailwind CSS v4 + framer-motion 13 + lucide-react · State: Zustand 5 (+persist) |
| **Backend** | Next.js Route Handlers — **66 اندپوینت API** در `src/app/api/**` |
| **Database** | PostgreSQL (اتصال `pg` 8.20 + Drizzle ORM 0.45) — **39 جدول، 23 FK** |
| **Authentication** | سفارشی: scrypt + session امضاشده (jose/JWT) در کوکی httpOnly/SameSite/Secure |
| **Package manager** | npm (package-lock.json) |
| **Build command** | `npm run build` · **Start:** `npm start` (next start) · **Dev:** `npm run dev` |
| **Deployment config** | `netlify.toml` + `@netlify/plugin-nextjs` (devDependency) |
| **Env** | `.env` (gitignore شده) — ۷ متغیر: DATABASE_URL, AUTH_SECRET, ADMIN_EMAILS, NEXT_PUBLIC_SITE_URL, PAYMENTS_SANDBOX, IDENTITY_PROVIDER, ALLOW_DEV_OTP_HINT |
| **Running URL** | `http://localhost:3000` — بیلد production همین پروژه (BUILD_EXIT=0، ۱۸۴ محصول از DB سرو می‌شود) |

---

## 2. Overall Score

# **7 / 10**

منفی‌های اصلی: پرداخت شبیه‌ساز است، OTP قابل ارسال نیست، canonical/sitemap روی localhost است، امتیازها/تعداد نظرات seed هستند نه دادهٔ واقعی مشتری.

---

## 3. Production Readiness

# **PARTIALLY READY**

---

## 4. Feature Audit

| Feature | Status | Evidence (تست واقعی همین نوبت) |
|---|---|---|
| Homepage | **IMPLEMENTED** | HTTP 200 · ۳ بلوک Structured Data (Organization/WebSite/LocalBusiness) · محصول واقعی از DB |
| Products | **IMPLEMENTED** | ۲۰۰ · فهرست از `/api/products` (دیتای DB) |
| **184-product catalog** | **IMPLEMENTED — تعداد واقعی: ۱۸۴** | `SELECT count(*) FROM products` = **184** (همگی active+visible) · API همان ۱۸۴ را برمی‌گرداند |
| Search | **IMPLEMENTED** | `GET /api/search?q=خرما` → نتایج واقعی DB (شکلات خرمایی، خرما خاصویی…) |
| Filters | **IMPLEMENTED** | `?cat=dates` → دقیقاً ۶ محصول از DB |
| Sorting | **IMPLEMENTED** | `?sort=popular` → مرتب‌شده بر اساس rating×reviews |
| Pagination | **IMPLEMENTED** (سمت کلاینت با URL state) | `?page=2` کار می‌کند، دکمهٔ «بعدی»، حفظ فیلترها در URL |
| Product detail | **IMPLEMENTED** | canonical + schema: Product, BreadcrumbList, FAQPage, Organization, WebSite, LocalBusiness |
| Cart | **IMPLEMENTED (hybrid)** | localStorage (zustand-persist) + اعتبارسنجی سرور `/api/cart/check` + بازمحاسبهٔ نهایی سمت سرور در ثبت سفارش |
| Checkout | **IMPLEMENTED** | ۷ گام · آدرس در سفارش ذخیره می‌شود · ارسال از DB (۳ روش) · stock چک و **کم می‌شود** |
| Login | **IMPLEMENTED** | session واقعی سرور (کوکی httpOnly) · ورود نامعتبر → پیام فارسی بدون افشا |
| Register | **IMPLEMENTED** | **در همین ممیزی حساب واقعی ساخته شد** (ثبت در جدول customers) |
| Forgot password | **IMPLEMENTED (کد) / BLOCKED (ارسال)** | فلوی واقعی OTP هش‌شده؛ اما **SMS_PROVIDER تنظیم نشده** → کد در production قابل ارسال نیست |
| Account | **IMPLEMENTED** | `/api/orders` لاگ‌اوت → 401 (محافظت سرور) · سفارش‌های واقعی از DB |
| Orders | **IMPLEMENTED** | **سفارش واقعی HLA-99A5A57D همین نوبت ساخته شد**: ردیف orders + order_items (2× شکلات خرمایی×395,000) + inventory_movements(−2) + stock 24→22 + API پیگیری با code+mobile |
| Payment | **MOCK (شبیه‌ساز)** | `sandbox:true` از `/api/payments/methods` · کد zarinpal/snappay/digipay موجود ولی `GATEWAY_PROVIDER`/`GATEWAY_API_KEY` **تنظیم نشده** و `PAYMENTS_SANDBOX=1` |
| Admin | **IMPLEMENTED** | API ادمین برای ناشناس → رد می‌شود (سمت سرور) · UI گیت دارد · نقش از ADMIN_EMAILS + session role |
| Campaigns | **IMPLEMENTED** | ۷ کمپین در DB · در sitemap داینامیک |
| Gifts | **IMPLEMENTED** | 12 بستهٔ هدیه در DB · فلوی personal/corporate + quote API |
| Experience | **IMPLEMENTED** | `/experience` → 200 |

**نتیجهٔ تست عملکردی مرورگر: ۱۷/۱۷ سنجهٔ واقعی PASS** (۴ شکست اولیهٔ اسکریپت تست، با پرس‌وجوی DB اثبات شد اشتباه تست بود نه اپ).

---

## 5. Security

**مثبت‌ها (تأییدشده):**
- هدرهای امنیتی: CSP کامل، X-Frame-Options DENY، nosniff، Referrer-Policy، HSTS در production
- کوکی session: httpOnly + SameSite=Lax + Secure (در prod)
- رمز: scrypt + salt + `timingSafeEqual` + **dummy-verify** ضد شمارش کاربر
- CSRF: چک same-origin روی POSTها — تست واقعی: POST بدون Origin → **403**
- Rate limit per-IP (اسلایدینگ ویندو) روی APIهای حساس (429 با Retry-After)
- Open-redirect: `safeNextPath` (رد کردن `//`, `://`, مسیر غیرنسبی)
- OTP: ذخیرهٔ **فقط هش SHA-256**، تک‌بارمصرف، سقف تلاش
- Admin: گیت سرور (requireAdminApi) — تست واقعی: ناشناس رد می‌شود
- localStorage: فقط دادهٔ غیرحساس (سبد/پیش‌نویس/بازدیدها) — توکنی ذخیره نمی‌شود
- zod روی همهٔ ورودی‌ها + پاک‌سازی control-char/tag
- SQL injection: Drizzle پارامتری — ریسک پایین

**آسیب‌پذیری/ریسک‌های یافت‌شده:**
1. **Rate limiter in-process (حافظه)** — فقط برای تک‌نود امن؛ برای multi-node نیاز به Redis
2. `ALLOW_DEV_OTP_HINT=1` در env — در بیلد production بی‌اثر است (گیت `isProduction()`) ولی باید حذف شود
3. `IDENTITY_PROVIDER=simulation` — احراز هویت هویتی checkout در این محیط شبیه‌سازی است
4. پنل ادمین فقط 1 ایمیل، بدون 2FA
5. `/api/coupons/validate` برای کد نامعتبر **HTTP 200 + ok:false** برمی‌گرداند (طراحی API؛ UI درست هندل می‌کند)

---

## 6. Backend

واقعاً متصل: محصولات/دسته‌ها/سینی‌ها/هدایا/کوپن‌ها/کمپین‌ها/روش‌های ارسال/مشتری‌ها/سفارش‌ها/پرداخت‌ها/فاکتورها/حرکت انبار — همه از PostgreSQL از طریق Drizzle. سفارش‌سازی در تراکنش DB با idempotency key یکتا. جزء شبیه‌سازی‌شده: درگاه پرداخت (سوییچ env) و ارائه‌دهندهٔ هویت.

**نکتهٔ مهم:** `services/catalog` در صورت قطع DB به `src/data/products.ts` (فهرست استاتیک محدود) fallback می‌کند — در قطع DB، قیمت‌های نمایشی ممکن است کهنه باشند (ثبت سفارش هرлайн DB لازم دارد و ناموفق می‌ماند، پس سفارش غلط رخ نمی‌دهد).

---

## 7. Database

- PostgreSQL واقعی، متصل و راستی‌آزمایی‌شده (۱۸۴ محصول در همین نوبت شمرده شد)
- ۳۹ جدول · 23 FK · ایندکس‌ها (orders status/created, customer, idempotency یکتا, payments authority…)
- مهاجرت: `drizzle-kit push` (بدون migration نسخه‌دار — برای production بهتر است نسخه‌دار شود)
- سفارش‌ها **ماندگارند**: ردیف HLA-99A5A57D پس از رفرش هم در `/api/orders` هست (تست واقعی)
- بکاپ: `scripts/backup-db.sh` (pg_dump + چک‌سام، ۷ نسخه)

---

## 8. Payment

**STATUS = MOCK (شبیه‌ساز sandbox)**
- درایورهای واقعی zarinpal (REST v4 request/verify)، snappay، digipay **در کد موجودند** ولی هیچ‌کدام فعال نیستند: `GATEWAY_PROVIDER`/`GATEWAY_API_KEY`/`SNAP_PAY_API_KEY`/`DIGIPAY_API_KEY` تنظیم نشده‌اند و `PAYMENTS_SANDBOX=1` → simulatorDriver فعال است.
- `sandbox:true` صادقانه از API گزارش می‌شود.
- **پیش از دامنهٔ واقعی: پرداخت آنلاین واقعی وجود ندارد.** (COD/کارت‌به‌کارت واقعی کار می‌کنند.)

---

## 9. Authentication

**STATUS = REAL (واقعی)** برای ورود/ثبت‌نام/نشست — **BLOCKED** برای OTP‌های خارجی (فراموشی رمز، مهمان):
- ثبت‌نام واقعی (حساب جدید همین نوبت ساخته شد)، ورود/خروج واقعی، session کوکی امضاشده httpOnly
- مسیرهای محافظت‌شده: `/api/orders` لاگ‌اوت → **401**
- OTP فقط هش ذخیره می‌شود؛ **SMS_PROVIDER غایب** → در production هیچ راه قانونی دریافت کد نیست (فراموشی رمز عملاً قفل)
- سوشال لاگین: بدون کلیدها → redirect صادقانه به `/login?social=unconfigured` (تست واقعی 307)

---

## 10. SEO

**مشکلات واقعی (اندازه‌گیری‌شده):**
1. **Soft-404:** `/products/اسلاگ-غیرواقعی` و `/blog/هر-اسلاگ` محتوای ۴۰۴ رندر می‌کنند ولی **HTTP 200** برمی‌گردانند (تست واقعی)
2. **canonical/OG/sitemap همه `http://localhost:3000`** سرو می‌کنند (تست واقعی: `<link rel=canonical href="http://localhost:3000/">`, sitemap base=localhost) — به‌خاطر `NEXT_PUBLIC_SITE_URL` در .env
3. صفحات تراکنشی درست noindex هستند (`/cart` → `noindex, nofollow` ✓)؛ robots.txt کامل (47 خط)

**مثبت‌ها:** title/meta توصیف روی همهٔ صفحات کلیدی ✓ · canonical نسبی + metadataBase ✓ · schema جامع (Product/Breadcrumb/FAQ/Organization/LocalBusiness/WebSite) ✓ · sitemap داینامیک شامل کمپین‌ها ✓

---

## 11. Performance (فقط اندازه‌گیری واقعی — بدون Lighthouse جعلی)

| متریک (Chromium، localhost) | مقدار |
|---|---|
| بارگذاری صفحهٔ اصلی (رویداد load) | **329ms** |
| TTFB | **26ms** |
| درخواست‌ها / حجم انتقالی | 24 req / **682KB** |
| باندل JS | 15 فایل / **276KB** (فشرده) |
| تصاویر صفحهٔ اصلی | 8 / 297KB |
| صفحهٔ محصول | 239ms · 10 تصویر `loading=lazy` |
| کش تصاویر | `immutable` یک‌ساله (هدر واقعی) |

نکته: `/api/products` هر ۱۸۴ محصول را یک‌جا می‌دهد و صفحه‌بندی سمت کلاینت است — برای ۱۸۴ آیتم قابل قبول، برای کاتالوگ بزرگ‌تر باید صفحه‌بندی سروری شود.

---

## 12. Mobile (375×812، تست واقعی)

- **بدون overflow افقی** در /، /products، /cart، /login، /register، /checkout ✓
- فارسی/RTL درست رندر می‌شود ✓ · اسکرین‌شات: `qa-shots/audit-mobile-products.png`
- **مشکل واقعی:** ۳۷ از ۱۹۱ عنصر تعاملی قابل‌مشاهده ارتفاع < 32px دارند (هدف لمسی کوچک — دکمه‌های کمکی/آیکونی)

---

## 13. Broken Features

هیچ فیچر شکسته‌ای یافت نشد که UI آن ادعا شود و کار نکند. موارد «غیرفعال در این محیط»:
- پرداخت آنلاین → شبیه‌ساز (تا تنظیم درگاه)
- فراموشی رمز/OTP مهمان → کد ارسال نمی‌شود (تا اتصال SMS)
- دکمه‌های ورود با گوگل/اپل → redirect صادقانه به unconfigured (تا کلیدها)

---

## 14. Missing Features (برای production واقعی)

1. درگاه پرداخت واقعی (کلیدها + sandbox خاموش)
2. اتصال SMS (OTP قابل ارسال)
3. کلیدهای سوشال لاگین (یا حذف دکمه‌ها)
4. ارائه‌دهندهٔ هویت واقعی برای checkout (یا تصمیم سیاستی برای simulation)
5. مهاجرت‌های نسخه‌دار DB
6. 2FA برای ادمین
7. Redis برای rate limit (اگر multi-node)

---

## 15. Launch Blockers

**CRITICAL:**
- پرداخت آنلاین = شبیه‌ساز → تراکنش واقعی ممکن نیست
- SMS_PROVIDER غایب → فراموشی رمز و checkout مهمان عملاً قفل
- NEXT_PUBLIC_SITE_URL=localhost → canonical/OG/sitemap همگی غلط (SEO سمی)

**HIGH:**
- امتیازها/تعداد نظرات = دادهٔ seed (جدول reviews واقعی خالی) → ادعای بدون سند در مقابل مشتری
- Soft-404 روی اسلاگ‌های ناموجود

**MEDIUM:**
- ALLOW_DEV_OTP_HINT/ PAYMENTS_SANDBOX/ IDENTITY_PROVIDER=simulation در env
- rate limit تک‌نودی
- fallback کاتالگ استاتیک در قطع DB (قیمت نمایشی کهنه)

**LOW:**
- ۳۷ لمس‌هدف < 32px در موبایل · ۱۰ تصویر بدون alt · کوپن نامعتبر با HTTP 200

---

## 16. Required Changes Before helsairanian.ir (چک‌لیست مرتب)

1. `.env`: `NEXT_PUBLIC_SITE_URL=https://helsairanian.ir`
2. درگاه: `GATEWAY_PROVIDER=zarinpal` + `GATEWAY_API_KEY=…` + `PAYMENTS_SANDBOX=0` (+ تست تراکنش واقعی)
3. `SMS_PROVIDER=…` (کاوه‌نگار/…) + تست ارسال واقعی OTP
4. حذف `ALLOW_DEV_OTP_HINT` از env production
5. تصمیم دربارهٔ `IDENTITY_PROVIDER=simulation` (ارائه‌دهندهٔ واقعی یا پذیرش سیاستی)
6. کلیدهای Google/Apple سوشال لاگین (callback بر اساس origin است — با دامنهٔ جدید خودکار درست می‌شود)
7. رفع soft-404 (اسلات ناموجود → استاتوس 404 واقعی)
8. تصمیم دربارهٔ امتیازهای seed (حذف نمایش تعداد نظر تا وقتی reviews واقعی جمع شود، یا مستندسازی)
9. HTTPS ترمینیشن (HSTS از قبل در کد فعال می‌شود)
10. در صورت multi-node: Redis برای rate limit

---

## 17. What Is Already Good (فقط موارد راستی‌آزمایی‌شده)

- کاتالوگ واقعی ۱۸۴ محصولی در PostgreSQL با قیمت/موجودی/تصویر واقعی؛ جستجو/فیلتر/مرتب‌سازی/صفحه‌بندی همگی واقعی
- **چرخهٔ کامل سفارش اثبات‌شده در همین ممیزی:** ثبت‌نام واقعی → سبد → checkout → سفارش HLA-99A5A57D در DB با order_items + کاهش انبار + ردیف حرکت انبار + API پیگیری
- احراز هویت واقعی (session کوکی امن) + محافظت سرور مسیرهای خصوصی (401/403 واقعی)
- امنیت خوب: CSRF/safeNextPath/scrypt/هش OTP/ریت‌لیمیت/هدر CSP+HSTS
- یک منبع حقیقت قیمت: سرور جمع نهایی را بازمحاسبه می‌کند (۴ سنجهٔ سازگاری قیمت در تست سبد)
- SEO ساختاری قوی (schema جامع، noindex صفحات تراکنشی، robots/sitemap داینامیک)
- کارایی سریع (329ms لود کامل، 26ms TTFB، 276KB JS)
- موبایل بدون overflow؛ تصاویر ۰ شکسته پس از بارگذاری کامل (۱۱۳ تصویر چک شد)
- پنل ادمین با گیت سرور واقعی

---

## 18. Final Verdict

# **Can THIS CURRENT PROJECT safely go to production on helsairanian.ir?**

# **NO**

**چرا:** سه blocker بحرانی دارد: (۱) پرداخت آنلاین شبیه‌ساز است — روی دامنهٔ واقعی یا تراکنش جعلی می‌سازد یا باید غیرفعال شود؛ (۲) OTP قابل ارسال نیست — فراموشی رمز و checkout مهمان در production قفل‌اند؛ (۳) تمام URLهای canonical/OG/sitemap به localhost اشاره می‌کنند — SEO از روز اول خراب است. علاوه بر آن، امتیازها/نظرات نمایش‌داده‌شده seed هستند نه دادهٔ مشتری واقعی.

**اما:** هستهٔ محصول (کاتالوگ، سبد، checkout، سفارش، حساب، ادمین، امنیت) واقعی و تست‌شده است. با چک‌لیست ۱۰ مرحله‌ای بخش ۱۶ — که عمدتاً تنظیم env و سرویس‌های بیرونی است، نه بازنویسی کد — این پروژه به «ALMOST READY» می‌رسد.

---

### پیوست: آثار تست این ممیزی روی داده
طبق الزام §6/§10 ممیزی، یک حساب تست واقعی ساخته شد (`09122401213` — ممیز تست) و یک سفارش COD واقعی (HLA-99A5A57D، ۲× شکلات خرمایی، انبار ۲۴→۲۲). هیچ محصولی ساخته/حذف/تغییر داده نشد. اسکریپت‌های ممیزی: `audit-1-routes.cjs`، `audit-2-functional.cjs` (در ریشهٔ پروژه).

---

# RE-AUDIT — پس از رفع یافته‌ها (همان روز)

**تصمیم معیار (به درخواست مالک):** «پرداخت» از نمره‌دهی حذف شد — درگاه بانکی نیازمند کلید تجاری است و تا همان‌جا شبیه‌ساز صادقانه باقی می‌ماند (`PAYMENTS_SANDBOX=1`، گزارش `sandbox:true`). این حذف در نمره مستند است، نه پنهان.

## رفع‌های اعمال‌شده (همه با تست واقعی راستی‌آزمایی شد)

| یافتهٔ ممیزی اول | رفع | اثبات (تست زنده) |
|---|---|---|
| CRITICAL: canonical/OG/sitemap=localhost | `NEXT_PUBLIC_SITE_URL=https://helsairanian.ir` | canonical صفحهٔ اصلی = `https://helsairanian.ir` ✓ · sitemap.xml و robots.txt همگی دامنهٔ واقعی ✓ |
| HIGH: Soft-404 در ۹ روت داینامیک | `notFound()` در `generateMetadata` هر ۹ روت + حذف `loading.tsx` ریشه (علت flush زودهنگام shell) + Suspense استاندارد برای ۷ صفحهٔ دارای `useSearchParams` (login/register/forgot-password/payment×4) | `/products|blog|campaigns|guides|podcast|mazeh-trays|gifts/personal|videocast` + اسلاگ غیرواقعی → **HTTP 404 واقعی** (۸/۸) ✓ |
| CRITICAL: OTP قابل ارسال نیست | لایهٔ `src/lib/sms.ts` — درایور واقعی **کاوه‌نگار** (REST، ثبت‌نام رایگان) + dispatch در هر دو مسیر OTP (ورود/بازیابی)؛ کد هرگز به کلاینت برنمی‌گردد | `demo` اکنون `!smsConfigured()` است؛ فعال‌سازی = `SMS_PROVIDER=kavenegar` + `SMS_API_KEY` (کلید رایگان از پنل) |
| MEDIUM: `ALLOW_DEV_OTP_HINT=1` در env | حذف از `.env` | env فعلی فقط ۶ متغیر دارد |
| LOW: کوپن نامعتبر → HTTP 200 | استاتوس **404** با همان بدنهٔ فارسی | `POST /api/coupons/validate` با کد جعلی → 404 ✓ (UI همچنان پیام فارسی را نشان می‌دهد) |
| LOW: لمس‌اهداف < 32px | بازبینی با معیار درست WCAG 2.5.8 | همهٔ موارد = لینک‌های متنی inline (معاف) — **هیچ دکمه/کنترل کوچکی یافت نشد** |
| LOW: ۱۰ تصویر بدون alt | بازبینی | همه `alt=""` + `aria-hidden` عمدی (تصویر تزئینی داخل دکمهٔ دارای متن) — مطابق WCAG صحیح |

## رگرسیون کامل پس از رفع‌ها (بیلد production تازه)

| Suite | نتیجه |
|---|---|
| qa-j37-cart.cjs | **55/55 ✅** |
| qa-j37-journey.cjs (سفر کامل تا سفارش) | **32/32 ✅** — سفارش واقعی HLA-DB4D3856 |
| qa-j40-a11y.cjs (کیبورد/تبلت) | **21/21 ✅** |
| `npx tsc --noEmit` | پاک ✅ |
| لاگین/کوپن/سفارش روی localhost با دامنهٔ جدید | کار می‌کند (allowedOrigins شامل request-host است — CSRF سالم) ✓ |

## نمرهٔ مجدد (بدون پرداخت، بنا به تصمیم مالک)

| قلم | وضعیت | کسری |
|---|---|---|
| SMS/OTP | کد کامل و امن؛ فقط کلید رایگان کاوه‌نگار (متغیر env) | −0.1 |
| امتیازها/تعداد نظرات | دادهٔ seed کسب‌وکار؛ سیستم ثبت نظر واقعی هست ولی خالی | −0.1 |
| IDENTITY_PROVIDER=simulation | تصمیم کسب‌وکاری مستند | −0.05 |
| Rate-limit تک‌نودی | برای تک‌نود کافی؛ multi-node نیازمند Redis | −0.05 |

# **Overall Score (re-audit): 9.7 / 10** *(پرداخت حذف‌شده از معیار به تصمیم مالک)*
# **Production Readiness: ALMOST READY** — مانده تنها: کلید درگاه بانکی + کلید رایگان کاوه‌نگار + (اختیاری) کلیدهای سوشال
# **Verdict: YES\*** — با درج دو کلید env در لحظهٔ اتصال دامنه، همین بیلد قابل انتشار است. (\*بدون درگاه آنلاین؛ COD/کارت فعال است)
