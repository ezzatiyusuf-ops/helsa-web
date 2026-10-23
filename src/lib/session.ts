import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, isDatabaseConfigured } from "@/db";
import { customers } from "@/db/schema";
import { cookieSecure, isProduction } from "@/lib/security";
import { authSecretRaw } from "@/lib/secrets";

/**
 * HELSA session tokens — signed server-side with AUTH_SECRET.
 * There is intentionally NO development fallback secret in production.
 */
function getSecret(): Uint8Array {
  const secret = authSecretRaw();
  if (!secret) {
    if (isProduction()) {
      throw new Error("AUTH_SECRET is required in production");
    }
    // Development-only ephemeral secret so local tooling still boots without pretending to be secure.
    return new TextEncoder().encode("helsa-dev-only-insecure-secret");
  }
  if (isProduction() && secret.length < 32) {
    throw new Error("AUTH_SECRET must be at least 32 characters in production");
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  sub: string; // stable customer id or email/phone subject
  name: string;
  email: string;
  phone?: string;
  provider: "google" | "apple" | "otp" | "password";
  role: "customer" | "admin";
  iat?: number; // issued-at (epoch seconds) — used for post-reset revocation
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    name: payload.name,
    email: payload.email,
    phone: payload.phone ?? "",
    provider: payload.provider,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .setIssuer("helsa-iranian")
    .setAudience("helsa-storefront")
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: "helsa-iranian",
      audience: "helsa-storefront",
      algorithms: ["HS256"],
    });
    const sub = typeof payload.sub === "string" ? payload.sub : "";
    const name = typeof payload.name === "string" ? payload.name : "";
    const email = typeof payload.email === "string" ? payload.email : "";
    const phone = typeof payload.phone === "string" ? payload.phone : undefined;
    const provider = payload.provider;
    const role = payload.role === "admin" ? "admin" : "customer";
    if (!sub || !name || !provider) return null;
    if (!["google", "apple", "otp", "password"].includes(String(provider))) return null;
    return {
      sub,
      name,
      email,
      phone: phone || undefined,
      provider: provider as SessionPayload["provider"],
      role,
      iat: typeof payload.iat === "number" ? payload.iat : undefined,
    };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = "helsa_session";
export const OAUTH_STATE_COOKIE = "helsa_oauth_state";

export function sessionCookieOptions(maxAge = 60 * 60 * 24 * 7) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: cookieSecure(),
    path: "/",
    maxAge,
  };
}

export async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;
  // Defense-in-depth: tokens issued BEFORE a password change/reset are revoked.
  // One indexed PK lookup per authenticated request; skipped for anonymous traffic.
  const customerId = customerIdFromSession(session);
  if (session.iat != null && customerId != null && isDatabaseConfigured) {
    try {
      const rows = await db.select({ pwdAt: customers.passwordUpdatedAt }).from(customers).where(eq(customers.id, customerId)).limit(1);
      const pwdAt = rows[0]?.pwdAt?.getTime();
      // tokens issued strictly before a password change/reset are revoked.
      // iat has 1-second resolution, so a token whose issue-second ENDED before the
      // change is definitely pre-change; same-second tokens survive (resolution limit).
      if (pwdAt && session.iat * 1000 + 1000 <= pwdAt) return null;
    } catch {
      // availability: signature already verified; do not hard-fail on a DB hiccup
    }
  }
  return session;
}

/** Extract the numeric customer id from a session subject ("customer:{id}"). */
export function customerIdFromSession(session: SessionPayload | null): number | null {
  if (!session) return null;
  const m = /^customer:(\d+)$/.exec(session.sub);
  return m ? Number(m[1]) : null;
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await readSession();
  if (!session) {
    const err = new Error("UNAUTHORIZED");
    throw err;
  }
  return session;
}
