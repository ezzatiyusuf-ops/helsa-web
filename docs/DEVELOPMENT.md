# راهنمای توسعه هلسا (DEVELOPMENT)

## ساختار پروژه

```
src/
├── app/                    # App Router
│   ├── api/                # Route Handlers (API)
│   ├── products/           # ویترین و صفحه محصول
│   ├── mazeh/              # مزه هلسا
│   ├── mazeh-trays/        # سینی‌ها، جزئیات، سازنده سینی
│   ├── mehmani/            # مهمانی هلسا
│   ├── account/            # داشبورد حساب (nested routes)
│   ├── checkout/ payment/  # پرداخت
│   └── layout.tsx globals.css
├── components/
│   ├── layout/             # Header, Footer, Shell, PageHeader, FloatingContact
│   ├── product/            # ProductCard, ProductDetailClient, ProductsExplorer
│   ├── mazeh/              # TrayCard, TrayExplorer, TrayDetailClient
│   ├── account/            # AccountDashboard, shared (آدرس، فاکتور، تایم‌لاین)
│   ├── auth/               # AuthPanel
│   ├── theme/              # ThemeProvider, ThemeSwitcher
│   ├── seo/                # JsonLd
│   ├── consent/            # CookieConsent
│   └── ui/                 # primitives, controls, Toast, CouponBanner
├── config/                 # site.ts, mazeh.ts, payments.ts
├── data/                   # داده seed (products, categories, trays, content)
├── db/                     # schema.ts, index.ts
├── lib/                    # store.ts, format.ts, session.ts, payment.ts, seo.ts
├── services/               # catalog.ts (لایه دسترسی داده)
└── types/                  # مدل‌های TypeScript
```

## سیستم طراحی

### توکن‌های رنگ (معنایی)

در `src/app/globals.css` تعریف شده و در هر دو تم کار می‌کنند:

| توکن | نقش |
| --- | --- |
| `canvas` | پس‌زمینه صفحه |
| `surface` / `surface2` | سطح کارت‌ها / سطح ثانویه |
| `line` / `line-soft` | خطوط و مرزها |
| `heading` / `body` / `muted` / `faint` | سلسله‌مراتب متن |
| `inverse` | متن روی سطوح تیره/سبز |
| `brand-*` | سبز هلسا | 
| `gold-*` | طلایی ملایم |
| `accent-*` | نارنجی — فقط برای تخفیف و خطا |

**قاعده:** هرگز از `bg-white`, `text-black` یا رنگ خام استفاده نکنید؛ همیشه توکن معنایی.

### تم تیره

با `:root[data-theme="dark"]` فقط توکن‌ها بازنویسی می‌شوند:
پس‌زمینه `#0D1712`، ثانویه `#122018`، کارت `#17271F`، مرز `#294136`،
متن `#F5F1E8` / `#C8D0C9` / `#9DAAA1`.

اسکریپت ضدپرش (FOUC) در `layout.tsx` پیش از رنگ‌آمیزی اولیه تم را اعمال می‌کند.

## کامپوننت‌های قابل استفاده مجدد

| کامپوننت | مسیر |
| --- | --- |
| `ProductCard` | `components/product/ProductCard.tsx` |
| `TrayCard` | `components/mazeh/TrayCard.tsx` |
| QuickPreview (محصول/سینی) | داخل همان کارت‌ها، با الگوی مشترک |
| `Button`, `LinkButton`, `Price`, `Badge`, `Stars`, `QtyPicker`, `SectionHead`, `Reveal`, `Countdown`, `HelsaLogo` | `components/ui/primitives.tsx` |
| `Input`, `Select`, `TextArea`, `FieldLabel`, `Skeleton`, `EmptyState`, `Modal` | `components/ui/controls.tsx` |
| `ThemeSwitcher` | `components/theme/ThemeSwitcher.tsx` |
| `JsonLd` | `components/seo/JsonLd.tsx` |

> کارت محصول و کارت سینی از یک زبان بصری مشترک استفاده می‌کنند:
> همان شعاع گوشه، مرز، مقیاس تایپوگرافی، جفت دکمه (`پیش‌نمایش` + `افزودن به سبد`)
> در گرید `grid-cols-1 min-[420px]:grid-cols-2` که از هم‌پوشانی جلوگیری می‌کند.

## لایه داده

`src/services/catalog.ts` تنها نقطه دسترسی به کاتالوگ است:

```ts
getCategories() · getProducts() · getProductBySlug() · getTrays() · getTrayBySlug() · getCoupons() · getCampaigns()
```

هر تابع ابتدا از PostgreSQL می‌خواند و در صورت خطا/نبود داده به seed داخل `src/data` برمی‌گردد.
**کامپوننت‌ها نباید مستقیماً از `src/data` بخوانند** مگر برای داده‌های ثابت محتوایی.

## مدیریت وضعیت

`src/lib/store.ts` (Zustand + persist، کلید `helsa-store-v2`):
سبد خرید، علاقه‌مندی، مقایسه، کوپن، کاربر، سفارش‌ها، آدرس‌ها، اعلان‌ها، مهمان، رضایت کوکی، `authRedirect`.

## قواعد کدنویسی

- TypeScript سخت‌گیرانه؛ `any` ممنوع.
- همه متن‌های کاربر فارسی.
- آیکون‌های جهت‌دار: در RTL، جلو = `ArrowLeft`/`ChevronLeft` و عقب = `ArrowRight`/`ChevronRight`؛ بدون کلاس آینه‌ای.
- انیمیشن ۲۰۰–۵۰۰ms؛ بدون parallax سنگین.
- دسترس‌پذیری: `aria-label` برای دکمه‌های آیکونی، `aria-pressed` برای حالت‌ها، فوکوس مرئی.

## بررسی‌ها

```bash
npm run typecheck
npm run lint
npm run build
```
