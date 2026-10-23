#!/usr/bin/env bash
# ═══ اطمینان از وجود فایل‌های تصویر محصولات (بازیابی خودکار بعد از ری‌استارت سندباکس) ═══
# ۱) منابع gen که ممکن است از snapshot جا افتاده باشند را از منبع آزاد بازمی‌آورد
# ۲) هر واریانت گم‌شدهٔ opt را از منبع gen بازتولید می‌کند (scripts/regen-image-variants.mjs)
set -uo pipefail
cd "$(dirname "$0")/.."

dl() { # $1=url $2=dst
  [ -f "$2" ] && return 0
  echo "[ensure-img] دانلود $(basename "$2") …"
  curl -sL --max-time 60 "$1" -o "$2.tmp" && mv "$2.tmp" "$2" || { rm -f "$2.tmp"; echo "[ensure-img] ⚠ شکست: $2"; return 1; }
}

# منابع آزاد Pexels (الگوی پروژه) — فقط اگر فایل نبود
dl "https://images.pexels.com/photos/7217526/pexels-photo-7217526.jpeg?auto=compress&cs=tinysrgb&w=1600" public/images/src-japanese.jpg
dl "https://images.pexels.com/photos/5908470/pexels-photo-5908470.jpeg?auto=compress&cs=tinysrgb&w=1600" public/images/src-mixed.jpg

# مربع‌سازی ۱۲۵۴×۱۲۵۴ با خط تولید پروژه (اگر gen نبود)
for pair in "src-japanese japanese-seeds" "src-mixed mixed-seeds"; do
  set -- $pair; SRC=$1; NAME=$2
  if [ -f "public/images/$SRC.jpg" ] && [ ! -f "public/images/gen/$NAME.jpg" ]; then
    node -e "
const sharp = require('sharp');
sharp('public/images/$SRC.jpg').resize(1254, 1254, { fit: 'cover', position: 'centre' })
  .jpeg({ quality: 88, mozjpeg: true }).toFile('public/images/gen/$NAME.jpg')
  .then(() => console.log('[ensure-img] ✓ gen/$NAME.jpg'))
  .catch(e => { console.error('[ensure-img] ⚠ $NAME:', e.message); process.exit(1); });"
  fi
done


# عکس‌های ادیت‌شدهٔ مالک (چای ایرانی — استودیو هلسا v2): بازیابی از final-v2 اگر جا افتاده باشند
cp -f /home/user/helsa-photo-edits/final-v2/12-IMG_3467.jpg public/images/gen/lahijan-black-tea.jpg 2>/dev/null || true
cp -f /home/user/helsa-photo-edits/final-v2/14-tg2.jpg public/images/gen/lahijan-black-tea-2.jpg 2>/dev/null || true

# خرما بار — عکس‌های واقعی مالک
declare -A DATEBAR=( [date-bar]=06-1 [date-bar-2]=13-tg1 [date-bar-3]=15-tg3 )
for NAME in "${!DATEBAR[@]}"; do
  cp -f "/home/user/helsa-photo-edits/final-v2/${DATEBAR[$NAME]}.jpg" "public/images/gen/$NAME.jpg" 2>/dev/null || true
done

# انجیر خشک استهبان — عکس واقعی مالک
cp -f /home/user/helsa-photo-edits/final-v2/07-2.jpg public/images/gen/dried-figs.jpg 2>/dev/null || true

# کشمش سبز — عکس‌های واقعی مالک
declare -A RAISIN=( [golden-raisins]=10-7 [golden-raisins-2]=11-8 )
for NAME in "${!RAISIN[@]}"; do
  cp -f "/home/user/helsa-photo-edits/final-v2/${RAISIN[$NAME]}.jpg" "public/images/gen/$NAME.jpg" 2>/dev/null || true
done

# مغز گردو — عکس‌های واقعی مالک
declare -A WALNUT=( [walnut-kernels]=08-3 [walnut-kernels-2]=09-4 )
for NAME in "${!WALNUT[@]}"; do
  cp -f "/home/user/helsa-photo-edits/final-v2/${WALNUT[$NAME]}.jpg" "public/images/gen/$NAME.jpg" 2>/dev/null || true
done

# شکلات دست‌ساز خرما — عکس‌های واقعی مالک (بازیابی از final-v2)
declare -A CHOC=( [handmade-date-chocolate]=01-IMG_3596 [handmade-date-chocolate-2]=02-IMG_3598 [handmade-date-chocolate-3]=03-IMG_3599 [handmade-date-chocolate-4]=04-IMG_3601 [handmade-date-chocolate-5]=05-IMG_3602 )
for NAME in "${!CHOC[@]}"; do
  cp -f "/home/user/helsa-photo-edits/final-v2/${CHOC[$NAME]}.jpg" "public/images/gen/$NAME.jpg" 2>/dev/null || true
done

# بازتولید هر واریانت opt گم‌شده از منبع gen
# ── انطباق منیفست با منابع gen (AUD-01 fix) ──
# قاعدهٔ عدم‌افتادن: هر public/images/gen/{name}.jpg باید مدخل کامل در
# src/data/image-variants.json داشته باشد. ریشهٔ باگ: سقف حجم snapshot فایل‌های
# opt را می‌اندازد → rebuild-image-manifest منیفست را از optِ بازساخته → کلید
# گم می‌شود → regen (منیفست‌محور) دیگر آن را نمی‌سازد (بن‌بست). این همگام‌سازی
# حلقه را می‌بندد: gen = منبع canonical.
node --input-type=module -e '
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
const P = "src/data/image-variants.json";
const m = JSON.parse(readFileSync(P, "utf8"));
const added = [];
for (const f of readdirSync("public/images/gen")) {
  if (!f.endsWith(".jpg")) continue;
  const name = f.slice(0, -4);
  if (!m[name]) { m[name] = { avif: [0, 480, 768, 1080], webp: [0, 480, 768, 1080], jpg: true }; added.push(name); }
}
if (added.length) writeFileSync(P, JSON.stringify(m, null, 2));
console.log(added.length ? `[ensure-manifest] + ${added.length} کلید: ${added.join(", ")}` : "[ensure-manifest] کامل — gen و منیفست همگام");
' 2>/dev/null || true

node scripts/regen-image-variants.mjs 2>&1 | tail -2
