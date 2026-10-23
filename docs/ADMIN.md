# پنل مدیریت هلسا

## وضعیت پیاده‌سازی

- **پیاده‌سازی‌شده:** محصولات (CRUD + variants + images)، دسته‌بندی‌ها، سینی‌ها، موجودی + movementها، سفارش‌ها، مشتریان، گزارش حسابداری، جستجوی سراسری، داشبورد آمار واقعی
- **REQUIRES CONFIGURATION:** آپلود فایل تصویر (storage provider)، bulk update قیمت/موجودی، محاسبه سود (نیاز به cost price دارد)
- **NOT IMPLEMENTED:** نرم‌افزار حسابداری قانونی کامل (دفتر کل، مالیات، reconciliation)

## دسترسی امن

همه مسیرهای `/admin/*` در `src/app/admin/layout.tsx` با `requireAdminPage()` محافظت می‌شوند و همه APIهای `/api/admin/*` پیش از کوئری `requireAdminApi()` را اجرا می‌کنند.

متغیر لازم:

```env
AUTH_SECRET=<long-random-secret>
ADMIN_EMAILS=owner@helsa.example,manager@helsa.example
```

مدیر با Google/Apple OAuth موجود وارد می‌شود. ایمیل OAuth باید دقیقاً در `ADMIN_EMAILS` باشد. هیچ admin پیش‌فرض، رمز hardcode یا نقش کلاینتی وجود ندارد. پنهان‌کردن لینک مبنای امنیت نیست.

## مسیرها

| مسیر | کاربرد |
|---|---|
| `/admin` | آمار واقعی و دسترسی سریع |
| `/admin/products` | فهرست، جستجو، فیلتر، ویرایش، بایگانی |
| `/admin/products/new` | افزودن محصول و variant |
| `/admin/products/[id]` | ویرایش محصول، قیمت، stock، SEO، variant |
| `/admin/categories` | ایجاد/ویرایش دسته و SEO |
| `/admin/trays` | مدیریت سینی‌ها |
| `/admin/trays/new` | افزودن سینی |
| `/admin/trays/[id]` | قیمت، محتوا، مهمان، موجودی، وضعیت و SEO |
| `/admin/inventory` | تغییر واقعی موجودی + تاریخچه movement |
| `/admin/orders` | وضعیت سفارش/پرداخت/ارسال |
| `/admin/customers` | نام، تماس، تعداد سفارش، جمع خرید (بدون داده auth حساس) |
| `/admin/accounting` | فروش، دریافت، pending، refund، هزینه و CSV |
| `/admin/search` | جستجوی واقعی در محصول/SKU/دسته/سینی/سفارش/مشتری |
| `/admin/settings` | وضعیت پیکربندی سرویس‌ها |

## افزودن/ویرایش محصول

فرم محصول شامل نام، slug، دسته، SKU، توضیح کوتاه/کامل، قیمت، قیمت قبل، cost، stock، threshold، حداقل/حداکثر سفارش، وزن، واحد، بسته‌بندی، مواد، مبدأ، نگهداری، URL تصویر، alt، وضعیت، featured، visibility، SEO و variantهاست.

پس از ذخیره، storefront در درخواست بعدی مستقیماً DB را می‌خواند؛ source code تغییر نمی‌کند.

## تصویر محصول

معماری فعلی URL/path-based است: مدیر URL یا مسیر `/images/...` را انتخاب می‌کند و alt را وارد می‌کند. تصویر اصلی در `product_images` ثبت می‌شود.

**آپلود فایل و reorder گالری: NOT IMPLEMENTED.** چون storage provider در پروژه وجود ندارد. تا زمان انتخاب storage واقعی، endpoint آپلود جعلی ساخته نشده است. عکس‌های خارجی seed با `requires_replacement=true` مشخص‌اند.

## بایگانی امن

DELETE محصول/سینی، حذف فیزیکی انجام نمی‌دهد؛ `isActive=false`, `isVisible=false`, `archivedAt` ثبت می‌شود. `order_items` نام/SKU/قیمت/تعداد را snapshot می‌کند؛ سفارش تاریخی با تغییر قیمت آینده عوض نمی‌شود.

## مدیریت سفارش و حسابداری

وقتی admin سفارش را `paid` می‌کند، رکورد `SALE` با reference سفارش ثبت می‌شود. unique index `(type, referenceType, referenceId)` از فروش تکراری جلوگیری می‌کند. `refunded` رکورد REFUND idempotent می‌سازد.

## جستجو

`GET /api/admin/search?q=` مستقیماً DB را در پنج entity جستجو می‌کند. حداقل دو حرف در UI لازم است.

## Bulk update

**NOT IMPLEMENTED.** Bulk price/stock عمداً اضافه نشده چون preview/confirm/transaction/audit کامل لازم دارد. عملیات تکی واقعی و audit‌شده است.
