import { NextResponse } from "next/server";
import { z } from "zod";
import { requestPasswordReset, resetPassword } from "@/lib/auth-service";
import { assertSameOrigin, clientKey, csrfRejectedResponse, rateLimit, rateLimitedResponse } from "@/lib/security";

const schema = z.object({
  step: z.enum(["request", "reset"]),
  identifier: z.string().min(5).max(180),
  code: z.string().optional(),
  password: z.string().optional(),
});

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return csrfRejectedResponse();
  const limited = rateLimit(clientKey(req, "auth-reset"), 10, 15 * 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec, "تعداد تلاش‌ها بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.");

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "داده نامعتبر است." }, { status: 400 });

  try {
    if (parsed.data.step === "request") {
      const result = await requestPasswordReset(parsed.data.identifier);
      // Customer-safe message for everyone — never reveals delivery configuration or account existence.
      return NextResponse.json({
        ok: true,
        demo: result.demo,
        expiresAt: result.expiresAt,
        message: "اگر حسابی با این مشخصات وجود داشته باشد، کد بازیابی ارسال می‌شود.",
        ...(result.devCode ? { devCode: result.devCode } : {}),
      });
    }

    if (!parsed.data.code || !parsed.data.password) {
      return NextResponse.json({ ok: false, message: "کد و رمز جدید الزامی است." }, { status: 400 });
    }
    await resetPassword(parsed.data.identifier, parsed.data.code, parsed.data.password);
    return NextResponse.json({ ok: true, message: "رمز عبور با موفقیت تغییر کرد. اکنون وارد شوید." });
  } catch (error) {
    const code = error instanceof Error ? error.message : "ERROR";
    if (code === "DATABASE_UNAVAILABLE") return NextResponse.json({ ok: false, message: "سرویس حساب کاربری در دسترس نیست." }, { status: 503 });
    if (code === "WEAK_PASSWORD") return NextResponse.json({ ok: false, message: "رمز عبور انتخاب‌شده امنیت کافی ندارد." }, { status: 400 });
    if (code === "EXPIRED_CODE") return NextResponse.json({ ok: false, message: "کد تأیید منقضی شده است. لطفاً کد جدید دریافت کنید." }, { status: 401 });
    if (code === "TOO_MANY_ATTEMPTS") return NextResponse.json({ ok: false, message: "تعداد تلاش‌ها بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید." }, { status: 429 });
    if (code === "INVALID_CODE" || code === "INVALID_IDENTIFIER") return NextResponse.json({ ok: false, message: "کد تأیید صحیح نیست." }, { status: 401 });
    return NextResponse.json({ ok: false, message: "در بازیابی رمز عبور مشکلی پیش آمد. لطفاً دوباره تلاش کنید." }, { status: 500 });
  }
}
