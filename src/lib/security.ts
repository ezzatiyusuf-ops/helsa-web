import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
export { safeNextPath } from "@/lib/safe-url";

/** Production-safe origin resolver (no open host reflection). */
export function resolveOrigin(req: Request): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? (isProduction() ? "https" : "http");
  const requestOrigin = host && !host.startsWith("0.0.0.0") ? `${proto}://${host}` : new URL(req.url).origin;
  const configured = (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL)?.replace(/\/$/, "");
  // Prefer configured public origin only when it matches this request, or when no host is available.
  if (configured && (configured === requestOrigin || !host)) return configured;
  if (isProduction() && configured) return configured;
  return requestOrigin;
}

function allowedOrigins(req: Request): Set<string> {
  const set = new Set<string>();
  const configured = (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL)?.replace(/\/$/, "");
  if (configured) set.add(configured);
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? (isProduction() ? "https" : "http");
  if (host && !host.startsWith("0.0.0.0")) set.add(`${proto}://${host}`);
  try { set.add(new URL(req.url).origin); } catch { /* ignore */ }
  return set;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function cookieSecure(): boolean {
  return isProduction() || process.env.FORCE_SECURE_COOKIES === "1";
}

export function hashToken(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function generateOtpCode(): string {
  // 6-digit numeric OTP from CSPRNG
  const n = randomBytes(4).readUInt32BE(0) % 1_000_000;
  return n.toString().padStart(6, "0");
}

export function generateResetToken(): string {
  return randomBytes(32).toString("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/**
 * In-process sliding fixed window limiter.
 * Suitable for single-node deployments. Documented as requiring shared store for multi-node.
 */
export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSec: Math.ceil(windowMs / 1000) };
  }
  if (current.count >= limit) {
    return { ok: false, remaining: 0, retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }
  current.count += 1;
  buckets.set(key, current);
  return { ok: true, remaining: Math.max(0, limit - current.count), retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
}

export function clientKey(req: Request, scope: string): string {
  const xf = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = xf || req.headers.get("x-real-ip") || "unknown";
  return `${scope}:${ip}`;
}

export function rateLimitedResponse(retryAfterSec: number, message = "تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید.") {
  return NextResponse.json({ ok: false, message }, { status: 429, headers: { "Retry-After": String(retryAfterSec) } });
}

export function genericAuthMessage(): string {
  return "اطلاعات ورود صحیح نیست.";
}

export function requestLooksStateChanging(method: string): boolean {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

/**
 * CSRF defense for cookie-authenticated state changes:
 * require same-origin via Origin/Referer when present.
 */
export function assertSameOrigin(req: Request): boolean {
  const allowed = allowedOrigins(req);
  const headerOrigin = req.headers.get("origin")?.replace(/\/$/, "");
  if (headerOrigin) return allowed.has(headerOrigin);
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return allowed.has(new URL(referer).origin);
    } catch {
      return false;
    }
  }
  // Non-browser/server-to-server clients may omit both; allow only outside production.
  return !isProduction();
}

export function csrfRejectedResponse() {
  return NextResponse.json({ ok: false, message: "درخواست نامعتبر است." }, { status: 403 });
}

export function securityHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "X-DNS-Prefetch-Control": "off",
  };
  if (isProduction()) {
    headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload";
  }
  // CSP kept compatible with current HELSA assets (inline theme boot script + cdn Vazirmatn + image hosts).
  headers["Content-Security-Policy"] = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self' https://appleid.apple.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline'",
    "connect-src 'self' https:",
    "worker-src 'self'",
    "manifest-src 'self'",
  ].join("; ");
  return headers;
}
