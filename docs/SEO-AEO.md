# سئو و AEO (SEO-AEO)

> سئوی هلسا برای جست‌وجوی فارسی (Google) + پاسخ‌دهی به موتورهای هوش مصنوعی (AEO — AI Engine Optimization) طراحی شده و با `qa-meta-crawl.cjs` (۲۸ تست سبز) راستی‌آزمایی می‌شود.

## زیرساخت فنی

| مورد | وضعیت | محل |
| --- | --- | --- |
| `sitemap.xml` داینامیک | ✅ همهٔ صفحات + محصولات (184) + بلاگ | `src/app/sitemap.ts` |
| `robots.txt` | ✅ | `src/app/robots.ts` |
| canonical در همهٔ صفحات کلیدی | ✅ `alternates.canonical` | متادیتای صفحات |
| Open Graph (fa_IR) + twitter | ✅ | متادیتای صفحات |
| متادیتای داینامیک محصول/بلاگ | ✅ ۱۰ صفحهٔ `generateMetadata` | `src/app/**` |
| URL عمومی مطلق | `NEXT_PUBLIC_SITE_URL` → فالبک config | `src/lib/seo.ts` |
| SSR/ISR (نه client-only) | ✅ محتوای رندر سرور برای خزنده | App Router |

## JSON-LD (Schema.org) — قلب AEO

از `src/lib/seo.ts` + `src/components/seo/JsonLd.tsx`:

- **Organization** — نام قانونی، برند، لوگو، شعار، تماس (پنل دانش گوگل + هویت برای LLMها)
- **Product** — فقط فیلدهای واقعی؛ **AggregateRating فقط وقتی نظر واقعی وجود دارد** (نمرهٔ ساختگی ممنوع)
- **BreadcrumbList** — مسیر ناوبری در نتایج
- **FAQPage** — پرسش‌های پاسخ‌دار (featured snippet + استخراج پاسخ توسط AI)
- سینی مزه (tray) هم به‌صورت Product با اطلاعات سروicing

## AEO — چرا برای هوش مصنوعی بهینه است

1. **محتوای متنی SSR** — پاسخ‌ها در HTML اولیه هستند، نه پشت fetch کلاینت.
2. **FAQ ساخت‌یافته** — پرسش/پاسخ‌های فارسی واقعی با FAQPage schema.
3. **اطلاعات هویتی منسجم** — Organization واحد با `@id` پایدار؛ NAP (نام/آدرس/تلفن) یکسان در کل سایت.
4. **صفحات پاسخ‌محور** — بلاگ و صفحات راهنما با `generateMetadata` و canonical اختصاصی.
5. **پوزیشن برند روشن** — «تولید+فرآوری+فروش» خورما/آجیل/سینی مزه — در متادیتا و متن (نه farming محض).

## راستی‌آزمایی

```bash
node qa-meta-crawl.cjs     # ۲۸ تست: titles/descriptions/canonical/OG/sitemap/robots/JSON-LD
curl -s https://SITE/sitemap.xml | head
curl -s https://SITE/products/mazafati-dates | grep -o 'application/ld+json'
```

## باز (نیاز به مشتری)

- دامنهٔ نهایی (`helsairanian.ir`) روی استقرار واقعی → متادیتا خودکار از `NEXT_PUBLIC_SITE_URL` پیگیری می‌شود.
- ثبت Google Search Console + acceleratorهای Bing/ChatGPT-adjacent crawlers در robots (در صورت تمایل به ایندکس AI).
- محتوای بلاگ بیشتر = سطح AEO عمیق‌تر (زیرساخت آماده است).
