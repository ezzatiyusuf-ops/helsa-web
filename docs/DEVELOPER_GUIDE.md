# راهنمای توسعه‌دهنده هلسا — DEVELOPER_GUIDE.md

> این سند نقطه شروع هر توسعه‌دهنده جدید است. برای جزئیات هر حوزه به مستندات تخصصی در `docs/` بروید.

## ۱. راه‌اندازی سریع

```bash
npm install
sudo apt-get install -y postgresql          # اگر نیست
bash scripts/dev-setup.sh                    # PG + دیتابیس + seed
cp .env.example .env  # اگر نبود؛ مقادیر dev آماده است
npm run dev                                  # http://localhost:3000
```

**محیط dev:** PG در `127.0.0.1:5432/helsa_db` (کاربر `helsa`)، `ALLOW_DEV_OTP_HINT=1` (کد OTP در پاسخ API برمی‌گردد).

## ۲. اسکریپت‌ها

| دستور | کار |
| --- | --- |
| `npm run dev` | سرور توسعه |
| `npm run build` | بیلد production (سندباکس کم‌حافظه: `NODE_OPTIONS="--max-old-space-size=2600" npx next build`) |
| `npm run typecheck` | `tsc --noEmit` — **قبل از هر کامیت باید پاک باشد** |
| `npm run lint` | ESLint — 0 error |
| `bash scripts/dev-setup.sh` | راه‌اندازی کامل محیط |
| `npx tsx scripts/seed-wholesale.ts` | داده دمو پرتال عمده |
| `python3 scripts/stress-test-auth.py` | استرس‌تست auth (۱۴ چک؛ سرور باید تازه restart شده باشد) |

## ۳. نقشه کد

```
src/
├── app/               # مسیرها (App Router) — صفحه = page.tsx + متادیتا
│   ├── api/           # Route Handlers؛ هر دامنه یک پوشه
│   ├── admin/         # پنل ادمین (NAV: ...عمده B2B...)
│   ├── wholesale/     # پرتال عمده B2B
│   └── blog/          # بلاگ + sitemap
├── components/        # layout / home / mazeh / gifts / ui / admin /
│   │                  # wholesale / blog / consent / theme / pwa
├── config/            # کانفیگ دامنه‌ای: mazeh, site, corporate-gifts,
│                      # tray-builder, wholesale, i18n/
├── services/          # لایه دسترسی داده (catalog, gifts, wholesale)
├── data/content.ts    # محتوای استاتیک: BLOG_POSTS, COUPONS
├── db/schema.ts       # Drizzle schema (جدول‌ها + relations)
├── lib/               # session, admin, security, auth-service (server-only!),
│                      # seo, format (faDigits/faDate)
└── types/index.ts     # تایپ‌های مشترک (BlogPost, ...)
```

## ۴. قواعد پروژه (non-negotiable)

1. **قیمت فقط سرور-محور.** کلاینت فقط id/quantity می‌فرستد. هر قیمت در کلاینت = باگ.
2. **RTL فارسی اول.** کلاس‌های منطقی (`ps-`/`pe-`/`ms-`/`me-`)، اعداد با `faDigits`، تاریخ با `faDate`.
3. **توکن‌های طراحی معنایی** (`text-heading`, `bg-surface`, `border-line`, `text-muted`, ...) — رنگ خام ننویس؛ تم روشن/تیره خودکار می‌ماند.
4. **API ها:** Zod برای ورودی + `requireSession()`/`requireAdminApi()` + `csrfRejectedResponse`/`rateLimitedResponse` برای مسیرهای حساس.
5. **نشست:** id مشتری فقط با `customerIdFromSession(session)` (فرمت `sub` = `customer:{id}`).
6. **`auth-service.ts` server-only است** — در seed/کلاینت import نکن.
7. **اعتبارسنجی نهایی:** `typecheck` پاک + `lint` بدون error + curl مسیرهای تغییرگرفته.

## ۵. الگوهای مرجع (کپی کن از این‌ها)

| نیاز | الگو در کد |
| --- | --- |
| API عمومی با فیلتر | `src/app/api/products/route.ts` |
| API خصوصی مشتری | `src/app/api/wholesale/orders/route.ts` (گارد 401/403/400/404) |
| API ادمین | `src/app/api/admin/wholesale/route.ts` + `adminErrorResponse` |
| قیمت سرور-محور + transaction | `POST /api/orders` |
| فرم چندمرحله‌ای کلاینت | `src/app/wholesale/register/page.tsx` |
| کامپوننت consent-aware | `src/components/consent/CookieConsent.tsx` |
| تست قابل تکرار | `scripts/stress-test-auth.py` |

## ۶. جریان کار پیشنهادی

1. از `main` برنچ بزن؛ فاز/فیچر در کامیت‌های کوچک
2. قبل از PR: `npm run typecheck && npm run lint` + تست دستی curl/مرورگر
3. برای تغییرات auth/order: `scripts/stress-test-auth.py` بعد از restart سرور
4. CHANGELOG.md را آپدیت کن

## ۷. دام‌های شناخته‌شده (خوانده‌شده از تجربه)

- drizzle `or()` با ستون nullable: آرایه شرط بساز و `or(...conds)`
- تست‌های functional ثبت‌نام را **sequential** اجرا کن — پارالل rate-limit را فعال می‌کند
- ویرایش `next.config.ts` سرور dev را restart می‌کند — بعدش health-check کن
- بیلد در سندباکس ۲GB حافظه: dev را ببند و `NODE_OPTIONS` بده
