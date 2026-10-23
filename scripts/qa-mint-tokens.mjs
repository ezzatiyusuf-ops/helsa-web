/**
 * ساخت توکن‌های آزمون برای QA سرتاسری — scripts/qa-mint-tokens.mjs
 * ──────────────────────────────────────────────────────────────
 * سه کاربر واقعی در DB می‌سازد (مشتری، ادمین، «کاربر دیگر» برای آزمون IDOR)
 * و برای هر کدام یک توکن نشستِ امضاشده با AUTH_SECRET تولید می‌کند:
 *   /tmp/tok-customer.txt · /tmp/tok-admin.txt · /tmp/tok-other.txt · /tmp/tok-identity.txt
 *
 * چرا از API لاگین استفاده نمی‌شود: رمزی برای این کاربران وجود ندارد و نباید
 * رمز ساختگی/هش ساختگی در DB نوشته شود. مسیر «چالش OTP» هم کد پیامک می‌خواهد.
 * امضای مستقیم توکن، همان چیزی است که سرور در هر درخواست اعتبارسنجی می‌کند.
 *
 * اجرا:  node scripts/qa-mint-tokens.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { SignJWT } from "jose";
import pg from "pg";

const ROOT = new URL("..", import.meta.url).pathname;

function envValue(key) {
  const raw = readFileSync(`${ROOT}.env`, "utf-8");
  const line = raw.split("\n").find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).replace(/^["']|["']$/g, "").trim() : "";
}

const DATABASE_URL = process.env.DATABASE_URL || envValue("DATABASE_URL");
const AUTH_SECRET = process.env.AUTH_SECRET || envValue("AUTH_SECRET");
if (!DATABASE_URL) throw new Error("DATABASE_URL پیدا نشد");
if (!AUTH_SECRET) throw new Error("AUTH_SECRET پیدا نشد");

const secret = new TextEncoder().encode(AUTH_SECRET);

const USERS = [
  { key: "customer", name: "مشتری آزمون", email: "qa-customer@helsa.test", phone: "09120000001", role: "customer" },
  { key: "admin", name: "مالک فروشگاه", email: "owner@helsa.dev", phone: "09120000002", role: "admin" },
  { key: "other", name: "کاربر دیگر", email: "qa-other@helsa.test", phone: "09120000003", role: "customer" },
];

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

for (const u of USERS) {
  // جست‌وجو با ایمیل یا موبایل — روی دیتابیس بازیابی‌شده ممکن است ردیفی با همان موبایل باشد
  const found = await client.query("select id, email from customers where email = $1 or phone = $2 limit 1", [u.email, u.phone]);
  let id = found.rows[0]?.id;
  if (!id) {
    const ins = await client.query(
      "insert into customers (name, email, phone, is_active) values ($1,$2,$3,true) returning id",
      [u.name, u.email, u.phone],
    );
    id = ins.rows[0].id;
    console.log(`+ کاربر ساخته شد: ${u.email} (id=${id})`);
  } else {
    console.log(`= کاربر موجود: ${found.rows[0].email} → استفاده برای ${u.key} (id=${id})`);
  }
  const token = await new SignJWT({ name: u.name, email: u.email, phone: u.phone, provider: "password", role: u.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(id))
    .setIssuedAt()
    .setExpirationTime("7d")
    .setIssuer("helsa-iranian")
    .setAudience("helsa-storefront")
    .sign(secret);
  writeFileSync(`/tmp/tok-${u.key}.txt`, token);
  console.log(`  → /tmp/tok-${u.key}.txt`);
}

/**
 * توکن احراز هویت (identityToken) برای checkout — جدا از نشست.
 * همان قراردادی که src/lib/identity.ts در verifyIdentityToken انتظار دارد:
 *   header HS256 · iss=helsa-iranian · aud=helsa-identity · claims: mobile, nid, provider, via
 * کد ملی باید چک‌سام معتبر داشته باشد و موبایل با customer.mobile سفارش یکی باشد.
 */
const QA_MOBILE = "09120000001";
const QA_NID = "0013542419"; // چک‌سام معتبر · دادهٔ آزمون، نه هویت واقعی
const cust = await client.query("select id from customers where phone = $1 limit 1", ["09120000001"]);
if (!cust.rows[0]) throw new Error("کاربر آزمون پیدا نشد");
await client.query(
  "update customers set national_id = $2, nid_verified_at = coalesce(nid_verified_at, now()), identity_provider = coalesce(identity_provider,'simulation') where id = $1",
  [cust.rows[0].id, QA_NID],
);
const identityToken = await new SignJWT({ mobile: QA_MOBILE, nid: QA_NID, provider: "simulation", via: "checksum" })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setIssuer("helsa-iranian")
  .setAudience("helsa-identity")
  .setExpirationTime("30m")
  .sign(secret);
writeFileSync("/tmp/tok-identity.txt", identityToken);
console.log("  → /tmp/tok-identity.txt (identityToken برای checkout)");

await client.end();
console.log("انجام شد.");
