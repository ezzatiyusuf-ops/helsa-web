import "server-only";
import { and, desc, eq, gte, gt, isNull, sql } from "drizzle-orm";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { db, isDatabaseConfigured } from "@/db";
import { authChallenges, customers } from "@/db/schema";
import { createSessionToken, type SessionPayload } from "@/lib/session";
import { generateOtpCode, generateResetToken, hashToken, isProduction, safeEqual } from "@/lib/security";
import { isAdminEmail } from "@/lib/admin";
import { dispatchOtpSms, smsConfigured } from "@/lib/sms";

const scryptAsync = promisify(scrypt);

function normalizeIdentifier(raw: string): { kind: "phone" | "email"; value: string } | null {
  const value = raw.trim();
  if (/^09\d{9}$/.test(value)) return { kind: "phone", value };
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return { kind: "email", value: value.toLowerCase() };
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algo, salt, hash] = encoded.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  const left = Buffer.from(hash, "hex");
  if (left.length !== derived.length) return false;
  return timingSafeEqual(left, derived);
}

async function findCustomer(identifier: string) {
  const parsed = normalizeIdentifier(identifier);
  if (!parsed) return null;
  if (parsed.kind === "phone") {
    const rows = await db.select().from(customers).where(eq(customers.phone, parsed.value)).limit(1);
    return rows[0] ?? null;
  }
  const rows = await db.select().from(customers).where(eq(customers.email, parsed.value)).limit(1);
  return rows[0] ?? null;
}

function roleForEmail(email?: string | null): "customer" | "admin" {
  return email && isAdminEmail(email) ? "admin" : "customer";
}

export async function issueSessionForCustomer(customer: {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  provider: SessionPayload["provider"];
}) {
  return createSessionToken({
    sub: `customer:${customer.id}`,
    name: customer.name,
    email: customer.email ?? "",
    phone: customer.phone ?? undefined,
    provider: customer.provider,
    role: roleForEmail(customer.email),
  });
}

export async function registerWithPassword(input: {
  name: string;
  family: string;
  phone: string;
  email: string;
  password: string;
}) {
  if (!isDatabaseConfigured) throw new Error("DATABASE_UNAVAILABLE");
  const phone = input.phone.trim();
  const email = input.email.trim().toLowerCase();
  if (!/^09\d{9}$/.test(phone)) throw new Error("INVALID_PHONE");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("INVALID_EMAIL");
  if (input.password.length < 8) throw new Error("WEAK_PASSWORD");

  const existingPhone = await db.select({ id: customers.id }).from(customers).where(eq(customers.phone, phone)).limit(1);
  const existingEmail = await db.select({ id: customers.id }).from(customers).where(eq(customers.email, email)).limit(1);
  if (existingPhone.length || existingEmail.length) throw new Error("ACCOUNT_EXISTS");

  const passwordHash = await hashPassword(input.password);
  const fullName = `${input.name.trim()} ${input.family.trim()}`.trim();
  const row = (await db.insert(customers).values({
    name: fullName,
    phone,
    email,
    passwordHash,
    isActive: true,
    updatedAt: new Date(),
  }).returning())[0];

  const token = await issueSessionForCustomer({ id: row.id, name: row.name, email: row.email, phone: row.phone, provider: "password" });
  return { token, customer: row };
}

export async function loginWithPassword(identifier: string, password: string) {
  if (!isDatabaseConfigured) throw new Error("DATABASE_UNAVAILABLE");
  const customer = await findCustomer(identifier);
  // Constant-ish failure path: always hash something.
  const dummy = "scrypt$00$00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
  const ok = customer?.passwordHash ? await verifyPassword(password, customer.passwordHash) : await verifyPassword(password, dummy);
  if (!customer || !customer.isActive || !ok) throw new Error("INVALID_CREDENTIALS");
  const token = await issueSessionForCustomer({ id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, provider: "password" });
  return { token, customer };
}

/**
 * Dev-only OTP hint gate. The real code must NEVER reach a client in production,
 * even if ALLOW_DEV_OTP_HINT=1 leaks into a production env file.
 */
function devHintAllowed(): boolean {
  // هرگز وقتی SMS واقعی پیکربندی شده (حتی اگر پرچم فراموش شد)
  if (process.env.SMS_PROVIDER) return false;
  // OTP_TEST_HINT=1 — پرچم صریح محیط تست/استیجینگ (بیلد production هم مجاز است،
  // اما گیت scripts/verify-production.sh وجود آن را در انتشار NO-GO می‌کند)
  if (process.env.OTP_TEST_HINT === "1") return true;
  return process.env.ALLOW_DEV_OTP_HINT === "1" && !isProduction();
}

