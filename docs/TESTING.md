# تست و تضمین کیفیت (TESTING)

> وضعیت به تاریخ مهاجرت Next 16.3.5 + Cloudflare (سپتامبر ۲۰۲۶). همهٔ اعداد زیر **خروجی واقعی اجرا** هستند، نه برآورد.

## باتری QA — ۱۴ سوئیت، ۳۳۸/۳۳۸ سبز

| سوئیت | فایل | تست | وضعیت |
| --- | --- | --- | --- |
| Unit | `tests/unit.test.ts` (`npm run test:unit`) | 7 | ✅ |
| Audit-fixes | `qa-audit-fixes.cjs` | 58 | ✅ |
| Journey | `qa-j37-journey.cjs` | 32 | ✅ |
| Price | `qa-price-regression.cjs` | 10 | ✅ |
| Meta/SEO | `qa-meta-crawl.cjs` | 28 | ✅ |
| Security | `qa-security.cjs` | 18 | ✅ |
| A11y | `qa-j40-a11y.cjs` | 21 | ✅ |
| Cart | `qa-j37-cart.cjs` | 55 | ✅ |
| Auth form | `qa-auth-form.cjs` | 32 | ✅ |
| Orders/account | `qa-j31-orders.cjs` | 7 | ✅ |
| J31 UI | `qa-j31-ui.cjs` | 40 | ✅ |
| J31 redirect | `qa-j31-redirect.cjs` | 2 | ✅ |
| Guest checkout | `qa-guest-checkout.cjs` | 12 | ✅ (سفارش واقعی HLA-…) |
| Admin | `qa-admin.cjs` | 16 | ✅ |

**اجرا:** سوئیت‌های `qa-*.cjs` با Playwright و سرور در حال اجرا کار می‌کنند:

```bash
npm run start &          # یا build && start
node qa-j37-cart.cjs     # هر سوئیت جدا
```

> **اصلاح شفاف (۱۴۰۲/۰۶/۲۶):** ثبت قبلی این باتری ۳۶۲ بود که شامل «journey-auth=31» بود؛ فایل `qa-j31-orders.cjs` در واقع ۷ چک دارد و رقم ۳۱ قابل بازتولید نبود. جمع دقیق و قابل بازتولید: **۳۳۸**.

> قبل از هر دستهٔ auth، جدول `auth_challenges` را پاک کنید و کاربر QA تستی را حذف/بازسازی کنید (درازمدت: rate-limit درون‌حافظه‌ای بین سوئیت‌ها روی هم انبار می‌شود — با ری‌استارت سرور تست صفر می‌شود).

## استرس انبار (oversell) — 15/15 سبز

`scripts/inventory-stress.py` — ۱۰ خریدار هم‌زمان روی موجودی ۲۰:

- دقیقاً ۶ سفارش موفق (۱۸ از ۲۰)، ۴ رد صحیح (400)
- موجودی نهایی ۲ — **بدون oversell و بدون موجودی منفی**
- سفارش بیشتر از باقی‌مانده → رد؛ موجودی صفر → رد (نه کرش)
- لغو سفارش → بازگردانی موجودی (+3 → 3) ✓

```bash
# نکته: برای ایزوله‌کردن منطق موجودی، سرور تست با IDENTITY_REQUIRED=0 بالا می‌آید
IDENTITY_REQUIRED=0 npm run start -- -p 3001 &
HELSA_BASE=http://localhost:3001 python3 scripts/inventory-stress.py
```

> مسیر هویتِ سفارش جداگانه پوشش داده شده (guest checkout 12 تست + auth journey 31 تست با IDENTITY_REQUIRED=1).

## گیت‌های کیفیت

| گیت | دستور | نتیجهٔ آخر |
| --- | --- | --- |
| TypeScript | `npm run typecheck` | ✅ |
| ESLint | `NODE_OPTIONS=--max-old-space-size=3000 npx eslint .` | ✅ 0 خطا / 0 هشدار |
| بیلد محلی | `NODE_OPTIONS=--max-old-space-size=1100 npm run build` | ✅ ۱۸۴ پیش‌رندر محصول (۲۹۱ مسیر کل) |
| زنجیرهٔ CF | `npm run cf:build:local` + `wrangler deploy --dry-run` | ✅ 14579.70 KiB / gzip 2980.31 KiB |
| همه با هم | `npm test` | typecheck + lint + unit |

**پیش‌نیاز حافظه (باکس ≤2GB):** swap ≥ 5GB + `NODE_OPTIONS` بالا؛ eslint بدون heap 3GB OOM می‌شود. Turbopack روی 2GB همیشه OOM است → build با `--webpack` پین شده.

## نکات صادقانه

- سوئیت‌ها در همان پروسهٔ سرور state درون‌حافظه دارند (rate-limit) — بین اجراهای متوالی سرور را ری‌استارت کنید.
- `qa-j32-ui` / `qa-j34-edge` سوئیت‌های تاریخی نسخه‌های قبلی‌اند و در باتری روزمره نیستند (جایگزین‌های بالاتر پوشش می‌دهند).
- تست دستی موبایل/RTL در Playwright با viewport+dir پوشش داده شده، نه دستگاه واقعی.
