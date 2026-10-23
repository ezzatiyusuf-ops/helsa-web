# گزارش نهایی بریف ۱۵بندی — «Consistent, fast, production-ready, manageable from Admin»

تاریخ: ۱۴ شهریور ۱۴۰۵ / 2026-09-17 · سرور: `next start` :3000 روی بیلد تازه (۱۸۴ صفحهٔ محصول پیش‌رندر) · همهٔ ادعاها با تست واقعی روی همین workspace اثبات شده‌اند.

---

## A-۲) دور دوم سرعت: «چرا هلسا؟» و اینستاگرام (درخواست مستقیم کاربر)

**علامت:** هر دو سکشن «خیلی دیر لود می‌شوند» و کاربر خواست روی دیتای آفلاین بیایند.

**ریشهٔ واقعی:** همان ریشهٔ بند A-1 — دروازهٔ انیمیشن `Reveal` (framer-motion): «چرا هلسا؟» (SectionHead + ۶ کارت با delay پلکانی ۵۰ms) و کل سکشن اینستاگرام (تیتر، استوری‌ها، هر پست با delay ۴۰ms، نوار سوشال، لینک) همه `opacity:0` بودند تا هیدراسیون JS + رویداد whileInView. دادهٔ اینستاگرام از ابتدا سمت سرور خوانده می‌شد (بدون Graph API چون هیچ توکنی در DB/env تنظیم نیست) — یعنی «دیر دیده شدن» انیمیشن بود، نه شبکه.

| اصلاح | اثر |
|---|---|
| حذف کامل `Reveal` از «چرا هلسا؟» و `InstagramSection` (۱۲ wrapper) | هر دو سکشن در HTML اولیه با `opacity:1` — Playwright با **JS خاموش**: ۶/۶ کارت و ۸/۸ پست و ۵/۵ سوشال visible ✓ (`qa-instant-sections.cjs` = 24/24) |
| **دیتای آفلاین اینستاگرام:** `npm run catalog:export` حالا `src/data/instagram.ts` هم می‌سازد (۱۶ پست + ۱۰ استوری از رکوردهای واقعی منتخب؛ بدون هیچ لایک/کامنت جعلی) و `getCuratedPosts/Stories` در نبود/قطعی DB به آن برمی‌گردند | با `DATABASE_URL` غلط، سرویس ۸ پست + ۱۰ استوری برمی‌گرداند (تست tsx) و کل صفحهٔ اصلی با **DB قطع** کامل رندر شد: چرا هلسا ۵/۵ عنوان، پست‌ها/استوری‌ها از fallback، شمارش ۱۸۴ از fallback کاتالوگ، prem-card×12 — اثبات با `next start` جدا روی :3005 با env غلط |

هشدار نگهداری: بعد از تغییر پست‌های منتخب در پنل ادمین هم `npm run catalog:export` اجرا شود تا دیتای آفلاین اینستاگرام همگام بماند.

---

## A) ریشه‌یابی و اصلاح‌های پنج‌گانه (بندهای ۱-۵ بریف)

| # | نشانه | ریشهٔ واقعی | اصلاح | اثبات |
|---|---|---|---|---|
| ۱ | کندی «برای چه مناسبتی خرید می‌کنید؟» | `Reveal` (framer-motion) روی محتوای کاملاً استاتیک → محتوا تا هیدراسیون JS پشت `opacity:0` قفل بود. هیچ دادهٔ API‌ای در کار نبود؛ «لودینگ» نبود، دروازهٔ انیمیشن بود. | حذف Reveal از SectionHead و ۶ کارت مناسبت در `HomepageLite.tsx` — SSR خالص | Playwright با **JS غیرفعال**: کارت در DOM، `opacity=1`، بدون هیچ انتظار انیمیشن ✓ |
| ۲ | شمارش «۳۴» | `src/data/products.ts` (fallback بدون DB) فقط ۳۴ seed داشت؛ نوار اعتماد ۱۸۴ را هاردکد زده بود | اسکریپت `npm run catalog:export` → بازتولید fallback از DB با همان نگاشت `getProducts` (هدر AUTO-GENERATED) + شمارش نوار از `products.length` مشتق شد | DOM: «۱۸۴+ محصول طبیعی» و «۱۸۴ محصول» هدر کاتالوگ؛ صفر مورد «۳۴» در HTML ✓ |
| ۳ | سه سیستم کارت ناهمگون | GoldenTrayCard/GiftBoxCard با rounded-2xl، aspect-[4/5]، p-4، CTA «افزوده شد» h-11 در برابر prem-card/p-3/aspect-square/h-10 | بازنویسی هر دو با **پوستهٔ دقیق ProductCard** | DOM سکشن پیشنهاد ویژه: ۴×`prem-card` + `p-3` + `aspect-square` + CTA «افزودن به سبد» h-10 با ارتفاع یکنواخت ۴۰px ✓ |
| ۴ | «پیشنهاد ویژه» ناهماهنگ | سه کامپوننت رقیب + fetch آبشاری (trays→gifts→campaigns متوالی) | پوستهٔ واحد (بند ۳) + `Promise.all` موازی + متن واحد | بیلد سبز؛ ۴ کارت هم‌پوسته در ۸ عرض بدون overflow ✓ |
| ۵ | شمارش‌معکوس چندماههٔ جعلی | `CAMPAIGN_END` هاردکد `2026-12-30` — همیشه می‌تپید | `activeCampaignEnd()`: زودترین پایانِ کمپینِ **فعالِ در حال برگزاری** از جدول `campaigns` + گیت سخت `0 < remaining ≤ 24h`؛ مهر زمان پایان server-generated (`toISOString`) | E2E کامل در §E (ظاهر/محو) ✓ |

