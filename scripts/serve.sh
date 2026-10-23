#!/usr/bin/env bash
# serve.sh — استارت امن سرور هلسا با گارد دیتابیس
# مشکل ریشه‌ای (جلسهٔ ۱۳): اگر PostgreSQL پایین باشد (مثلاً قربانی OOM در حین بیلد)،
# صفحهٔ محصولات بی‌صدا به دادهٔ seed (۳۷ محصول) برمی‌گردد و کاربر ۳ صفحه به‌جای ۱۶ می‌بیند.
# این اسکریپت قبل از استارت، DB را چک می‌کند و اگر لازم است بالا می‌آورد.
set -euo pipefail
cd "$(dirname "$0")/.."

# ۱) اگر بیلد نیست، خطای واضح بده
[ -f .next/BUILD_ID ] || { echo "خطا: بیلد وجود ندارد — اول بیلد بگیرید"; exit 1; }

# ۲) PostgreSQL بالا است؟
if ! pg_isready -q -h 127.0.0.1 -p 5432 2>/dev/null; then
  echo "[serve] PostgreSQL پایین بود — بالا آوردن..."
  command -v pg_ctlcluster >/dev/null 2>&1 || { sudo apt-get update -qq; sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql; }
  sudo pg_ctlcluster 17 main start 2>/dev/null || sudo pg_ctlcluster 16 main start 2>/dev/null || true
  sleep 1
  pg_isready -q -h 127.0.0.1 -p 5432 || { echo "خطا: دیتابیس بالا نیامد — env-recover.sh را اجرا کنید"; exit 1; }
fi

# ۳) گارد محتوا: اگر محصولات کمتر از ۱۰۰ است، هشدار بلند بده (fallback seed = ۳۷)
COUNT=$(PGPASSWORD=helsa_dev_pw psql -h 127.0.0.1 -U helsa -d helsa_db -tAc "SELECT count(*) FROM products WHERE is_active AND is_visible" 2>/dev/null || echo 0)
if [ "$COUNT" -lt 100 ]; then
  echo "⚠️  هشدار: فقط $COUNT محصول نمایان در DB (انتظار: ۱۸۴) — احتمالاً بازگردانی ناقص!"
  echo "   اگر ادامه بدهید، فروشگاه به‌جای ۱۶ صفحه فقط ~۳ صفحه (seed) نشان می‌دهد."
  echo "   توصیه: bash scripts/env-recover.sh"
  exit 1
fi
echo "[serve] DB سالم: $COUNT محصول نمایان ✓ — استارت سرور..."
exec npm start
