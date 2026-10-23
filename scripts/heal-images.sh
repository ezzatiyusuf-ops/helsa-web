#!/usr/bin/env bash
# heal-images.sh — بازسازی قطعی تصاویر مالک (۱۵) + بنرهای هیرو (۵) از مسترهای اصلی
# ─────────────────────────────────────────────────────────────────────────────
# چرا: ری‌استارت سندباکس می‌تواند پوشهٔ سنگین public/images/opt را به وضعیت قدیمی/استوک
# برگرداند. این اسکریپت همیشه از منبع حقیقت (/home/user/helsa-photo-edits) بازسازی
# می‌کند و در پایان با مقایسهٔ پیکسلی (RMSE) تأیید می‌کند: ۲۰/۲۰.
#
# استفاده:  bash scripts/heal-images.sh [--force-all]
#   --force-all : همهٔ نام‌هایی که مستر gen دارند هم از gen بازسازی می‌شوند.
set -euo pipefail
cd /home/user/helsa

MASTER_OWNER="/home/user/helsa-photo-edits/final-v2"
MASTER_HERO="/home/user/helsa-photo-edits/hero-banner-v1"
MAP_FILE="scripts/owner-image-map.txt"
[ -f "$MAP_FILE" ] || { echo "[heal] ✗ نگاشت $MAP_FILE نیست" >&2; exit 1; }
HERO_MAP="hero-piarom hero-mazafati hero-nuts-dried-fruits hero-date-chocolate hero-mazeh-tray"

wipe_set() {
  local N="$1"
  rm -f "public/images/opt/$N.jpg" "public/images/opt/$N.avif" "public/images/opt/$N.webp" \
        "public/images/opt/$N-480.avif"  "public/images/opt/$N-480.webp" \
        "public/images/opt/$N-768.avif"  "public/images/opt/$N-768.webp" \
        "public/images/opt/$N-1080.avif" "public/images/opt/$N-1080.webp" \
        "public/images/opt/$N-1400.avif" "public/images/opt/$N-1400.webp"
}

echo "[heal] ۱/۴ کپی مسترهای مالک → public/images/gen…"
while read -r NAME SRC; do
  case "$NAME" in \#*|"") continue;; esac
  SRC="$MASTER_OWNER/$SRC.jpg"
  [ -f "$SRC" ] || { echo "  ✗ منبع $SRC نیست" >&2; exit 1; }
  cp -f "$SRC" "public/images/gen/$NAME.jpg"
  wipe_set "$NAME"
done < "$MAP_FILE"

echo "[heal] ۲/۴ کپی بنرهای هیرو → public/images/gen…"
for N in $HERO_MAP; do
  SRC="$MASTER_HERO/$N.jpg"
  [ -f "$SRC" ] || { echo "  ✗ مستر هیرو $N نیست" >&2; exit 1; }
  cp -f "$SRC" "public/images/gen/$N.jpg"
  wipe_set "$N"
done

if [ "${1:-}" = "--force-all" ]; then
  echo "[heal] بازسازی اجباری همهٔ نام‌های دارای مستر gen…"
  for f in public/images/gen/*.jpg; do
    N="$(basename "$f" .jpg)"
    case " $HERO_MAP " in *" $N "*) continue;; esac
    if ! awk '{print $1}' "$MAP_FILE" | grep -qx "$N"; then wipe_set "$N"; fi
  done
fi

echo "[heal] ۳/۴ بازتولید variantها (sharp)…"
node scripts/regen-image-variants.mjs 2>&1 | tail -2
node scripts/gen-hero-real-variants.mjs 2>&1 | tail -1

echo "[heal] ۴/۴ گارد پیکسلی ۲۰/۲۰…"
BAD=0
while read -r NAME SRC; do
  case "$NAME" in \#*|"") continue;; esac
  cmp -s "public/images/gen/$NAME.jpg" "$MASTER_OWNER/$SRC.jpg" || { echo "  ✗ gen/$NAME" >&2; BAD=1; }
  [ -f "public/images/opt/$NAME.jpg" ] || { echo "  ✗ opt/$NAME نیست" >&2; BAD=1; continue; }
  RMSE=$( (compare -metric RMSE -resize 128x128! "$MASTER_OWNER/$SRC.jpg" "public/images/opt/$NAME.jpg" null: 2>&1 || true) | tr -d ' ' | cut -d'(' -f1)
  python3 -c "import sys; sys.exit(0 if float('${RMSE:-99999}')<3000 else 1)" || { echo "  ✗ opt/$NAME (RMSE=$RMSE)" >&2; BAD=1; }
done < "$MAP_FILE"
for N in $HERO_MAP; do
  cmp -s "public/images/gen/$N.jpg" "$MASTER_HERO/$N.jpg" || { echo "  ✗ gen/$N" >&2; BAD=1; }
  [ -f "public/images/opt/$N.jpg" ] || { echo "  ✗ opt/$N نیست" >&2; BAD=1; continue; }
  RMSE=$( (compare -metric RMSE -resize 128x128! "$MASTER_HERO/$N.jpg" "public/images/opt/$N.jpg" null: 2>&1 || true) | tr -d ' ' | cut -d'(' -f1)
  python3 -c "import sys; sys.exit(0 if float('${RMSE:-99999}')<3000 else 1)" || { echo "  ✗ opt/$N (RMSE=$RMSE)" >&2; BAD=1; }
done
[ "$BAD" = "0" ] && echo "[heal] ✅ ۲۰/۲۰ تأیید شد" || { echo "[heal] 🔴 رد شد" >&2; exit 1; }
