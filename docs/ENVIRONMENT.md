# متغیرهای محیطی (ENVIRONMENT)

> مرجع کامل متغیرهای هلسا. قالب‌ها: `.env.example` (محلی) و `.env.production.example` (تولید).
> **هرگز `.env` واقعی را commit نکنید.** منبع خواندن: فقط `process.env` سمت سرور.

## قواعد کلی

1. `DATABASE_URL` فقط از env خوانده می‌شود (`src/db/index.ts: resolveDatabaseUrl`) — فالبک **ندارد**؛ بدون آن APIهای دیتابیس 503 برمی‌گردانند و سایت با دیتای استاتیک بالا می‌آید.
2. هیچ رازی به باندل کلاینت نشت نمی‌کند — فقط متغیرهای `NEXT_PUBLIC_*` در کلاینت دیده می‌شوند.
3. بیلد به PostgreSQL محلی وابسته نیست (184 پیش‌رندر با DB؛ بیلد بدون DB هم سبز).
4. متغیر بیلد `NEXT_OUTPUT_STANDALONE=1` فقط برای زنجیرهٔ Cloudflare (اسکریپت‌های cf خودشان ست می‌کنند).

## الزامی (بدون این‌ها استقرار ناقص است)

| متغیر | توضیح |
| --- | --- |
| `DATABASE_URL` | رشتهٔ اتصال PostgreSQL میزبانی‌شده (TLS خودکار برای هاست غیرمحلی). در Workers با `wrangler secret put DATABASE_URL` |
| `AUTH_SECRET` | راز امضای JWT نشست (jose HS256) — حداقل ۳۲ نویسه؛ `openssl rand -base64 48`. مستعارها: `NEXTAUTH_SECRET`, `JWT_SECRET` |
| `NEXT_PUBLIC_SITE_URL` | آدرس عمومی مطلق — canonical/sitemap/robots/JSON-LD/CSRF همه از همین |
| `ADMIN_EMAILS` | ایمیل(های) مجاز پنل ادمین، با کاما |

## احراز هویت و OAuth (اختیاری)

| متغیر | توضیح |
| --- | --- |
| `GOOGLE_CLIENT_ID/SECRET` | OAuth گوگل؛ callback: `{SITE_URL}/api/auth/google/callback` |
| `APPLE_CLIENT_ID/TEAM_ID/KEY_ID/PRIVATE_KEY` | OAuth اپل؛ امضای client-secret سمت سرور (`src/app/api/auth/apple/client-secret.ts`) |
| `SMS_PROVIDER` / `SMS_API_KEY` | سرویس پیامک (کاوه‌نگار). خالی = OTP ساخته می‌شود ولی ارسال نه (هشدار در لاگ) |
| `ALLOW_DEV_OTP_HINT` | فقط dev بدون SMS — کد OTP در پاسخ برمی‌گردد؛ **هرگز در تولید** |
| `FORCE_SECURE_COOKIES` | کوکی Secure حتی خارج از production |

## پرداخت (بازار ایران)

| متغیر | توضیح |
| --- | --- |
| `GATEWAY_PROVIDER` / `GATEWAY_API_KEY` | درگاه شاپرکی — زرین‌پال v4 |
| `SNAP_PAY_*` | اسنپ‌پی (اقساط): API key، base، سقف مبلغ |
| `DIGIPAY_*` | دیجی‌پی: oauth + tickets/business + purchases/verify |
| `COD_ENABLED/COD_PROVINCES/COD_MAX_AMOUNT` | پرداخت در محل |
| `PAYMENTS_SANDBOX` | فقط dev؛ در تولید حتماً `0` — شبیه‌ساز فقط در dev |
| `IDENTITY_REQUIRED` | احراز هویت سفارش (کد ملی + موبایل تأییدشده) — پیش‌فرض `1` |
| `IDENTITY_PROVIDER` | `simulation` (dev) یا OTP واقعی |

> **امنیت:** روش/مبلغ/تخفیف پرداخت همیشه سمت سرور تعیین می‌شود؛ درگاه پیکربندی‌نشده 503 می‌دهد نه جعل.

## محتوا و آنالیتیکس

| متغیر | توضیح |
| --- | --- |
| `INSTAGRAM_ACCESS_TOKEN/USER_ID` | فید زندهٔ Graph API؛ خالی = پست‌های منتخب از پنل ادمین |
| `NEXT_PUBLIC_GTM_ID` | Google Tag Manager — خالی = اسکریپت تزریق نمی‌شود (CSP هم فقط همین دامنه را مجاز می‌کند) |

## جریان کاری امن

```bash
cp .env.example .env            # محلی
bash scripts/verify-production.sh   # راستی‌آزمایی تولید (بدون چاپ راز)
```

- در Cloudflare: Dashboard → Workers → Settings → Variables (یا `wrangler secret put`).
- برای بکاپ/بازیابی env: `npm run env:recovery` (اسکریپت `scripts/env-recovery.sh`).
- اسکن «راز هاردکد در src» انجام شده: **صفر مورد** (grep الگوی secret/password/token با مقدار بلند).
