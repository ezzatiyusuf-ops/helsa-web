import { NextResponse } from "next/server";
import { z } from "zod";
import { registerWholesaleBusiness } from "@/services/wholesale";
import { readSession, customerIdFromSession } from "@/lib/session";
import { assertSameOrigin, clientKey, csrfRejectedResponse, rateLimit, rateLimitedResponse } from "@/lib/security";
import { isDatabaseConfigured } from "@/db";
import { WHOLESALE_TYPES } from "@/config/wholesale";

const schema = z.object({
  businessName: z.string().trim().min(2).max(200),
  businessType: z.enum(WHOLESALE_TYPES.map((t) => t.id) as [string, ...string[]]),
  contactName: z.string().trim().min(2).max(160),
  mobile: z.string().regex(/^09\d{9}$/),
  email: z.string().trim().email().max(180),
  password: z.string().min(8).max(100).optional(),
  city: z.string().trim().min(2).max(80),
  address: z.string().trim().max(500).optional(),
  economicCode: z.string().trim().max(40).optional(),
  monthlyVolume: z.string().trim().max(80).optional(),
  interests: z.string().trim().max(1000).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return csrfRejectedResponse();
  const limited = rateLimit(clientKey(req, "wholesale-register"), 6, 15 * 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);
  if (!isDatabaseConfigured)
    return NextResponse.json({ ok: false, message: "سرویس خرید عمده در دسترس نیست." }, { status: 503 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "اطلاعات ثبت‌نام نامعتبر است." }, { status: 400 });

  try {
    const session = await readSession();
    const customerId = customerIdFromSession(session);
    const sessionCustomer =
      session && customerId != null
        ? { id: customerId, name: session.name, email: session.email, phone: session.phone }
        : undefined;
    const { code } = await registerWholesaleBusiness({ ...parsed.data, sessionCustomer });
    return NextResponse.json({
      ok: true,
      code,
      message: "ثبت‌نام عمده ثبت شد. پس از بررسی و تأیید کارشناس B2B، پنل عمده برای شما فعال می‌شود.",
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "ERROR";
    const map: Record<string, [string, number]> = {
      ALREADY_REGISTERED: ["این شماره قبلاً برای خرید عمده ثبت شده است.", 409],
      ACCOUNT_EXISTS_LOGIN: ["با این شماره حساب کاربری دارید؛ ابتدا وارد شوید و بعد ثبت‌نام عمده را تکمیل کنید.", 409],
      WEAK_PASSWORD: ["رمز عبور باید حداقل ۸ کاراکتر باشد.", 400],
      DATABASE_UNAVAILABLE: ["سرویس در دسترس نیست.", 503],
    };
    const [message, status] = map[code] ?? ["ثبت‌نام عمده انجام نشد.", 500];
    return NextResponse.json({ ok: false, message }, { status });
  }
}
