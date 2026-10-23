-- ============================================================================
-- 0005 — روزیته: تولیدکنندگان، پروفایل و گردش تأیید/انتشار
-- HELSA · 2026-10-21
--
-- قاعدهٔ سخت: هیچ تولیدکننده/بیوگرافی/گواهی/تأثیر اجتماعی ساختگی وارد این
-- جدول نمی‌شود. همهٔ ردیف‌ها از فرم «درخواست عضویت» خودِ تولیدکننده می‌آیند و
-- تا تأیید ادمین (approved) و انتشار (published) در هیچ صفحهٔ عمومی دیده
-- نمی‌شوند.
--
-- چرا ستون‌های متنی به‌جای ادعاهای ساختاری: هر ادعای «گواهی» یا «تأثیر اجتماعی»
-- فقط متنی است که خود تولیدکننده اعلام کرده و در UI با برچسب «اعلام‌شده توسط
-- تولیدکننده» نمایش داده می‌شود؛ هیچ نشان رسمی بدون مدرک داده نمی‌شود.
--
-- برگشت‌پذیری: بلوک DOWN در انتها.
-- ============================================================================

CREATE TABLE IF NOT EXISTS "producers" (
  "id" serial PRIMARY KEY,
  "slug" varchar(120) NOT NULL,
  "display_name" varchar(160) NOT NULL,
  "region" varchar(120) NOT NULL DEFAULT '',
  "craft" varchar(160) NOT NULL DEFAULT '',
  "bio" text NOT NULL DEFAULT '',
  "story" text NOT NULL DEFAULT '',
  "social_impact" text NOT NULL DEFAULT '',
  "certifications" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "avatar_image" varchar(400) NOT NULL DEFAULT '',
  "cover_image" varchar(400) NOT NULL DEFAULT '',
  "contact_name" varchar(160) NOT NULL DEFAULT '',
  "contact_phone" varchar(20) NOT NULL DEFAULT '',
  "contact_email" varchar(160) NOT NULL DEFAULT '',
  -- submitted | approved | published | unavailable | rejected
  "status" varchar(24) NOT NULL DEFAULT 'submitted',
  "submitted_by_sub" varchar(80) NOT NULL DEFAULT '',
  "submitted_at" timestamp NOT NULL DEFAULT now(),
  "reviewed_by" varchar(180),
  "reviewed_at" timestamp,
  "decision_reason" text NOT NULL DEFAULT '',
  "published_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "producers_slug_unique" ON "producers" ("slug");
CREATE INDEX IF NOT EXISTS "producers_status_idx" ON "producers" ("status", "submitted_at");

-- اتصال محصول به تولیدکننده. محصولِ متصل به تولیدکنندهٔ منتشرنشده در فهرست
-- عمومی نمایش داده نمی‌شود (moderation قبل از انتشار).
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "producer_id" integer REFERENCES "producers"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "products_producer_idx" ON "products" ("producer_id");

-- ── DOWN (اجرای دستی برای برگشت) ─────────────────────────────────────────────
-- DROP INDEX IF EXISTS "products_producer_idx";
-- ALTER TABLE "products" DROP COLUMN IF EXISTS "producer_id";
-- DROP TABLE IF EXISTS "producers";
