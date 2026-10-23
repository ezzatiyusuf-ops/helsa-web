# درگاه پرداخت آنلاین (زرین‌پال) — راهنمای فعال‌سازی

## وضعیت فعلی

معماری کامل پرداخت آنلاین پیاده شده است (`src/lib/payment.ts` + `/api/payments/verify` + صفحهٔ `/payment`) و **تا زمانی که متغیرهای محیطی تنظیم نشوند، گزینهٔ «پرداخت آنلاین» غیرفعال و صادقانه نمایش داده می‌شود** — فروش با «کارت به کارت» و «پرداخت در محل» کامل است.

## مراحل فعال‌سازی (۵ دقیقه)

1. ثبت‌نام در [zarinpal.com](https://www.zarinpal.com) و دریافت **کد پذیرندگی** (merchant_id — یک UUID ۳۶ کاراکتری) از پنل کاربری → «درگاه‌های پرداخت».
2. در فایل `.env` (یا متغیرهای محیط سرور):
   ```env
   GATEWAY_PROVIDER=zarinpal
   GATEWAY_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   GATEWAY_CURRENCY=IRT        # مبالغ فروشگاه تومان است؛ اگر پنل زرین‌پال روی «ریال» است IRR بگذارید
   # GATEWAY_SANDBOX=1         # فقط برای تست — تراکنش‌های sandbox واقعی ولی بدون برداشت
   ```
3. ری‌استارت سرور (`npm run build && npm start`).
4. تست: یک سفارش با «پرداخت آنلاین» ثبت کنید → انتقال به درگاه زرین‌پال → پرداخت → بازگشت خودکار → صفحهٔ موفقیت و تغییر وضعیت سفارش به «پرداخت شده».

## جریان فنی (چه اتفاقی می‌افتد)

```
checkout → POST /api/orders            (سفارش pending + ردیف payments pending + رزرو انبار)
        → /payment?code=…
        → GET  /api/payments/verify?code=…   (سرور: request.json به زرین‌پال → authority)
        → redirect به StartPay/{authority}    (کاربر روی درگاه پرداخت می‌کند)
        → بازگشت زرین‌پال به /payment?code=…&Authority=…&Status=OK
        → POST /api/payments/verify          (سرور: verify.json با مبلغ از DB — نه از کلاینت)
        → code 100/101 → تراکنش اتمیک: orders.paymentStatus=paid + payments.status=paid + ref_id
        → /payment/success
```

## امنیت

- **مبلغ همیشه از دیتابیس خوانده می‌شود** — پارامتر amount کلاینت نادیده گرفته می‌شود.
- **authority برگشتی با authority ثبت‌شدهٔ ردیف payments تطبیق داده می‌شود** — جعل authority ممکن نیست.
- verify فقط با سشن صاحب سفارش (تطبیق موبایل).
- کد ۱۰۱ زرین‌پال (قبلاً تأییدشده) به‌صورت idempotent موفق حساب می‌شود — دوبار شمولیت ندارد.
- API key فقط سمت سرور است (`server-only`) و هرگز به کلاینت نمی‌رسد.
- نتیجهٔ «موفق» **فقط** از پاسخ verify درگاه می‌آید — نه از URL یا state کلاینت.

## چرا در sandbox تستِ کاملِ پرداخت انجام نشد؟

ثبت درگاه زرین‌پال به حساب کاربری پذیرندهٔ واقعی شما نیاز دارد (شماره موبایل/کد ملی/حساب بانکی). در محیط توسعه:

- همهٔ مسیرهای شکست/افت اثبات شد (درگاه غیرفعال، شبکه قطع، authority نامعتبر، سفارش غریبه).
- قرارداد API دقیقاً مطابق مستندات v4 زرین‌پال پیاده شده (request/verify/StartPay/کدهای 100 و 101).
- اولین پرداخت واقعی را با `GATEWAY_SANDBOX=1` یا مبلغ کم انجام دهید.

## افزودن PSP دیگر (IDPay و…)

قرارداد در `src/lib/payment.ts` آماده است: یک تابع `xxxRequest` و `xxxVerify` با همین امضا + شاخهٔ جدید در `buildGatewayRedirect`/`verifyPaymentServerSide`. UI و API بدون تغییر می‌ماند.
