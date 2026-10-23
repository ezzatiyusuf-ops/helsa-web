import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/** Deterministic hosted-Platform detection — در Cloudflare Workers، process.env
 * ممکن است NONE از متغیرهای کلاسیک را نداشته باشد؛ userAgent ران‌تایم مرجع است. */
function detectHostedPlatform(): boolean {
  if (process.env.NETLIFY || process.env.VERCEL || process.env.RENDER || process.env.CF_PAGES || process.env.CLOUDFLARE || process.env.CF_BUILD_ID) return true;
  try {
    return typeof navigator !== "undefined" && /Cloudflare-Workers/i.test(String((navigator as Navigator & { userAgent?: string }).userAgent ?? ""));
  } catch {
    return false;
  }
}

/**
 * HELSA database client — hosted-PostgreSQL safe (Cloudflare Workers).
 *
 * قواعد استقرار:
 *  1) هیچ‌وقت به localhost وابسته نیستیم: اگر DATABASE_URL غایب باشد، Pool واقعی
 *     ساخته نمی‌شود (pg به‌طور پیش‌فرض به 127.0.0.1:5432 می‌رفت — عامل ECONNREFUSED
 *     در بیلد CI بدون DB). یک stub بدون شبکه برمی‌گردانیم که هر کوئری را با پیام روشن
 *     reject می‌کند تا لایهٔ سرویس fallback بزند.
 *  2) در محیط میزبانی‌شده (Cloudflare Workers و…) اتصال به localhost رد می‌شود (خطای روشن).
 *  3) PostgreSQL میزبانی‌شده (Supabase / Neon / Railway) به‌طور پیش‌فرض SSL می‌گیرد؛
 *     DATABASE_SSL=disable برای خاموش‌کردن، DATABASE_SSL=verify برای تأیید سختگیرانهٔ cert.
 *
 * DATABASE_URL برای هر فچر دیتا-محور الزامی است:
 *   DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
 */
const databaseUrl = (process.env.DATABASE_URL ?? "").trim();

export const isDatabaseConfigured = Boolean(databaseUrl);

export const DATABASE_SETUP_MESSAGE =
  "[HELSA] DATABASE_URL تنظیم نشده است. مقدار آن را در محیط (wrangler secret / Dashboard Variables یا فایل .env) قرار دهید " +
  "(نمونه: postgresql://USER:PASSWORD@HOST:5432/DATABASE) و سپس `npx drizzle-kit push` را اجرا کنید.";

const LOCAL_DB_HOSTS = new Set(["localhost", "127.0.0.1", "::1", ""]);
const ON_HOSTED_PLATFORM = detectHostedPlatform();

