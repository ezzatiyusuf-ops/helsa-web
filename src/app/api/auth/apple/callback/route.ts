import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { OAUTH_STATE_COOKIE, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";
import { upsertOAuthCustomer } from "@/lib/auth-service";
import { isAdminEmail } from "@/lib/admin";
import { makeClientSecret } from "../client-secret";
import { clientKey, rateLimit, rateLimitedResponse, resolveOrigin, safeNextPath } from "@/lib/security";

const appleJWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

/**
 * یافتهٔ B-01: این مسیر بی‌احراز، بی‌محدودیت نرخ بود و بدنهٔ multipart را
 * نامحدود می‌خواند (هر درخواست یک jwtVerify روی JWKS اپل). محدودیت نرخ اضافه شد.
 * توجه: بررسی Origin برای callback بین‌دامنه‌ای OAuth گذاشته نمی‌شود؛
 * اعتبار با `state` کوکی‌محور + امضای id_token اپل تأمین می‌شود.
 */
export async function POST(req: Request) {
  const limited = rateLimit(clientKey(req, "apple-callback"), 20, 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);
  const origin = resolveOrigin(req);
  // B-04: formData() روی درخواست غیر multipart استثنا پرتاب می‌کرد → ۵۰۰ و لاگ پرخطا.
  // درخواست نامعتبر باید مثل هر ورودی بد دیگری به مسیر خطای ورود برگردد.
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.redirect(`${origin}/login?social=error`);
  const idToken = String(form.get("id_token") ?? "");
  const state = String(form.get("state") ?? "");
  const next = safeNextPath(String(form.get("next") ?? ""), "/account");
  const store = await cookies();
  const expected = store.get(OAUTH_STATE_COOKIE)?.value;

  if (!idToken || !state || !expected || state !== expected) {
    return NextResponse.redirect(`${origin}/login?social=error`);
  }
  store.delete(OAUTH_STATE_COOKIE);

  try {
    const { payload } = await jwtVerify(idToken, appleJWKS, {
      issuer: "https://appleid.apple.com",
      audience: process.env.APPLE_CLIENT_ID,
    });
    const email = typeof payload.email === "string" ? payload.email : "";
    if (!email) return NextResponse.redirect(`${origin}/login?social=error`);
    if (process.env.APPLE_PRIVATE_KEY) await makeClientSecret(process.env.APPLE_CLIENT_ID!).catch(() => null);

    const { token: session } = await upsertOAuthCustomer({ name: email.split("@")[0], email, provider: "apple" });
    const destination = isAdminEmail(email) ? "/admin" : next;
    const res = NextResponse.redirect(`${origin}${destination}`);
    res.cookies.set(SESSION_COOKIE, session, sessionCookieOptions());
    return res;
  } catch {
    return NextResponse.redirect(`${origin}/login?social=error`);
  }
}