**رفتار شمارش‌معکوس (مطابق بندهای ۵ بریف):** بدون کمپین فعال در ۲۴ ساعت پایانی → **هیچ شمارش‌معکوسی رندر نمی‌شود** (وضعیت فعلی سایت: هر ۷ کمپین یا پایان‌یافته‌اند یا gifts که ~۳ ماه مانده → تایمر به‌درستی غایب است و desc عادی «چهار انتخاب ممتاز با قیمت واقعی هلسا» دیده می‌شود). منقضی → از محاسبه حذف می‌شود؛ قیمت‌ها واقعی‌اند، هیچ فوریت جعلی‌ای ساخته نمی‌شود.

---

## B) پرفورمنس (بند ۱۰)

- **رفع waterfall:** سه منبع دادهٔ پیشنهاد ویژه حالا با یک `Promise.all` موازی.
- **First Load صفحهٔ اصلی: ۲۹۸ KiB gzip** (JS 281 + CSS 17، اندازه‌گیری واقعی gzip روی فایل‌های خودِ HTML) — کاتالوگ fallback ۵۷۰KB فقط سمت سرور است و در هیچ chunk کلاینت نیست (بررسی شد).
- مناسبت: صفر وابستگی به JS برای دیده‌شدن (بند A-1).
- ۱۸۴ صفحهٔ محصول پیش‌رندر؛ rebuild کامل بدون خطا (`NODE_OPTIONS=--max-old-space-size=1100`).

## C) ماتریس شمارش محصول (بند ۲) — همه از یک منبع مشتق

| لایه | مقدار | منبع/فایل |
|---|---|---|
| رکورد واقعی DB (active∧visible) | **۱۸۴** | `products` در PostgreSQL |
| seed/fallback (بدون DB) | **۱۸۴** (قبلاً ۳۴) | `src/data/products.ts` — auto-generated با `npm run catalog:export` |
| نمایش نوار اعتماد صفحهٔ اصلی | **۱۸۴+** (مشتق از `products.length`، نه هاردکد) | `HomepageLite.tsx` |
| هدر کاتالوگ `/products` | **۱۸۴ محصول** (مشتق) | `src/app/products/page.tsx` |
| structured-data | بدون شمارش محصول؛ عدد 34 در هیچ JSON-LD نیست | qa-meta-crawl 28/28 ✓ |
| هدف بریف | ۱۸۴ | ✓ برآورده — **بدون ساخت هیچ محصول فیک** |

⚠️ قاعدهٔ نگهداری: بعد از هر تغییر کاتالوگ در DB، `npm run catalog:export` را اجرا کنید تا fallback همیشه همگام بماند (فایل هشدار می‌دهد اگر تعداد ≠۱۸۴ شد).

## D) ماتریس ادمین (بندهای ۶-۸) — صادقانه، طبق قواعد §۱۵

| بخش | API سمت سرور | UI | وضعیت |
|---|---|---|---|
| داشبورد + ۳ سنجهٔ جدید (محصولات فعال از کل، کمپین‌های فعال، پیام‌های تماس) | ✓ | ✓ | **FUNCTIONAL** — همه از SQL واقعی: `productsTotal=184, productsActive=184, activeCampaigns=7, contactMessages=27, orders=51, customers=55`. صفرِ واقعی به‌صورت «۰» نمایش داده می‌شود (نه دادهٔ ساختگی). |
| **کمپین‌ها (جدید این دور)** | `GET/POST /api/admin/campaigns` + `PATCH /api/admin/campaigns/[id]` | `/admin/campaigns` (جدول + فرم + toggle + برچسب وضعیت واقعی از تاریخ‌ها) | **FUNCTIONAL با persist واقعی** — E2E کامل: ساخت→ظاهر شدن شمارش‌معکوس در صفحهٔ اصلی→ویرایش→غیرفعال‌سازی→محو؛ audit log در `admin_audit_logs` |
| محصولات/دسته‌ها/سینی‌ها/موجودی/سفارش‌ها/مشتریان/درخواست‌ها/عمده/حسابداری/تنظیمات/جستجو | ✓ (موجود از قبل) | ✓ | **FUNCTIONAL** — پس از تغییرات این دور، qa-admin 16/16 و j37-journey 32/32 سبز |
| کوپن‌ها | ✗ | ✗ | **وجود ندارد** — جدول `coupons` در schema هست ولی UI/API ساخته نشده (خارج از ۱۵ بند نبود؛ «where schema allows» — اگر بخواهید در دور بعد ساخته می‌شود) |
| پیام‌های تماس (mark-as-read) | فقط دیدن | — | **NOT FUNCTIONAL** — جدول `contact_messages` ستون `status/read` ندارد → علامت‌گذاری خوانده‌شده **REQUIRES PRODUCTION DATABASE** (نیازمند migration `ALTER TABLE ... ADD COLUMN`) |
| امنیت (بند ۷) | همهٔ APIهای ادمین: `requireAdminApi()` سمت سرور + same-origin روی غیرGET + rate-limit 60/60s + zod | — | **تست‌شده:** بدون سشن → 401 فارسی؛ POST بدون Origin → 403؛ هیچ نقش‌/isAdmin کلاینت‌محوری وجود ندارد |