function dbHost(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/** رد خودکار localhost در محیط میزبانی‌شده — «production must use hosted PostgreSQL only» */
const localDbRejected = Boolean(databaseUrl) && LOCAL_DB_HOSTS.has(dbHost(databaseUrl)) && ON_HOSTED_PLATFORM;
if (localDbRejected) {
  console.error(
    "[HELSA] DATABASE_URL به localhost/127.0.0.1 اشاره می‌کند که در محیط میزبانی (Cloudflare Workers) معتبر نیست. " +
      "یک PostgreSQL میزبانی‌شده (Supabase/Neon/Railway) تنظیم کنید.",
  );
}

/** وضعیت نهایی: دیتابیس فقط وقتی «پیکربندی‌شده» است که آدرس قابل‌استفاده داشته باشد */
export const isDatabaseUsable = isDatabaseConfigured && !localDbRejected;

if (!isDatabaseUsable && process.env.NODE_ENV !== "production" && !ON_HOSTED_PLATFORM) {
  // developer-facing only; never rendered to customers
  console.warn(localDbRejected ? "[HELSA] local DATABASE_URL rejected on hosted platform." : DATABASE_SETUP_MESSAGE);
}

/** SSL خودکار برای هاست‌های غیرمحلی (Supabase/Neon/Railway) */
function sslOptions(url: string): { rejectUnauthorized: boolean } | undefined {
  if (!url || LOCAL_DB_HOSTS.has(dbHost(url))) return undefined;
  if (process.env.DATABASE_SSL === "disable") return undefined;
  return { rejectUnauthorized: process.env.DATABASE_SSL === "verify" };
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

/**
 * Stub بدون شبکه برای حالت «پیکربندی‌نشده»: هیچ اتصالی (حتی به localhost) برقرار
 * نمی‌شود؛ کوئری‌ها فوراً reject می‌شوند و سرویس‌ها fallback/empty برمی‌گردانند.
 */
class UnconfiguredPool {
  on() {
    return this;
  }
  async connect(): Promise<never> {
    throw new Error(DATABASE_SETUP_MESSAGE);
  }
  async query(): Promise<never> {
    throw new Error(DATABASE_SETUP_MESSAGE);
  }
  end(): Promise<void> {
    return Promise.resolve();
  }
}

/**
 * آدرس نهایی اتصال — با اولویت:
 *  1) DATABASE_URL (راز محیط؛ در Cloudflare با `wrangler secret put DATABASE_URL`)
 *  2) binding اتصال Hyperdrive (فقط داخل Workers، از طریق OpenNext) — اگر binding
 *     HYPERDRIVE در wrangler.jsonc فعال باشد و DATABASE_URL تنظیم نشده باشد.
 * حلقهٔ try فقط در runtime کلادفلر جواب می‌دهد؛ در Node محلی بی‌صدا رد می‌شود.
 */
function resolveDatabaseUrl(): string {
  const direct = (process.env.DATABASE_URL ?? "").trim();
  if (direct) {
    if (localDbRejected) throw new Error("[HELSA] DATABASE_URL به localhost اشاره می‌کند؛ در محیط میزبانی معتبر نیست.");
    return direct;
  }
  try {
    const { getCloudflareContext } = require("@opennextjs/cloudflare") as {
      getCloudflareContext: (opts?: { async?: boolean }) => { env?: { HYPERDRIVE?: { connectionString?: string } } };
    };
    const cs = getCloudflareContext({ async: false })?.env?.HYPERDRIVE?.connectionString;
    if (typeof cs === "string" && cs.trim()) return cs.trim();
  } catch {
    /* نه در Workers / بدون binding — مسیر عادی ادامه می‌یابد */
  }
  return "";
}

/**
 * Pool تنبل: ساخت Pool واقعی تا اولین کوئری به تعویق می‌افتد تا
 *  • در بیلد بدون DATABASE_URL هیچ اتصالی (حتی به localhost) باز نشود
 *  • در Workers آدرس Hyperdrive در زمانِ درخواست (داخل کانتکست) resolve شود
 *  • HMR/گرم‌سازی: Pool واقعی روی globalThis کش می‌شود (رفتار قبلی حفظ شد)
 */
class LazyPool {
  private get real(): Pool {
    if (globalForDb.__arenaNextJsPostgresqlPool) return globalForDb.__arenaNextJsPostgresqlPool;
    const url = resolveDatabaseUrl();
    if (!url) {
      throw new Error(DATABASE_SETUP_MESSAGE);
    }
    const created = new Pool({
      connectionString: url,
      ssl: sslOptions(url),
      // تیونینگ سرورلس (Cloudflare/Neon/Supabase): اتصال محدود و کوتاه‌عمر
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
    created.on("error", () => undefined);
    globalForDb.__arenaNextJsPostgresqlPool = created;
    return created;
  }
  on(...args: Parameters<Pool["on"]>) {
    try { this.real.on(...args); } catch { /* unconfigured */ }
    return this;
  }
  connect(...args: Parameters<Pool["connect"]>) {
    return this.real.connect(...args);
  }
  query(...args: Parameters<Pool["query"]>) {
    return this.real.query(...args);
  }
  end(...args: Parameters<Pool["end"]>) {
    return this.real.end(...args);
  }
}

/**
 * رابط عمومی — همیشه LazyPool:
 *  • بدون هیچ پیکربندی: اولین کوئری با پیام روشن reject می‌شود (بدون تلاش شبکه)
 *  • فقط Hyperdrive (Workers): آدرس از binding خوانده می‌شود
 *  • DATABASE_URL: مسیر عادی توسعه/production
 */
export const pool: Pool = new LazyPool() as unknown as Pool;

export const db = drizzle(pool);

/** Lightweight health probe used by /api/health */
export async function checkDatabase(): Promise<{ ok: boolean; message: string }> {
  if (localDbRejected) {
    return {
      ok: false,
      message: "DATABASE_URL به localhost اشاره می‌کند؛ در محیط میزبانی باید PostgreSQL میزبانی‌شده تنظیم شود.",
    };
  }
  // در محیط میزبانی حتی بدون DATABASE_URL هم pool را امتحان می‌کنیم (مسیر Hyperdrive)؛
  // فقط در محلی/توسعه بدون پیکربندی، همان پیام راهنما برمی‌گردد.
  if (!isDatabaseConfigured && !ON_HOSTED_PLATFORM) return { ok: false, message: DATABASE_SETUP_MESSAGE };
  try {
    await pool.query("SELECT 1");
    return { ok: true, message: "اتصال پایگاه داده برقرار است." };
  } catch (error) {
    return { ok: false, message: `اتصال پایگاه داده برقرار نشد: ${(error as Error).message}` };
  }
}
