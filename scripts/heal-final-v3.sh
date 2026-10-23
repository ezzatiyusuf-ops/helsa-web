#!/usr/bin/env bash
# heal-final-v3.sh — بازسازی تصاویر عکس‌های جدید مالک پس از ری‌استارت سندباکس
# ─────────────────────────────────────────────────────────────────────────────
# منابع حقیقت (پایدار در ورک‌اسپیس):
#   /home/user/helsa-photo-edits/final-v3/raw/      عکس‌های خام موبایل مالک
#   /home/user/helsa-photo-edits/final-v3/edited/   نسخهٔ استودیویی (هم‌سبک final-v2)
# خروجی: مستر ۱۴۰۰×۱۴۰۰ در public/images/gen + واریانت‌ها در public/images/opt
#         + به‌روزرسانی manifest (image-variants / image-blur)
# اجرا:  bash scripts/heal-final-v3.sh
set -euo pipefail
cd /home/user/helsa

V3="/home/user/helsa-photo-edits/final-v3"
EDITED="$V3/edited/real"   # عکس مالک با بسته‌بندی دست‌نخورده + پس‌زمینهٔ استودیویی
[ -d "$EDITED" ] || { echo "[v3] ✗ پوشهٔ $EDITED نیست" >&2; exit 1; }
[ -d node_modules/sharp ] || { echo "[v3] وابستگی‌ها نیست — npm ci لازم است" >&2; exit 1; }

NAMES="dried-mulberries dried-mulberries-2 dried-mulberries-3 moiz-uzbek moiz-uzbek-2 moiz-uzbek-3 \
       date-coconut-sugar date-coconut-sugar-2 date-coconut-sugar-3 date-coconut-sugar-4"

# نگاشت: تصویر استودیویی → نام محصول
JOBS="
mulberry-1.png|dried-mulberries
mulberry-2.png|dried-mulberries-2
mulberry-3.png|dried-mulberries-3
moiz-1.png|moiz-uzbek
moiz-2.png|moiz-uzbek-2
moiz-3.png|moiz-uzbek-3
date-coconut-sugar-1.png|date-coconut-sugar
date-coconut-sugar-2.png|date-coconut-sugar-2
date-coconut-sugar-3.png|date-coconut-sugar-3
date-coconut-sugar-4.png|date-coconut-sugar-4
"

echo "[v3] مسترها از تصاویر استودیویی (سبک final-v2: پلاستر مات، نور بالا-چپ)…"
while IFS='|' read -r SRC NAME; do
  [ -z "$SRC" ] && continue
  [ -f "$EDITED/$SRC" ] || { echo "  ✗ منبع $SRC نیست" >&2; exit 1; }
  convert "$EDITED/$SRC" -resize 1400x1400 -quality 92 "public/images/gen/$NAME.jpg" || {
    echo "  ✗ ساخت $NAME شکست خورد" >&2; exit 1; }
  printf "  ✓ %s ← %s\n" "$NAME" "$SRC"
done <<< "$JOBS"

echo "[v3] واریانت‌ها…"
node scripts/gen-image-variants.mjs $NAMES 2>&1 | tail -1

echo "[v3] ثبت در manifest (image-variants + image-blur)…"
node -e '
const fs = require("fs"), sharp = require("sharp");
const names = ["dried-mulberries","dried-mulberries-2","dried-mulberries-3",
               "moiz-uzbek","moiz-uzbek-2","moiz-uzbek-3",
               "date-coconut-sugar","date-coconut-sugar-2","date-coconut-sugar-3","date-coconut-sugar-4"];
(async () => {
  const vp = "src/data/image-variants.json", bp = "src/data/image-blur.json";
  const v = JSON.parse(fs.readFileSync(vp, "utf8")), b = JSON.parse(fs.readFileSync(bp, "utf8"));
  for (const n of names) {
    v[n] = { avif: [0,480,768,1080], webp: [0,480,768,1080], jpg: true };
    const buf = await sharp("public/images/gen/" + n + ".jpg").resize({ width: 16 }).webp({ quality: 40 }).toBuffer();
    b[n] = "data:image/webp;base64," + buf.toString("base64");
  }
  fs.writeFileSync(vp, JSON.stringify(v, null, 2) + "\n");
  fs.writeFileSync(bp, JSON.stringify(b, null, 2) + "\n");
  console.log("  ✓ manifest به‌روز شد");
})();
'

echo "[v3] گارد فایل‌ها…"
BAD=0
for N in $NAMES; do
  for F in "$N.jpg" "$N.avif" "$N.webp" "$N-480.avif" "$N-480.webp" "$N-768.avif" "$N-768.webp" "$N-1080.avif" "$N-1080.webp"; do
    [ -s "public/images/opt/$F" ] || { echo "  ✗ opt/$F نیست" >&2; BAD=1; }
  done
done
[ "$BAD" = "0" ] && echo "[v3] ✅ ۱۰ ست تصویری کامل" || { echo "[v3] 🔴 ناقص" >&2; exit 1; }
