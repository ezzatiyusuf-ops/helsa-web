# راه‌اندازی هلسا در ویندوز (VS Code + PowerShell) — نسخه اصلاح‌شده

> ⚠️ **سه اشتباه رایج که در ترمینال شما رخ داد — اول این‌ها را بخوانید:**
>
> ۱. **پوشه فعلی شما (`Desktop\HELSA WEB\Helsa web`) نسخه قدیمی گیت‌هاب است، نه نسخه به‌روز!**
>    نشانه‌ها: خطای `Missing script: "dev"` و نبودن `drizzle.config.json` و `.env`.
>    نسخه به‌روز (۱.۶.۰) را از **فایل `helsa-web-1.6.0.zip` در ورک‌اسپیس همین گفتگو** دانلود کنید.
>
> ۲. **متن‌های توضیحی را در ترمینال paste نکنید.** فقط چیزی که داخل بلوک‌های کد (مثل این) است، دستور است:
>    ```powershell
>    npm install   ← این یک دستور است، کپی کنید
>    ```
>    جمله‌هایی مثل «Requirements:» یا «After all development...» متن مستندات بودند — PowerShell آن‌ها را دستور فرض کرد و خطا داد. **هیچ آسیبی وارد نشده؛ فقط خطای نمایشی بود.**
>
> ۳. **مقادیر `.env` را در ترمینال تایپ نکنید** — آن‌ها محتوای یک **فایل** هستند (مرحله ۴).

---

## گام ۱ — دانلود نسخه به‌روز

از **ورک‌اسپیس همین گفتگو** فایل **`helsa-web-1.6.0.zip`** (۳۶ مگابایت) را دانلود کنید.

سپس Extract کنید به مسیری **خارج از OneDrive و بدون فاصله در نام پوشه** — مثلاً:

```
C:\Projects\helsa
```

> چرا نه OneDrive؟ هم‌گام‌سازی OneDrive با `node_modules` (ده‌ها هزار فایل) کند و پرخطا می‌شود.
> چرا بدون فاصله؟ مسیرهای دارای فاصله (`HELSA WEB`) بعضی ابزارها را به مشکل می‌اندازند.

در VS Code: **File → Open Folder** → `C:\Projects\helsa` → ترمینال جدید (`Ctrl+`` `).

**بررسی اینکه نسخه درست است:**
```powershell
Test-Path package.json, drizzle.config.json, .env, .env.example, scripts\seed.ts
```
باید هر ۵ مقدار `True` برگرداند.

## گام ۲ — نصب پیش‌نیازها

✅ **Node.js** — شما `v24.11.0` دارید؛ کامل است، کاری لازم نیست.

❌ **PostgreSQL** — شما نصبش **ندارید** (`psql not recognized`). نصب:

1. از **postgresql.org/download/windows** نصب‌کننده EDB را بگیرید (نسخه ۱۷، x64).
2. هنگام نصب:
   - **رمز کاربر `postgres` را انتخاب کنید و یادداشت کنید** (مثلاً `Helsa1234`) — فقط برای نصب لوکال لازم است.
   - پورت ۵۴۳۲ پیش‌فرض را نگه دارید.
3. پایان نصب، Stack Builder را می‌توانید لغو کنید — نیازی نیست.

نصب‌کننده، سرویس پستگرس را خودکار روشن می‌کند (Services → `postgresql-x64-17` باید Running باشد).

## گام ۳ — ساخت دیتابیس (فقط یک‌بار)

از منوی Start برنامه **SQL Shell (psql)** را باز کنید. به همه سؤال‌ها Enter بزنید (Server, Database, Port, Username) — فقط در **Password** همان رمزی را بزنید که هنگام نصب انتخاب کردید.

وقتی `postgres=#` appeared، این **سه خط** را دقیقاً تایپ/پیست کنید (هر خط با Enter):

```sql
CREATE USER helsa WITH PASSWORD 'helsa_dev_pw';
CREATE DATABASE helsa_db OWNER helsa;
\q
```

> `\q` یعنی خروج — این سه خط فقط در **SQL Shell** کار می‌کنند، نه در PowerShell (خطای `CREATE not recognized` شما به همین دلیل بود).

## گام ۴ — فایل `.env`

✅ **در ZIP نسخه به‌روز، فایل `.env` از قبل هست — این گام را رد کنید.**

