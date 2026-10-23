# معماری پرداخت ایران — HELSA (Parts A–J)

> سند فنی فاز «امنیت پرداخت و چک‌اوت ایران». منطق حیاتی هرگز mock نمی‌شود؛
> شبیه‌سازی فقط برای محیط توسعه و **پشت سوییچ env** است.

## ۱) سوییچ‌های محیطی

| متغیر | مقادیر | اثر |
|---|---|---|
| `PAYMENTS_SANDBOX` | `1` فقط dev | درگاه‌ها از مسیر **شبیه‌ساز امن** اجرا می‌شوند (توکن امضاشده، callback واقعی). در پروداکشن حذف/`0`. |
| `GATEWAY_PROVIDER` + `GATEWAY_API_KEY` | `zarinpal` + merchant_id | روش `online` را به **درگاه واقعی زرین‌پال v4** وصل می‌کند. |
| `SNAP_PAY_API_KEY` | — | اسنپ‌پی واقعی؛ نبود کلید + sandbox → شبیه‌ساز. |
| `DIGIPAY_API_KEY` / `DIGIPAY_SECRET` | — | دیجی‌پی واقعی؛ نبود کلید + sandbox → شبیه‌ساز. |
| `IDENTITY_REQUIRED` | `1` | ثبت سفارش بدون توکن احراز هویت (کد ملی + موبایل) ممکن نیست. |
| `IDENTITY_PROVIDER` | `simulation` | در dev؛ در پروداکشن به سرویس شاهکار/بانکی متصل می‌شود (interface آماده). |
| `COD_ENABLED` / `COD_PROVINCES` / `COD_MAX_AMOUNT` | — | قواعد پرداخت در محل (Part G). |

## ۲) جریان احراز هویت (Part A/B)

```
چک‌اوت گام ۳:
  مهمان  → POST /api/auth/otp/request (مالکیت موبایل) → POST /api/identity/verify {nid, mobile, otpCode}
  عضو    → POST /api/identity/verify {nid, mobile(=شمارهٔ حساب)}  ← شمارهٔ متفاوت = 409
        ← { identityToken (JWT HS256, aud=helsa-identity, TTL 30m), nidMasked }
POST /api/orders → identityToken الزامی؛ سرور mobile سفارش را با توکن تطبیق می‌دهد
```
- کد ملی: الگوریتم رسمی رقم کنترل + رد ارقام هم‌شکل (`src/lib/nid.ts`).
- ذخیره: `customers.nationalId/nidVerifiedAt/identityProvider` + snapshot سفارش.
- لاگ‌ها هرگز NID/موبایل کامل ندارند (mask).

## ۳) جریان پرداخت آنلاین (Part D/E/F)

```
POST /api/orders (توکن هویت + روش) → payments(pending, expiresAt=+15m)
→ /payment?code= → GET /api/payments/verify?code= → provider.initiate()
    ← { url } (شبیه‌ساز: /payment/simulator?token=HS256؛ زرین‌پال: StartPay/{Authority})
→ بازگشت درگاه:
    شبیه‌ساز → POST /api/payments/callback {token, outcome} (توکن امضاشده، aud=helsa-pay-sim)
    زرین‌پال → /payment?Authority&Status → POST /api/payments/verify {code, remoteRef}
→ نهایی‌سازی اتمیک در finalizePaidOrder():
    payments pending→paid (فقط یک‌بار؛ replay/duplicate ممنوع)
    orders → paymentStatus=paid, paidAt
    invoices → یک فاکتور یکتا (unique orderId)
    admin_notifications + payment_logs
```

## ۴) ضدهای امنیتی (Part H)

| تهدید | دفاع |
|---|---|
| پرداخت تکراری | نهایی‌سازی فقط pending→paid (اتمیک در تراکنش SQL) + `duplicate_callback_blocked` لاگ |
| جعل callback | توکن HS256 سرور-امضا؛ authority با ردیف payments تطبیق می‌شود؛ مبلغ فقط از DB |
| بازپخش (replay) | توکن کوتاه‌مدت (15m) + انقضای تراکنش + قفل status |
| تغییر مبلغ (tampering) | سرور همیشه total را از DB می‌خواند؛ ورودی کلاینت مبلغ ندارد |
| CSRF | `assertSameOrigin` روی همهٔ نقاط پرداخت |
| session hijacking | verify فقط توسط صاحب سفارش (customerId از session) |
| حملات brute-force | rate-limit اختصاصی روی identity/verify/callback |

## ۵) COD و کارت‌به‌کارت (Part G)

سفارش pending → دکمهٔ «ثبت دریافت وجه» در پنل ادمین → `POST /api/admin/orders/{id}/collect`
(فقط ادمین؛ فقط روش‌های دستی؛ همان نهایی‌سازی اتمیک + فاکتور + اعلان).

## ۶) آمادگی درگاه‌های واقعی

- **زرین‌پال v4**: پیاده‌سازی کامل (request/verify، code 100/101/-503/-504). فقط `GATEWAY_API_KEY` واقعی لازم است.
- **دیجی‌پی**: قرارداد **رسمی** مستندات پذیرندگان (mydigipay.com/developers/docs/upg) پیاده شده است —
  `oauth/token` (grant_type=password + Basic) → `tickets/business?type=11` (Agent: WEB, Digipay-Version) →
  فرم-پست نتیجه به `/api/payments/callback/digipay` → `purchases/verify` سرور-به-سرور (الزامی؛ وگرنه خودکار مرجوع می‌شود).
  فقط اعتبارنامه‌های پذیرنده (DIGIPAY_USERNAME/PASSWORD/CLIENT_ID/CLIENT_SECRET) لازم است. *در برابر سرور زنده هنوز NOT VERIFIED.*
- **اسنپ‌پی**: endpointها با env قابل تنظیم (`src/lib/payments/snappay.ts`)؛ مستندات رسمی پذیرنده پس از ثبت‌نام در اختیار ما قرار می‌گیرد. *NOT VERIFIED تا دریافت قرارداد.*
