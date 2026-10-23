# راهنمای مشارکت در پروژه هلسا (CONTRIBUTING)

از مشارکت شما در توسعه **هلسا ایرانیان** استقبال می‌کنیم.
پیش از ارسال تغییر، لطفاً این راهنما را بخوانید.

---

## ۱. سبک کد

- **TypeScript سخت‌گیرانه** — استفاده از `any` مجاز نیست؛ برای داده‌های ناشناخته `unknown` + type guard.
- **کامپوننت سرور به‌صورت پیش‌فرض**؛ `"use client"` فقط وقتی state/effect/رویداد لازم است.
- توابع کوچک و تک‌مسئولیتی؛ از کامپوننت‌های چندصد خطی پرهیز کنید.
- بدون `console.log` در کد نهایی (به‌جز هشدار پیکربندی سمت سرور).

## ۲. قواعد رابط کاربری

- **زبان:** همه متن‌های کاربر فارسی؛ جهت RTL.
- **رنگ:** فقط از توکن‌های معنایی استفاده کنید:
  `bg-canvas` · `bg-surface` · `bg-surface2` · `border-line` · `text-heading` ·
  `text-body` · `text-muted` · `text-faint` · `text-inverse` · `brand-*` · `gold-*` · `accent-*`
  ❌ هرگز `bg-white`, `text-black`, یا رنگ خام hex در کلاس‌ها.
- **دکمه‌ها:** primary سبز برند، secondary کرم/outline. شعاع: `rounded-full` برای دکمه، `rounded-2xl` برای کارت.
- **انیمیشن:** ۲۰۰–۵۰۰ms؛ بدون bounce و parallax سنگین.
- **آیکون‌های جهت‌دار (RTL):** سایت همیشه RTL است؛ بنابراین جهت درست را با خود آیکون بیان کنید:
  جلو/ادامه/مشاهده = `ArrowLeft` یا `ChevronLeft` (چپ‌گرد) · عقب/قبلی/بازگشت = `ArrowRight` یا `ChevronRight` (راست‌گرد) · جداکننده breadcrumb = `ChevronLeft`.
  از کلاس‌های آینه‌ای (`flip-rtl`) و `rotate-180` برای آیکون‌های جهت‌دار استفاده **نکنید**.
- **دسترس‌پذیری:** `aria-label` برای دکمه‌های آیکونی، `aria-pressed` برای حالت‌ها،
  `aria-expanded` برای منوها، فوکوس مرئی، تضاد کافی رنگ.

## ۳. نام‌گذاری

| مورد | قاعده | نمونه |
| --- | --- | --- |
| کامپوننت | PascalCase | `TrayCard.tsx` |
| هوک | `use` + camelCase | `useTheme` |
| توابع کمکی | camelCase | `formatToman` |
| ثابت‌ها | SCREAMING_SNAKE | `TRAY_CATEGORIES` |
| مسیر API | kebab-case | `/api/coupons/validate` |
| فایل مستندات | UPPERCASE.md | `PAYMENT.md` |

## ۴. کامپوننت‌های مشترک

پیش از ساخت کامپوننت جدید، موارد موجود را بررسی کنید:

- `components/ui/primitives.tsx` — `Button`, `LinkButton`, `Price`, `Badge`, `Stars`, `QtyPicker`, `SectionHead`, `Reveal`, `Countdown`, `HelsaLogo`
- `components/ui/controls.tsx` — `Input`, `Select`, `TextArea`, `FieldLabel`, `Skeleton`, `EmptyState`, `Modal`
- `components/product/ProductCard.tsx` و `components/mazeh/TrayCard.tsx` — الگوی مشترک کارت کاتالوگ

**تکرار UI ممنوع است.** اگر الگویی دوبار استفاده می‌شود، آن را استخراج کنید.

## ۵. توسعه API

- هر مسیر جدید در `src/app/api/**/route.ts`
- **همیشه** ورودی را با Zod اعتبارسنجی کنید.
- پاسخ استاندارد: `{ ok: true, ... }` یا `{ ok: false, message: "پیام فارسی" }`
- کد وضعیت درست: `400` داده نامعتبر · `404` یافت نشد · `503` سرویس پیکربندی نشده
- **هرگز** جزئیات فنی خطا یا stack trace به کلاینت نفرستید.
- دسترسی به داده فقط از طریق `src/services/*`، نه ایمپورت مستقیم `src/data` در مسیرها.

## ۶. مهاجرت پایگاه داده

```bash
# ۱. اسکیما را در src/db/schema.ts ویرایش کنید
# ۲. اعمال روی دیتابیس توسعه
npx drizzle-kit push
# ۳. در صورت نیاز داده اولیه
npx tsx --env-file=.env scripts/seed.ts
```

- جدول‌های موجود را حذف یا تغییر نام ندهید مگر با هماهنگی.
- ستون جدید را با `default` یا nullable اضافه کنید تا داده موجود نشکند.
- **روی دیتابیس تولید seed اجرا نکنید.**

## ۷. گردش کار Git

```bash
git checkout -b feat/tray-gift-wrap      # feat/ | fix/ | docs/ | refactor/ | chore/
# تغییرات...
npm run typecheck && npm run lint && npm run build
git commit -m "feat(tray): افزودن گزینه بسته‌بندی هدیه"
```

قالب پیام کامیت: `type(scope): توضیح کوتاه`
انواع: `feat` · `fix` · `docs` · `style` · `refactor` · `perf` · `chore`

## ۸. بررسی‌های الزامی پیش از PR

```bash
npm run typecheck   # باید بدون خطا باشد
npm run lint        # باید بدون خطا باشد
npm run build       # باید موفق باشد
```

> در حال حاضر مجموعه تست خودکار در پروژه وجود ندارد (**NOT IMPLEMENTED**).
> تا افزوده‌شدن آن، تغییرات را دستی روی دسکتاپ/تبلت/موبایل و در هر دو تم بررسی کنید.

## ۹. چک‌لیست Pull Request

- [ ] `typecheck`، `lint` و `build` موفق
- [ ] در تم روشن و تیره بررسی شده
- [ ] در ۳۶۰px، ۷۶۸px و ۱۴۴۰px بررسی شده
- [ ] RTL درست است (حاشیه‌ها، آیکون‌های جهت‌دار، انیمیشن کشو)
- [ ] متن‌های کاربر فارسی است
- [ ] `aria-label` و حالت فوکوس اضافه شده
- [ ] مستندات مربوطه در `docs/` به‌روز شده
- [ ] هیچ راز یا کلیدی commit نشده

## ۱۰. قواعد امنیتی 🔒

- **هرگز** `.env` یا کلید واقعی را commit نکنید؛ فقط `.env.example`.
- اسرار (`DATABASE_URL`, `AUTH_SECRET`, `GOOGLE_CLIENT_SECRET`, `APPLE_PRIVATE_KEY`,
  `GATEWAY_API_KEY`) فقط سمت سرور — بدون پیشوند `NEXT_PUBLIC_`.
- تأیید پرداخت **فقط سمت سرور**؛ هرگز از پارامتر URL یا وضعیت کلاینت.
- اعتبارسنجی سروری برای همه ورودی‌ها، حتی اگر کلاینت هم اعتبارسنجی می‌کند.
- داده حساس را در سرویس‌ورکر کش نکنید (فهرست `NEVER_CACHE` در `public/sw.js`).
- اگر قابلیتی نیازمند کلید پیکربندی‌نشده است، **آن را جعل نکنید** —
  به‌روشنی وضعیت «پیکربندی نشده» را اعلام کنید.
