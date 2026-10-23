#!/usr/bin/env bash
# rebuild-owner-images.sh — بازسازی کامل دارایی تصویری از عکس‌های مالک
# ─────────────────────────────────────────────────────────────────────────────
# چرا: پوشهٔ public/images در بعضی بازنشانی‌های محیط ناقص می‌شود؛ این اسکریپت
# همهٔ تصاویر مشتق‌شده از عکس‌های مالک را از منبع اصلی (uploads/ و helsa-photo-edits/)
# بازمی‌سازد. idempotent — هر بار اجرا شود، خروجی یکسان تولید می‌کند.
#
# اجرا:  bash scripts/rebuild-owner-images.sh
# پیش‌نیاز: python3 + Pillow (اسکریپت‌های پایتونی هم‌ارز product-photo.mjs / gen-image-variants.mjs)
set -uo pipefail
cd "$(dirname "$0")/.."

SRC_EDITS="${OWNER_EDITS:-/home/user/helsa-photo-edits}"
SRC_UP="${OWNER_UPLOADS:-/home/user/uploads}"
mkdir -p public/images/gen public/images/opt

n=0
copy_gen() { # copy_gen <file> <name>
  if [ -f "$1" ]; then cp -f "$1" "public/images/gen/$2.jpg" && n=$((n+1)); else echo "  ✗ منبع نیست: $1"; fi
}

echo "── ۱) منابع مالک → gen/ (بنرهای هیرو + ست ۱۵ عکسی) ──"
copy_gen "$SRC_EDITS/hero-banner-v1/hero-piarom.jpg" hero-piarom
copy_gen "$SRC_EDITS/hero-banner-v1/hero-mazafati.jpg" hero-mazafati
copy_gen "$SRC_EDITS/hero-banner-v1/hero-date-chocolate.jpg" hero-date-chocolate
copy_gen "$SRC_EDITS/hero-banner-v1/hero-mazeh-tray.jpg" hero-mazeh-tray
copy_gen "$SRC_EDITS/hero-banner-v1/hero-nuts-dried-fruits.jpg" hero-nuts-dried-fruits
copy_gen "$SRC_EDITS/final-v2/01-IMG_3596.jpg" handmade-date-chocolate
copy_gen "$SRC_EDITS/final-v2/02-IMG_3598.jpg" handmade-date-chocolate-2
copy_gen "$SRC_EDITS/final-v2/03-IMG_3599.jpg" handmade-date-chocolate-3
copy_gen "$SRC_EDITS/final-v2/05-IMG_3602.jpg" handmade-date-chocolate-4
copy_gen "$SRC_EDITS/final-v2/04-IMG_3601.jpg" date-chocolate-walnut
copy_gen "$SRC_EDITS/final-v2/09-4.jpg" walnut-kernels
copy_gen "$SRC_EDITS/final-v2/08-3.jpg" walnut-kernels-2
copy_gen "$SRC_EDITS/final-v2/06-1.jpg" walnut-kernels-3
copy_gen "$SRC_EDITS/final-v2/07-2.jpg" dried-figs
copy_gen "$SRC_EDITS/final-v2/10-7.jpg" golden-raisins
copy_gen "$SRC_EDITS/final-v2/11-8.jpg" golden-raisins-2
copy_gen "$SRC_EDITS/final-v2/12-IMG_3467.jpg" lahijan-black-tea
copy_gen "$SRC_EDITS/final-v2/13-tg1.jpg" lahijan-black-tea-2
copy_gen "$SRC_EDITS/final-v2/14-tg2.jpg" lahijan-black-tea-3
copy_gen "$SRC_EDITS/final-v2/15-tg3.jpg" lahijan-black-tea-4
echo "  → $n فایل"

