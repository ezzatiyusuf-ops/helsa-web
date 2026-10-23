# رفع اشکال هلسا (TROUBLESHOOTING)

## `DATABASE_URL is required` یا نبود داده

**علت:** متغیر `DATABASE_URL` تنظیم نشده است.

**راه‌حل:**

```bash
cp .env.example .env
# مقدار DATABASE_URL را تنظیم کنید، سپس:
npx drizzle-kit push
npx tsx --env-file=.env scripts/seed.ts
```

معماری فعلی در نبود این متغیر **کرش نمی‌کند**: پیام توسعه‌دهنده در کنسول چاپ می‌شود،
ویترین از داده seed استفاده می‌کند و مسیرهای وابسته به دیتابیس پاسخ `503` با پیام فارسی می‌دهند.
برای بررسی وضعیت: `curl http://localhost:3000/api/health`

## ورود با گوگل/اپل کار نمی‌کند

به `/login?social=unconfigured` هدایت می‌شوید یعنی کلیدها تنظیم نشده‌اند.
`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` یا مجموعه `APPLE_*` را تنظیم کنید.
Redirect URI باید دقیقاً با `{NEXT_PUBLIC_SITE_URL}/api/auth/{provider}/callback` یکی باشد.

## پرداخت آنلاین نمایش داده نمی‌شود

عمدی است: تا وقتی `GATEWAY_PROVIDER` و `GATEWAY_API_KEY` تنظیم نشده باشند،
روش «پرداخت آنلاین» پنهان می‌ماند تا پرداخت جعلی رخ ندهد.
از «کارت به کارت» یا «پرداخت در محل» استفاده کنید یا درگاه را پیکربندی کنید.

## کد OTP / بازیابی رمز نمی‌رسد

بدون `SMS_PROVIDER`، سامانه در حالت نمایشی است و کد `123456` روی صفحه اعلام می‌شود.
برای ارسال واقعی، سرویس پیامک را در `src/app/api/auth/reset/route.ts` وصل کنید.

## تم تیره درست نمایش داده نمی‌شود

- مطمئن شوید کلاس‌ها از توکن‌های معنایی استفاده می‌کنند (`bg-surface`, `text-heading`)
  و نه رنگ خام (`bg-white`, `text-black`).
- مقدار ذخیره‌شده: `localStorage.helsa-theme` = `light | dark | system`.

## خطای هیدراسیون (Hydration mismatch)

معمولاً از رندر تاریخ/عدد وابسته به زمان یا خواندن `localStorage` هنگام رندر می‌آید.
از `useEffect` برای مقادیر کلاینتی استفاده کنید. تم با اسکریپت ضدپرش قبل از هیدراسیون تنظیم می‌شود.

## خطاهای TypeScript یا Lint

```bash
npm run typecheck
npm run lint
```

## پاک‌سازی کامل build

```bash
rm -rf .next
npm run build
```

## بازنشانی دیتابیس توسعه

```bash
psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
npx drizzle-kit push
npx tsx --env-file=.env scripts/seed.ts
```

## اپلیکیشن (PWA) نصب نمی‌شود

- سرویس‌ورکر تنها در **build تولید** ثبت می‌شود: `npm run build && npm start`.
- نصب روی دامنه واقعی **نیازمند HTTPS** است (روی `localhost` استثناست).
- در Chrome DevTools → Application → Manifest خطاها را ببینید.
- در iOS رویداد `beforeinstallprompt` وجود ندارد؛ نصب از Safari →
  «Add to Home Screen» انجام می‌شود.

## سرویس‌ورکر نسخه قدیمی را نشان می‌دهد

1. مقدار `VERSION` در `public/sw.js` را افزایش دهید.
2. build و start مجدد.
3. یا در DevTools → Application → Service Workers → **Unregister** و رفرش.

## دکمه پشتیبانی روی محتوا می‌افتد

موقعیت آن با `bottom-[calc(5rem+env(safe-area-inset-bottom))]` و `start-4`
تنظیم شده است. اگر عنصر چسبان جدیدی اضافه کردید، فاصله را در
`src/components/layout/SupportButton.tsx` هماهنگ کنید (z-index فعلی `74`،
زیر بنر کوکی `75` و پرامپت نصب `76`).
