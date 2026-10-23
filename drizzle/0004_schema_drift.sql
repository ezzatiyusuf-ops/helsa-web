-- ============================================================================
-- 0004 — هم‌ترازی مهاجرت‌ها با schema.ts (رفع drift)
-- HELSA · 2026-10-21
--
-- **یافتهٔ بحرانی فاز ۴:** دو ستون در `src/db/schema.ts` وجود داشت که هیچ
-- مهاجرتی آن‌ها را نمی‌ساخت (پروژه در عمل با `drizzle-kit push` ساخته شده بود).
-- نتیجه: پایگاه‌دادهٔ تازه‌ساخته‌شده از پوشهٔ drizzle/ هنگام اولین کوئری محصول
-- با خطای `column "discount_starts_at" does not exist` می‌شکست — یعنی
-- استقرار از صفر (و هر CI با DB خالی) غیرممکن بود.
--
-- روش تشخیص (قابل بازتولید): مقایسهٔ برنامه‌ای ستون‌های schema.ts با
-- information_schema روی پایگاه‌داده‌ای که فقط از مهاجرت‌ها ساخته شده است.
-- نتیجه: تنها این دو ستون کم بود؛ در ایندکس‌ها drift وجود ندارد.
--
-- برگشت‌پذیری: بلوک DOWN در انتها.
-- ============================================================================

-- محصول: شروع تخفیف واقعی (نمایش قیمت خط‌خورده فقط از این تاریخ)
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "discount_starts_at" timestamp;

-- کوپن: فقط برای اولین خرید
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "first_order_only" boolean NOT NULL DEFAULT false;

-- ── DOWN (اجرای دستی برای برگشت) ─────────────────────────────────────────────
-- ALTER TABLE "coupons" DROP COLUMN IF EXISTS "first_order_only";
-- ALTER TABLE "products" DROP COLUMN IF EXISTS "discount_starts_at";
