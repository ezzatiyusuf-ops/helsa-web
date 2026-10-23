# مستندات API هلسا

همه مسیرها زیر `/api` قرار دارند و با App Router (Route Handlers) پیاده‌سازی شده‌اند.
پاسخ‌ها JSON و پیام‌های خطا فارسی هستند.

> این سند تنها نقاط پایانی‌ای را مستند می‌کند که **واقعاً در پروژه پیاده‌سازی شده‌اند**.

---

## کاتالوگ

### `GET /api/products`
فهرست محصولات.

- **احراز هویت:** ندارد
- **کوئری:** `cat` (اختیاری) — فیلتر بر اساس slug دسته‌بندی
- **پاسخ:** `{ ok: true, products: Product[] }`

```bash
curl "http://localhost:3000/api/products?cat=dates"
```

### `GET /api/products/[slug]`
یک محصول به‌همراه محصولات مرتبط.

- **پاسخ:** `{ ok: true, product: Product, related: Product[] }`
- **خطا:** `404` → `{ ok: false, message: "محصول یافت نشد" }`

### `GET /api/categories`
- **پاسخ:** `{ ok: true, categories: Category[] }`

### `GET /api/search`
جستجوی فارسی محصولات و دسته‌بندی‌ها (نرمال‌سازی «ی/ک» و ارقام فارسی).

- **کوئری:** `q` — عبارت جستجو
- **پاسخ:** `{ results: SearchHit[], categories: SearchCat[] }`

```bash
curl "http://localhost:3000/api/search?q=خرما"
```

---

## سینی مزه

### `GET /api/trays`
- **پاسخ:** `{ ok: true, trays: MazehTray[] }`

### `GET /api/trays/[slug]`
- **پاسخ:** `{ ok: true, tray: MazehTray, related: MazehTray[] }`
- **خطا:** `404` → `{ ok: false, message: "سینی مزه یافت نشد" }`

### `POST /api/mazeh/quote`
قیمت‌گذاری **سرور-محور** سینی سفارشی. قیمت هرگز از سمت کلاینت پذیرفته نمی‌شود.

- **بدنه:**

```json
{
  "guests": 8, "size": "large", "base": "stone",
  "cheese": ["cheese-liqvan"], "olive": ["olive-green"], "deli": [],
  "nuts": ["nut-pistachio"], "dried": ["dry-fig"], "dates": ["date-piarom"],
  "chocolate": ["choc-handmade"], "fruit": ["fruit-grape"],
  "crackerdip": ["cd-cracker"], "decor": ["decor-medallion"], "message": "یلدا مبارک"
}
```

- **پاسخ:** `{ ok: true, quote: { lines: {label, amount}[], total, guests, sizeLabel } }`
- **خطا:** `400` اگر کمتر از ۴ قلم مزه انتخاب شود یا اندازه/پایه نامعتبر باشد.

### `POST /api/tray-builder/quote`
قیمت‌گذاری **سرور-محور** سازنده سینی پیشرفته (`/mazeh-trays/build`). قیمت هرگز از سمت کلاینت پذیرفته نمی‌شود؛ quote ثبت‌شده در جدول `tray_quotes` با کلید سبد `custom-quote-{id}` در `POST /api/orders` دوباره از DB خوانده می‌شود.

- **بدنه:**

```json
{
  "size": "medium", "base": "wood", "guests": 6,
  "items": [
    { "id": "cheese-feta", "qty": 2 },
    { "id": "nuts-pistachio", "qty": 1 },
    { "id": "bread-crackers", "qty": 1 },
    { "id": "dip-hummus", "qty": 1 }
  ],
  "decor": ["medallion"],
  "giftWrap": "box",
  "message": true
}
```

- **قواعد:** حداقل ۴ قلم متفاوت · qty بین ۱ تا ۵ · حداکثر ۲۴ پورشن · مهمان ۲ تا ۳۰ · اقلام فقط از `src/config/tray-builder.ts`
- **پاسخ:** `{ ok: true, quote: { id, lines: {label, amount}[], total, guests, sizeLabel } }`
- **خطاها:** `400` پیکربندی نامعتبر / کمتر از ۴ قلم / سقف پورشن · `403` CSRF · `429` rate-limit · `503` دیتابیس پیکربندی نشده

```bash
curl -X POST http://localhost:3000/api/tray-builder/quote \
  -H 'Content-Type: application/json' \
  -H "Origin: http://localhost:3000" \
  -d '{"size":"small","base":"wood","guests":4,"items":[{"id":"dates-premium","qty":1},{"id":"cheese-feta","qty":1},{"id":"nuts-walnut","qty":1},{"id":"fruit-dried","qty":1}],"giftWrap":"lux"}'
```

---

## سبد و سفارش

> سبد خرید سمت کلاینت با Zustand و `localStorage` نگهداری می‌شود (`helsa-store-v2`)
> و در زمان ثبت سفارش به سرور ارسال می‌گردد. نقطه پایانی مستقل `/api/cart` وجود ندارد.

### `POST /api/orders`
ثبت سفارش و صدور کد پیگیری.

