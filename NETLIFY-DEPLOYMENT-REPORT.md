# گزارش استقرار Netlify — Helsa Iranian (Phases 1–10)

> **تاریخ:** 2026-09-12 · **بیلد تست‌شده:** Next.js 16.2.6 / Node 20 · **نتیجه:** 🟢 آمادهٔ استقرار
> **تست‌ها:** ۳ سناریوی شبیه‌سازی بیلد Netlify + tsc + lint + رگرسیون کامل (۱۵/۱۵ پرداخت + ۲/۲ ادمین + smoke صفحات) — همه سبز

---

## خلاصهٔ مدیریتی

خطای `ECONNREFUSED 127.0.0.1:5432` در بیلد Netlify **کاملاً ریشه‌یابی و رفع شد**. پروژه اکنون در سه سناریو بیلد می‌شود: (۱) بدون هیچ متغیر محیطی، (۲) با دیتابیس میزبانی‌شدهٔ غیرقابل‌دسترس، (۳) با DATABASE_URL=localhost (خودکار رد می‌شود) — در هر سه، بیلد ۹۶/۹۶ صفحه موفق. هیچ логیک فیچری، UI، رنگ یا کامپوننتی تغییر نکرده است.

---

## Phase 1 — ممیزی کامل (چک‌لیست یافته‌ها)

| # | محل | یافته | وضعیت |
|---|---|---|---|
| A1 | `src/db/index.ts` | با غیاب DATABASE_URL، Pool با `postgresql://unconfigured` ساخته می‌شد و **pg به‌طور پیش‌فرض به 127.0.0.1:5432 وصل می‌شد** → عامل دقیق ECONNREFUSED در Netlify | ✅ رفع (B1) |
| A2 | `src/app/instagram/page.tsx` | `revalidate=300` → prerender در بیلد → کوئری DB در زمان build | ✅ رفع (B3) |
| A3 | `src/services/instagram.ts` | `getCuratedPosts/Stories` فقط `isDatabaseConfigured` را چک می‌کردند؛ DBِ «پیکربندی‌شده ولی غیرقابل‌دسترس» → کرش | ✅ رفع (B4) |
| A4 | سرویس‌های کاتالوگ | همگی try/catch با fallback به seed دارند | ✅ از قبل سالم |
| A5 | `sitemap.ts`×۵ + robots | `force-dynamic` / بدون DB | ✅ از قبل سالم |
| A6 | `src/proxy.ts` (middleware) | بدون env/localhost؛ امن | ✅ از قبل سالم |
| A7 | `assertSameOrigin`/`allowedOrigins` | مبدأ از `x-forwarded-host`/`host` مشتق می‌شود → **پشت پروکسی Netlify خودکار درست کار می‌کند** | ✅ از قبل سالم |
| A8 | `package.json` | `typecheck` موجود؛ `build` استاندارد | ✅ |
| A9 | `netlify.toml` | وجود نداشت | ✅ ایجاد (B2) |
| A10 | `.gitignore` | **فقط `backups/`** — با `git add .` فایل `.env` (همهٔ رازها) commit می‌شد! | ✅ رفع (B6) |
| A11 | `generateStaticParams` / `getStaticProps` / `getServerSideProps` | وجود ندارند (App Router خالص) | ✅ |
| A12 | `ALLOW_DEV_OTP_HINT` | کد OTP در پاسخ API فقط با این پرچم + بدون SMS_PROVIDER برمی‌گردد؛ در پروداکشن تنظیم نشود | ✅ گیت‌شده + مستند |

## Phase 2 — سازگاری Netlify

- **`netlify.toml`** ایجاد شد: `command = "npm run build"` · `publish = ".next"` · `NODE_VERSION = "20"` · پلاگین رسمی `@netlify/plugin-nextjs` (v5.15.13 به devDependencies اضافه شد).
- App Router + API routes + `src/proxy.ts` (میان‌افزار Next 16) + بهینه‌سازی تصویر — همگی توسط runtime رسمی Netlify پشتیبانی می‌شوند.
- استقرار خودکار GitHub: repo را در Netlify → «Add new site → Import an existing project» متصل کنید؛ Netlify خودش netlify.toml را می‌خواند.
- توسعهٔ محلی دست‌نخورده (`next dev` + `next start` + PG محلی) — اثبات‌شده با رگرسیون کامل.

## Phase 3 — متغیرهای محیطی

`.env.example` کاملاً بازنویسی شد (فارسی، گروه‌بندی‌شده). جدول کامل:

