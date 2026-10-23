# سئو و کشف‌پذیری هلسا (SEO)

## اصول

- زبان اصلی: فارسی (`lang="fa"`, `dir="rtl"`)
- محتوای ساختاریافته و صادق: هیچ امتیاز یا نظر جعلی تولید نمی‌شود.
- URLهای تمیز و مبتنی بر slug.

## Metadata

در `src/app/layout.tsx` از Metadata API استفاده شده است:

- `metadataBase` از `NEXT_PUBLIC_SITE_URL` (یا `SITE.url`)
- `title.default` و `title.template`
- `description`, `keywords`
- `openGraph` (locale: `fa_IR`, تصویر ۱۲۰۰×۶۳۰)
- `twitter: summary_large_image`
- `robots: { index: true, follow: true }`
- `alternates.canonical`

صفحات محصول و سینی، `generateMetadata` اختصاصی با canonical مخصوص خود دارند.

## داده ساختاریافته (Schema.org)

فایل کمکی: `src/lib/seo.ts` — کامپوننت رندر: `src/components/seo/JsonLd.tsx`

| Schema | محل | توضیح |
| --- | --- | --- |
| `Organization` | layout (سراسری) | نام، لوگو، شعار، تلفن، آدرس نیاوران، شبکه اجتماعی |
| `WebSite` + `SearchAction` | layout (سراسری) | جعبه جستجوی سایت‌لینک گوگل |
| `Product` | `/products/[slug]` | نام، تصویر، توضیح، SKU، برند، وزن، قیمت، موجودی |
| `BreadcrumbList` | محصول و سینی | مسیر ناوبری |
| `Product` (سینی) | `/mazeh-trays/[slug]` | به‌همراه `additionalProperty` تعداد مهمان |
| `FAQPage` | `/faq` | تنها روی صفحه‌ای که واقعاً پرسش و پاسخ دارد |

**نکته مهم:** `aggregateRating` تنها زمانی به Product اضافه می‌شود که تعداد نظرات
واقعاً بزرگ‌تر از صفر باشد.

## Sitemap

`src/app/sitemap.ts` به‌صورت پویا تولید می‌کند:

- صفحات ثابت عمومی (خانه، محصولات، مزه، سینی‌ها، مهمانی، جشنواره‌ها، درباره، تماس، وبلاگ، قوانین)
- همه محصولات از `PRODUCTS`
- همه سینی‌های مزه از `TRAYS`
- همه مقالات وبلاگ

آدرس: `/sitemap.xml`

## Robots

`src/app/robots.ts`:

- `allow: /`
- `disallow`: `/api/`، `/cart`، `/checkout`، `/payment*`، `/login`، `/register`،
  `/forgot-password`، `/verify`، `/account*`، `/wishlist`، `/compare`، `/track`
- `sitemap` و `host` از `NEXT_PUBLIC_SITE_URL`

آدرس: `/robots.txt`

## بهینه‌سازی برای جستجوی هوش مصنوعی (AI discovery)

- **HTML معنایی:** `<header> <nav> <main> <section> <article> <footer>` و سلسله‌مراتب صحیح H1→H3.
- **نام‌گذاری یکدست موجودیت‌ها:** «هلسا ایرانیان»، «سینی مزه هلسا» در همه صفحات یکسان است.
- **توضیح کامل محصول:** دسته، وزن، مواد اولیه، محل تولید، بسته‌بندی، شرایط نگهداری،
  تاریخ تولید/انقضا، آلرژن‌ها و ارزش غذایی — همگی از داده واقعی.
- **لینک‌دهی داخلی هدفمند:** محصولات مرتبط، سینی‌های مرتبط، دسته‌بندی، مقالات.
- **Breadcrumb** در صفحات محصول و سینی.
- **Canonical** برای جلوگیری از محتوای تکراری.
- **Alt فارسی توصیفی** برای تصاویر معنادار.

هیچ تکنیک دستکاری یا اسپم به‌کار نرفته است؛ تمرکز بر محتوای درست و ساختاریافته است.

## تصاویر

- بارگذاری تنبل (`loading="lazy"`) برای همه تصاویر غیر از تصویر اصلی صفحه.
- تصویر اصلی هر صفحه با `fetchPriority="high"`.
- alt فارسی توصیفی، مثال: «سینی مزه هلسا با چیدمان پنیر، زیتون، خرما و شکلات».

## چک‌لیست پس از استقرار

- [ ] `NEXT_PUBLIC_SITE_URL` روی دامنه واقعی تنظیم شده باشد
- [ ] `/robots.txt` بررسی شود
- [ ] `/sitemap.xml` بررسی شود
- [ ] داده ساختاریافته با Rich Results Test گوگل تست شود
- [ ] Search Console: ثبت دامنه و ارسال sitemap
