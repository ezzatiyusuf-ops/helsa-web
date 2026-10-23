import { NextResponse } from "next/server";
import { z } from "zod";
import { requestOtpLogin } from "@/lib/auth-service";
import { assertSameOrigin, clientKey, csrfRejectedResponse, rateLimit, rateLimitedResponse } from "@/lib/security";

const schema = z.object({ phone: z.string().regex(/^09\d{9}$/) });

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return csrfRejectedResponse();
  const limited = rateLimit(clientKey(req, "otp-request"), 5, 15 * 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "شماره موبایل معتبر نیست." }, { status: 400 });

  try {
    const result = await requestOtpLogin(parsed.data.phone);
    // Never return OTP in production. Dev-only helper when SMS is unconfigured.
    return NextResponse.json({
      ok: true,
      demo: result.demo,
      expiresAt: result.expiresAt,
      message: result.demo
        ? "ارسال پیامک پیکربندی نشده است. در محیط توسعه کد یک‌بارمصرف فقط برای تست سمت سرور تولید شد."
        : "اگر شماره معتبر باشد، کد تأیید ارسال می‌شود.",
      // Explicitly omit code unless non-production + unconfigured SMS.
      ...(result.devCode ? { devHint: "کد تست فقط در پاسخ توسعه و بدون SMS برمی‌گردد." , devCode: result.devCode } : {}),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "ERROR";
    if (code === "DATABASE_UNAVAILABLE") return NextResponse.json({ ok: false, message: "سرویس حساب کاربری در دسترس نیست." }, { status: 503 });
    return NextResponse.json({ ok: false, message: "درخواست کد انجام نشد." }, { status: 400 });
  }
}
