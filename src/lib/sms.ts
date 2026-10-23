import "server-only";

/**
 * HELSA — لایهٔ ارسال پیامک (تحویل OTP)
 *
 * ارائه‌دهنده: کاوه‌نگار (api.kavenegar.com) — ثبت‌نام و ساخت کلید API رایگان است
 * و هزینه به‌ازای پیامک محاسبه می‌شود. فعال‌سازی production:
 *   SMS_PROVIDER=kavenegar
 *   SMS_API_KEY=<کلید از پنل kavenegar.com>
 *   SMS_SENDER=<خط ارسال تأییدشده> (اختیاری)
 *
 * امنیت: کد فقط به مقصد تأییدشده ارسال می‌شود؛ در لاگ‌ها هرگز کد/شماره ثبت نمی‌شود.
 */

export function smsConfigured(): boolean {
  return (
    process.env.SMS_PROVIDER === "kavenegar" &&
    Boolean(process.env.SMS_API_KEY || process.env.KAVENEGAR_API_KEY)
  );
}

export type SmsPurpose = "otp_login" | "password_reset";

export async function dispatchOtpSms(
  mobile: string,
  code: string,
  purpose: SmsPurpose,
): Promise<{ ok: boolean; httpStatus?: number }> {
  if (!smsConfigured()) return { ok: false };
  const key = process.env.SMS_API_KEY ?? process.env.KAVENEGAR_API_KEY!;
  const sender = process.env.SMS_SENDER;
  const message =
    purpose === "password_reset"
      ? `هلسا — کد بازیابی رمز عبور شما: ${code}\nاعتبار کد ۱۰ دقیقه است.`
      : `هلسا — کد تأیید شما: ${code}\nاعتبار کد ۵ دقیقه است.`;
  try {
    const res = await fetch(`https://api.kavenegar.com/v1/${key}/sms/send.json`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ receptor: mobile, message, ...(sender ? { sender } : {}) }),
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json().catch(() => null)) as { return?: { status?: number } } | null;
    const ok = res.status === 200 && data?.return?.status === 200;
    if (!ok) {
      // فقط وضعیت HTTP/ارائه‌دهنده — بدون کد و بدون شماره
      console.error(`[HELSA-SMS] dispatch failed (HTTP ${res.status}, provider status ${data?.return?.status ?? "n/a"}).`);
    }
    return { ok, httpStatus: res.status };
  } catch {
    console.error("[HELSA-SMS] dispatch error (network/timeout).");
    return { ok: false };
  }
}