/** Ops log for unconfigured delivery — once per process, never includes codes or identifiers. */
let deliveryWarned = false;
function warnDeliveryUnconfigured(purpose: string): void {
  if (deliveryWarned) return;
  deliveryWarned = true;
  console.warn(`[HELSA-AUTH] Delivery provider unconfigured (SMS_PROVIDER missing) — ${purpose} challenge created but NOT dispatched. Set SMS_PROVIDER and wire a provider to make this flow operational.`);
}

/** Per-identifier challenge creation cap — blocks OTP flooding of one account from rotating IPs. */
const CHALLENGE_CAP_PER_WINDOW = 3;
const CHALLENGE_CAP_WINDOW_MS = 15 * 60_000;

async function challengeCreationCapped(purpose: "otp_login" | "password_reset", identifier: string): Promise<boolean> {
  const rows = await db.select({ id: authChallenges.id }).from(authChallenges).where(and(
    eq(authChallenges.identifier, identifier),
    eq(authChallenges.purpose, purpose),
    gte(authChallenges.createdAt, new Date(Date.now() - CHALLENGE_CAP_WINDOW_MS)),
  ));
  return rows.length >= CHALLENGE_CAP_PER_WINDOW;
}

/** An unconsumed-but-expired challenge exists → the code simply timed out. */
async function hasExpiredChallenge(purpose: "otp_login" | "password_reset", identifier: string): Promise<boolean> {
  const rows = await db.select({ id: authChallenges.id }).from(authChallenges).where(and(
    eq(authChallenges.identifier, identifier),
    eq(authChallenges.purpose, purpose),
    isNull(authChallenges.consumedAt),
  )).orderBy(desc(authChallenges.id)).limit(1);
  return rows.length > 0;
}

async function createChallenge(purpose: "otp_login" | "password_reset", identifier: string) {
  // Both flows use a short-lived 6-digit OTP so the existing HELSA UI remains unchanged.
  // Codes are stored only as SHA-256 hashes.
  const value = generateOtpCode();
  const codeHash = hashToken(value);
  const expiresAt = new Date(Date.now() + (purpose === "password_reset" ? 10 * 60_000 : 5 * 60_000));
  await db.update(authChallenges)
    .set({ consumedAt: new Date() })
    .where(and(eq(authChallenges.identifier, identifier), eq(authChallenges.purpose, purpose), isNull(authChallenges.consumedAt)));
  await db.insert(authChallenges).values({
    purpose,
    identifier,
    codeHash,
    attempts: 0,
    maxAttempts: 5,
    expiresAt,
  });
  return { code: value, expiresAt, demo: !smsConfigured() };
}

export async function requestOtpLogin(identifier: string) {
  if (!isDatabaseConfigured) throw new Error("DATABASE_UNAVAILABLE");
  const parsed = normalizeIdentifier(identifier);
  if (!parsed || parsed.kind !== "phone") throw new Error("INVALID_PHONE");
  // Per-identifier cap — identical generic response, no new challenge when capped.
  if (await challengeCreationCapped("otp_login", parsed.value)) {
    return {
      ok: true as const,
      demo: !smsConfigured(),
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      hasAccount: Boolean(await findCustomer(parsed.value)),
    };
  }
  // Do not reveal whether the phone exists; still create challenge for anti-enumeration UX.
  const customer = await findCustomer(parsed.value);
  const challenge = await createChallenge("otp_login", parsed.value);
  if (challenge.demo) warnDeliveryUnconfigured("otp_login");
  else await dispatchOtpSms(parsed.value, challenge.code, "otp_login"); // real provider — code never returned to client
  return {
    ok: true as const,
    demo: challenge.demo,
    devCode: devHintAllowed() ? challenge.code : undefined,
    expiresAt: challenge.expiresAt.toISOString(),
    hasAccount: Boolean(customer),
  };
}

export async function verifyOtpLogin(identifier: string, code: string) {
  if (!isDatabaseConfigured) throw new Error("DATABASE_UNAVAILABLE");
  const parsed = normalizeIdentifier(identifier);
  if (!parsed || parsed.kind !== "phone") throw new Error("INVALID_PHONE");
  const rows = await db.select().from(authChallenges).where(and(
    eq(authChallenges.identifier, parsed.value),
    eq(authChallenges.purpose, "otp_login"),
    isNull(authChallenges.consumedAt),
    gt(authChallenges.expiresAt, new Date()),
  )).limit(1);
  const challenge = rows[0];
  if (!challenge) {
    if (await hasExpiredChallenge("otp_login", parsed.value)) throw new Error("EXPIRED_CODE");
    throw new Error("INVALID_CODE");
  }
  if (challenge.attempts >= challenge.maxAttempts) throw new Error("TOO_MANY_ATTEMPTS");
  const matches = safeEqual(challenge.codeHash, hashToken(code));
  await db.update(authChallenges).set({ attempts: challenge.attempts + 1 }).where(eq(authChallenges.id, challenge.id));
  if (!matches) throw new Error("INVALID_CODE");
  await db.update(authChallenges).set({ consumedAt: new Date() }).where(eq(authChallenges.id, challenge.id));

  let customer = await findCustomer(parsed.value);
  if (!customer) {
    customer = (await db.insert(customers).values({
      name: "کاربر هلسا",
      phone: parsed.value,
      email: null,
      isActive: true,
      updatedAt: new Date(),
    }).returning())[0];
  }
  const token = await issueSessionForCustomer({ id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, provider: "otp" });
  return { token, customer };
}