| متغیر | الزام | نکته |
|---|---|---|
| `DATABASE_URL` | **الزامی runtime** | فقط PostgreSQL میزبانی‌شده (Supabase/Neon/Railway)؛ localhost در Netlify خودکار رد می‌شود |
| `DATABASE_SSL` | اختیاری | خالی=SSL خودکار برای هاست غیرمحلی · `verify`=تأیید سختگیرانه · `disable`=خاموش |
| `NEXT_PUBLIC_SITE_URL` | الزامی پروداکشن | دامنهٔ نهایی؛ canonical/sitemap/robots/CSRF |
| `NEXTAUTH_URL` | اختیاری | نام مستعار SITE_URL (سازگاری) |
| `AUTH_SECRET` | الزامی لاگین | ≥۳۲ نویسه؛ مستعارهای پذیرفته‌شده: `NEXTAUTH_SECRET`، `JWT_SECRET` |
| `ADMIN_EMAILS` | الزامی ادمین | لیست مجاز، با کاما |
| `GATEWAY_PROVIDER`/`GATEWAY_API_KEY` | پرداخت آنلاین | `zarinpal` + merchant_id |
| `SNAP_PAY_API_KEY` و تنظیمات | اختیاری | اقساطی |
| `DIGIPAY_USERNAME/PASSWORD/CLIENT_ID/CLIENT_SECRET` | اختیاری | قرارداد رسمی mydigipay |
| `COD_ENABLED/PROVINCES/MAX_AMOUNT` | اختیاری | پرداخت در محل |
| `PAYMENTS_SANDBOX` | ⚠️ فقط dev | در پروداکشن حتماً `0`/حذف |
| `IDENTITY_REQUIRED`/`IDENTITY_PROVIDER` | توصیه | احراز هویت پرداخت |
| `INSTAGRAM_ACCESS_TOKEN/USER_ID` | اختیاری | فید زندهٔ Graph API |
| `SMS_PROVIDER/SMS_API_KEY` | اختیاری | OTP واقعی |
| `GOOGLE_*/APPLE_*` | اختیاری | OAuth |
| `RESEND_API_KEY`، `SMTP_*` | رزرو | در کد استفاده نمی‌شوند (فعال‌سازی = فیچر جدید) |
| `STRIPE_SECRET_KEY` | — | **استفاده نمی‌شود** (تحریم؛ درگاه‌های ایرانی) |
| `ALLOW_DEV_OTP_HINT` | ⚠️ فقط dev | هرگز در پروداکشن |

هیچ رازی در `.env.example` نیست؛ `.env` توسط `.gitignore` از commit محروم است.

## Phase 4 — ایمنی دیتابیس (تصمیم صفحه‌به‌صفحه)

| صفحه | حالت | دلیل |
|---|---|---|
| `/instagram` | **force-dynamic (جدید)** | الزام Phase 5 — هرگز کوئری در build |
| حساب کاربری/سفارش‌ها/چک‌اوت پرداخت | force-dynamic (موجود) | نشست/کوکی |
| کاتالوگ (products/gifts/trays/blog/home) | ایستا با fallback ایمن | try/catch → seed؛ با hosted PG در build دادهٔ واقعی |
| sitemapها | force-dynamic (موجود) | تازگی |
| API routes | dynamic | request-محور |

## Phase 5 — صفحهٔ اینستاگرام ✅

- `export const dynamic = "force-dynamic"` جایگزین `revalidate=300` شد — **صفر کوئری DB در بیلد**.
- سرویس: try/catch حول کوئری‌های DB → در قطعی، `{posts:[], stories:[]}` + حالت خالیٔ موجود UI («هنوز پستی منتشر نشده است»).
- UI بایت‌به‌بایت دست‌نخورده. تست: بیلد بدون DB ✅ · رندر با داده ✅ · API فید ✅.

## Phase 6 — حفاظت جهانی بیلد

سه شبیه‌سازی بیلد Netlify (با حذف کامل .env):

| سناریو | نتیجه |
|---|---|
| A) هیچ env‌ای نیست (دقیقاً حالت گزارش‌شده) | ✅ بیلد موفق ۹۶/۹۶، صفر ECONNREFUSED |
| B) hosted DB غیرقابل‌دسترس (DNS نامعتبر) | ✅ بیلد موفق (fallback ایمن) |
| C) DATABASE_URL=localhost + NETLIFY | ✅ رد خودکار با پیام روشن + بیلد موفق |

## Phase 7 — دیتابیس پروداکشن

- **SSL خودکار** برای هاست‌های غیرمحلی (`rejectUnauthorized:false` پیش‌فرض؛ `verify`/`disable` با `DATABASE_SSL`) — سازگار Supabase/Neon/Railway. هر دو مسیر SSL/غیرSSL عملاً تست شد (اتصال واقعی).
- **رد خودکار localhost** روی پلتفرم میزبانی (NETLIFY/VERCEL/RENDER) با خطای فارسی روشن؛ توسعهٔ محلی (localhost) دست‌نخورده کار می‌کند.
- بدون اعتبارنامهٔ واقعی hosted، اتصال زنده NOT VERIFIED (صادقانه) — معماری و قرارداد آماده است.

## Phase 8 — امنیت (بازبینی استقرار)

