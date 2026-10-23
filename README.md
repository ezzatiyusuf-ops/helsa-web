# HELSA IRANIAN — هلسا ایرانیان

> **هلسا؛ طعم طبیعت، هنر پذیرایی ایرانی**
> «چون شما لایق بهترین‌ها هستید ...»

فروشگاه اینترنتی **تولید بازرگانی هلسا ایرانیان** — خرما، آجیل، خشکبار،
شکلات دست‌ساز خرمایی، عسل، زعفران و **سینی‌های مزه هلسا**.
تمام‌فارسی، RTL، با طراحی **Luxury Minimal Iranian**.

---

## فناوری‌ها

| لایه | فناوری |
| --- | --- |
| فریم‌ورک | Next.js ۱۶ — App Router |
| زبان | TypeScript (strict) |
| استایل | Tailwind CSS v4 + توکن‌های معنایی (تم روشن/تیره) |
| انیمیشن | Framer Motion |
| وضعیت | Zustand + persist |
| اعتبارسنجی | Zod |
| پایگاه داده | PostgreSQL + Drizzle ORM |
| نشست | jose (JWT، کوکی HttpOnly) |
| فونت | Vazirmatn |
| میزبانی | Cloudflare Workers (OpenNext) — [docs/CLOUDFLARE.md](./docs/CLOUDFLARE.md) |

## قابلیت‌ها

**فروشگاه** · ویترین محصولات با فیلتر و مرتب‌سازی، صفحه محصول تحریریه‌ای با
تب‌های توضیحات/ترکیبات/ارزش غذایی/نگهداری/نظرات، پیش‌نمایش سریع، مقایسه محصولات،
علاقه‌مندی، بازدیدهای اخیر، جستجوی فارسی با تکمیل خودکار.

**سینی مزه هلسا** · ۸ سینی امضا با کارت‌هایی هم‌سیستم با محصولات، دسته‌بندی‌های
تصویری (دو نفره، خانوادگی، مهمانی، VIP، یلدا، نوروز، سازمانی)، پیش‌نمایش سینی،
صفحه جزئیات، و **سازنده سینی پیشرفته** (`/mazeh-trays/build`) با ۱۰ دسته اقلام،
قیمت زنده سرور-محور، پیش‌نمایش بصری، بسته‌بندی هدیه و ذخیره پیکربندی.

**خرید** · سبد پایدار، کوپن، تسویه شش‌مرحله‌ای، خرید بدون ثبت‌نام، مدیریت آدرس،
روش‌های ارسال، معماری پرداخت قابل توسعه، پیگیری سفارش، فاکتور قابل چاپ.

**پرتال عمده B2B** · ثبت‌نام کسب‌وکار (`/wholesale`)، ورک‌فلو تأیید ادمین،
کاتالوگ قیمت عمده با تخفیف پلکانی، حداقل سفارش (MOQ)، فاکتور، سفارش تکراری
و داشبورد عمده‌فروشان.

**بلاگ و مجله** · مقاله‌های تخصصی خرما/آجیل/خشکبار با دسته‌بندی، زمان مطالعه،
برچسب، مقالات مرتبط، breadcrumb و اشتراک‌گذاری اجتماعی.

**حریم خصوصی** · مدیر ترجیحات کوکی سه‌دسته‌ای (ضروری/تحلیلی/تبلیغاتی) با
پیش‌فرض محافظه‌کارانه — تحلیلی و تبلیغاتی تا رضایت صریح کاربر خاموش می‌مانند.

**سئو و AEO** · متادیتای کامل + OG/Twitter، JSON-LD (Product/Article/FAQ/
Breadcrumb/Organization)، ۵ sitemap (با تصویر)، robots.txt با قانون ویژه
موتورهای پاسخ AI.

**حساب کاربری** · داشبورد فارسی با سفارش‌ها، آدرس‌ها، علاقه‌مندی‌ها، سینی‌های من،
کدهای تخفیف، اطلاعات شخصی، تنظیمات و اعلان‌ها.

**تجربه** · تم روشن/تیره/سیستم با پالت اختصاصی تیره، مگا منوی تصویری،
درگ‌اور موبایل از سمت راست، دکمه شناور پشتیبانی هلسا، دسترس‌پذیری و سئوی کامل.

**PWA** · قابل نصب به‌عنوان «اپلیکیشن هلسا» با manifest فارسی/RTL، سرویس‌ورکر با
سیاست کش امن، صفحه آفلاین برندشده و پرامپت‌های ظریف نصب و به‌روزرسانی.

## نصب سریع

```bash
npm install
./scripts/dev-setup.sh        # PostgreSQL + دیتابیس + .env + اسکیما + seedها (idempotent)
npm run dev
```

آدرس: `http://localhost:3000`

## متغیرهای محیطی

نمونه کامل: [`.env.example`](./.env.example)

