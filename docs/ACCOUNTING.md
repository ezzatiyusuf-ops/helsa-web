# حسابداری ساده هلسا

> این بخش ابزار گزارش مدیریتی فروشگاه است و جایگزین نرم‌افزار حسابداری/مالیاتی قانونی نیست.

## مدل

`accounting_transactions`:

- `type`: SALE, REFUND, EXPENSE, PURCHASE, ADJUSTMENT
- `amount` (تومان)
- `description`
- `referenceType`, `referenceId`
- `status`
- `createdBy`
- `createdAt`

Unique index روی `(type, referenceType, referenceId)` از رکورد SALE/REFUND تکراری برای یک سفارش جلوگیری می‌کند.

## اتصال سفارش

- ایجاد سفارش: payment/order status = pending؛ هیچ SALE ثبت نمی‌شود.
- admin یا درگاه پرداخت تأییدشده status را paid می‌کند: یک SALE idempotent ثبت می‌شود.
- status مرجوع: یک REFUND idempotent ثبت می‌شود.

## داشبورد

از DB محاسبه می‌شود:

- فروش کل (SALE)
- دریافت‌شده = SALE - REFUND
- در انتظار پرداخت (جمع orders با paymentStatus=pending)
- مرجوعی (REFUND)
- هزینه‌ها (EXPENSE + PURCHASE)

**سود تقریبی نمایش داده نمی‌شود مگر cost price محصولات ثبت شود.** UI صریحاً پیام «برای محاسبه سود، بهای تمام‌شده محصولات باید ثبت شود» دارد.

## تراکنش دستی

`POST /api/admin/accounting` فقط EXPENSE/PURCHASE/ADJUSTMENT را می‌پذیرد. SALE فقط از order workflow می‌آید.

## خروجی

صفحه `/admin/accounting` بدون dependency جدید خروجی UTF-8 CSV می‌سازد.

## خریدها/هزینه‌ها

این بخش ثبت مبلغ و شرح دارد. سیستم سندداری قانونی، مالیات، دفتر کل و reconciliation بانکی: **NOT IMPLEMENTED**.
