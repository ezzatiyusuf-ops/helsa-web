#!/usr/bin/env bash
# ==========================================================
# HELSA — production readiness gate (go/no-go)
# استفاده: bash scripts/verify-production.sh
# خروج 0 = GO (بلاکر ندارد) · خروج 1 = NO-GO
# ==========================================================
set -uo pipefail
cd "$(dirname "$0")/.."

PASS=0; WARN=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "  ✓ $1"; }
warn() { WARN=$((WARN+1)); echo "  ▲ WARN: $1"; }
fail() { FAIL=$((FAIL+1)); echo "  ✗ FAIL: $1"; }

echo "═══ HELSA Production Readiness Gate ═══"

# ── 1) ENV ──────────────────────────────────────────────
if [ ! -f .env ]; then echo "✗ .env یافت نشد"; exit 1; fi
get() { grep -E "^$1=" .env 2>/dev/null | head -1 | cut -d= -f2-; }

[ -n "$(get DATABASE_URL)" ] && ok "DATABASE_URL تنظیم است" || fail "DATABASE_URL تنظیم نیست"
SECRET_LEN=$(printf %s "$(get AUTH_SECRET)" | wc -c)
[ "$SECRET_LEN" -ge 32 ] && ok "AUTH_SECRET ($SECRET_LEN کاراکتر)" || fail "AUTH_SECRET باید ≥ ۳۲ کاراکتر باشد"
URL=$(get NEXT_PUBLIC_SITE_URL)
case "$URL" in https://*) ok "NEXT_PUBLIC_SITE_URL = $URL" ;; *) fail "NEXT_PUBLIC_SITE_URL باید https دامنهٔ واقعی باشد (الان: ${URL:-تنظیم‌نشده})" ;; esac
[ -z "$(get ALLOW_DEV_OTP_HINT)" ] && ok "ALLOW_DEV_OTP_HINT غایب (درست)" || fail "ALLOW_DEV_OTP_HINT نباید در production باشد"
[ -z "$(get OTP_TEST_HINT)" ] && ok "OTP_TEST_HINT غایب (درست)" || fail "OTP_TEST_HINT=1 فقط محیط تست است — در تولید حذف کنید (وگرنه کد OTP در UI نمایش داده می‌شود)"
[ -z "$(get SMS_PROVIDER)" ] || [ -n "$(get SMS_API_KEY)" ] && ok "پیکربندی SMS سازگار است" || fail "SMS_PROVIDER تنظیم شده ولی SMS_API_KEY خالی است"

# ── 2) PAYMENT ──────────────────────────────────────────
if [ -n "$(get GATEWAY_API_KEY)" ] && [ "$(get PAYMENTS_SANDBOX)" != "1" ]; then
  ok "درگاه پرداخت واقعی فعال"
else
  warn "پرداخت آنلاین غیرفعال (GATEWAY_API_KEY نیست یا PAYMENTS_SANDBOX=1) — COD/کارت‌به‌کارت کار می‌کند"
fi

# ── 3) SMS / OTP ────────────────────────────────────────
if [ "$(get SMS_PROVIDER)" = "kavenegar" ] && [ -n "$(get SMS_API_KEY)" ]; then
  ok "SMS کاوه‌نگار پیکربندی شده"
else
  warn "SMS پیکربندی نشده — OTP مهمان و بازیابی رمز غیرفعال است (ثبت‌نام/ورود با رمز سالم است)"
fi

# ── 4) ADMIN ────────────────────────────────────────────
[ -n "$(get ADMIN_EMAILS)" ] && ok "ADMIN_EMAILS تنظیم است" || fail "ADMIN_EMAILS تنظیم نیست (پنل مدیریت قفل می‌ماند)"

# ── 5) BUILD ────────────────────────────────────────────
[ -f .next/BUILD_ID ] && ok "بیلد production موجود است" || fail "بیلد production نیست — npm run build"

# ── 6) DATABASE ─────────────────────────────────────────
DBURL=$(get DATABASE_URL)
if command -v psql >/dev/null 2>&1; then
  COUNT=$(psql "$DBURL" -t -A -c "SELECT count(*) FROM products" 2>/dev/null || echo "-1")
  if [ "$COUNT" -gt 0 ] 2>/dev/null; then ok "DB متصل — $COUNT محصول"; else fail "اتصال به دیتابیس ناموفق"; fi
else
  warn "psql در دسترس نیست — اتصال DB را با npm run start و صفحهٔ /products چک کنید"
fi

# ── 7) BACKUP ───────────────────────────────────────────
LATEST=$(ls -1t backups/helsa-*.dump 2>/dev/null | head -1)
if [ -n "$LATEST" ]; then
  AGE_H=$(( ( $(date +%s) - $(stat -c %Y "$LATEST") ) / 3600 ))
  [ "$AGE_H" -le 24 ] && ok "بکاپ تازه (${AGE_H} ساعت پیش)" || warn "آخرین بکاپ ${AGE_H} ساعت پیش — cron روزانه: 0 3 * * * npm run db:backup"
