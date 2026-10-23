import { NextResponse } from "next/server";
import { z } from "zod";
import { registerWithPassword } from "@/lib/auth-service";
import { sessionCookieOptions, SESSION_COOKIE } from "@/lib/session";
import { assertSameOrigin, clientKey, csrfRejectedResponse, genericAuthMessage, rateLimit, rateLimitedResponse } from "@/lib/security";

const schema = z.object({
  // strip angle brackets/control chars — markup can never enter the data layer
  name: z.string().trim().transform((s) => s.replace(/[<>\u0000-\u001f]/g, "")).pipe(z.string().min(2).max(80)),
  family: z.string().trim().transform((s) => s.replace(/[<>\u0000-\u001f]/g, "")).pipe(z.string().min(2).max(80)),
  phone: z.string().regex(/^09\d{9}$/),
  email: z.string().trim().email().max(180),
  password: z.string().min(8).max(100),
});

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return csrfRejectedResponse();
  const limited = rateLimit(clientKey(req, "auth-register"), 8, 15 * 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "اطلاعات ثبت‌نام نامعتبر است." }, { status: 400 });

  try {
    const { token, customer } = await registerWithPassword(parsed.data);
    const res = NextResponse.json({ ok: true, name: customer.name, email: customer.email, phone: customer.phone });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  } catch (error) {
    const code = error instanceof Error ? error.message : "ERROR";
    if (code === "ACCOUNT_EXISTS") return NextResponse.json({ ok: false, message: "امکان ایجاد حساب با این اطلاعات وجود ندارد." }, { status: 409 });
    if (code === "DATABASE_UNAVAILABLE") return NextResponse.json({ ok: false, message: "سرویس حساب کاربری در دسترس نیست." }, { status: 503 });
    if (code === "WEAK_PASSWORD") return NextResponse.json({ ok: false, message: "رمز عبور باید حداقل ۸ کاراکتر باشد." }, { status: 400 });
    return NextResponse.json({ ok: false, message: genericAuthMessage() }, { status: 400 });
  }
}
