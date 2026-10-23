# دارایی‌های تصویری هلسا (offline-first)

## سیاست

توسعه هرگز نباید به سرویس تصویر خارجی وابسته باشد. از نسخه ۱.۴.۰:

1. **همه تصاویر لوکال سرو می‌شوند** — هیچ URL خارجی در seed data یا کامپوننت‌ها نیست.
2. **تصاویر برند** (`/images/*.jpg`) اختصاصی و هم‌هویت با پالت سبز/طلایی هلسا هستند.
3. **تصاویر عمومی** در `/images/pexels/` ذخیره شده‌اند (دانلود یک‌باره برای توسعه).
4. **هیچ تصویر شکسته‌ای نمایش داده نمی‌شود** — محافظ جهانی جایگزین برندشده می‌گذارد.

## ساختار

```
public/images/
├── placeholder.svg          ← جایگزین برندشده (SVG سبز/طلایی)
├── tray-vip.jpg             ← سینی VIP با مدالیون طلا
├── tray-classic.jpg         ← سینی چوبی کلاسیک
├── tray-yalda.jpg           ← سینی یلدا (انار، خرما، آجیل)
├── tray-norooz.jpg          ← سینی نوروز
├── chocolate-craft.jpg      ← شکلات خرمایی دست‌ساز
├── mazeh-board.jpg          ← تخته مزه شور/شیرین
├── mazeh-light.jpg          ← تخته مزه روشن
├── hero-helsa.jpg           ← هیرو اصلی (میز پذیرایی)
├── hero-light.jpg           ← هیرو روشن
├── story-grove.jpg          ← نخلستان (صفحه داستان)
└── pexels/{photo-id}.jpg    ← ۴۱ تصویر عمومی لوکال‌شده
```

## محافظ تصویر شکسته

`src/components/ui/ImageFallbackGuard.tsx` در layout ریشه نصب شده و با capture listener
روی خطای `<img>` (حتی تصاویر lazy که هنوز لود نشده‌اند) `src` را یک‌بار به
`/images/placeholder.svg` تغییر می‌دهد. فلگ `data-helsa-fallback` از حلقه بی‌نهایت جلوگیری می‌کند.

## قواعد افزودن تصویر جدید

1. فایل را در `public/images/` بگذارید (ترجیحاً < ۳۵۰KB، عرض حداکثر ۱۴۰۰px، JPEG progressive).
2. در seed/ادمین فقط **مسیر لوکال** ثبت کنید (`/images/...`).
3. تصویر خارجی فقط در صورت وجود نیاز تولیدی واقعی (CDN) اضافه شود — نه برای توسعه.

## فشرده‌سازی

```bash
# نمونه: فشرده‌سازی مجدد با Pillow
python3 -c "from PIL import Image; img=Image.open('x.jpg').convert('RGB'); img.save('x.jpg','JPEG',quality=80,optimize=True,progressive=True)"
```

## TODO تولید

- [ ] آپلود تصویر واقعی از پنل ادمین پس از انتخاب storage provider (دلخواه: S3/R2/لوکال مدیریت‌شده)
- [ ] تولید WebP/AVIF و `srcset` واکنش‌گرا پس از مهاجرت به `next/image`
- [ ] دو تصویر اختصاصی پکیج‌های سازمانی (corporate-gift / corporate-tray)
