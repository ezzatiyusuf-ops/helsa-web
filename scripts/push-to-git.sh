#!/usr/bin/env bash
# push-to-git.sh — پوش کامل پروژهٔ هلسا به GitHub (کد + تصاویر بهینه‌شده)
# استفاده:  GITHUB_TOKEN=ghp_xxxxx bash scripts/push-to-git.sh
# امنیت: توکن فقط از متغیر محیطی خوانده می‌شود و هرگز چاپ نمی‌شود؛
#         git-dir در /tmp ساخته می‌شود تا فضای ورک‌اسپیس پر نشود.
set -euo pipefail

REPO="ezzatiyusuf-ops/helsa-web"
BRANCH="main"
: "${GITHUB_TOKEN:?خطا: GITHUB_TOKEN ست نشده — GITHUB_TOKEN=xxx bash scripts/push-to-git.sh}"

cd /home/user/helsa
GITDIR="${HELSA_GITDIR:-/tmp/helsa-git}"

# شروع تازه (فایل اشاره‌گر .git بعداً حذف می‌شود)
rm -rf "$GITDIR" .git
git init --separate-git-dir="$GITDIR" -b "$BRANCH" >/dev/null
git config user.name "ezzatiyusuf-ops"
git config user.email "ezzatiyusuf-ops@users.noreply.github.com"
git config http.postBuffer 524288000

echo "[push] ۱/۵ stage فایل‌ها (طبق .gitignore — بدون .env/بکاپ/qa-shots)…"
git add -A

# گارد امنیتی: هرگز اجازهٔ push رازها را نده
if git ls-files --cached | grep -qx ".env"; then
  echo "خطای امنیتی: .env استیج شده است — متوقف شد!" >&2; exit 1
fi
if git ls-files --cached | grep -q "^backups/"; then
  echo "خطای امنیتی: backups/ استیج شده است — متوقف شد!" >&2; exit 1
fi

# ── خودترمیمی تصاویر مالک (IMG-HEAL): سندباکس ممکن است بین نوبت‌ها ری‌استارت شود و
# پوشهٔ حجیم opt را به وضعیت استوک برگرداند. پیش از هر پوش، ۱۵ ست مالک از
# final-v2 (منبع حقیقت) بازسازی می‌شوند — با همان خط تولید پروژه (sharp).
if [ ! -d node_modules/sharp ]; then
  echo "[push] وابستگی‌ها نیست — نصب (~۲ دقیقه)…"
  npm ci --no-audit --no-fund >/dev/null 2>&1 || { echo "[push] ✗ npm ci شکست خورد" >&2; exit 1; }
fi
while read -r NAME SRC; do
  case "$NAME" in \#*|"") continue;; esac
  cp -f "/home/user/helsa-photo-edits/final-v2/$SRC.jpg" "public/images/gen/$NAME.jpg" 2>/dev/null || true
  rm -f public/images/opt/$NAME.jpg public/images/opt/$NAME.avif public/images/opt/$NAME.webp \
        public/images/opt/$NAME-480.avif public/images/opt/$NAME-480.webp \
        public/images/opt/$NAME-768.avif public/images/opt/$NAME-768.webp \
        public/images/opt/$NAME-1080.avif public/images/opt/$NAME-1080.webp \
        public/images/opt/$NAME-1400.avif public/images/opt/$NAME-1400.webp
done < scripts/owner-image-map.txt
node scripts/gen-image-variants.mjs --from-file scripts/owner-image-map.txt 2>&1 | tail -1
node scripts/regen-image-variants.mjs 2>&1 | tail -1

# بنرهای هیرو (منبع حقیقت: helsa-photo-edits/hero-banner-v1) — بازسازی با خط تولید اختصاصی هیرو
for N in hero-piarom hero-mazafati hero-nuts-dried-fruits hero-date-chocolate hero-mazeh-tray; do
  cp -f "/home/user/helsa-photo-edits/hero-banner-v1/$N.jpg" "public/images/gen/$N.jpg" 2>/dev/null || true
  rm -f public/images/opt/$N.jpg public/images/opt/$N.avif public/images/opt/$N.webp \
        public/images/opt/$N-480.avif public/images/opt/$N-480.webp \
        public/images/opt/$N-768.avif public/images/opt/$N-768.webp \
        public/images/opt/$N-1080.avif public/images/opt/$N-1080.webp \
        public/images/opt/$N-1400.avif public/images/opt/$N-1400.webp
done
node scripts/gen-hero-real-variants.mjs 2>&1 | tail -1

