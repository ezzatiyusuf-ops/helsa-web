# HELSA Android — گزارش نهایی (§48 بریف)

تاریخ: 2026-09-17 · **خروجی‌های واقعی ساخته‌شده در همین سندباکس:** `releases/helsa-v1.0.0-debug.apk` (۲۱MB) · `releases/helsa-v1.0.0-release.aab` (۵.۱MB، R8 + امضاشده) · سرور سایت :3000 روی بیلد تازه با `/api/campaigns` جدید، ۱۸۴ محصول ✓

---

## A) معماری پروژه

**Android:** تک‌Activity + Jetpack Compose + Material 3 (Kotlin 2.0.20 · AGP 8.6.1 · Gradle 8.9 · compileSdk/targetSdk 35 · minSdk 24) · ناوبری Compose (5 تب: خانه/محصولات/دسته‌بندی/سبد/حساب) · RTL فارسی در ریشه · فونت وزیرمتن (همان سایت) · پالت دقیق از توکن‌های برند سایت (#0B5F3B/#B3922F/#E06A00/#FAF7F0) · HelsaProductCard واحد با variant برای Featured (§12) · core-library-desugaring برای java.time روی API 24-25 · Coil با کش دیسک 96MB · بدون Room (کش در حافظهٔ جلسه — §4 «فقط جایی که واقعاً لازم است») · DataStore برای سبد/جستجو/آنبوردینگ · EncryptedSharedPreferences (Keystore سخت‌افزاری) برای کوکی نشست.

**Backend:** بدون تغییر معماری — همان Next.js 16.3.5. **تنها افزودن لازم‌شده:** `GET /api/campaigns` عمومی (read-only، rate-limited، بدون دادهٔ مدیریتی) — تأیید زنده: ۷ کمپین. CSRF سایت دست‌نخورده: بدون Origin → 403؛ اپ با هدر `Origin` دامنهٔ هلسا عبور می‌کند (کلاینت بومی، بدون بافت مرورگری) — ۲۰۰ تأیید شد.

**Database:** همان PostgreSQL واحد (184 محصول فعال/نمایان). اپ هیچ کاتالوگ موازی ندارد؛ `/api/products` → **184** (≠34) تأیید زنده. کاتالوگ در شروع اپ لود نمی‌شود (فقط هنگام ورود به صفحهٔ محصولات).

**Authentication:** همان بک‌اند سایت — OTP موبایل (`09xxxxxxxxx`، demo-state صادقانه وقتی SMS_PROVIDER نباشد: «پیامکی ارسال نشده» + devCode فقط در پاسخ توسعه) + رمز عبور. نشست = همان کوکی امضاشدهٔ سرور، ذخیره در EncryptedSharedPreferences، بازیابی با `GET /api/auth/session`.

**Payment:** §25 رعایت شد — اپ هرگز سفارش را «پرداخت‌شده» اعلام نمی‌کند؛ درگاه در مرورگر خارجی باز می‌شود و حقیقت فقط از verify سرور-به-سرور می‌آید. `sandbox:true` سرور در UI اپ شفاف نمایش داده می‌شود («درگاه واقعی پیکربندی نشده»). idempotencyKey (UUID) برای هر ثبت سفارش → سناریوی «بستن اپ وسط checkout» امن است.

**Notifications:** معماری آماده (کانال‌های «وضعیت سفارش» و «پیشنهادها» روی API 26+) — **ارسال push وجود ندارد؛ REQUIRES PRODUCTION CONFIGURATION (FCM/سرویس‌دهنده)**. مجوز POST_NOTIFICATIONS درخواست/اعلام نشده (§40).

**Analytics:** رابط واحد + ۱۳ رخداد استاندارد (app_open … wishlist_add)؛ پیاده‌سازی فعلی فقط لاگ debug — ارسال واقعی نیازمند ارائه‌دهندهٔ تولید.

## B) امکانات (وضعیت صادقانه)

| بخش | وضعیت | توضیح |
|---|---|---|
| Home | **PASS** | هدر/جستجو/بنر کمپین فعال/دسته‌ها/مناسبت فوری (کانفیگ استاتیک §9)/پیشنهاد ویژه + شمارش‌معکوس واقعی ≤۲۴h (همان قانون سایت، تست واحد دارد)/quick tiles/داستان برند |
| Products | **PASS** | گرید ۲ستونه، فیلتر دسته از API (۳۵ دسته)، ۵ مرتب‌سازی، صفحه‌بندی محلی (۲۴تایی)، شمارش مشتق |
| 184 catalog | **PASS** | از `/api/products` = 184 زنده؛ هیچ شمارشی هاردکد نیست؛ هیچ محصول فیک ساخته نشد |
| Search | **PASS** | همان موتور جستجوی فارسی سایت (سرور-ساید) + debounce 350ms + تاریخچه + حالت بدون‌نتیجه |
| Product detail | **PASS** | گالری pager + دات‌ها، قیمت/تخفیف، وضعیت موجودی، انتخاب تعداد، مشخصات/مواد/آلرژن، مرتبط‌ها. ⚠️ نمایش نظراتِ تک‌تک و اسکرول‌به‌نظر → فاز بعد |
| Cart | **PASS** | add/remove/±qty، DataStore مانا، اعتبارسنجی سرور (`/api/cart/check`): تغییر قیمت→نمایش قیمت سرور، ناموجودی→هشدار. جمع از قیمت‌های سرور |
| Authentication | **PASS** | OTP + رمز عبور روی همان بک‌اند؛ refresh نشست؛ خروج |
| OTP | **PASS (dev-state صادقانه)** | request/verify/resend با کول‌داون؛ وقتی SMS_PROVIDER نباشد صریحاً «پیامکی ارسال نشده» + کد تست توسعه — هرگز جعلی «ارسال شد» نمی‌گوید. **OTP واقعی: REQUIRES SMS PROVIDER** |
| Orders | **PASS** | لیست سفارش‌ها از `/api/orders` با همان نشست؛ وضعیت پرداخت/ارسال فارسی؛ تاریخ شمسی (مبدل تست‌شده: 2026-09-17=۲۶ شهریور ۱۴۰۵) |
| Payment | **PASS (architecture)** | جریان سفارش→درگاه→verify سرور کامل؛ **درگاه واقعی: REQUIRES PRODUCTION GATEWAY** |
| Campaigns | **PASS** | فعال/به‌زودی/پایان‌یافته از تاریخ‌های واقعی + جزئیات + شمارش‌معکوس ≤۲۴h با تست واحد |
| MazeH | **PASS** | لیست سینی‌ها (۱۰)، جزئیات با محتویات واقعی/تعداد نفر/قیمت، افزودن به سبد (kind=tray). ⚠️ سفارشی‌سازی کامل سینی و فرم «درخواست پیشنهاد اختصاصی» → فاز بعد |
| Gifts | **PASS** | بسته‌های واقعی (۱۲) با فیلتر مناسبت + افزودن به سبد (kind=gift). ⚠️ مسیر جداگانهٔ هدیهٔ سازمانی → فاز بعد |
| App Links | **PASS (code) / REQUIRES DEPLOY** | intent-filter autoVerify برای helsairanian.ir + نگاشت ۸ مسیر به صفحات اپ. **تأیید دیجیتال نیازمند میزبانی assetlinks.json روی دامنهٔ تولید** |
| Notifications | **REQUIRES PRODUCTION CONFIG** | کانال‌ها آماده؛ FCM متصل نیست |
| Offline | **PASS (core)** | خطای فارسی + retry در همهٔ سکشن‌ها؛ سبد/مناسبت/دسته‌ها آفلاین. ⚠️ بنر سراسری اتصال → فاز بعد |

## C) امنیت

- **HTTPS:** PASS — network_security_config فقط HTTPS؛ استثنای cleartext فقط debug-overrides (10.0.2.2). نسخهٔ release به https://helsairanian.ir وصل می‌شود.
- **Secrets:** PASS — هیچ کلید/رمز/اعتبار DB در APK نیست (BUILD_CONFIG فقط BASE_URL عمومی). رمز Keystore در فایل بیرونی. ⚠️ keystore فعلی = **توسعه**؛ کلید تولید جداگانه لازم است.
- **Secure session:** PASS — کوکی نشست در EncryptedSharedPreferences؛ از backup/transfer مستثنا (backup_rules + data_extraction_rules).
- **Payment:** PASS — تأیید فقط سرور-به-سرور؛ sandbox شفاف.
- **WebView:** N/A — از WebView استفاده نشده؛ درگاه در مرورگر خارجی.

## D) بیلد (همه در همین سندباکس اجرا شد)

| مورد | نتیجه |
|---|---|
| Debug build | **PASS** — `assembleDebug` موفق (پس از فعال‌سازی swap 3GB روی سندباکس ۱.۹GB RAM) |
| Release build | **PASS** — `bundleRelease` با R8 + shrinkResources موفق |
| AAB | **PASS** — `helsa-v1.0.0-release.aab` (۵.۱MB) امضاشده با keystore توسعه (SHA-256 ثبت‌شده در docs/assetlinks.json) |
| Lint | **PASS** — `lintDebug`: ۰ خطا (۹۵ هشدار معمول؛ NewApi حل شد با desugaring + گارد نسخه) |
| Unit tests | **PASS** — ۶/۶ (ارقام فارسی، هزارگان، مبدل شمسی، پنجرهٔ ۲۴h کمپین، فاز کمپین، idempotency) |
| UI tests | **NOT RUN** — شبیه‌ساز/دستگاه در این سندباکس موجود نیست؛ سناریوهای §44 آمادهٔ اجرا روی دستگاه واقعی‌اند |

## E) موارد باقی‌مانده برای تولید (صادقانه — بدون این‌ها «production-ready» ادعا نمی‌شود)

1. **دامنهٔ تولید + SSL** (helsairanian.ir) — اپ release به آن وصل است؛ تا deploy، اپ فقط با بیلد debug به سرور لوکال وصل می‌شود
2. **PostgreSQL تولید** (بک‌اند)
3. **SMS_PROVIDER (کاوه‌نگار)** → OTP واقعی
4. **درگاه پرداخت واقعی (زرین‌پال)** → پرداخت آنلاین (verify سرور-به-سرور از قبل پیاده)
5. **FCM/ارائه‌دهندهٔ push** + کلید VAPID
6. **کلید امضای تولید** (keystore فعلی = توسعه) + میزبانی `/.well-known/assetlinks.json` برای App Links تأییدشده
7. **حساب Google Play** + تست روی دستگاه واقعی (UI tests §43/44، ۶ عرض، back-button، process-death)
8. صفحه‌های حقوقی/حذف حساب (الزام Play)
9. فاز ۲ محصول: نظرات محصول، آدرس‌های ذخیره‌شده، سینی سفارشی/پیشنهاد سازمانی، بنر آفلاین سراسری

**فایل‌ها:** سورس کامل در `helsa-android/` (۲۹ فایل Kotlin، ~۴هزار خط + منابع کامل برند) · خروجی‌ها در `helsa-android/releases/` · الگوی App Links و راهنما در `helsa-android/docs/` · ابزارِ بازتولید: `scripts/provision-tools.sh`.
