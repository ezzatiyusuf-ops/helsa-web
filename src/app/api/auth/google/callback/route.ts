import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { OAUTH_STATE_COOKIE, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";
import { upsertOAuthCustomer } from "@/lib/auth-service";
import { isAdminEmail } from "@/lib/admin";
import { resolveOrigin, safeNextPath } from "@/lib/security";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = resolveOrigin(req);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const store = await cookies();
  const expected = store.get(OAUTH_STATE_COOKIE)?.value;
  const next = safeNextPath(url.searchParams.get("next"), "/account");

  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(`${origin}/login?social=error`);
  }
  store.delete(OAUTH_STATE_COOKIE);

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return NextResponse.redirect(`${origin}/login?social=unconfigured`);

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${origin}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });
    const token = (await tokenRes.json()) as { access_token?: string };
    if (!token.access_token) return NextResponse.redirect(`${origin}/login?social=error`);

    const userRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const user = (await userRes.json()) as { name?: string; email?: string };
    if (!user.email) return NextResponse.redirect(`${origin}/login?social=error`);

    const { token: session } = await upsertOAuthCustomer({ name: user.name ?? user.email, email: user.email, provider: "google" });
    const destination = isAdminEmail(user.email) ? "/admin" : next;
    const res = NextResponse.redirect(`${origin}${destination}`);
    res.cookies.set(SESSION_COOKIE, session, sessionCookieOptions());
    return res;
  } catch {
    return NextResponse.redirect(`${origin}/login?social=error`);
  }
}
