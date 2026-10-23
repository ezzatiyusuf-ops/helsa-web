# موجودی هلسا

## مدل‌ها

- `products.stock`, `products.stockStatus`, `products.lowStockThreshold`
- `product_variants.stock`
- `mazeh_trays.stock`, `mazeh_trays.lowStockThreshold`
- `inventory_movements`: `productId/trayId/variantId`, تغییر، قبلی، جدید، علت، توضیح، مدیر، مرجع، تاریخ

## وضعیت‌ها

| وضعیت | منطق |
|---|---|
| موجود | `stock > lowStockThreshold` |
| کم‌موجود | `0 < stock <= lowStockThreshold` |
| ناموجود | `stock <= 0` |

threshold برای هر محصول جداست و global hardcode نیست.

## تغییر موجودی

`PATCH /api/admin/inventory/[id]`

```json
{ "mode": "increase", "quantity": 10, "reason": "ورود کالا", "note": "خرید شهریور" }
```

modeها: `increase`, `decrease`, `set`, `unavailable`
علت‌ها: ورود کالا، فروش، اصلاح موجودی، مرجوعی، ضایعات.

تغییر و movement در یک transaction ثبت می‌شوند. مقدار منفی ممکن نیست.

## اتصال به سفارش

`POST /api/orders` قبل از ثبت سفارش stock را با شرط `stock >= quantity` بررسی می‌کند و در همان transaction کم می‌کند. حرکت موجودی با reason «فروش» و reference order ثبت می‌شود. قیمت و stock ارسالی کلاینت نادیده گرفته می‌شوند.

## Variant

برای item variant، هم stock گونه و هم stock کلی محصول کم می‌شود. variant در cart با key `p-{productId}-v-{variantId}` شناخته می‌شود.

## Bulk update

NOT IMPLEMENTED. عملیات انبوه بدون preview و confirmation امن اضافه نشده است.
