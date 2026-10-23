# راهنمای سئوی هلسا — SEO-GUIDE.md

> فاز ۱۳: سئوی سازمانی + AEO. همه metadata با Metadata API نسل ۳ Next.js.

## ۱. لایه متادیتا

- `src/lib/seo.ts` — `siteUrl`، `organizationJsonLd`، توابع کمکی
- هر صفحه: `title` / `description` فارسی + `alternates.canonical`
- OG + Twitter Card برای همه صفحات عمومی (تصویر 1200×630)

## ۲. داده ساخت‌یافته (JSON-LD)

| Schema | کجا |
| --- | --- |
| Organization + LocalBusiness | layout ریشه |
| Product + Offer + AggregateRating | صفحه محصول |
| Service/ItemList | سینی‌های مزه |
| BlogPosting (با `mainEntityOfPage` و `keywords`) | مقاله بلاگ |
| BreadcrumbList | صفحات دارای breadcrumb |
| FAQPage | بخش‌های پرسش‌وپاسخ |

**قانون:** Schema فقط داده‌های واقعی از DB/کانفیگ؛ هرگز مقدار جعلی (مثل امتیاز ساختگی) تولید نکن.

## ۳. سایتمپ‌ها

| مسیر | محتوا |
| --- | --- |
| `/sitemap.xml` | ۲۱ صفحه استاتیک با priority |
| `/products/sitemap.xml` | محصولات + `image:image` |
| `/mazeh-trays/sitemap.xml` | سینی‌ها + تصویر |
| `/gifts/sitemap.xml` | بسته‌های هدیه + تصویر |
| `/blog/sitemap.xml` | مقالات + تصویر |

همه `force-dynamic` (همیشه تازه). Next خودش `<lastmod>` می‌گذارد؛ robots.txt هر ۵ را با خط `Sitemap:` معرفی می‌کند.

**بعد از استقرار:** هر ۵ را در Google Search Console ثبت و submit کنید.

## ۴. robots.txt

- `Disallow` مسیرهای خصوصی/تراکنشی: `/api/`، `/cart`، `/checkout`، `/payment`، `/account`، `/admin`، `/wholesale/dashboard`، `/wholesale/register`، `/gifts/corporate/inquiry`، ...
- قانون مجزا برای موتورهای پاسخ AI (GPTBot، ClaudeBot، PerplexityBot، ...) — اجازه خزیدن محتوای عمومی، منع مسیرهای خصوصی

## ۵. بلاگ (فاز ۱۲)

- فیلتر دسته با `?cat=` (قابل ایندکس، canonical به `/blog`)
- مقاله: زمان مطالعه، برچسب‌ها، مقالات مرتبط، breadcrumb، اشتراک‌گذاری (تلگرام/واتس‌اپ/کپی لینک)
- ۸ مقاله واقعی در `src/data/content.ts` (`BLOG_POSTS`) — افزودن مقاله = افزودن آبجکت، بقیه خودکار

## ۶. چک‌لیست محتوایی

- [ ] عنوان ۵۰–۶۰ کاراکتر، توضیحات ۱۴۰–۱۶۰
- [ ] متن alt توصیفی برای همه تصاویر
- [ ] لینک‌سازی داخلی: محصول ↔ بلاگ مرتبط ↔ سینی
- [ ] URL های فارسی فقط در slug های انگلیسی؛ از id خام در URL پرهیز شود

## ۷. ابزارهای گوگل (فاز ۱۴ — آماده‌سازی)

- GSC: verify با DNS، هر ۵ sitemap را submit کنید
- GA4/GTM: **فقط بعد از رضایت analytics کاربر** (فاز ۶) بارگذاری شود — `helsa-consent-v2`
- PageSpeed Insights / Rich Results Test: بعد از دامنه واقعی اجرا و رفع خطا