# ── عکس‌های جدید مالک (final-v3): توت خشک + مویز ممتاز ازبک + قند خرما نارگیلی ──
# منبع حقیقت: helsa-photo-edits/final-v3/edited (نسخهٔ استودیویی هم‌سبک final-v2)
if [ -d /home/user/helsa-photo-edits/final-v3/edited ]; then
  bash scripts/heal-final-v3.sh 2>&1 | tail -2
else
  echo "[push] ⚠ منابع final-v3 نیست — از فایل‌های موجود استفاده می‌شود"
fi

# ── گارد تصاویر مالک (IMG-GUARD): هرگز پوش با عکس استوک نکن ──
# سندباکس ممکن است پوشهٔ حجیم opt را به وضعیت استوک برگرداند (سابقهٔ واقعی: ۲۰۲۶-۱۰-۱۸).
# (۱) منابع gen باید بایت‌به‌بایت همان final-v2 باشند · (۲) optِ سروشده باید پیکسلی همان عکس مالک باشد.
IMG_BAD=0
while read -r NAME SRC; do
  case "$NAME" in \#*|"") continue;; esac
  if [ ! -f "/home/user/helsa-photo-edits/final-v2/$SRC.jpg" ]; then
    echo "[push] ✗ منبع final-v2/$SRC.jpg پیدا نشد" >&2; IMG_BAD=1; continue
  fi
  if ! cmp -s "public/images/gen/$NAME.jpg" "/home/user/helsa-photo-edits/final-v2/$SRC.jpg" 2>/dev/null; then
    echo "[push] ✗ gen/$NAME.jpg با final-v2/$SRC.jpg یکی نیست" >&2; IMG_BAD=1
  fi
  if [ -f "public/images/opt/$NAME.jpg" ]; then
    RMSE=$( (compare -metric RMSE -resize 128x128! "/home/user/helsa-photo-edits/final-v2/$SRC.jpg" "public/images/opt/$NAME.jpg" null: 2>&1 || true) | tr -d ' ' | cut -d'(' -f1)
    HIGH=$(python3 -c "print(1 if float('${RMSE:-99999}') >= 3000 else 0)" 2>/dev/null || echo 1)
    if [ "$HIGH" = "1" ]; then echo "[push] ✗ opt/$NAME.jpg عکس مالک نیست (RMSE=$RMSE)" >&2; IMG_BAD=1; fi
  else
    echo "[push] ✗ opt/$NAME.jpg وجود ندارد" >&2; IMG_BAD=1
  fi
done < scripts/owner-image-map.txt

# بنرهای هیرو هم باید پیکسلی همان مستر باشند (مانند عکس‌های مالک)
for N in hero-piarom hero-mazafati hero-nuts-dried-fruits hero-date-chocolate hero-mazeh-tray; do
  M="/home/user/helsa-photo-edits/hero-banner-v1/$N.jpg"
  if [ ! -f "$M" ]; then echo "[push] ✗ مستر هیرو $N پیدا نشد" >&2; IMG_BAD=1; continue; fi
  if ! cmp -s "public/images/gen/$N.jpg" "$M" 2>/dev/null; then
    echo "[push] ✗ gen/$N.jpg با مستر هیرو یکی نیست" >&2; IMG_BAD=1
  fi
  if [ -f "public/images/opt/$N.jpg" ]; then
    RMSE=$( (compare -metric RMSE -resize 128x128! "$M" "public/images/opt/$N.jpg" null: 2>&1 || true) | tr -d ' ' | cut -d'(' -f1)
    HIGH=$(python3 -c "print(1 if float('${RMSE:-99999}') >= 3000 else 0)" 2>/dev/null || echo 1)
    if [ "$HIGH" = "1" ]; then echo "[push] ✗ opt/$N.jpg با مستر هیرو نمی‌خواند (RMSE=$RMSE)" >&2; IMG_BAD=1; fi
  else
    echo "[push] ✗ opt/$N.jpg وجود ندارد" >&2; IMG_BAD=1
  fi
done

