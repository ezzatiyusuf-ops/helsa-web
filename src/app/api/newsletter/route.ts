import { NextResponse } from "next/server";
import { z } from "zod";
import { db, isDatabaseConfigured } from "@/db";
import { contactMessages, coupons } from "@/db/schema";
import { assertSameOrigin, clientKey, csrfRejectedResponse, rateLimit, rateLimitedResponse } from "@/lib/security";

/**
 * POST /api/newsletter — عضویت در خبرنامه + صدور کوپن واقعیِ اولین خرید (CRO).
 * کوپنِ fixed با پشتوانهٔ واقعی در جدول coupons ثبت می‌شود (نه کد جعلی):
 * ۲۰۰٬۰۰۰ تومان تخفیف، حداقل خرید ۱٬۰۰۰٬۰۰۰ تومان، اعتبار ۳۰ روز، یک‌بار مصرف.
 * همان گاردهای امنیتی فرم تماس: same-origin + rate-limit + zod.
 */
const schema = z
  .object({
    email: z.string().email().max(180).optional().or(z.literal("")),
    mobile: z.string().regex(/^09\d{9}$/).optional().or(z.literal("")),
  })
  .refine((d) => Boolean(d.email) || Boolean(d.mobile), { message: "ایمیل یا شماره موبایل معتبر وارد کنید." });

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const genCode = () =>
  "WELCOME-" +
  Array.from({ length: 4 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return csrfRejectedResponse();
  const limited = rateLimit(clientKey(req, "newsletter"), 5, 15 * 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);
  if (!isDatabaseConfigured) return NextResponse.json({ ok: false, message: "سرویس خبرنامه در دسترس نیست." }, { status: 503 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "داده نامعتبر" }, { status: 400 });
  }
  const { email, mobile } = parsed.data;

  try {
    // ثبت درخواست در پیام‌های پنل ادمین (همان جدول فرم تماس)
    await db.insert(contactMessages).values({
      name: "عضو خبرنامه (صفحهٔ اصلی)",
      mobile: mobile || "",
      email,
      subject: "عضویت در خبرنامهٔ هلسا + کوپن اولین خرید",
      message: `عضویت در خبرنامه از فرم صفحهٔ اصلی — ایمیل: ${email || "—"} | موبایل: ${mobile || "—"}`,
    });
  } catch {
    return NextResponse.json({ ok: false, message: "ثبت عضویت ممکن نشد؛ بعداً تلاش کنید." }, { status: 500 });
  }

  // صدور کوپن واقعی اولین خرید
  const start = new Date();
  const end = new Date(Date.now() + 30 * 86_400_000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const code = genCode();
      await db.insert(coupons).values({
        code,
        type: "fixed",
        value: 200_000,
        minimumPurchase: 1_000_000,
        maximumDiscount: null,
        startDate: iso(start),
        endDate: iso(end),
        usageLimit: 1,
        usedCount: 0,
        active: true,
        label: "هدیهٔ اولین خرید — ویژهٔ خبرنامهٔ هلسا",
      });
      return NextResponse.json({ ok: true, code, message: "عضویت ثبت شد؛ کد تخفیف اولین خرید شما آماده است." });
    } catch {
      // احتمال تصادم کد — تلاش مجدد
    }
  }
  return NextResponse.json({ ok: true, code: null, message: "عضویت شما ثبت شد." });
}
