-- ============================================================================
-- 0003 — مشارکت حمایتی داوطلبانه (جدا از فروش)
-- HELSA · 2026-10-21
--
-- چرا: ستونی برای مشارکت داوطلبانه وجود نداشت، بنابراین نه در جمع سفارش قابل
-- ثبت بود و نه از فروش قابل تفکیک. این مهاجرت فقط دو ستون اضافه می‌کند و
-- هیچ داده‌ای را تغییر نمی‌دهد (پیش‌فرض ۰ = مشارکت نکرده).
--
-- ضمانت‌ها:
--  ۱) پیش‌فرض ۰ است → سفارش‌های موجود و آینده بدون مشارکت دست‌نخورده می‌مانند.
--  ۲) تفکیک حسابداری در کد انجام می‌شود: type=SALE برای کالا/ارسال و
--     type=SUPPORT برای مشارکت (referenceId یکتا: <code>-SUPPORT).
--  ۳) برگشت‌پذیر: بلوک DOWN در انتها.
-- ============================================================================

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "support_contribution" integer NOT NULL DEFAULT 0;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "support_amount" integer NOT NULL DEFAULT 0;

-- ── DOWN (اجرای دستی برای برگشت) ─────────────────────────────────────────────
-- ALTER TABLE "invoices" DROP COLUMN IF EXISTS "support_amount";
-- ALTER TABLE "orders" DROP COLUMN IF EXISTS "support_contribution";