else
  warn "فایل بکاپی در backups/ نیست — یک‌بار npm run db:backup اجرا کنید"
fi

# ── 8) LIVE CHECKS (اگر سرور بالا است) ──────────────────
if curl -s -o /dev/null --max-time 3 http://localhost:3000/; then
  H=$(curl -s -D- -o /dev/null http://localhost:3000/)
  echo "$H" | grep -q "Content-Security-Policy" && ok "هدر CSP فعال" || fail "هدر CSP غایب"
  echo "$H" | grep -q "Strict-Transport-Security" && ok "هدر HSTS فعال" || fail "هدر HSTS غایب"
  echo "$H" | grep -q "X-Frame-Options" && ok "X-Frame-Options فعال" || fail "XFO غایب"
  echo "$H" | grep -qi "X-Powered-By" && warn "X-Powered-By هنوز ارسال می‌شود" || ok "X-Powered-By حذف شده"
  curl -s http://localhost:3000/robots.txt | grep -q "helsairanian.ir" && ok "robots.txt → دامنهٔ واقعی" || warn "robots.txt دامنهٔ واقعی را نشان نمی‌دهد"
  CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/products/bogus-xyz-audit)
  [ "$CODE" = "404" ] && ok "404 واقعی روی اسلاج ناموجود" || warn "soft-404؟ استاتوس: $CODE"
  curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health | grep -q 200 && ok "health endpoint سالم" || warn "health endpoint پاسخ نداد"
  # ── تلهٔ ایندکس (فاز ۹): متادیتای robots روی صفحات استاتیک هنگام **بیلد** پخته می‌شود.
  # اگر بیلد بدون ALLOW_INDEXING=1 گرفته شود، کل سایت — از جمله PDP — با noindex منتشر
  # می‌شود حتی اگر در زمان اجرا این متغیر ست باشد. این بررسی همان تله را می‌گیرد.
  if [ "${ALLOW_INDEXING:-}" = "1" ]; then
    if curl -s http://localhost:3000/products/mazafati-dates | grep -q 'name="robots" content="noindex'; then
      fail "ALLOW_INDEXING=1 است ولی PDP با noindex منتشر شده — بیلد باید با ALLOW_INDEXING=1 گرفته شود"
    else
      ok "PDP با index منتشر شده (بیلد و اجرا هم‌خوان با ALLOW_INDEXING=1)"
    fi
  else
    curl -s http://localhost:3000/products/mazafati-dates | grep -q 'name="robots" content="noindex' \
      && ok "ایندکس خاموش است (noindex روی PDP) — برای لانچ ALLOW_INDEXING=1 را در **بیلد** بگذارید" \
      || warn "ALLOW_INDEXING تنظیم نشده ولی صفحه noindex نیست"
  fi
  if curl -s http://localhost:3000/robots.txt | grep -q "Disallow: /account"; then ok "robots.txt مسیرهای خصوصی را می‌بندد"; else warn "robots.txt مسیرهای خصوصی را نمی‌بندد (ALLOW_INDEXING=0؟)"; fi
  if curl -s http://localhost:3000/sitemap.xml | grep -q "<loc>"; then ok "sitemap.xml آدرس دارد"; else warn "sitemap.xml خالی است (ALLOW_INDEXING=0 در بیلد)"; fi
  # GTM — سازگاری env ↔ CSP ↔ تزریق (اگر پیکربندی شده باشد)
  GTM_ID_VAL="$(get NEXT_PUBLIC_GTM_ID)"
  if [ -n "$GTM_ID_VAL" ]; then
    echo "$H" | grep -q "googletagmanager.com" && ok "CSP شامل googletagmanager.com (سازگار با GTM=$GTM_ID_VAL)" || fail "GTM تنظیم شده ولی CSP دامنهٔ googletagmanager.com را مسدود می‌کند"
    curl -s http://localhost:3000/ | grep -q "googletagmanager.com/gtm.js?id=" && ok "اسکریپت GTM در HTML تزریق شده" || fail "NEXT_PUBLIC_GTM_ID تنظیم شده ولی تگ GTM در HTML نیست (بیلد با env درست گرفته شد؟)"
  else
    curl -s http://localhost:3000/ | grep -q "googletagmanager.com" && warn "تگ GTM بدون NEXT_PUBLIC_GTM_ID در HTML هست؟" || ok "GTM غیرفعال (بدون NEXT_PUBLIC_GTM_ID) — CSP سخت‌گیرانه حفظ شده"
  fi
else
  warn "سرور روی :3000 بالا نیست — چک‌های زنده (هدرها/404/health) رد شد"
fi

echo "──────────────────────────────────────────"
echo "نتیجه: PASS=$PASS · WARN=$WARN · FAIL=$FAIL"
if [ "$FAIL" -eq 0 ]; then
  echo "🟢 GO — بلاکری ندارید (WARNها را هم بخوانید)"
  exit 0
else
  echo "🔴 NO-GO — ابتدا موارد FAIL را رفع کنید"
  exit 1
fi
