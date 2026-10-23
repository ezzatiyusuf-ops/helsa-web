# راهنمای استقرار (DEPLOYMENT)

> مسیر رسمی: **Cloudflare Workers + OpenNext**. جزئیات کامل معماری CF: `docs/CLOUDFLARE.md` · متغیرها: `docs/ENVIRONMENT.md` · تست: `docs/TESTING.md`.

## ۱) پیش‌نیازها

- Node.js ≥ 20 (برای wrangler ≥ 22) — محلی این پروژه با Node 22 تست شده
- PostgreSQL میزبانی‌شده (Supabase / Neon / Railway / …) با TLS
- اکانت Cloudflare + wrangler لاگین (`npx wrangler login`)

## ۲) پیکربندی

```bash
cp .env.production.example .env     # مقادیر واقعی را بگذارید
npx wrangler secret put DATABASE_URL
npx wrangler secret put AUTH_SECRET
# و بقیهٔ متغیرها طبق docs/ENVIRONMENT.md (Dashboard → Workers → Settings → Variables)
```

## ۳) مایگریشن دیتابیس (از CI/محلی، نه از Worker)

```bash
npm run db:migrate       # drizzle-kit migrate — اتصال مستقیم
npm run db:backup        # بکاپ پیش از هر تغییر (pg_dump)
```

## ۴) بیلد و راستی‌آزمایی

```bash
npm test                          # typecheck + lint + unit — باید سبز باشد
npm run cf:build:local            # روی باکس کم‌حافظه (بیلد جدا + skipNextBuild)
npx wrangler deploy --dry-run     # بررسی باندل بدون انتشار
```

نتیجهٔ مرجع آخرین اجرا: بیلد ۱۸۴ پیش‌رندر محصول · باندل 14579.70 KiB / gzip 2980.31 KiB.

## ۵) انتشار

```bash
npm run deploy        # = cf:build + opennextjs-cloudflare deploy
```

## ۶) پس از انتشار (Smoke test)

1. `GET /api/health` → سالم
2. چند صفحهٔ کلیدی: `/`، `/products`، یک صفحه محصول، `/cart`، `/login`
3. `npx wrangler tail` — پایش لاگ زنده برای خطا
4. سفارش آزمایشی COD یا پیش‌پرداخت در حالت sandbox

## استقرار محلی (توسعه)

```bash
npm run dev                            # توسعه
NODE_OPTIONS=--max-old-space-size=1100 npm run build   # بیلد محلی (بدون standalone)
npm run start                          # next start — با standalone ناسازگار است
```

## بازیابی

- بکاپ دیتابیس: `scripts/backup-db.sh` / بازیابی: `scripts/restore-db.sh` (فهرست بکاپ‌ها و رویه در `docs/backup-restore.md`)
- بازیابی env: `npm run env:recovery`
- Rollback: نسخهٔ قبلی Worker از Dashboard → Deployments → Rollback (یا deploy مجدد کامیت قبلی)

## موارد باز (نیازمند مقادیر واقعی از مشتری)

زرین‌پال (کلید API) · کاوه‌نگار (SMS) · کدهای Enamad/Samandehi/درگاه · تأیید نهایی هزینهٔ ارسال ۸۵٬۰۰۰ تومانی · دامنهٔ نهایی DNS.
