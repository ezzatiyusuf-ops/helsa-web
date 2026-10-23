# پایگاه داده هلسا (DATABASE)

## فناوری

| مورد | مقدار |
| --- | --- |
| پایگاه داده | PostgreSQL |
| ORM | Drizzle ORM (`drizzle-orm/node-postgres`) |
| ابزار مهاجرت | `drizzle-kit` |
| فایل اسکیما | `src/db/schema.ts` |
| کلاینت | `src/db/index.ts` |
| پیکربندی | `drizzle.config.json` |

## متغیر محیطی

```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
```

### رفتار در نبود DATABASE_URL

کلاینت در `src/db/index.ts` **در سطح ماژول خطا پرتاب نمی‌کند**. در عوض:

1. `isDatabaseConfigured` برابر `false` می‌شود.
2. پیام توسعه‌دهنده‌ای در کنسول سرور چاپ می‌شود (`DATABASE_SETUP_MESSAGE`).
3. لایه سرویس (`src/services/catalog.ts`) هر خطای کوئری را می‌گیرد و به داده‌های
   seed داخل `src/data/*` برمی‌گردد تا ویترین از کار نیفتد.
4. مسیرهایی که واقعاً به دیتابیس نیاز دارند (مثل `GET /api/orders/[id]`)
   پاسخ `503` با پیام پیکربندی برمی‌گردانند — هرگز داده جعلی تولید نمی‌شود.

## جدول‌ها

### کاتالوگ
| جدول | توضیح |
| --- | --- |
| `categories` | دسته‌بندی، تصویر/alt، active، ترتیب و SEO |
| `products` | محصول، قیمت/cost، stock/threshold، وضعیت، بسته‌بندی، مواد، مبدأ، visibility و SEO |
| `product_variants` | وزن/طعم با SKU، قیمت، compare price، cost و stock مستقل |
| `product_images` | تصویر اصلی/گالری، alt، ترتیب و `requiresReplacement` |
| `reviews` | نظر محصول، مشتری و وضعیت تأیید |

### سینی مزه
| جدول | توضیح |
| --- | --- |
| `mazeh_trays` | سینی‌های مزه؛ قیمت پایه، تعداد مهمان، محتویات، آلرژن‌ها |
| `mazeh_tray_items` | اقلام هر سینی (ارجاع به `mazeh_trays.id`) |
| `mazeh_categories` | بخش‌های سینی: SAVORY / SWEET / NUTS / FRUIT / BREAD / DIP / DECORATION |
| `tray_sizes` | اندازه‌ها و ضریب قیمت |
| `tray_occasions` | مناسبت‌ها |
| `tray_customizations` | گزینه‌های ساخت سینی و قیمت هرکدام |
| `beverage_pairings` | پیشنهاد نوشیدنی |
| `allergens` | فهرست آلرژن‌ها |
| `party_packages` | قواعد پیشنهاد بر اساس تعداد مهمان |
| `tray_quotes` | لاگ قیمت‌گذاری سرور برای سینی‌های سفارشی |

### فروش
| جدول | توضیح |
| --- | --- |
| `customers` / `addresses` | مشتری و آدرس‌های پایدار |
| `orders` | سفارش، snapshot مشتری/آدرس، totals، payment/shipping status |
| `order_items` | snapshot تاریخی نام/SKU/قیمت/تعداد؛ مستقل از تغییر قیمت آینده |
| `payments` | provider، مبلغ، status، authority/reference و زمان تأیید |
| `shipping_methods` | روش‌های ارسال فعال و قیمت/زمان |
| `inventory_movements` | ورود/خروج/اصلاح/فروش/مرجوعی با قبلی/جدید و مدیر |
| `accounting_transactions` | SALE/REFUND/EXPENSE/PURCHASE/ADJUSTMENT |
| `admin_audit_logs` | تغییرات حساس مدیریت بدون داده محرمانه |
| `coupons` | کد درصدی/مبلغی، محدودیت محصول/دسته، حداقل، سقف و شمارنده مصرف |
| `campaigns` / `banners` | جشنواره‌ها و بنرهای قابل مدیریت |
| `contact_messages` | پیام‌های فرم تماس |

## روابط

- `mazeh_tray_items.tray_id` → `mazeh_trays.id` (حذف آبشاری)
- `mazeh_tray_items.product_id` → شناسه محصول (اختیاری، ارجاع نرم)
- `reviews.product_id` → شناسه محصول (ارجاع نرم)
- `products.category` → `categories.slug`

## مهاجرت‌ها

```bash
# اعمال اسکیما روی دیتابیس
npx drizzle-kit push

# تولید فایل مهاجرت (در صورت نیاز به تاریخچه)
npx drizzle-kit generate
```

## داده اولیه (Seed)

```bash
npx tsx --env-file=.env scripts/seed.ts
```

اسکریپت `scripts/seed.ts` جدول‌ها را پاک و دوباره پر می‌کند:
۳۴ محصول، ۸ سینی مزه به‌همراه اقلام، کوپن‌ها، جشنواره‌ها، اندازه‌ها، مناسبت‌ها و آلرژن‌ها.

## بازنشانی دیتابیس توسعه

```bash
psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
npx drizzle-kit push
npx tsx --env-file=.env scripts/seed.ts
```

## نکات تولید

- روی دیتابیس تولید **seed را اجرا نکنید** (داده‌ها را پاک می‌کند).
- پیش از `drizzle-kit push` از دیتابیس نسخه پشتیبان بگیرید.
- اتصال باید SSL داشته باشد (`?sslmode=require` در بیشتر سرویس‌های ابری).