- **بدنه:** `{ customer, items[], subtotal, discount, shipping, total, couponCode?, shippingMethod?, paymentMethod? }`
- **پاسخ:** `{ ok: true, code: "HLA-1234567", payState: "pending" | "unconfigured" }`
- **نکته:** وضعیت اولیه همیشه `pending` است؛ سفارش تنها پس از **تأیید سروری پرداخت** «پرداخت شده» می‌شود.

### `GET /api/orders`
فهرست سفارش‌ها (برای پنل مدیریت آینده).

### `GET /api/orders/[id]`
سفارش بر اساس کد عمومی (مثل `HLA-1234567`).

- **پاسخ:** `{ ok: true, order }`
- **خطاها:** `404` سفارش یافت نشد · `503` پایگاه داده پیکربندی نشده است

---

## کوپن

### `POST /api/coupons/validate`
- **بدنه:** `{ code: string, subtotal: number }`
- **پاسخ موفق:** `{ ok: true, message, coupon }`
- **پاسخ ناموفق:** `{ ok: false, message }` با پیام‌های: کد نامعتبر، تاریخ اعتبار گذشته، حداقل مبلغ خرید

```bash
curl -X POST http://localhost:3000/api/coupons/validate \
  -H 'Content-Type: application/json' \
  -d '{"code":"HELSA10","subtotal":3000000}'
```

---

## پرداخت

### `GET /api/payments/verify?code=&amount=&method=`
ساخت آدرس هدایت به درگاه.

- **پاسخ:** `{ url }` یا `{ error: "درگاه پرداخت آنلاین پیکربندی نشده است." }`

### `POST /api/payments/verify`
**تأیید سرور به سرور** پرداخت.

- **بدنه:** `{ code, amount, method: "online"|"card"|"cod", remoteRef? }`
- **پاسخ:** `{ ok: true, state, ref? }`
- **مقادیر `state`:** `pending` · `success` · `failed` · `cancelled` · `unconfigured`

> بدون پیکربندی `GATEWAY_PROVIDER` و `GATEWAY_API_KEY` مقدار `unconfigured` بازمی‌گردد و
> هیچ پرداختی موفق تلقی نمی‌شود.

---

## احراز هویت

### `GET /api/auth/google`
شروع OAuth گوگل. بدون پیکربندی → هدایت به `/login?social=unconfigured`.

### `GET /api/auth/google/callback`
تبادل کد و ساخت کوکی نشست (HttpOnly، امضاشده با `AUTH_SECRET`).

### `GET /api/auth/apple` و `POST /api/auth/apple/callback`
Sign in with Apple؛ `id_token` با JWKS اپل در سرور اعتبارسنجی می‌شود.

### `GET /api/auth/session`
- **پاسخ:** `{ ok: true, name, email, provider }` یا `{ ok: false }`

### `POST /api/auth/logout`
پاک‌کردن کوکی نشست.

### `POST /api/auth/reset`
بازیابی رمز عبور (provider-ready).

- **بدنه گام ۱:** `{ step: "request", identifier }` → `{ ok, demo, code?, message }`
- **بدنه گام ۲:** `{ step: "reset", identifier, code, password }` → `{ ok, message }`
- **نکته:** تا زمانی که `SMS_PROVIDER` تنظیم نشده باشد، پاسخ با پرچم `demo: true` مشخص می‌کند
  که پیامکی ارسال نشده است.

---

## سایر

### `POST /api/reviews`
ثبت نظر محصول.

- **بدنه:** `{ productId, author, rating (1..5), title, text }`
- **پاسخ:** `{ ok: true, message }`

### `POST /api/contact`
ثبت پیام فرم تماس. اعتبارسنجی با Zod؛ شماره موبایل باید `^09\d{9}$` باشد.

### `GET /api/health`
گزارش سلامت و پیکربندی:

```json
{
  "ok": true,
  "status": "healthy",
  "checks": {
    "database": { "configured": true, "ok": true, "message": "..." },
    "auth": { "sessionSecret": true, "google": false, "apple": false },
    "payment": { "onlineGateway": false }
  }
}
```

---

## API مدیریت

همه مسیرهای `/api/admin/*` به کوکی نشست معتبر و ایمیل موجود در `ADMIN_EMAILS` نیاز دارند. بدون نشست `401` و برای کاربر غیرمجاز یا پیکربندی‌نشده `403` برمی‌گردد.

| Method | Endpoint | کاربرد |
|---|---|---|
| GET | `/api/admin/dashboard` | آمار واقعی فروش، سفارش، موجودی و مشتری |
| GET/POST | `/api/admin/products` | فهرست/ایجاد محصول |
| GET/PATCH/DELETE | `/api/admin/products/[id]` | دریافت/ویرایش/soft archive محصول |
| GET/POST | `/api/admin/categories` | فهرست/ایجاد دسته |
| PATCH/DELETE | `/api/admin/categories/[id]` | ویرایش/غیرفعال‌سازی دسته |
| GET/POST | `/api/admin/trays` | فهرست/ایجاد سینی |
| GET/PATCH/DELETE | `/api/admin/trays/[id]` | دریافت/ویرایش/غیرفعال‌سازی سینی |
| GET | `/api/admin/inventory` | موجودی و movementها (`q`, `status`) |
| PATCH | `/api/admin/inventory/[id]` | تغییر transactional موجودی |
| GET | `/api/admin/orders` | سفارش‌ها (`q` اختیاری) |
| PATCH | `/api/admin/orders/[id]` | وضعیت سفارش/پرداخت + accounting idempotent |
| GET | `/api/admin/customers` | مشتریان بدون داده حساس auth |
| GET/POST | `/api/admin/accounting` | گزارش/ثبت هزینه، خرید، اصلاح |
| GET | `/api/admin/search?q=` | جستجوی محصول/SKU/دسته/سینی/سفارش/مشتری |

