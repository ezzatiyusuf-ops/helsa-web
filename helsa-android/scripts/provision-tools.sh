#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# provision-tools.sh — نصب ابزار بیلد اندروید برای HELSA Android
# اجرا در سندباکس (بدون root). همه‌چیز در /opt نصب می‌شود (بیرون از snapshot
# workspace) — این اسکریپت قابل اجرای مجدد در هر turn است.
# prerequisite: network به dl.google.com / services.gradle.org / adoptium
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
TOOLS=/home/user/.cache/helsa-android-tools
mkdir -p "$TOOLS"
cd "$TOOLS"

echo "[1/5] JDK 17 (Temurin)…"
if [ ! -d jdk17 ]; then
  curl -sSL -o jdk17.tar.gz "https://api.adoptium.net/v3/binary/latest/17/ga/linux/x64/jdk/hotspot/normal/eclipse"
  mkdir -p jdk17 && tar -xzf jdk17.tar.gz -C jdk17 --strip-components=1
  rm -f jdk17.tar.gz
fi
export JAVA_HOME="$TOOLS/jdk17"
echo "  java: $($JAVA_HOME/bin/java -version 2>&1 | head -1)"

echo "[2/5] Android cmdline-tools…"
if [ ! -d android-sdk/cmdline-tools/latest ]; then
  curl -sSL -o cmdtools.zip "https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"
  mkdir -p android-sdk/cmdline-tools
  unzip -q cmdtools.zip -d android-sdk/cmdline-tools
  mv android-sdk/cmdline-tools/cmdline-tools android-sdk/cmdline-tools/latest
  rm -f cmdtools.zip
fi
export ANDROID_HOME="$TOOLS/android-sdk"
SDKMANAGER="$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager"

echo "[3/5] پذیرش لایسنس‌ها و نصب پکیج‌های SDK…"
yes | "$SDKMANAGER" --licenses >/dev/null 2>&1 || true
"$SDKMANAGER" --install "platform-tools" "platforms;android-35" "build-tools;35.0.0" > /dev/null
echo "  نصب‌شده: $(ls "$ANDROID_HOME/platforms" 2>/dev/null | tr '\n' ' ')"

echo "[4/5] Gradle 8.9…"
if [ ! -d gradle-8.9 ]; then
  curl -sSL -o gradle.zip "https://services.gradle.org/distributions/gradle-8.9-bin.zip"
  unzip -q gradle.zip && rm -f gradle.zip
fi
export GRADLE_USER_HOME="$TOOLS/gradle-home"
mkdir -p "$GRADLE_USER_HOME"

echo "[5/5] فونت وزیرمتن (TTF)…"
if [ ! -d fonts ]; then
  mkdir -p fonts
  for w in Regular Medium SemiBold Bold; do
    curl -sSL -o "fonts/Vazirmatn-$w.ttf" "https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/fonts/ttf/Vazirmatn-$w.ttf" || echo "  ⚠ $w ناموفق"
  done
  ls -la fonts/
fi
echo "═══ PROVISION DONE ═══"
