import "server-only";

/**
 * HELSA — امضای اعتبارنامه‌های کوتاه‌مدت (identity / payment-simulation).
 * از AUTH_SECRET (راز امضای نشست) استفاده می‌کنیم؛ در پروداکشن اجباری است.
 */
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

/**
 * راز امضای نشست — AUTH_SECRET مرجع است؛ نام‌های مستعار رایج
 * (NEXTAUTH_SECRET / JWT_SECRET) فقط برای راحتی استقرار پذیرفته می‌شوند.
 * هیچ‌کدام در پاسخ‌های API یا کلاینت افشا نمی‌شود.
 */
export function authSecretRaw(): string | null {
  return (process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? process.env.JWT_SECRET)?.trim() || null;
}

function secretBytes(): Uint8Array {
  const secret = authSecretRaw();
  if (!secret) throw new Error("AUTH_SECRET is required");
  return new TextEncoder().encode(secret);
}

export async function signShortToken<T extends object>(
  payload: T,
  audience: string,
  ttlSeconds: number,
): Promise<string> {
  return new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("helsa-iranian")
    .setAudience(audience)
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(secretBytes());
}

export async function verifyShortToken<T extends object>(
  token: string,
  audience: string,
): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, secretBytes(), {
      issuer: "helsa-iranian",
      audience,
      algorithms: ["HS256"],
    });
    return payload as T;
  } catch {
    return null;
  }
}