export async function requestPasswordReset(identifier: string) {
  if (!isDatabaseConfigured) throw new Error("DATABASE_UNAVAILABLE");
  const parsed = normalizeIdentifier(identifier);
  if (!parsed) throw new Error("INVALID_IDENTIFIER");
  // Per-identifier creation cap: same generic ok response, but no new challenge is created —
  // an attacker rotating IPs cannot flood one account with codes (SMS abuse / OTP flooding).
  if (await challengeCreationCapped("password_reset", parsed.value)) {
    return {
      ok: true as const,
      demo: !smsConfigured(),
      expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    };
  }
  // Always behave the same whether account exists or not.
  const challenge = await createChallenge("password_reset", parsed.value);
  if (challenge.demo) warnDeliveryUnconfigured("password_reset");
  else await dispatchOtpSms(parsed.value, challenge.code, "password_reset"); // real provider — code never returned to client
  return {
    ok: true as const,
    demo: challenge.demo,
    devCode: devHintAllowed() ? challenge.code : undefined,
    expiresAt: challenge.expiresAt.toISOString(),
  };
}

export async function resetPassword(identifier: string, code: string, password: string) {
  if (!isDatabaseConfigured) throw new Error("DATABASE_UNAVAILABLE");
  if (password.length < 8) throw new Error("WEAK_PASSWORD");
  const parsed = normalizeIdentifier(identifier);
  if (!parsed) throw new Error("INVALID_IDENTIFIER");
  const rows = await db.select().from(authChallenges).where(and(
    eq(authChallenges.identifier, parsed.value),
    eq(authChallenges.purpose, "password_reset"),
    isNull(authChallenges.consumedAt),
    gt(authChallenges.expiresAt, new Date()),
  )).limit(1);
  const challenge = rows[0];
  if (!challenge) {
    if (await hasExpiredChallenge("password_reset", parsed.value)) throw new Error("EXPIRED_CODE");
    throw new Error("INVALID_CODE");
  }
  if (challenge.attempts >= challenge.maxAttempts) throw new Error("TOO_MANY_ATTEMPTS");
  const matches = safeEqual(challenge.codeHash, hashToken(code));
  await db.update(authChallenges).set({ attempts: challenge.attempts + 1 }).where(eq(authChallenges.id, challenge.id));
  if (!matches) throw new Error("INVALID_CODE");
  const customer = await findCustomer(parsed.value);
  if (!customer) throw new Error("INVALID_CODE");
  const passwordHash = await hashPassword(password);
  await db.update(customers).set({ passwordHash, passwordUpdatedAt: new Date(), updatedAt: new Date() }).where(eq(customers.id, customer.id));
  await db.update(authChallenges).set({ consumedAt: new Date() }).where(eq(authChallenges.id, challenge.id));
  // Invalidate older reset challenges.
  await db.update(authChallenges).set({ consumedAt: new Date() }).where(and(eq(authChallenges.identifier, parsed.value), eq(authChallenges.purpose, "password_reset"), isNull(authChallenges.consumedAt)));
  return { ok: true as const };
}

export async function upsertOAuthCustomer(input: { name: string; email: string; provider: "google" | "apple" }) {
  if (!isDatabaseConfigured) throw new Error("DATABASE_UNAVAILABLE");
  const email = input.email.trim().toLowerCase();
  const existing = await db.select().from(customers).where(eq(customers.email, email)).limit(1);
  const row = existing[0]
    ? (await db.update(customers).set({ name: input.name || existing[0].name, updatedAt: new Date(), isActive: true }).where(eq(customers.id, existing[0].id)).returning())[0]
    : (await db.insert(customers).values({ name: input.name || email.split("@")[0], email, phone: null, isActive: true, updatedAt: new Date() }).returning())[0];
  const token = await issueSessionForCustomer({ id: row.id, name: row.name, email: row.email, phone: row.phone, provider: input.provider });
  return { token, customer: row };
}