- CSRF/Same-origin: مبتنی بر هدرهای فوروارد → روی Netlify درست؛ `NEXTAUTH_URL` هم پذیرفته می‌شود.
- کوکی‌ها: `Secure` در production (HTTPS Netlify) + HttpOnly + امضا.
- OTP دمو: فقط پشت `ALLOW_DEV_OTP_HINT=1` + نبود SMS_PROVIDER (گیت دوطبقه).
- `.gitignore` اصلاح شد — **جلوگیری از commit شدن `.env`** (یافتهٔ بحرانی A10).
- admin: allowlist + رول امضاشده + گارد proxy — بدون تغییر.
- SQLi: Drizzle پارامتری؛ XSS: پاکسازی zod + CSP — بدون تغییر.

## Phase 9 — تست‌های اجرایی

| تست | نتیجه |
|---|---|
| `npm install` | ✅ |
| `npm run lint` | ✅ (پس از فیکس یک خطای واقعی `set-state-in-effect` — B5) |
| `npm run typecheck` | ✅ صفر خطا |
| `npm run build` (پایه) | ✅ ۹۶/۹۶ |
| ۳ شبیه‌سازی Netlify | ✅✅✅ |
| رگرسیون پرداخت (UI+DB) | ✅ ۱۵/۱۵ |
| پنل ادمین (COD collect) | ✅ ۲/۲ |
| smoke صفحات/API | ✅ همه 200؛ /admin بدون نشست → 307 |

## Phase 10 — خلاصهٔ تغییرات

### فایل‌های تغییریافته/ایجادشده

| فایل | تغییر |
|---|---|
| `netlify.toml` | **جدید** — پیکربندی بیلد + پلاگین |
| `src/db/index.ts` | بازنویسی: stub بدون شبکه (رفع ECONNREFUSED)، رد localhost در میزبانی، SSL خودکار |
| `src/app/instagram/page.tsx` | `revalidate=300` → `force-dynamic` |
| `src/services/instagram.ts` | try/catch حول کوئری‌های curated |
| `.env.example` | بازنویسی کامل (جدول بالا) |
| `.gitignore` | عدم commit رازها + artifacts |
| `src/lib/secrets.ts` | `authSecretRaw()` + مستعارها |
| `src/lib/session.ts` · `src/lib/admin.ts` · `src/app/api/health/route.ts` | خواندن راز از زنجیرهٔ مستعار |
| `src/lib/seo.ts` · `src/app/robots.ts` · ۴×`sitemap.ts` · `src/lib/security.ts` | fallback `NEXTAUTH_URL` |
| `src/app/checkout/page.tsx` | فیکس lint: state مشتق‌شده به‌جای effect (رفتار یکسان) |
| `package.json` | devDep: `@netlify/plugin-nextjs` |
| `scripts/env-recover.sh` | انتخاب بکاپ بر اساس نام (نه mtime) |

### باگ‌های رفع‌شده

1. **ECONNREFUSED 127.0.0.1:5432 در بیلد** — ریشه: Pool جعلی با fallback پیش‌فرض pg به localhost (A1→B1).
2. **کرش /instagram در بیلد بدون DB** (A2+A3→B3+B4).
3. **ریسک commit شدن `.env` با `git add .`** (A10→B6).
4. **خطای lint** `react-hooks/set-state-in-effect` (B5).
5. **بازیابی بکاپ قدیمی در sandbox** (mtime) — اسکریپت recovery اصلاح شد (بی‌تأثیر برای repo شما).

### تنظیمات Netlify (خلاصه)

- Build command: `npm run build` · Publish: `.next` · Node 20 · Plugin: `@netlify/plugin-nextjs`
- در UI نیازی به تنظیم دستی نیست — `netlify.toml` مرجع است.
- **Environment variables (Site settings → Environment variables):** `DATABASE_URL` (hosted PG) + `NEXT_PUBLIC_SITE_URL` + `AUTH_SECRET` + `ADMIN_EMAILS` (+ درگاه‌ها طبق نیاز) — هر دو scope («Build» و «Functions») فعال بمانند.

### دستورات Git (روی سیستم شما — PowerShell)

```powershell
git add .
git commit -m "Fix Netlify production deployment"
git push origin main
```

سپس در Netlify: «Add new site → Import an existing project» → repo را انتخاب کنید → Deploy. (اگر سایت از قبل متصل است، push خودش دیپلوی می‌کند.)

## معیارهای موفقیت

| معیار | وضعیت |
|---|---|
| بیلد Netlify موفق | ✅ (۳ سناریو اثبات شد) |
| بدون ECONNREFUSED | ✅ |
| بدون وابستگی localhost | ✅ (رد خودکار) |
| /instagram کار می‌کند | ✅ (بیلد + رندر + API) |
| دیتابیس با hosted PostgreSQL | ✅ معماری + SSL (تست زنده منتظر اعتبارنامه) |
| GitHub auto-deploy | ✅ (netlify.toml + مستندات اتصال) |
| UI یکسان | ✅ (فقط دایرکتیو رندر؛ صفر تغییر بصری) |
| فیچرهای هلسا سالم | ✅ (۱۵/۱۵ + ۲/۲ + smoke) |
