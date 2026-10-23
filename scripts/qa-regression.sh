#!/usr/bin/env bash
# HELSA — full QA regression chain. Run ONCE against a freshly restarted server:
#   bash scripts/qa-regression.sh
set -u
cd "$(dirname "$0")/.."
R=0
run() {
  echo ""
  echo "════════ $1 ════════"
  shift
  "$@"
  code=$?
  if [ $code -ne 0 ]; then R=1; echo "⚠️ FAILED: $1 (exit $code)"; fi
  return 0
}

echo "── پاک‌سازی state تست ──"
sudo -u postgres psql -d helsa_db > /dev/null 2>&1 <<'SQL'
DELETE FROM auth_challenges;
DELETE FROM customers WHERE email = 'zahra.qa@helsa-test.ir'; -- سارا حساب دائمی تست است؛ حذف نشود (سوئیت‌های cart/journey/admin به او وابسته‌اند)
DELETE FROM product_images WHERE product_id IN (SELECT id FROM products WHERE slug LIKE 'qa-audit-%');
DELETE FROM inventory_movements WHERE product_id IN (SELECT id FROM products WHERE slug LIKE 'qa-audit-%');
DELETE FROM products WHERE slug LIKE 'qa-audit-%';
DELETE FROM wholesale_businesses WHERE email LIKE 'demo_.cafe@helsa-test.ir' OR email LIKE 'demo__.cafe@helsa-test.ir';
SQL
echo "cleaned"

run "۱) سفر مشتری — احراز هویت" python3 scripts/qa-journey-auth.py
run "۲) سازنده سینی — دقت قیمت" python3 scripts/qa-journey-builder.py
run "۳) سفر UI مرورگر واقعی" npx tsx --env-file=.env scripts/qa-ui-journey.ts
run "۳ب) هیدریشن/تم و چیدمان موبایل" node scripts/qa/hydration-check.mjs
run "۴) سفر ادمین" python3 scripts/qa-journey-admin.py

echo ""
echo "── ری‌استارت سرور (ریست شمارنده‌های rate-limit برای سوئیت‌های استرس) ──"
echo "(اجرای دستی: npm start را ری‌استارت کنید، سپس بخش دوم)"
echo ""
run "۵) استرس سفارش/سینی/امنیت" python3 scripts/stress-test-orders.py
run "۶) استرس احراز هویت" python3 scripts/stress-test-auth.py
run "۷) خزش کامل فروشگاه" python3 scripts/qa-browse.py

echo ""
if [ $R -eq 0 ]; then
  echo "════════ رگرسیون کامل: همه سوئیت‌ها PASS ════════"
else
  echo "════════ رگرسیون: برخی سوئیت‌ها FAILED ════════"
fi
exit $R