echo "── ۲) واریانت‌های opt برای همان نام‌ها ──"
python3 scripts/gen-image-variants.py \
  hero-piarom hero-mazafati hero-date-chocolate hero-mazeh-tray hero-nuts-dried-fruits \
  handmade-date-chocolate handmade-date-chocolate-2 handmade-date-chocolate-3 handmade-date-chocolate-4 \
  date-chocolate-walnut walnut-kernels walnut-kernels-2 walnut-kernels-3 \
  dried-figs golden-raisins golden-raisins-2 \
  lahijan-black-tea lahijan-black-tea-2 lahijan-black-tea-3 lahijan-black-tea-4 | tail -3

echo "── ۳) عکس‌های خام مالک با قالب ثابت محصول (توت/مویز/قند خرما نارگیلی) ──"
[ -f "$SRC_UP/IMG_3575.jpeg" ] && python3 scripts/product-photo.py "$SRC_UP/IMG_3575.jpeg" dried-mulberries | tail -1
[ -f "$SRC_UP/IMG_3574.jpeg" ] && python3 scripts/product-photo.py "$SRC_UP/IMG_3574.jpeg" dried-mulberries-2 | tail -1
[ -f "$SRC_UP/IMG_3580.jpeg" ] && python3 scripts/product-photo.py "$SRC_UP/IMG_3580.jpeg" dried-mulberries-3 | tail -1
[ -f "$SRC_UP/IMG_3573.jpeg" ] && python3 scripts/product-photo.py "$SRC_UP/IMG_3573.jpeg" dried-mulberries-4 | tail -1
[ -f "$SRC_UP/IMG_3606.jpeg" ] && python3 scripts/product-photo.py "$SRC_UP/IMG_3606.jpeg" moiz-uzbek | tail -1
[ -f "$SRC_UP/IMG_3608.jpeg" ] && python3 scripts/product-photo.py "$SRC_UP/IMG_3608.jpeg" moiz-uzbek-2 | tail -1
[ -f "$SRC_UP/IMG_3609.jpeg" ] && python3 scripts/product-photo.py "$SRC_UP/IMG_3609.jpeg" moiz-uzbek-3 | tail -1
[ -f "$SRC_UP/IMG_3587.jpeg" ] && python3 scripts/product-photo.py "$SRC_UP/IMG_3587.jpeg" date-coconut-sugar | tail -1
[ -f "$SRC_UP/IMG_3592.jpeg" ] && python3 scripts/product-photo.py "$SRC_UP/IMG_3592.jpeg" date-coconut-sugar-2 | tail -1
[ -f "$SRC_UP/IMG_3589.jpeg" ] && python3 scripts/product-photo.py "$SRC_UP/IMG_3589.jpeg" date-coconut-sugar-3 | tail -1
[ -f "$SRC_UP/IMG_3590.jpeg" ] && python3 scripts/product-photo.py "$SRC_UP/IMG_3590.jpeg" date-coconut-sugar-4 | tail -1

echo "── ۴) بنر و کاشی روزیته (برش از عکس واقعی مالک) ──"
python3 scripts/make-banner.py "$SRC_EDITS/final-v2/01-IMG_3596.jpg" rooziteh-banner --w 1600 --h 620 --side right --zoom 1.15 --y 0.42 | tail -1
python3 scripts/make-banner.py "$SRC_EDITS/final-v2/03-IMG_3599.jpg" rooziteh-tile --w 900 --h 600 --side none --zoom 1.05 --y 0.45 | tail -1

echo "── ۵) بازرسی: هر مسیر manifest روی دیسک هست؟ ──"
python3 - <<'PY'
import json, os
m = json.load(open('src/data/image-variants.json'))
miss = []
for name, v in m.items():
    for fmt in ('avif', 'webp'):
        for w in v.get(fmt, []):
            f = f"{name}.{fmt}" if w == 0 else f"{name}-{w}.{fmt}"
            if not os.path.exists('public/images/opt/' + f):
                miss.append(f)
    if v.get('jpg') and not os.path.exists(f'public/images/opt/{name}.jpg'):
        miss.append(name + '.jpg')
print(('  ✗ ناموجود: ' + ', '.join(miss[:8])) if miss else '  ✓ همهٔ واریانت‌ها موجودند')
PY
