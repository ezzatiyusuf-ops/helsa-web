# اجرای هلسا روی ویندوز — بازتولید دقیق همان پیش‌نمایش

> **چرا فایل دانلودیِ تکی ≠ سایتِ در حال اجرا؟**
> چیزی که در پیش‌نمایش می‌بینید «یک فایل» نیست؛ حاصلِ سه لایه است که با هم اجرا می‌شوند:
> ۱) **کد منبع** (همان فایل‌هایی که دانلود می‌کنید)
> ۲) **بیلد** (`npm run build` — کامپایل Next.js)
> ۳) **سرور + دیتابیس** (`npm start` + PostgreSQL با ۱۷۲ محصول، کاربران، سفارش‌ها)
>
> هیچ فایل HTML تکی‌ای وجود ندارد که کل هلسا باشد، چون سایت **سرور-رندر** است (صفحات و API در لحظه روی سرور ساخته می‌شوند و داده از دیتابیس می‌آید). پس فایلِ تنها = کدِ خام؛ سایتِ اجراشده = کد + بیلد + سرور + دیتابیس.

---

## پیش‌نیازها

| ابزار | نسخه | دریافت |
|---|---|---|
| Node.js | 20 LTS | `winget install OpenJS.NodeJS.LTS` یا nodejs.org |
| PostgreSQL | 14+ (محلی) **یا** hosted (Supabase/Neon/Railway) | postgresql.org |
| (اختیاری) Git | — | git-scm.com |

## مراحل (PowerShell)

```powershell
# ۱) استخراج ZIP سورس و رفتن به پوشه
cd C:\path\to\helsa

# ۲) نصب پکیج‌ها
npm install

# ۳) ساخت فایل محیط از روی نمونه
copy .env.example .env
```

فایل `.env` را با VS Code باز کنید و این مقادیر را تنظیم کنید:

```ini
# دیتابیس — نمونهٔ محلی:
DATABASE_URL=postgresql://postgres:YOURPASSWORD@localhost:5432/helsa_db
# یا hosted (مثل Supabase — connection string پنل را کپی کنید)

# راز نشست — بسازید با دستور زیر (PowerShell):
# node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
AUTH_SECRET=<خروجی دستور بالا>

ADMIN_EMAILS=owner@helsa.dev
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# ⚠️ برای دیدن «دقیقاً همان پیش‌نمایش» (درگاه شبیه‌ساز + نمایش کد OTP در توسعه):
PAYMENTS_SANDBOX=1
IDENTITY_PROVIDER=simulation
IDENTITY_REQUIRED=1
ALLOW_DEV_OTP_HINT=1
COD_ENABLED=1
COD_PROVINCES=تهران
```

```powershell
# ۴) ساخت دیتابیس (اگر محلی و هنوز نساخته‌اید)
createdb -U postgres helsa_db

# ۵) ساخت جداول از روی اسکیمای Drizzle
npx drizzle-kit push

# ۶) اگر دیتابیس تازه است: دادهٔ اولیه (محصولات، ادمین و…)
npx tsx --env-file=.env scripts/seed.ts
#    ⚠️ اگر دیتابیس خودتان را از قبل دارید (پروژهٔ محلی قبلی)، این مرحله را نکنید.

# ۷) بیلد و اجرا
npm run build
npm start
# یا حالت توسعه: npm run dev
```

سپس **http://localhost:3000** را باز کنید — همان چیزی که در پیش‌نمایش می‌بینید.

## نکته‌های مهم

1. **تصاویر:** پوشهٔ `public/images` (حدود ۱۰۰ مگابایت عکس بهینه‌شدهٔ محصولات) به‌خاطر حجم در ZIP سورس نیست — آن را از ریپوی خودتان (`github.com/eztatiyusuf-ops/Helsa-web`) دارید. پوشهٔ `public` را از ریپوی محلی‌تان داخل همین پوشه کپی کنید. (فقط `icons`، `brand` و `sw.js` داخل ZIP هستند.)
2. **این محیط sandbox به GitHub شما متصل نیست** — تغییرات فاز پرداخت و فاز Netlify فقط در همین فایل‌هاست؛ آن‌ها را با محتوای این ZIP در ریپوی خودتان جایگزین/ادغام کنید و بعد commit/push.
3. **تست پرداخت در حالت شبیه‌ساز:** در چک‌اوت با کد ملیِ تستی `1234567891` و موبایل دلخواه (مثل `09120000015`) پیش بروید — کد OTP در حالت توسعه روی صفحه نمایش داده می‌شود.
4. **استقرار آنلاین (Netlify):** طبق `NETLIFY-DEPLOYMENT-REPORT.md` — فقط envهای پروداکشن لازم است.
5. **پرچم‌های توسعه را برای پروداکشن حذف کنید:** `PAYMENTS_SANDBOX`، `ALLOW_DEV_OTP_HINT` هرگز به سرور واقعی نروند.
