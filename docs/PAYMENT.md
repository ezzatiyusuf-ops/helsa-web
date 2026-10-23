# پرداخت هلسا (PAYMENT)

## اصل بنیادین

> سفارش **تنها** پس از تأیید سرور به سرور با درگاه، «پرداخت شده» می‌شود.
> هیچ‌گاه بر اساس پارامتر URL، وضعیت کلاینت یا callback فرانت‌اند، پرداخت موفق ثبت نمی‌شود.

## لایه انتزاعی

```
PaymentProvider
├── OnlineGateway    (auto   — تأیید سرور به سرور)
├── CardToCard       (manual — تأیید دستی کارشناس)
├── CashOnDelivery   (manual — تسویه هنگام تحویل)
└── Wallet           (آماده توسعه آینده)
```

| فایل | نقش |
| --- | --- |
| `src/config/payments.ts` | تعریف روش‌های پرداخت/ارسال، وضعیت‌ها، `onlineGatewayEnabled()` |
| `src/lib/payment.ts` | ساخت redirect درگاه و `verifyPaymentServerSide()` |
| `src/app/api/payments/verify/route.ts` | نقاط پایانی ساخت لینک و تأیید |
| `src/app/payment/page.tsx` | صفحه «در حال بررسی پرداخت» |
| `src/app/payment/success/page.tsx` | صفحه موفقیت |
| `src/app/payment/failed/page.tsx` | صفحه ناموفق |

## متغیرهای محیطی

```
GATEWAY_PROVIDER=zarinpal      # یا idpay
GATEWAY_API_KEY=...
```

`onlineGatewayEnabled()` تنها وقتی `true` است که **هر دو** متغیر تنظیم شده باشند.
در غیر این صورت گزینه «پرداخت آنلاین» در checkout **نمایش داده نمی‌شود** و
API مقدار `unconfigured` برمی‌گرداند.

## وضعیت‌های پرداخت

| کلید | برچسب فارسی |
| --- | --- |
| `pending` | در انتظار پرداخت |
| `success` | پرداخت موفق |
| `failed` | پرداخت ناموفق |
| `cancelled` | پرداخت لغو شده |
| `unconfigured` | پرداخت نامشخص |

## چرخه سفارش

```
pending → paid → preparing → shipped → transit → delivered
                     ↘ cancelled / refunded
```

## افزودن درگاه جدید

1. در `src/config/payments.ts` مقدار مجاز `GATEWAY_PROVIDER` را اضافه کنید.
2. در `src/lib/payment.ts`:
   - در `buildGatewayRedirect()` آدرس شروع تراکنش و فراخوانی «request-to-pay» را اضافه کنید.
   - در `verifyPaymentServerSide()` فراخوانی endpoint تأیید درگاه را اضافه کنید و
     **مبلغ بازگشتی را با مبلغ سفارش مقایسه کنید**؛ تنها در صورت تطابق `state: "success"` بازگردانید.
3. چیزی در UI تغییر نمی‌کند؛ checkout به‌طور خودکار روش فعال را نشان می‌دهد.

نمونه اسکلت:

```ts
if (provider === "mygateway") {
  const res = await fetch("https://api.myprovider.ir/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GATEWAY_API_KEY}` },
    body: JSON.stringify({ authority: remoteRef, amount: order.amount }),
  });
  const data = await res.json();
  if (data.status === 100 && data.amount === order.amount) {
    return { state: "success", ref: data.ref_id };
  }
  return { state: "failed" };
}
```

## وضعیت فعلی

| مورد | وضعیت |
| --- | --- |
| معماری قابل توسعه پرداخت | ✅ پیاده‌سازی شده |
| کارت به کارت / پرداخت در محل | ✅ فعال (تسویه دستی) |
| درگاه آنلاین | ⚙️ آماده اتصال — نیازمند `GATEWAY_PROVIDER` و `GATEWAY_API_KEY` |
| تأیید سرور به سرور | ✅ پیاده‌سازی شده (بدون کلید: `unconfigured`) |
