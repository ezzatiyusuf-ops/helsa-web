import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyOtpLogin } from "@/lib/auth-service";
import { sessionCookieOptions, SESSION_COOKIE } from "@/lib/session";
import { assertSameOrigin, clientKey, csrfRejectedResponse, genericAuthMessage, rateLimit, rateLimitedResponse } from "@/lib/security";

const schema = z.object({
  phone: z.string().regex(/^09\d{9}$/),
  code: z.string().regex(/^\d{6}$/),
});

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return csrfRejectedResponse();
  const limited = rateLimit(clientKey(req, "otp-verify"), 10, 15 * 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: genericAuthMessage() }, { status: 400 });

  try {
    const { token, customer } = await verifyOtpLogin(parsed.data.phone, parsed.data.code);
    const res = NextResponse.json({ ok: true, name: customer.name, phone: customer.phone, email: customer.email });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  } catch (error) {
    const code = error instanceof Error ? error.message : "ERROR";
    if (code === "EXPIRED_CODE") return NextResponse.json({ ok: false, message: "کد تأیید منقضی شده است. لطفاً کد جدید دریافت کنید." }, { status: 401 });
    if (code === "TOO_MANY_ATTEMPTS") return NextResponse.json({ ok: false, message: "تعداد تلاش‌ها بیش از حد مجاز است. لطفاً کد جدید دریافت کنید." }, { status: 429 });
    if (code === "DATABASE_UNAVAILABLE") return NextResponse.json({ ok: false, message: "سرویس حساب کاربری در دسترس نیست." }, { status: 503 });
    return NextResponse.json({ ok: false, message: "کد تأیید صحیح نیست." }, { status: 401 });
  }
}
