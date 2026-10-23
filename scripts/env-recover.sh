#!/usr/bin/env bash
# ==========================================================
# HELSA — sandbox environment recovery (after snapshot restore)
# محیط بین نشست‌ها ریست می‌شود (node_modules، .next، PostgreSQL از snapshot خارج‌اند).
# این اسکریپت همه‌چیز را بازمی‌گرداند: وابستگی‌ها، دیتابیس (فقط اگر خالی)،
# واریانت‌های gمکانی opt/ از روی gen/، و جایگزینی تصاویر.
# Idempotent — اجرای مکرر بی‌ضرر است.
# ==========================================================
set -euo pipefail
cd "$(dirname "$0")/.."

echo "[recover] 1/6 node_modules…"
[ -d node_modules/next ] || npm install --no-audit --no-fund

echo "[recover] 2/6 PostgreSQL…"
if ! pg_isready -q -h 127.0.0.1 -p 5432 2>/dev/null; then
  command -v pg_ctlcluster >/dev/null 2>&1 || { sudo apt-get update -qq; sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql; }
  sudo pg_ctlcluster 17 main start 2>/dev/null || sudo pg_ctlcluster 16 main start 2>/dev/null || true
fi
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='helsa'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE USER helsa WITH PASSWORD 'helsa_dev_pw';"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='helsa_db'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE helsa_db OWNER helsa;"

echo "[recover] 3/6 schema+seed (فقط اگر DB خالی)…"
COUNT=$(PGPASSWORD=helsa_dev_pw psql -h 127.0.0.1 -U helsa -d helsa_db -tAc "SELECT count(*) FROM products" 2>/dev/null || echo 0)
if [ "$COUNT" = "0" ]; then
  # مرتب‌سازی بر اساس «نام» (timestamp در نام فایل است) — mtime با snapshot ریست می‌شود و نامعتبر است
  LATEST=$(ls -1 backups/helsa-*.dump 2>/dev/null | sort | tail -1 || true)
  if [ -n "$LATEST" ]; then
    echo "  DB خالی — بازگردانی از آخرین بکاپ: $LATEST"
    TRG_FORCE=1 bash scripts/restore-db.sh "$LATEST" --force
  else
    npx drizzle-kit push --force
    npx tsx --env-file=.env scripts/seed.ts
    npx tsx --env-file=.env scripts/seed-catalog.ts || true
    npx tsx --env-file=.env scripts/seed-gifts.ts || true
    npx tsx --env-file=.env scripts/seed-instagram.ts || true
  fi
else
  echo "  DB has $COUNT products — seed skipped."
fi
# غنی‌سازی داده (idempotent) — در seed نیست و باید بعد از هر بازیابی اجرا شود
npx tsx --env-file=.env scripts/fix-nutrition.ts
npx tsx --env-file=.env scripts/fix-product-content.ts

echo "[recover] 4/6 python deps…"
python3 -c "import psycopg2" 2>/dev/null || pip install psycopg2-binary --quiet

echo "[recover] 5/6 مرورگرها (playwright + chromium سیستمی برای اسکریپت‌های QA)…"
if [ ! -d "$HOME/.cache/ms-playwright" ]; then
  npx playwright install --with-deps chromium >/dev/null 2>&1 || true
fi
[ -x /usr/bin/chromium ] || { sudo apt-get update -qq; sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq chromium; }

echo "[recover] 6/6 واریانت‌های opt/…"
# پس از فاز Premium، فایل‌های master در gen/ حذف شدند (۲۳MB تکراری؛ همهٔ variants
# از قبل در opt/ هستند و در snapshot می‌مانند). اگر gen/ نبود، فقط manifest بازسازی می‌شود.
if [ -d public/images/gen ]; then
  node scripts/optimize-new-images.mjs
else
  echo "  gen/ وجود ندارد — بازسازی manifest از opt/ موجود"
  node scripts/rebuild-image-manifest.mjs
fi

echo "[recover] جایگزینی تصاویر (idempotent)…"
python3 scripts/reassign-images.py || true
# جلسهٔ ۲۲ — اصلاحات ممیزی تصاویر (باید بعد از reassign اجرا شود تا نسخهٔ نهایی بماند)
python3 scripts/apply-image-fixes.py || true

# (بازسازی خودکار دیگر لازم نیست — tray-builder ماندگار است)

# بکاپ تازه از وضعیت بازیابی‌شده (همیشه یک snapshot به‌روز داشته باشیم)
bash scripts/backup-db.sh || true

echo "[recover] ✔ کامل — حالا: NODE_OPTIONS=\"--max-old-space-size=1500\" npx next build && npm start"
