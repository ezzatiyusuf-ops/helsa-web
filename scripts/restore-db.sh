#!/usr/bin/env bash
# ==========================================================
# HELSA — PostgreSQL restore
# بازگرداندن یک بکاپ به دیتابیس هدف (پیش‌فرض: همان helsa_db)
# Run:  bash scripts/restore-db.sh backups/helsa-XXXX.dump [--force]
#   بدون --force: از بازنویسی دیتابیسِ دارای داده سؤال می‌پرسد.
#   TRG_DB=other_db برای بازگردانی به دیتابیس دیگر (مثلاً تست)
# متغیرهای محیطی: DB_USER, DB_PASS, DB_HOST, DB_PORT, TRG_DB
# ==========================================================
set -euo pipefail
cd "$(dirname "$0")/.."

DUMP="${1:?استفاده: bash scripts/restore-db.sh backups/helsa-XXXX.dump [--force]}"
FORCE="${2:-}"
DB_USER="${DB_USER:-helsa}"
DB_PASS="${DB_PASS:-helsa_dev_pw}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
TRG_DB="${TRG_DB:-helsa_db}"
export PGPASSWORD="$DB_PASS"

[ -f "$DUMP" ] || { echo "❌ فایل یافت نشد: $DUMP"; exit 1; }

# صحت آرشیو
pg_restore --list "$DUMP" >/dev/null || { echo "❌ آرشیو خراب است: $DUMP"; exit 1; }

# اگر چک‌سام همزمان وجود دارد، بررسی شود
BASE="${DUMP%.dump}"
if [ -f "$BASE.sha256" ]; then
  sha256sum -c "$BASE.sha256" --quiet \
    && echo "[restore] چک‌سام ✔" || { echo "❌ چک‌سام مطابق نیست!"; exit 1; }
fi

CURRENT_ROWS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TRG_DB" -tAc \
  "SELECT count(*) FROM products" 2>/dev/null || echo 0)
if [ "$CURRENT_ROWS" != "0" ] && [ "$FORCE" != "--force" ] && [ "${TRG_FORCE:-}" != "1" ]; then
  echo "⚠️ دیتابیس مقصد «$TRG_DB» دارای $CURRENT_ROWS محصول است."
  read -r -p "بازنویسی؟ [y/N] " ans
  [ "$ans" = "y" ] || { echo "لغو شد."; exit 1; }
fi

echo "[restore] بازگردانی $DUMP → $TRG_DB …"
# DROP/CREATE هرکدام در فرمان جدا (DROP DATABASE داخل تراکنش مجاز نیست).
# ترجیحاً با postgres (restore عملیات ادمینی است؛ کاربر اپ CREATEDB ندارد)
ADMIN_PSQL=(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres)
if command -v sudo >/dev/null 2>&1 && sudo -u postgres psql -d postgres -tAc "SELECT 1" >/dev/null 2>&1; then
  ADMIN_PSQL=(sudo -u postgres psql -d postgres)
fi
"${ADMIN_PSQL[@]}" -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$TRG_DB' AND pid<>pg_backend_pid();" >/dev/null 2>&1 || true
"${ADMIN_PSQL[@]}" -c "DROP DATABASE IF EXISTS \"$TRG_DB\";" >/dev/null
"${ADMIN_PSQL[@]}" -c "CREATE DATABASE \"$TRG_DB\" OWNER \"$DB_USER\";" >/dev/null
pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TRG_DB" --no-owner --no-privileges --clean --if-exists "$DUMP"

# ── همگام‌سازی sequenceها با max(id) — اگر dump فقطدیتا باشد، sequenceها جلو نمی‌روند و
#    اولین INSERT بعد از restore با خطای duplicate key (pkey) می‌شکند (بالا آمد در campaigns).
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TRG_DB" -tAc "
DO \$\$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT table_name AS t, pg_get_serial_sequence(quote_ident(table_name), 'id') AS s
    FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'id' AND column_default LIKE 'nextval%'
  LOOP
    BEGIN
      EXECUTE format('SELECT setval(%L, COALESCE((SELECT max(id) FROM %I), 1))', r.s, r.t);
    EXCEPTION WHEN OTHERS THEN NULL; -- جدول‌های استثنایی رد شوند
    END;
  END LOOP;
END \$\$;
" >/dev/null && echo "[restore] ✔ sequenceها با max(id) همگام شدند"

# Schema drift: legacy dumps predate new columns — re-apply the current schema
# (additive; drizzle-kit push only adds missing columns, never drops data).
if [ -f node_modules/.bin/drizzle-kit ]; then
  npx drizzle-kit push --force >/dev/null 2>&1 && echo "[restore] ✔ اسکیمای فعلی اعمال شد (ستون‌های جدید)"
