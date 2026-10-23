# 🧩 فهرست کامل کامپوننت‌های هلسا (۵۷ کامپوننت — ۱۰,۷۰۲ خط)

> مبنای reuse: قبل از ساخت کامپوننت جدید این فهرست را ببینید. ⭐ = پایهٔ دیزاین‌سیستم (`ui/`).

## ui/ — پایه‌های دیزاین‌سیستم (۱۰)
| کامپوننت | خط | نقش | نکات |
|---|---|---|---|
| ⭐ `primitives.tsx` | 264 | Button/LinkButton (۶ واریانت×۳ سایز) · HelsaLogo · Badge (۴ tone) · Stars · Price · QtyPicker · SectionHead · Reveal | هستهٔ هویت — هر دکمه/قیمت/بج از همین‌جا |
| ⭐ `controls.tsx` | 159 | Input/Select/TextArea/FieldLabel · Skeleton/CardSkeleton · EmptyState · Modal | فرم h-11 + مودال 30/52rem |
| ⭐ `SmartImage.tsx` | 86 | picture AVIF→WebP→JPEG + srcset + LQIP | تنها راه رندر تصویر |
| ⭐ `CarouselRow.tsx` | 80 | نوار افقی snap + فلش دسکتاپ | الگوی ردیف محصولات |
| ⭐ `Toast.tsx` | 76 | useToast + توست ۳ نوع (3800ms) | aria-live |
| ⭐ `icons.tsx` | 41 | SVGهای سفارشی هلسا | تنها محل آیکون دستی |
| ⭐ `ImageFallbackGuard.tsx` | 34 | گارد تصویر شکسته | — |
| ⭐ `CouponBanner.tsx` | 63 | بنر کد تخفیف | — |

## layout/ (۷)
`Header.tsx` 719 (استیکی، مگامنو، دراور سبد، دراور موبایل RTL، ناوبری پایین) · `Footer.tsx` 129 (grid 2/5) · `Shell.tsx` 44 (PageHeader+Footer) · `PageHeader.tsx` 37 · `AnnouncementBar.tsx` 68 · `SupportButton.tsx` 170 (کانسیرج) · `LegalPage.tsx` 22.

## home/ (۱۲)
`Hero.tsx` 391 (۵ اسلاید فروش‌محور داینامیک + افزودن سریع) · `HomepageLite.tsx` 353 (ترکیب صفحهٔ اصلی) · `Sections.tsx` 366 · `FeaturedTabs.tsx` 94 (پرفروش/پیشنهاد/تخفیف‌دار) · `FlashOfferStrip.tsx` 66 (تخفیف واقعی + شمارش معکوس کمپین) · `Stories.tsx` 159 · `GoldenTrayCard.tsx` 77 · `NewsletterSection.tsx` 166 · `InstagramSection.tsx` 134 · `FirstPurchaseBanner` در product/ (مصرف خانه) · `CategoryShowcase`/`TrustBar` داخل Sections.

## product/ (۸)
`ProductCard.tsx` 311 (قلب فروش — Quick View/علاقه/مقایسه/افزودن سریع) · `ProductDetailClient.tsx` 681 · `ProductsExplorer.tsx` 558 (فیلتر/سورت/گرید) · `ProductGallery.tsx` 234 (۴:۵→مربع، کیبورد) · `Pagination.tsx` 134 (فشرده با ellipsis) · `CategoryHero.tsx` 73 · `FrequentlyBought.tsx` 89 · `FirstPurchaseBanner.tsx` 130.

## mazeh/ (۵)
`TrayBuilderClient.tsx` 766 (سازندهٔ سینی — قیمت زندهٔ API) · `TrayExplorer.tsx` 227 · `TrayCard.tsx` 208 · `TrayDetailClient.tsx` 169 · `MazehCta.tsx` 56.

## gifts/ (۵)
`GiftFinder.tsx` 245 (موتور پیشنهاد ۳ بعدی) · `CorporateInquiryClient.tsx` 178 · `PersonalGiftClient.tsx` 146 · `CorporateCalculator.tsx` 70 (برآورد صادقانه) · + لندینگ در `app/gifts/page.tsx`.

## cart/ (۲)
`CartUpsell.tsx` 77 · `EmptyCartSuggestions.tsx` 75.

## account/ (۴)
`AccountDashboard.tsx` 431 · `shared.tsx` 252 (KPI/ردیف وضعیت) · `WishlistClient.tsx` 74 · + کامپوننت‌های ساب‌صفحه در shared.

## admin/ (۴)
`AdminShell.tsx` 69 (پوسته) · `AdminPages.tsx` 135 · `WholesaleAdminClient.tsx` 149 · + فرم‌های محصول/سینی در صفحات مربوط.

## wholesale/ (۲)
`WholesaleDashboardClient.tsx` 224 · `WholesaleRegisterClient.tsx` 134.

## auth/ blog/ campaigns/ consent/ pwa/ theme/ seo/ (۹)
`auth/AuthPanel.tsx` 325 (ورود/ثبت/فراموشی/OTP) · `blog/ReadingEnhancements.tsx` 89 · `blog/ShareButtons.tsx` 45 · `campaigns/CampaignEventLink.tsx` 29 (آنالیتیکس کمپین) · `consent/CookieConsent.tsx` 148 · `pwa/PwaManager.tsx` 220 · `theme/ThemeProvider.tsx` 99 + `ThemeSwitcher.tsx` 37 · `seo/JsonLd.tsx` (اسکیمای واحد).

## نکات تحلیل
- **تک‌منبعی بودن:** دکمه/قیمت/بج/مودال/توست/تصویر همگی تک‌کامپوننتی — دیزاین‌سیستم عملاً متمرکز است. ✅
- **کامپوننت تکراری منطقی یافت نشد** — بزرگ‌ترین ریسک، کپی‌گرفتن از `ProductCard` به‌جای reuse است (قاعدهٔ §44).
- `Hero`/`Header`/`TrayBuilderClient` بزرگ‌اند اما تک‌مسئولیت‌اند؛ تجزیه فقط در صورت تغییر بنیادین.
- کامپوننت‌های صفحهٔ اصلی از `HomepageLite` ترکیب می‌شوند — سکشن جدید = کامپوننت + افزودن به همان ترکیب + حفظ سلسله‌مراتب §10/§42.
