-- ============================================================================
-- 0002 — کارت‌به‌کارت: رسید، بازبینی ادمین، فایل خصوصی
-- HELSA · 2026-10-21
--
-- چرا این مهاجرت: جدول payments هیچ ستونی برای رسید/شمارهٔ پیگیری/بازبین/دلیل
-- نداشت، بنابراین «آپلود رسید» و «تأیید ادمین» بدون تغییر مدل داده ممکن نبود.
--
-- قواعد سخت که در طراحی جدول‌ها تضمین شده‌اند:
--   ۱) آپلود رسید هیچ ستونی از orders/payments را عوض نمی‌کند → سفارش با آپلود
--      «پرداخت‌شده» نمی‌شود؛ فقط action=verify ادمین مسیر finalizePaidOrder را باز می‌کند.
--   ۲) وضعیت گردش رسید (payment_receipts.status) از وضعیت پرداخت (payments.status)
--      جداست؛ payments.status همان pending/paid/failed/expired/cancelled می‌ماند تا
--      UPDATE اتمیک «فقط از pending به paid» در finalizePaidOrder دست‌نخورده کار کند.
--   ۳) فایل رسید در payment_receipt_files (bytea) است، نه در public/ — دسترسی فقط با
--      احراز هویت ادمین از مسیر اختصاصی.
--   ۴) یکتایی (order_id, file_sha256) از ارسال دوبارهٔ همان تصویر جلوگیری می‌کند.
--
-- برگشت‌پذیری: بلوک DOWN در انتهای فایل. حذف جدول‌ها هیچ اثری روی orders/payments ندارد
-- (وابستگی یک‌طرفه است: این جدول‌ها به orders ارجاع می‌دهند).
-- ============================================================================

CREATE TABLE IF NOT EXISTS "payment_receipts" (
  "id" serial PRIMARY KEY,
  "order_id" integer NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "payment_id" integer REFERENCES "payments"("id") ON DELETE SET NULL,
  "status" varchar(32) NOT NULL DEFAULT 'receipt_submitted',
  "amount_declared" integer NOT NULL DEFAULT 0,
  "transfer_date" varchar(40) NOT NULL DEFAULT '',
  "tracking_number" varchar(64) NOT NULL DEFAULT '',
  "payer_card_last4" varchar(4) NOT NULL DEFAULT '',
  "payer_name" varchar(120) NOT NULL DEFAULT '',
  "file_name" varchar(160) NOT NULL DEFAULT '',
  "mime_type" varchar(80) NOT NULL DEFAULT '',
  "file_size" integer NOT NULL DEFAULT 0,
  "file_sha256" varchar(64) NOT NULL DEFAULT '',
  "submitted_by_sub" varchar(80) NOT NULL DEFAULT '',
  "submitted_at" timestamp NOT NULL DEFAULT now(),
  "reviewed_by" varchar(180),
  "review_started_at" timestamp,
  "decided_at" timestamp,
  "decision_reason" text NOT NULL DEFAULT '',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "payment_receipts_order_idx" ON "payment_receipts" ("order_id", "created_at");
CREATE INDEX IF NOT EXISTS "payment_receipts_status_idx" ON "payment_receipts" ("status", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "payment_receipts_file_sha_unique" ON "payment_receipts" ("order_id", "file_sha256");

CREATE TABLE IF NOT EXISTS "payment_receipt_files" (
  "receipt_id" integer PRIMARY KEY REFERENCES "payment_receipts"("id") ON DELETE CASCADE,
  "data" bytea NOT NULL
);

-- ── DOWN (اجرای دستی برای برگشت) ─────────────────────────────────────────────
-- DROP TABLE IF EXISTS "payment_receipt_files";
-- DROP TABLE IF EXISTS "payment_receipts";