## E) تست‌ها (بندهای ۱۳-۱۴) — همه روی بیلد تولیدی همان شب اجرا شد

| سوئیت | نتیجه |
|---|---|
| typecheck / eslint / unit | ✓ ✓ 7/7 |
| build (تولیدی) | ✓ · ۱۸۴ پیش‌رندر |
| qa-campaigns (جدید، مرورگری) | **17/17** |
| qa-j37-journey | 32/32 |
| qa-j37-cart | 55/55 |
| qa-visual-audit (۳۶ صفحه) | 36/36 · CRITICAL=0 |
| qa-meta-crawl (SEO) | 28/28 |
| qa-security | 18/18 |
| qa-admin | 16/16 |
| qa-j31-ui / qa-j40-a11y / hero-readability / price-regression | 40/40 · 21/21 · 138/138 · 10/10 |
| ریسپانسیو سکشن‌های جدید (320/360/390/430/768/1024/1280/1440) | 8/8 بدون overflow |
| qa-instant-sections (دوم — چرا هلسا/اینستاگرام، بدون JS + با JS + ۸ عرض) | **24/24** |

**≥۱۲ سناریوی مرورگری/E2E جدید:** (۱) مناسبت با JS خاموش دیده می‌شود opacity=1؛ (۲) ۱۸۴ بدون JS؛ (۳) ۴ کارت prem-card؛ (۴) CTA یکنواخت ۴۰px؛ (۵) غیبت تایمر بدون کمپینِ ≤۲۴h؛ (۶) ساخت کمپین پایان‌امروز → **تایمر واقعی ۰۶:۳۳:۴۶ روی صفحهٔ اصلی** ظاهر شد؛ (۷) غیرفعال‌سازی از ادمین → تایمر پس از چرخهٔ ISR (۶۰s) محو شد؛ (۸) لاگین owner → جدول ۷ کمپین واقعی؛ (۹) ساخت از UI با persist؛ (۱۰) toggle از UI؛ (۱۱) slug تکراری → 409؛ (۱۲) بدون Origin → 403؛ (۱۳) بدون سشن → 401؛ (۱۴) اعتبارسنجی zod (تاریخ/عنوان کوتاه) → 400.

## F) یافتهٔ مهم زیرساختی + وضعیت تولید

- 🐛 **باگ sequence بعد از restore (پیدا و رفع شد):** `campaigns_id_seq` بعد از بازیابی dump پشت `max(id)` مانده بود (seq=3 در برابر max=7) → هر INSERT روی campaigns با `duplicate key` می‌شکست؛ یعنی CRUD کمپین بدون این اصلاح روی دیتابیس بازیابی‌شده کار نمی‌کرد. **رفع:** setval روی همهٔ جدول‌ها + پچ دائمی `scripts/restore-db.sh` (همگام‌سازی خودکار sequenceها بعد از هر restore با DO-block). این یافته برای استقرار تولید حیاتی است.
- دیتای تست QA (کمپین‌های qa-*) از DB پاک شد؛ audit log آن‌ها (رد CREATE/UPDATE واقعی) باقی است — قبل از تولید پاک‌سازی شود.
- باز (بدون تغییر نسبت به قبل): زرین‌پال · کاوه‌نگار (SMS_PROVIDER تنظیم نیست) · نشان‌های Enamad/Samandehi · دامنه/DNS · gzip کل chunks سمت سرور ~460KiB (اولیهٔ صفحه ۲۹۸KiB).

### فهرست فایل‌های این دور
`HomepageLite.tsx` · `src/data/products.ts` (auto-gen) · `src/data/instagram.ts` (auto-gen) · `InstagramSection.tsx` · `services/instagram.ts` · `qa-instant-sections.cjs` · `GoldenTrayCard/GiftBoxCard/FlashOfferStrip.tsx` · `scripts/export-fallback-catalog.mjs` + `package.json` · `admin-validation.ts` · `services/admin.ts` · `api/admin/campaigns/{route,[id]/route}.ts` · `AdminPages.tsx` (CampaignsAdmin + داشبورد) · `AdminShell.tsx` (nav کمپین‌ها) · `app/admin/campaigns/page.tsx` · `scripts/restore-db.sh` (پچ sequence) · `qa-campaigns.cjs` · `qa-responsive-brief.cjs`