fi

# Data policy: batch dates must come from real batches — strip the known fabricated seed pair
# (production 1404/07/01 + expiry 1405/07/01). Real dates entered later are preserved.
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TRG_DB" -c "UPDATE products SET features = (SELECT COALESCE(jsonb_agg(f), '[]'::jsonb) FROM jsonb_array_elements(features) f WHERE NOT ((f->>'label') IN ('تاریخ تولید','تاریخ انقضا') AND (f->>'value') IN ('۱۴۰۴/۰۷/۰۱','۱۴۰۵/۰۷/۰۱','1404/07/01','1405/07/01'))) WHERE features::text LIKE '%تاریخ%';" >/dev/null && echo "[restore] ✔ تاریخ تولید/انقضای ساختگیٔ سید قدیمی حذف شد"

# Data policy: ratings/review counts live ONLY in the reviews table (approved rows).
# "Best seller"/"popular" badges require real sales data — neutralize seeded values in legacy dumps.
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TRG_DB" -c "UPDATE products SET rating = 0, reviews = 0; UPDATE products SET badge = NULL WHERE badge IN ('محبوب', 'پرفروش');" >/dev/null && echo "[restore] ✔ نمره/بج سیدشدهٔ قدیمی خنثی شد"

# گارد تکمیل تصاویر (درخواست مالک): هیچ محصولی روی placeholder نماند + alt کامل
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/fix-product-images.sql" ]; then

# ستون schema جدید که در dump قدیمی نیست (بیلد استاتیک بدون آن به ۱۱۱ صفحه سقوط می‌کند)
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TRG_DB" -c "ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_starts_at timestamp;" >/dev/null 2>&1 && echo "[restore] ✔ ستون discount_starts_at تضمین شد"

if [ -f "$SCRIPT_DIR/fix-owner-image-mapping.sql" ]; then
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TRG_DB" -f "$SCRIPT_DIR/fix-owner-image-mapping.sql" >/dev/null 2>&1 && echo "[restore] ✔ نگاشت عکس‌های مالک اعمال شد (۱۵ عکس / ۶ محصول)"
fi
if [ -f "$SCRIPT_DIR/add-moiz-uzbek.sql" ]; then
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TRG_DB" -f "$SCRIPT_DIR/add-moiz-uzbek.sql" >/dev/null 2>&1 && echo "[restore] ✔ مویز ممتاز ازبک (۵۰۰ گرم · ۱٬۲۵۰٬۰۰۰ · ۱۵ عدد) اعمال شد"
fi
if [ -f "$SCRIPT_DIR/merge-mulberry-duplicate.sql" ]; then
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TRG_DB" -f "$SCRIPT_DIR/merge-mulberry-duplicate.sql" >/dev/null 2>&1 && echo "[restore] ✔ توت خشک: یک محصول (۴۵۰ گرم · ۹۸۰٬۰۰۰) — تکراری حذف"
fi
if [ -f "$SCRIPT_DIR/add-date-coconut-sugar.sql" ]; then
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TRG_DB" -f "$SCRIPT_DIR/add-date-coconut-sugar.sql" >/dev/null 2>&1 && echo "[restore] ✔ قند خرما نارگیلی هلسا (۳۵۰ گرم · ۳۵۰٬۰۰۰ · ۳۰ عدد) اعمال شد"
fi

  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TRG_DB" -f "$SCRIPT_DIR/fix-product-images.sql" >/dev/null 2>&1 && echo "[restore] ✔ تصاویر محصولات تکمیل شد (گارد placeholder/alt)"
fi

# fallback کاتالوگ آفلاین هم با دادهٔ جدید بازتولید شود
( cd "$SCRIPT_DIR/.." && node scripts/export-fallback-catalog.mjs >/dev/null 2>&1 && echo "[restore] ✔ fallback کاتالوگ بازتولید شد" ) || true

# فایل‌های تصویر گم‌شده (خارج از snapshot) بازدانلود/بازتولید شوند
( cd "$SCRIPT_DIR/.." && bash scripts/ensure-product-images.sh 2>&1 | grep -E "ensure-img|regen\]" | head -3 ) || true

PRODUCTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TRG_DB" -tAc "SELECT count(*) FROM products")
ORDERS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TRG_DB" -tAc "SELECT count(*) FROM orders" 2>/dev/null || echo 0)
echo "[restore] ✔ انجام شد — $TRG_DB: products=$PRODUCTS, orders=$ORDERS"
