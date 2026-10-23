# اپلیکیشن وب پیش‌رونده هلسا (PWA)

سایت هلسا به‌صورت یک **Progressive Web App** واقعی پیاده‌سازی شده و روی
دستگاه‌های پشتیبانی‌شده با نام «اپلیکیشن هلسا» قابل نصب است.

---

## فایل‌های مرتبط

| فایل | نقش |
| --- | --- |
| `src/app/manifest.ts` | تولید `manifest.webmanifest` با Metadata API |
| `public/sw.js` | سرویس‌ورکر (کش، آفلاین، به‌روزرسانی) |
| `src/components/pwa/PwaManager.tsx` | ثبت سرویس‌ورکر + پرامپت نصب و به‌روزرسانی |
| `src/app/offline/page.tsx` | صفحه آفلاین برندشده |
| `src/components/pwa/OfflineRetryButton.tsx` | دکمه «تلاش مجدد» |
| `src/app/layout.tsx` | `manifest`, `appleWebApp`, `icons`, `viewport` |
| `public/icons/*` | آیکون‌های اپلیکیشن |

---

## Manifest

آدرس: `/manifest.webmanifest`

```jsonc
{
  "name": "هلسا ایرانیان",
  "short_name": "هلسا",
  "description": "فروشگاه محصولات طبیعی و پذیرایی هلسا ایرانیان",
  "lang": "fa-IR",
  "dir": "rtl",
  "display": "standalone",
  "orientation": "portrait",
  "start_url": "/",
  "scope": "/",
  "theme_color": "#0b5f3b",
  "background_color": "#fffdf9"
}
```

**میان‌برها (shortcuts):** محصولات هلسا · سینی مزه هلسا · سبد خرید

---

## آیکون‌ها

| فایل | اندازه | کاربرد |
| --- | --- | --- |
| `public/icons/icon-192.png` | ۱۹۲×۱۹۲ | اندروید / منیفست |
| `public/icons/icon-512.png` | ۵۱۲×۵۱۲ | اندروید / اسپلش |
| `public/icons/icon-maskable-512.png` | ۵۱۲×۵۱۲ | maskable (حاشیه امن سبز برند) |
| `public/icons/apple-touch-icon.png` | ۱۸۰×۱۸۰ | iOS |
| `public/icons/favicon-32.png` | ۳۲×۳۲ | تب مرورگر |
| `public/icon.svg` | برداری | فاوآیکون مدرن |

آیکون‌ها از نشان برند هلسا ساخته شده‌اند (سبز `#0B5F3B`، ایوری `#F5F1E8`،
طلایی ملایم `#B3922F`) و **لوگو تغییر شکل داده نشده است**.

---

## سرویس‌ورکر و سیاست کش

سرویس‌ورکر تنها در **نسخه تولید** ثبت می‌شود
(`process.env.NODE_ENV === "production"`) تا در توسعه سردرگمی ایجاد نکند.

| نوع درخواست | راهبرد |
| --- | --- |
| `/_next/static/*`, `/icons/*`, `/images/*`, `/icon.svg` | Cache-first (دارایی‌های تغییرناپذیر) |
| ناوبری صفحات (`mode === "navigate"`) | Network-first → کش → صفحه `/offline` |
| سایر | بدون دخالت |

### چیزهایی که هرگز کش نمی‌شوند

```
/api/*      /account*    /checkout   /payment*
/login      /register    /forgot-password   /verify   /track
```

همچنین: هر درخواست غیر `GET`، هر درخواست دارای هدر `Authorization`،
و هر درخواست از دامنه دیگر.

> این یعنی پاسخ‌های پرداخت، داده حساب کاربری و پاسخ‌های احراز هویت
> هرگز روی دستگاه ذخیره نمی‌شوند.

---

## تجربه نصب

- رویداد `beforeinstallprompt` گرفته و پیش‌فرض مرورگر لغو می‌شود.
- پرامپت **۱۲ ثانیه بعد از تعامل** نمایش داده می‌شود، نه بلافاصله.
- متن: «اپلیکیشن هلسا را نصب کنید» · دکمه‌ها: «نصب اپلیکیشن» / «بعداً»
- انصراف کاربر در `localStorage.helsa-pwa-dismissed` ذخیره و
  **۳۰ روز** دیگر نمایش داده نمی‌شود.

---

## تجربه به‌روزرسانی

وقتی نسخه جدید سرویس‌ورکر در حالت `waiting` قرار می‌گیرد:

- نوار ظریف بالای صفحه: «نسخه جدید هلسا آماده است.» + دکمه «به‌روزرسانی»
- با کلیک، پیام `SKIP_WAITING` ارسال و پس از `controllerchange` صفحه بازخوانی می‌شود.
- **هیچ‌گاه بدون اجازه کاربر رفرش اجباری انجام نمی‌شود.**

---

## تجربه آفلاین

مسیر `/offline` (با `robots: noindex`):

> «در حال حاضر اتصال شما به اینترنت قطع است.»
> «برخی اطلاعات ذخیره‌شده همچنان در دسترس هستند.»
> دکمه: «تلاش مجدد» · «بازگشت به خانه»

---

## iOS

- `apple-touch-icon` ۱۸۰×۱۸۰
- `appleWebApp: { capable: true, title: "هلسا", statusBarStyle: "default" }`
- `viewportFit: "cover"` به‌همراه استفاده از `env(safe-area-inset-bottom)`
  در ناوبری پایین، دکمه پشتیبانی و بنر کوکی.

> محدودیت iOS: نصب فقط از طریق Safari → «Add to Home Screen» ممکن است و
> رویداد `beforeinstallprompt` در iOS پشتیبانی نمی‌شود.

---

## تست محلی

سرویس‌ورکر فقط در build تولید فعال است:

```bash
npm run build
npm start
```

سپس در Chrome DevTools:

1. **Application → Manifest** — بررسی نام، آیکون‌ها، `start_url`، رنگ‌ها.
2. **Application → Service Workers** — وضعیت `activated`.
3. **Application → Cache Storage** — باید `helsa-v1-precache` و `helsa-v1-runtime` باشد.
4. **Network → Offline** سپس رفرش — باید صفحه `/offline` نمایش داده شود.
5. **Lighthouse → Progressive Web App** برای گزارش کامل.

### تست به‌روزرسانی

1. مقدار `VERSION` در `public/sw.js` را تغییر دهید.
2. دوباره build و start کنید.
3. صفحه را باز کنید — نوار «نسخه جدید هلسا آماده است.» ظاهر می‌شود.

---

## نیازمندی‌های تولید ⚠️

| مورد | وضعیت |
| --- | --- |
| Manifest | ✅ پیاده‌سازی شده |
| آیکون‌ها (۱۹۲/۵۱۲/maskable/apple) | ✅ ساخته شده |
| سرویس‌ورکر + سیاست کش امن | ✅ پیاده‌سازی شده |
| صفحه آفلاین | ✅ پیاده‌سازی شده |
| پرامپت نصب و به‌روزرسانی | ✅ پیاده‌سازی شده |
| **HTTPS** | ⚠️ **الزامی برای نصب** — روی دامنه تولید باید فعال باشد |
| `NEXT_PUBLIC_SITE_URL` روی دامنه واقعی | ⚠️ لازم |

> **قابلیت نصب در تولید تنها پس از استقرار روی HTTPS تضمین می‌شود.**
> در `http://localhost` سرویس‌ورکر کار می‌کند، اما روی دامنه بدون HTTPS خیر.