### نمونه تغییر موجودی

```bash
curl -X PATCH https://DOMAIN/api/admin/inventory/42 \
  -H 'Content-Type: application/json' --cookie 'helsa_session=...' \
  -d '{"mode":"increase","quantity":10,"reason":"ورود کالا","note":"خرید شهریور"}'
```

### نمونه ثبت هزینه

```bash
curl -X POST https://DOMAIN/api/admin/accounting \
  -H 'Content-Type: application/json' --cookie 'helsa_session=...' \
  -d '{"type":"EXPENSE","amount":500000,"description":"هزینه بسته‌بندی"}'
```

## قرارداد امن ثبت سفارش

`POST /api/orders` قیمت‌های کلاینت را نادیده می‌گیرد. کلیدهای معتبر cart عبارت‌اند از:
`p-{productId}`، `p-{productId}-v-{variantId}`، `t-{trayId}` و `custom-quote-{quoteId}`.
سرور قیمت/stock/coupon/shipping را از DB محاسبه، snapshot تاریخی `order_items` را ثبت و موجودی را transactionally کم می‌کند.


## Gifts

### `GET /api/gifts?kind=personal|corporate`
لیست بسته‌های هدیه فعال.

### `GET /api/gifts/[slug]`
جزئیات یک بسته هدیه.

### `POST /api/gifts/quote`
قیمت‌گذاری سرور برای هدیه شخصی.
Body: `{ packageSlug, quantity, packagingId, occasion?, recipientName?, message? }`
Response: `{ ok, quote: { id, unitPrice, quantity, total, ... } }`
کلاینت فقط `gift-quote-{id}` را به سبد/سفارش می‌فرستد.

### `POST /api/gifts/corporate`
ثبت درخواست هدیه سازمانی (بدون پرداخت قطعی اجباری).
Body شامل اطلاعات شرکت، تعداد، برندینگ و ...
Response: `{ ok, code, status, indicativeTotal?, message }`

---

## پرتال عمده‌فروشی B2B

> قیمت‌گذاری عمده کاملاً **سرور-محور** است؛ کلاینت فقط شناسه و تعداد می‌فرستد.

### `POST /api/wholesale/register`
ثبت‌نام کسب‌وکار (نیاز به نشست مشتری عادی؛ بدون نشست → 401).
Body: `{ businessName, ownerName, phone, nationalId?, economicCode?, category, city, address?, monthlyVolume?, description? }`
Response: `202 { ok, applicationCode, status: "pending", message }`
تکراری (تلفن یا کد اقتصادی) → `409` با پیام عمومی.

### `POST /api/wholesale/login` *(از طریق `/api/auth/otp` معمولی)*
ورود با همان شماره/پسورد حساب مشتری.

### `GET /api/wholesale/me`
وضعیت کسب‌وکار مشتری لاگین‌شده. Response شامل `status` (pending/approved/rejected)، `discountPercent`، `rules { minSubtotal, minItemQty }` و `business`.

### `GET /api/wholesale/catalog`
فقط برای مشتری approved. قیمت عمده = قیمت خرده به‌ازای هر آیتم با تخفیف پلکانی عمده اعمال‌شده.
Response: `{ ok, items: [{ id, name, unit, retailPrice, wholesalePrice, discountPercent, stock, minQty }], rules }`

### `POST /api/wholesale/orders`
ثبت سفارش عمده. Body: `{ items: [{ productId, quantity }], address, shippingMethod, paymentMethod, note? }`
گاردها: بدون نشست→401، غیر approved→403، زیر حداقل مبلغ/تعداد→400، productId نامعتبر→404، موجودی ناکافی→400.
Response: `201 { ok, order: { code: "WSO-XXXX", total, items, ... } }`

### `POST /api/wholesale/orders` (تکرار سفارش)
Body: `{ repeatOrderId: number }` — اقلام از سفارش قبلی **سمت سرور** بازخوانی و دوباره قیمت/موجودی اعتبارسنجی می‌شوند. `201` با کد جدید یا `404` اگر سفارش متعلق به مشتری نباشد.

### `GET /api/admin/wholesale`
فهرست درخواست‌ها (ادمین). کوئری: `status`, `q`, `page`.

### `PATCH /api/admin/wholesale/[id]`
تأیید/رد/ویرایش (discountPercent، rules، ...). Body: `{ action: "approve" | "reject" | "update", ... }`
