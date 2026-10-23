#!/usr/bin/env bash
# ==========================================================
# HELSA — PostgreSQL backup (production-safe)
# خروجی در backups/ داخل پروژه (در sandbox همراه workspace زنده می‌ماند)
#   helsa-YYYYMMDD-HHMMSS.dump   — pg_dump فرمت فشردهٔ سفارشی (-Fc)
#   helsa-…-roles.sql            — نقش‌ها/کاربران (pg_dumpall --globals-only)
#   helsa-….sha256               — چک‌سام همهٔ فایل‌های همان نسخه
# + تأیید صحت (pg_restore --list) + سیاست نگهداری (KEEP، پیش‌فرض ۷)
# Run: bash scripts/backup-db.sh   (یا: npm run db:backup)
# متغیرهای محیطی: DB_USER, DB_PASS, DB_NAME, DB_HOST, DB_PORT, KEEP
# ==========================================================
set -euo pipefail
cd "$(dirname "$0")/.."

DB_USER="${DB_USER:-helsa}"
DB_PASS="${DB_PASS:-helsa_dev_pw}"
DB_NAME="${DB_NAME:-helsa_db}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
KEEP="${KEEP:-7}"
OUT="backups"
STAMP="$(date +%Y%m%d-%H%M%S)"
DUMP="$OUT/helsa-$STAMP.dump"
ROLES="$OUT/helsa-$STAMP-roles.sql"

mkdir -p "$OUT"
export PGPASSWORD="$DB_PASS"

echo "[backup] pg_dump $DB_NAME@$DB_HOST:$DB_PORT → $DUMP"
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  --format=custom --compress=6 --no-owner --no-privileges \
  --file="$DUMP"

# نقش‌ها/کاربران — pg_dumpall به خواندن pg_authid (ابرکاربر) نیاز دارد؛
# اول از مسیر استاندارد سرور (sudo -u postgres، سوکت محلی)، بعد با کاربر جاری.
ROLES_OK=0
if command -v sudo >/dev/null 2>&1 && sudo -u postgres pg_dumpall --globals-only > "$ROLES" 2>/dev/null; then
  ROLES_OK=1
elif pg_dumpall -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" --globals-only > "$ROLES" 2>/dev/null; then
  ROLES_OK=1
else
  rm -f "$ROLES"
  echo "[backup] ⚠️ dump نقش‌ها انجام نشد (روی سرور واقعی: اجرای بکاپ با کاربر postgres یا sudo)"
fi

# تأیید صحت آرشیو قبل از اعلام موفقیت
pg_restore --list "$DUMP" >/dev/null
DUMP_ROWS="$(pg_restore --list "$DUMP" | grep -c 'TABLE DATA' || true)"

# چک‌سام همهٔ فایل‌های این نسخه
FILES=("$DUMP")
[ "$ROLES_OK" = 1 ] && FILES+=("$ROLES")
sha256sum "${FILES[@]}" > "$OUT/helsa-$STAMP.sha256"
sha256sum -c "$OUT/helsa-$STAMP.sha256" --quiet && echo "[backup] چک‌سام ✔"

SIZE="$(du -h "$DUMP" | cut -f1)"
echo "[backup] ✔ $DUMP ($SIZE, $DUMP_ROWS جدولِ دارای داده)"

# سیاست نگهداری: فقط KEEP نسخهٔ آخر بماند (بر اساس زمان فایل dump)
ls -1t "$OUT"/helsa-*.dump 2>/dev/null | tail -n +$((KEEP + 1)) | while read -r old; do
  base="${old%.dump}"
  rm -f "$old" "$base-roles.sql" "$base.sha256"
  echo "[backup] 🧹 حذف نسخهٔ قدیمی: $(basename "$old")"
done

echo "[backup] نسخه‌های موجود: $(ls -1 "$OUT"/helsa-*.dump 2>/dev/null | wc -l) (سقف $KEEP)"
