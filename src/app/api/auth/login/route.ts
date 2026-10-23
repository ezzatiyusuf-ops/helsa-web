import { NextResponse } from "next/server";
import { z } from "zod";
import { loginWithPassword } from "@/lib/auth-service";
import { sessionCookieOptions, SESSION_COOKIE } from "@/lib/session";
import { assertSameOrigin, clientKey, csrfRejectedResponse, genericAuthMessage, rateLimit, rateLimitedResponse } from "@/lib/security";

const schema = z.object({
  identifier: z.string().min(5).max(180),
  password: z.string().min(1).max(100),
  remember: z.boolean().optional(),
});

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return csrfRejectedResponse();
  const limited = rateLimit(clientKey(req, "auth-login"), 10, 15 * 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: genericAuthMessage() }, { status: 400 });

  try {
    const { token, customer } = await loginWithPassword(parsed.data.identifier, parsed.data.password);
    const res = NextResponse.json({ ok: true, name: customer.name, email: customer.email, phone: customer.phone });
    // "remember me" extends the session from 7 days to 30 days
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(parsed.data.remember ? 60 * 60 * 24 * 30 : undefined));
    return res;
  } catch (error) {
    const code = error instanceof Error ? error.message : "ERROR";
    if (code === "DATABASE_UNAVAILABLE") return NextResponse.json({ ok: false, message: "سرویس حساب کاربری در دسترس نیست." }, { status: 503 });
    return NextResponse.json({ ok: false, message: "شماره موبایل/ایمیل یا رمز عبور صحیح نیست." }, { status: 401 });
  }
}
