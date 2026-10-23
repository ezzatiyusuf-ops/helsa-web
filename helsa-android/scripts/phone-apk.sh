#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# phone-apk.sh — تونل عمومی مقاوم + بیلد APK تست گوشی، همه در یک دستور
# اجرا:  bash scripts/phone-apk.sh
# خروجی: releases/helsa-v1.0.0-phonetest.apk + releases/tunnel-url.txt
# نکته: تونل با nohup جدا می‌شود تا از پایان turn هم زنده بماند (مثل سرور سایت).
# ═══════════════════════════════════════════════════════════════════════
set -euo pipefail
cd "$(dirname "$0")/.."
TOOLS=/home/user/.cache/helsa-android-tools

# ۱) سایت روی :3000 باید بالا باشد
if ! curl -s -o /dev/null --max-time 4 http://localhost:3000/; then
  echo "✗ سایت روی :3000 بالا نیست — اول بازیابی:" >&2
  echo "  npm ci && bash scripts/dev-setup.sh && bash scripts/restore-db.sh backups/helsa-20260916-221507.dump --force && npm run build && (npm run start -- -p 3000 &)" >&2
  exit 1
fi

# ۲) cloudflared (دانلود اگر نیست)
if [ ! -x /tmp/cloudflared ]; then
  curl -sSL -o /tmp/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
  chmod +x /tmp/cloudflared
fi

# ۳) تونل جداشده (اگر نیست) — nohup تا از پایان turn زنده بماند
if ! pgrep -f "/tmp/cloudflared[ ]tunnel" >/dev/null 2>&1; then
  : > /tmp/tunnel.log
  nohup /tmp/cloudflared tunnel --url http://localhost:3000 --no-autoupdate > /tmp/tunnel.log 2>&1 &
  disown || true
  echo "… در انتظار آدرس تونل"
  for i in $(seq 1 30); do
    grep -q "trycloudflare.com" /tmp/tunnel.log 2>/dev/null && break
    sleep 1
  done
fi
URL=$(grep -oE "https://[a-z-]+\.trycloudflare\.com" /tmp/tunnel.log | head -1)
if [ -z "$URL" ]; then echo "✗ آدرس تونل پیدا نشد — /tmp/tunnel.log را ببینید" >&2; exit 1; fi
echo "$URL" > releases/tunnel-url.txt
echo "✓ تونل: $URL"

# ۴) آماده‌سازی ابزار اگر پاک شده (بین turnها .cache نمی‌ماند)
if [ ! -d "$TOOLS/jdk17" ]; then
  echo "… نصب مجدد ابزار اندروید"
  bash scripts/provision-tools.sh > /dev/null 2>&1
fi
command -v swapon >/dev/null 2>&1 && [ "$(swapon --show 2>/dev/null | wc -l)" -eq 0 ] && \
  (sudo fallocate -l 3G /swapfile 2>/dev/null && sudo chmod 600 /swapfile && sudo mkswap /swapfile >/dev/null && sudo swapon /swapfile) || true

# ۵) بیلد APK با آدرس همین تونل
export JAVA_HOME="$TOOLS/jdk17"
export ANDROID_HOME="$TOOLS/android-sdk"
export GRADLE_USER_HOME="$TOOLS/gradle-home"
chmod +x gradlew
./gradlew assembleDebug -PHELSA_BASE_URL="$URL" --no-daemon
cp app/build/outputs/apk/debug/app-debug.apk releases/helsa-v1.0.0-phonetest.apk
echo "✓ APK آماده: releases/helsa-v1.0.0-phonetest.apk (سرور: $URL)"