| متغیر | الزامی | کاربرد |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | اتصال PostgreSQL |
| `NEXT_PUBLIC_SITE_URL` | توصیه‌شده | canonical / sitemap / JSON-LD |
| `AUTH_SECRET` | برای ورود | امضای کوکی نشست |
| `GOOGLE_CLIENT_ID` · `GOOGLE_CLIENT_SECRET` | اختیاری | ورود با گوگل |
| `APPLE_CLIENT_ID` · `APPLE_TEAM_ID` · `APPLE_KEY_ID` · `APPLE_PRIVATE_KEY` | اختیاری | ورود با اپل |
| `GATEWAY_PROVIDER` · `GATEWAY_API_KEY` | اختیاری | درگاه پرداخت آنلاین |
| `SMS_PROVIDER` · `SMS_API_KEY` | اختیاری | ارسال واقعی OTP |

> قابلیت‌هایی که کلید ندارند، به‌صورت شفاف «پیکربندی‌نشده» اعلام می‌شوند —
> هیچ پرداخت یا ورودی جعلی شبیه‌سازی نمی‌شود.

## پایگاه داده

```bash
npx drizzle-kit push                          # اعمال اسکیما
npx tsx --env-file=.env scripts/seed.ts       # داده اولیه
```

جزئیات: [`docs/DATABASE.md`](./docs/DATABASE.md)

## اسکریپت‌ها

```bash
npm run dev             # سرور توسعه
npm run build           # ساخت تولید (next build --webpack — پین مهم)
npm start               # اجرای تولید محلی
npm run lint            # ESLint
npm run typecheck       # TypeScript
npm run cf:build:local  # بیلد + باندل Cloudflare (کم‌حافظه)
npm run deploy          # انتشار روی Cloudflare Workers
```

## مستندات

| سند | موضوع |
| --- | --- |
| [`HELSA-DEVELOPMENT-GUIDE.md`](./HELSA-DEVELOPMENT-GUIDE.md) | **راهنمای اصلی توسعه‌دهنده** |
| [`docs/CLOUDFLARE.md`](./docs/CLOUDFLARE.md) | استقرار Cloudflare Workers/OpenNext |
| [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) | استقرار گام‌به‌گام |
| [`docs/ENVIRONMENT.md`](./docs/ENVIRONMENT.md) | مرجع متغیرهای محیطی |
| [`docs/SECURITY.md`](./docs/SECURITY.md) | وضعیت امنیتی تست‌شده |
| [`docs/TESTING.md`](./docs/TESTING.md) | باتری QA ۳۳۸/۳۳۸ + استرس انبار |
| [`docs/SEO-AEO.md`](./docs/SEO-AEO.md) | سئو + بهینه‌سازی برای موتورهای AI |
| [`docs/AI-SITE-DOCUMENTATION.md`](./docs/AI-SITE-DOCUMENTATION.md) | نقشه پروژه برای عامل AI |
| [`docs/SETUP.md`](./docs/SETUP.md) | راه‌اندازی گام‌به‌گام |
| [`docs/API.md`](./docs/API.md) | مستندات کامل API |
| [`docs/DATABASE.md`](./docs/DATABASE.md) | اسکیما، روابط، مهاجرت |
| [`docs/AUTHENTICATION.md`](./docs/AUTHENTICATION.md) | نشست، گوگل، اپل، OTP |
| [`docs/PAYMENT.md`](./docs/PAYMENT.md) | معماری و تأیید پرداخت |
| [`docs/SEO.md`](./docs/SEO.md) | سئو و کشف‌پذیری هوش مصنوعی |
| [`docs/PWA.md`](./docs/PWA.md) | manifest، سرویس‌ورکر، آفلاین، نصب |
| [`docs/DEVELOPMENT.md`](./docs/DEVELOPMENT.md) | ساختار، سیستم طراحی، قواعد |
| [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) | استقرار و چک‌لیست تولید |
| [`docs/TROUBLESHOOTING.md`](./docs/TROUBLESHOOTING.md) | رفع اشکال |
| [`docs/IMAGES.md`](./docs/IMAGES.md) | سیاست دارایی‌های تصویری آفلاین |
| [`CHANGELOG.md`](./CHANGELOG.md) | تاریخچه تغییرات |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | راهنمای مشارکت |

## سلامت سیستم

```bash
curl http://localhost:3000/api/health
```

وضعیت اتصال پایگاه داده و پیکربندی احراز هویت/پرداخت را برمی‌گرداند.

## رفع اشکال

پرتکرارترین مورد: **نبود `DATABASE_URL`**. اپلیکیشن کرش نمی‌کند و از داده seed
استفاده می‌کند، اما برای ثبت سفارش و نظرات باید پیکربندی شود.
راهنما: [`docs/TROUBLESHOOTING.md`](./docs/TROUBLESHOOTING.md)

---

**تولید بازرگانی هلسا ایرانیان**
تهران، نیاوران، خیابان شهید باهنر، قبل از چهارراه مژده
📞 ۰۲۱-۵۶۱۳۰۸۵۸ · 📱 ۰۹۳۷-۹۱۰۵۱۳۳ · 🌐 helsairanian.ir
