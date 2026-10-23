# استقرار روی Cloudflare Workers (OpenNext)

> این سند مسیر رسمی و تست‌شدهٔ استقرار هلسا روی **Cloudflare Workers** با **OpenNext Cloudflare** است.
> جایگزین مستندات قدیمی Netlify شده است (گزارش Netlify صرفاً آرشیوی است).

## معماری

```
Next.js 16.3.5 (App Router, webpack)
        │  NEXT_OUTPUT_STANDALONE=1 next build --webpack
        ▼
output: "standalone" (.next/standalone)
        │  opennextjs-cloudflare build --skipNextBuild
        ▼
.open-next/worker.js  (Worker واحد؛ SSR + ISR + API Routes + Middleware)
        │  wrangler deploy
        ▼
Cloudflare Workers  ←→  PostgreSQL خارجی (TLS)
```

- **Static export نیست** — همهٔ قابلیت‌های سرور (SSR، API، middleware، ISR) حفظ شده‌اند.
- فایل‌های کانفیگ: `wrangler.jsonc` (Worker + assets + vars) · `open-next.config.ts` · `next.config.ts`.
- ابعاد باندل در آخرین dry-run تست‌شده: **14579.70 KiB / gzip 2980.31 KiB** (زیر سقف ۳MB gzip... مرز آستانه — پایش در هر بیلد).

## چرا standalone مشروط است؟

`output: "standalone"` با `next start` ناسازگار است (Next هشدار می‌دهد و رندر می‌شکند). بنابراین در `next.config.ts`:

```ts
output: process.env.NEXT_OUTPUT_STANDALONE === "1" ? "standalone" : undefined
```

- بیلد محلی/تست → بدون standalone → `next start` سالم.
- بیلد CF → با `NEXT_OUTPUT_STANDALONE=1` → OpenNext.

## دستورات (از package.json)

| دستور | کار |
| --- | --- |
| `npm run cf:build` | `NEXT_OUTPUT_STANDALONE=1 next build` + باندل OpenNext (یک‌تکه) |
| `npm run cf:build:local` | بیلد Next جدا + `opennextjs-cloudflare build --skipNextBuild` — برای باکس‌های کم‌حافظه |
| `npm run deploy` | cf:build + `opennextjs-cloudflare deploy` |
| `npm run preview` | اجرای محلی Worker باندل‌شده (`opennextjs-cloudflare preview`) |
| `npx wrangler deploy --dry-run` | راستی‌آزمایی بدون انتشار (نیازمند Node ≥ 22) |

> **حافظه:** روی ماشین ≤ 2GB حتماً swap بدهید و `NODE_OPTIONS=--max-old-space-size=1100` (بیلد) / `1400` (OpenNext) بگذارید. Turbopack روی 2GB OOM می‌شود — به همین دلیل build با `--webpack` پین شده.

## متغیرها و رازها

در Workers متغیرهای محیطی از **Dashboard → Workers → Settings → Variables** یا `wrangler secret put NAME` خوانده می‌شوند. `DATABASE_URL` فقط از env خوانده می‌شود (`src/db/index.ts`) — هرگز در کد یا کلاینت نیست. فهرست کامل: `docs/ENVIRONMENT.md`.

## دیتابیس

- PostgreSQL میزبانی‌شده (Supabase/Neon/Railway/…) با TLS.
- از Worker با `nodejs_compat` و درایور `pg` (اتصال TCP Socket). **Hyperdrive اختیاری** است (کش/pooling بین‌منطقه‌ای) — بدون آن هم کار می‌کند.
- Pool در Worker: `LazyPool` با کش `globalThis` (max:10, idle:30s, connection:10s) — برای محدودیت اتصال Workers.
- **Migrations هرگز از Worker اجرا نمی‌شود** — از CI/محلی با اتصال مستقیم: `npm run db:migrate`.

## چک‌لیست انتشار

1. `npm run test` سبز (typecheck + lint + unit)
2. `npm run cf:build:local` (یا cf:build) بدون خطا
3. `PATH=/opt/node22/bin:$PATH npx wrangler deploy --dry-run` ✓
4. متغیرهای محیطی Dashboard را با `docs/ENVIRONMENT.md` تطبیق دهید
5. `npm run deploy`
6. بعد از انتشار: `/api/health` و چند صفحهٔ کلیدی را بگیرید؛ لاگ‌ها: `wrangler tail`

## محدودیت‌های شناخته‌شده (brutally honest)

- باندل gzip ~2.98MB به سقف اسکریپت Workers (3MB پس‌از gzip) نزدیک است؛ رشد باندل باید پایش شود.
- امضای Apple (`client-secret`) و درگاه‌ها به راز واقعی نیاز دارند — بدون آن‌ها مسیر مربوطه 503 می‌دهد (طراحی‌شده، نه باگ).
- ورود با OTP بدون `SMS_PROVIDER` چالش می‌سازد ولی ارسال نمی‌کند (در لاگ هشدار می‌دهد).
