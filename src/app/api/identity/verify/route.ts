import { z } from "zod";
import { assertSameOrigin, clientKey, csrfRejectedResponse, rateLimit, rateLimitedResponse } from "@/lib/security";
import { IdentityError, verifyCheckoutIdentity } from "@/lib/identity";
import { maskNationalId } from "@/lib/nid";

/**
 * POST /api/identity/verify — احراز هویت پرداخت (Part A/B).
 * ورودی: { nid, mobile, otpCode? } → خروجی: توکن امضاشدهٔ کوتاه‌مدت.
 * هیچ دادهٔ حساسی در پاسخ کامل برنمی‌گردد (کد ملی ماسک می‌شود).
 */
const schema = z.object({
  nid: z.string().trim().min(8).max(12),
  mobile: z.string().trim().regex(/^09\d{9}$/, "شمارهٔ موبایل معتبر نیست (مثال: ۰۹۱۲۳۴۵۶۷۸۹)."),
  otpCode: z.string().trim().regex(/^\d{4,8}$/).optional(),
});

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return csrfRejectedResponse();
  const limited = rateLimit(clientKey(req, "identity-verify"), 10, 15 * 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, message: parsed.error.issues[0]?.message ?? "داده نامعتبر است" }, { status: 400 });
  }
  try {
    const { token, provider } = await verifyCheckoutIdentity(parsed.data);
    return Response.json({
      ok: true,
      identityToken: token,
      provider,
      nidMasked: maskNationalId(parsed.data.nid),
    });
  } catch (e) {
    if (e instanceof IdentityError) {
      return Response.json({ ok: false, message: e.message, needOtp: e.needOtp }, { status: e.status });
    }
    return Response.json({ ok: false, message: "احراز هویت انجام نشد؛ دوباره تلاش کنید." }, { status: 400 });
  }
}
