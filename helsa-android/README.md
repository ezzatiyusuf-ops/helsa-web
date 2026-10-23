# HELSA Android — اپلیکیشن رسمی اندروید هلسا

اپ اندروید بومی (Kotlin + Jetpack Compose + Material 3) که **همان بک‌اند سایت هلسا** را مصرف می‌کند —
دو کلاینت برای یک سیستم تجارت واحد؛ منبع حقیقت: PostgreSQL همان سرور.

## بیلد
```bash
# ابزار (JDK17 + SDK35 + Gradle) — سندباکس:
bash scripts/provision-tools.sh

# بیلد debug (BASE_URL=http://10.0.2.2:3000 → سرور لوکال)
JAVA_HOME=~/... ./gradlew assembleDebug

# بیلد release (AAB + امضای keystore توسعه)
./gradlew bundleRelease
```
`local.properties` → `sdk.dir` را مطابق ماشین خود تنظیم کنید.

## امضای release
`keystore/keystore.properties` (git-ignore نشده در سندباکس اما **برای تولید جایگزین شود**):
```properties
storeFile=keystore/helsa-release.jks
storePassword=...
keyAlias=helsa
keyPassword=...
```

## App Links
پس از deploy، `docs/assetlinks.json` (با SHA-256 کلید تولید) باید در
`https://helsairanian.ir/.well-being/assetlinks.json` → در واقع `/.well-known/assetlinks.json` میزبانی شود.

## پیکربندی‌های لازم برای تولید (صادقانه)
- دامنهٔ تولید + SSL (helsairanian.ir)
- PostgreSQL تولید
- SMS_PROVIDER (کاوه‌نگار) برای OTP واقعی
- درگاه پرداخت واقعی (زرین‌پال) — تأیید سرور-به-سرور از قبل پیاده است
- ارائه‌دهندهٔ push (FCM) برای نوتیفیکیشن
- کلید امضای تولید (جای keystore توسعه)
