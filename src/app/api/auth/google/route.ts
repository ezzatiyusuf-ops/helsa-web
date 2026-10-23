import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { OAUTH_STATE_COOKIE, sessionCookieOptions } from "@/lib/session";
import { resolveOrigin, safeNextPath } from "@/lib/security";

export async function GET(req: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const origin = resolveOrigin(req);
  const next = safeNextPath(new URL(req.url).searchParams.get("next"), "/account");
  if (!clientId || !clientSecret) return NextResponse.redirect(`${origin}/login?social=unconfigured`);

  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origin}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  // Encode next path inside state cookie companion value via separate cookie.
  const res = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  const store = await cookies();
  store.set(OAUTH_STATE_COOKIE, state, { ...sessionCookieOptions(600), maxAge: 600 });
  store.set("helsa_oauth_next", next, { ...sessionCookieOptions(600), maxAge: 600 });
  return res;
}
