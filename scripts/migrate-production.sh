#!/usr/bin/env bash
# اجرای مهاجرت‌ها روی دیتابیس تولید — ترتیبی و با توقف در اولین خطا
# استفاده:  DATABASE_URL=postgresql://… bash scripts/migrate-production.sh
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL ست نشده}"
cd "$(dirname "$0")/.."
for f in drizzle/0000_init_snapshot.sql drizzle/0001_guest_reviews.sql \
         drizzle/0002_card_transfer_receipts.sql drizzle/0003_support_contribution.sql \
         drizzle/0004_schema_drift.sql drizzle/0005_rooziteh_producers.sql; do
  [ -f "$f" ] || { echo "✗ فایل نیست: $f"; exit 1; }
  echo "→ $f"
  psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f "$f"
done
COUNT=$(psql "$DATABASE_URL" -tAc "select count(*) from information_schema.tables where table_schema='public'")
echo "✓ جدول‌ها: $COUNT"
[ "$COUNT" -ge 42 ] || { echo "✗ تعداد جدول کمتر از انتظار (۴۲)"; exit 1; }
echo "✓ مهاجرت کامل شد"
