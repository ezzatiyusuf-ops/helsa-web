import "dotenv/config";
import type { Config } from "drizzle-kit";

/**
 * HELSA — drizzle-kit config (migrations / push).
 *
 * ⚠️ آدرس دیتابیس هرگز هاردکد نمی‌شود؛ همیشه از DATABASE_URL محیط
 * (.env برای توسعهٔ محلی، متغیر محیطی CI/پایپ‌لاین برای استقرار) می‌آید.
 *   DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
 */
const url = (process.env.DATABASE_URL ?? "").trim();
if (!url) {
  throw new Error("[drizzle.config] DATABASE_URL تنظیم نشده است — migrations بدون آن اجرا نمی‌شوند (فایل .env یا متغیر محیطی).");
}

const config: Config = {
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: { url },
  strict: true,
};

export default config;