فقط اگر به هر دلیلی نبود، در VS Code یک فایل جدید در ریشه پروژه به نام `.env` بسازید (File → New File) و این ۵ خط را داخلش بگذارید و Save کنید:

```env
DATABASE_URL=postgresql://helsa:helsa_dev_pw@127.0.0.1:5432/helsa_db
NEXT_PUBLIC_SITE_URL=http://localhost:3000
AUTH_SECRET=dev-secret-0f8a7b3c9d2e4f6a8b1c3d5e7f9a2b4c
ADMIN_EMAILS=owner@helsa.dev
ALLOW_DEV_OTP_HINT=1
```

## گام ۵ — نصب وابستگی‌ها

```powershell
npm install
```

(چند دقیقه؛ هشدارهای `npm audit` مربوط به پکیج‌های dev هستند و مانع اجرا نمی‌شوند.)

## گام ۶ — جدول‌ها + داده اولیه

```powershell
npx drizzle-kit push
npx tsx --env-file=.env scripts/seed.ts
npx tsx --env-file=.env scripts/seed-catalog.ts
npx tsx --env-file=.env scripts/seed-gifts.ts
npx tsx --env-file=.env scripts/seed-wholesale.ts
```

> **دقت:** `npx drizzle-kit push` ممکن است بپرسد `Ok to proceed?` → `y` بزنید.
> اگر در `drizzle-kit push` جدول‌ها را برای Apply نشان داد، Enter بزنید تا همه اعمال شوند.

## گام ۷ — اجرا 🚀

```powershell
npm run dev
```

مرورگر: **http://localhost:3000**

| حساب | شماره/ایمیل | رمز |
|---|---|---|
| عمده‌فروش تأییدشده (۱۵٪) | `09121112233` | `Wholesale123` |
| مشتری عادی | `09127778899` | `NormalUser1` |
| **ادمین** | در `/register` با ایمیل `owner@helsa.dev` ثبت‌نام کنید | — |

---

## رفع اشکال (خطاهای واقعی شما + موارد رایج)

| خطا که دیدید | علت | راه‌حل |
|---|---|---|
| `Missing script: "dev"` | پوشه قدیمی گیت‌هاب | ZIP جدید را از ورک‌اسپیس دانلود و Extract کنید (گام ۱) |
| `drizzle.config.json file does not exist` | همان پوشه قدیمی | — |
| `.env: not found` | `.env` در آن پوشه نبود | در ZIP جدید هست |
| `psql not recognized` در PowerShell | یا نصب نیست یا PATH | از **SQL Shell (psql)** استفاده کنید؛ اگر باز هم می‌خواهید در PowerShell باشد: مسیر `C:\Program Files\PostgreSQL\17\bin` را به Environment Variables → Path اضافه کنید و VS Code را باز مجدد کنید |
| `CREATE not recognized` | دستور SQL در PowerShell اجرا شده | فقط داخل SQL Shell |
| `DATABASE_URL=...` خطای not recognized | مقدار env در ترمینال paste شده | این مقدار فایل است نه دستور — گام ۴ |
| `ECONNREFUSED 127.0.0.1:5432` | سرویس پستگرس خاموش | `services.msc` → `postgresql-x64-17` → Start |
| `password authentication failed for user "helsa"` | کاربر `helsa` درست ساخته نشده | دوباره SQL Shell با کاربر postgres → دستورات گام ۳ (اگر خطای "already exists" داد، اول `DROP DATABASE helsa_db; DROP USER helsa;` بزنید) |
| پورت ۳۰۰۰ اشغال | برنامه دیگر روی آن است | `npx next dev -p 3001` |
| OneDrive قفل کرده | هم‌گام‌سازی | پروژه را به `C:\Projects\helsa` ببرید |

## چک‌لیست نهایی — کل مسیر در ۸ دستور

```powershell
# در C:\Projects\helsa (پس از Extract کردن ZIP و نصب PostgreSQL و ساخت دیتابیس در SQL Shell)
Test-Path .env          # True
npm install
npx drizzle-kit push
npx tsx --env-file=.env scripts/seed.ts
npx tsx --env-file=.env scripts/seed-catalog.ts
npx tsx --env-file=.env scripts/seed-gifts.ts
npx tsx --env-file=.env scripts/seed-wholesale.ts
npm run dev
```

موفق باشید! 🌿
