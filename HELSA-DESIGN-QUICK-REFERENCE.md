# ⚡ مرجع سریع توسعه‌دهندهٔ هلسا
> نسخهٔ فشردهٔ `HELSA-DESIGN-DEVELOPMENT-GUIDELINES.md` — قبل از هر PR این را ببین.

```text
رنگ اصلی (Primary):      brand-700 #0a5236 (دکمه) / brand-600 #0b5f3b (accent اصلی)
رنگ ثانویه:              accent-500 #e06a00 (تخفیف واقعی) / gold-500 #b3922f (پرمیوم)
سطوح:                    canvas #fffdf9 · surface #fff · surface2 #faf7f0 · line #e6ddcb
متن:                     heading #201f1b · body #403d36 · muted #6e6a60 · faint #767065
قیمت:                    .text-price → #0a5236 روشن / #6bd598 تاریک
دارک‌مود:                 data-theme="dark" — canvas #0d1712 · surface #17271f (طراحی‌شده نه معکوس)

فونت:                    Vazirmatn Variable (سلف‌هاست /fonts/Vazirmatn-Variable.woff2 + preload)
                          fallback: Vazir, Segoe UI, Tahoma · بدون فونت خارجی
کانتینر:                 .container-x → max-w 82rem (1312px) · px 20→40px
شعاع:                    دکمه/بج = pill (rounded-full) · کارت/مودال = rounded-2xl · فرم/تصویر = rounded-xl
ارتفاع دکمه:              sm 36 / md 44 / lg 48 (h-9/11/12)
ارتفاع فرم:              h-11 (44px) · focus ring brand-500/25
بریک‌پوینت:              sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536 (+ min-[390px])
سیستم آیکون:             فقط lucide-react · size-3.5/4/5 · stroke 2 · icon-only ⇒ aria-label فارسی
فرمت تصویر:              SmartImage → AVIF→WebP→JPEG + srcset + LQIP (خط تولید scripts/optimize-new-images.mjs)
RTL:                     dir="rtl" bومی · فقط ps/pe/ms/me/start/end · اعداد کاربر = فارسی (faDigits/formatToman)
CTA اصلی:                <Button variant="primary"> سبز تیره pill + متن فارسی bold
موشن:                    cubic-bezier(0.22,1,0.36,1) · 300ms تعامل · احترام prefers-reduced-motion
توست:                    useToast().push(text) · 3800ms · success/error/info
z-index:                 10 محتوا · 40 دراپ‌داون · 50 هدر · 70 ناوبری پایین · 76–90 دراور/مودال/توست
صفحه‌بندی:                فشرده با ellipsis هوشمند (Pagination.tsx) — نه لیست کامل
```

## پنج قاعدهٔ طلایی
1. **رنگ/فونت/فاصله فقط از توکن‌ها** — کد خام ممنوع (بدون کامنت دلیل).
2. **کامپوننت موجود را reuse کن** (`HELSA-COMPONENT-INVENTORY.md`) — نسخهٔ دوم نساز.
3. **هر عدد/Bج به کاربر = دادهٔ واقعی DB** — NO FAKE DATA (قاعدهٔ برند).
4. **سه حالت الزامی هر ویو داده:** Skeleton · EmptyState+CTA · خطای فارسی.
5. **قبل از تحویل:** tsc پاک + build سبز + QA پلی‌رایت (375/768/1440، سرریز 0، کنسول 0).

## پرکاربردترین‌ها
`Button/LinkButton` · `Price` · `Stars` · `Badge` · `QtyPicker` · `SectionHead` · `Card` hoverها (`.prem-card/.card-hover/.ring-hover`) · `SmartImage` · `CarouselRow` · `Modal` · `EmptyState` · `Skeleton/CardSkeleton` · `useToast` · `useStore` (سبد/علاقه/مقایسه) · `Reveal` · `trackEvent` · `faDigits/formatToman/faDate`