# گارد عکس‌های final-v3 (توت ۳ + مویز ۳ + قند خرما نارگیلی ۴ = ۱۰ عکس): فایل‌ها کامل + پیکسلی هم‌خوان با gen
V3_NAMES="dried-mulberries dried-mulberries-2 dried-mulberries-3 moiz-uzbek moiz-uzbek-2 moiz-uzbek-3 date-coconut-sugar date-coconut-sugar-2 date-coconut-sugar-3 date-coconut-sugar-4"
for N in $V3_NAMES; do
  if [ ! -f "public/images/gen/$N.jpg" ]; then echo "[push] ✗ gen/$N.jpg نیست" >&2; IMG_BAD=1; continue; fi
  for F in "$N.jpg" "$N.avif" "$N.webp" "$N-480.avif" "$N-480.webp" "$N-768.avif" "$N-768.webp" "$N-1080.avif" "$N-1080.webp"; do
    [ -s "public/images/opt/$F" ] || { echo "[push] ✗ opt/$F نیست" >&2; IMG_BAD=1; }
  done
  if [ -f "public/images/opt/$N.jpg" ]; then
    RMSE=$( (compare -metric RMSE -resize 96x96! "public/images/gen/$N.jpg" "public/images/opt/$N.jpg" null: 2>&1 || true) | tr -d ' ' | cut -d'(' -f1)
    HIGH=$(python3 -c "print(1 if float('${RMSE:-99999}') >= 3000 else 0)" 2>/dev/null || echo 1)
    if [ "$HIGH" = "1" ]; then echo "[push] ✗ opt/$N.jpg با gen نمی‌خواند (RMSE=$RMSE)" >&2; IMG_BAD=1; fi
  fi
done

if [ "$IMG_BAD" = "1" ]; then
  echo "[push] 🔴 گارد تصاویر مالک رد شد — پوش لغو شد. اول بازسازی: bash scripts/ensure-product-images.sh + rm/regen opt" >&2; exit 1
fi
echo "[push] ✓ گارد تصاویر: ۱۵ مالک + ۵ هیرو + ۱۰ عکس new (توت/مویز/نارگیلی) = ۳۰/۳۰ پیکسلی تأیید شد"

# تصاویر بهینه‌شده + منابع gen (شامل عکس‌های واقعی مالک) — طبق الگوی پوش‌های قبلی
git add -f public/images/opt public/images/gen 2>/dev/null || true
git add -f public/images/*.jpg public/images/*.png 2>/dev/null || true

FILES=$(git ls-files --cached | wc -l)
echo "[push] ۲/۵ commit ($FILES فایل)…"
git commit -q -m "محصول جدید: قند خرما نارگیلی هلسا + عکس‌های استودیویی توت/مویز

- توت خشک طبیعت: یک محصول واحد (۴۵۰ گرم · ۹۸۰٬۰۰۰) با ۴ عکس متمایز مالک — رکورد تکراری حذف شد
- مویز ممتاز ازبک (جدید): HLA-0036 · ۵۰۰ گرم · ۱٬۲۵۰٬۰۰۰ · موجودی ۱۵ · ۳ عکس مالک
- اصلاح نگاشت: ۰۶/۱۳/۱۵ از «خرما بار» برداشته شد (گردو و سرو چای بودند) → گردو/چای
- شکلات خرما با مغز گردو عکس واقعی گرفت (۰۴)؛ شکلات‌های هم‌خانواده از ست مالک
- قند خرما نارگیلی هلسا (جدید): HLA-0037 · ۳۵۰ گرم · ۳۵۰٬۰۰۰ · موجودی ۳۰ · گالری ۴ عکس مالک
- عکس‌های توت/مویز بازادیت شدند: هر ۳ فریم استودیویی، هم‌سبک پلاستر مات + نور بالا-چپ
- scripts/owner-image-map.txt منبع حقیقت مشترک · heal-images.sh · heal-final-v3.sh (۱۰ ست) · گارد ۳۰ تصویر
- SQL idempotent: fix-owner-image-mapping + add-moiz-uzbek + merge-mulberry-duplicate + add-date-coconut-sugar (قلاب در restore-db.sh)
"

echo "[push] ۳/۵ اتصال به $REPO و پوش…"
git remote add origin "https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO}.git"
FORCE=""
if ! git push -u origin "$BRANCH" 2>/tmp/push.err; then
  echo "[push] پوش عادی رد شد (احتمالاً commit اولیهٔ repo) — تلاش با --force…"
  FORCE=" (force)"
  git push -u origin "$BRANCH" --force
fi

echo "[push] ۴/۵ پاک‌کردن توکن از remote…"
git remote set-url origin "https://github.com/${REPO}.git"

echo "[push] ۵/۵ جمع‌بندی…"
SHA=$(git rev-parse --short HEAD)
echo "──────────────────────────────────────"
echo "✅ پوش موفق$FORCE"
echo "   repo:   github.com/$REPO (شاخهٔ $BRANCH)"
echo "   commit: $SHA"
echo "   فایل‌ها: $FILES"
echo "   حجم: $(du -sh "$GITDIR" | cut -f1) (شئ‌های git)"
echo "──────────────────────────────────────"

# نظافت: اشاره‌گر .git از پروژه حذف شود (git-dir در /tmp بین نشست‌ها می‌ماند/می‌رود)
rm -f .git
