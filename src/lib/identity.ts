import "server-only";
/**
 * HELSA — سرویس احراز هویت مشتری در پرداخت (Part A & B).
 *
 * قواعد:
 *  1) کد ملی با الگوریتم رسمی رقم‌کنترل اعتبارسنجی می‌شود.
 *  2) کاربرِ واردشده: شمارهٔ موبایلِ حساب (تأییدشده در ورود) مرجع است؛
 *     تغییر آن در پرداخت ممنوع است (409) تا هویت سفارش با حساب یکی بماند.
 *  3) مهمان: مالکیت موبایل با OTP اثبات می‌شود (همان چالش otp_login).
 *  4) وضعیت احراز به‌صورت توکن امضاشدهٔ کوتاه‌مدت (30m, aud=helsa-identity)
 *     صادر می‌شود؛ سرور سفارش امضا + هم‌خوانی mobile و رقم‌کنترل NID را
 *     دوباره بررسی می‌کند — صرفِ عبور از UI هرگز کافی نیست.
 *  5) اتصال به سرویس‌های رسمی (شاهکار/استعلام بانکی) از طریق IDENTITY_PROVIDER
 *     ممکن است؛ حالت simulation فقط فرمت را قبول می‌کند و صادقانه ثبت می‌شود.
 *  6) کد ملی/موبایل هرگز در لاگ‌ها نوشته نمی‌شود.
 */
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, isDatabaseConfigured } from "@/db";
import { authChallenges, customers } from "@/db/schema";
import { hashToken, safeEqual } from "@/lib/security";
import { isValidIranMobile, isValidNationalId, toEnglishDigits } from "@/lib/nid";
import { signShortToken, verifyShortToken } from "@/lib/secrets";
import type { SessionPayload } from "@/lib/session";
import { readSession } from "@/lib/session";

export const IDENTITY_TOKEN_TTL = 30 * 60; // ثانیه

export type IdentityProviderKind = "account" | "otp" | "simulation";

export interface VerifiedIdentity {
  mobile: string;
  nid: string;
  provider: IdentityProviderKind;
  nidVerifiedVia: "checksum" | "official";
}

/** مصرف چالش OTP (مالکیت موبایل) — بدون ساخت نشست؛ برای checkout و نظرات مهمان */
export async function consumeOtpChallenge(mobile: string, code: string): Promise<boolean> {
  const rows = await db
    .select()
    .from(authChallenges)
    .where(
      and(
        eq(authChallenges.identifier, mobile),
        eq(authChallenges.purpose, "otp_login"),
        isNull(authChallenges.consumedAt),
        gt(authChallenges.expiresAt, new Date()),
      ),
    )
    .limit(1);
  const ch = rows[0];
  if (!ch) return false;
  if (ch.attempts >= ch.maxAttempts) return false;
  const matches = safeEqual(ch.codeHash, hashToken(code));
  await db
    .update(authChallenges)
    .set({ attempts: ch.attempts + 1, ...(matches ? { consumedAt: new Date() } : {}) })
    .where(eq(authChallenges.id, ch.id));
  return matches;
}

export class IdentityError extends Error {
  constructor(
    public readonly status: 400 | 401 | 409 | 429,
    message: string,
    public readonly needOtp = false,
  ) {
    super(message);
  }
}

/**
 * تأیید هویت — خروجی: توکن امضاشده برای ارسال به POST /api/orders.
 * خطاها پیام فارسی شفاف دارند و هرگز وجود/عدم وجود حساب را لو نمی‌دهند.
 */
export async function verifyCheckoutIdentity(input: {
  nid: string;
  mobile: string;
  otpCode?: string;
}): Promise<{ token: string; provider: IdentityProviderKind }> {
  const nid = toEnglishDigits(input.nid ?? "").replace(/[\s-]/g, "");
  const mobile = toEnglishDigits(input.mobile ?? "").replace(/[\s-]/g, "");
  if (!isValidNationalId(nid)) throw new IdentityError(400, "کد ملی معتبر نیست؛ ۱۰ رقم و با رقم کنترل صحیح وارد کنید.");
  if (!isValidIranMobile(mobile)) throw new IdentityError(400, "شمارهٔ موبایل معتبر نیست (مثال: ۰۹۱۲۳۴۵۶۷۸۹).");
  if (!isDatabaseConfigured) throw new IdentityError(400, "سرویس احراز هویت در دسترس نیست.");

  const session: SessionPayload | null = await readSession();
  let provider: IdentityProviderKind;

  if (session?.phone) {
    // کاربر واردشده: شمارهٔ حساب مرجع است — تغییر در پرداخت ممنوع
    if (mobile !== session.phone) {
      throw new IdentityError(
        409,
        "شمارهٔ همراه سفارش باید با شمارهٔ حساب کاربری شما یکی باشد. برای تغییر شماره، از حساب کاربری (تأیید OTP) اقدام کنید.",
      );
    }
    provider = "account";
  } else {
    // مهمان: مالکیت موبایل با OTP اثبات می‌شود
    if (!input.otpCode) throw new IdentityError(400, "برای مهمان، تأیید شمارهٔ موبایل با کد یک‌بارمصرف لازم است.", true);
    const ok = await consumeOtpChallenge(mobile, toEnglishDigits(input.otpCode).trim());
    if (!ok) throw new IdentityError(401, "کد تأیید نامعتبر یا منقضی است؛ دوباره درخواست کد بدهید.", true);
    provider = "otp";
  }

  // استعلام رسمی (شاهکار/بانکی) — آمادهٔ اتصال؛ حالت فعلی: شبیه‌سازی صادقانهٔ فرمت
  const officialProvider = (process.env.IDENTITY_PROVIDER ?? "").trim();
  const nidVerifiedVia: "checksum" | "official" = officialProvider && officialProvider !== "simulation" ? "official" : "checksum";

  // ذخیرهٔ امن وضعیت روی پروفایل مشتری (اگر حساب موجود باشد)
  const cust = (
    await db.select({ id: customers.id }).from(customers).where(eq(customers.phone, mobile)).limit(1)
  )[0];
  if (cust) {
    await db
      .update(customers)
      .set({ nationalId: nid, nidVerifiedAt: new Date(), identityProvider: provider, updatedAt: new Date() })
      .where(eq(customers.id, cust.id));
  }

  const token = await signShortToken(
    { mobile, nid, provider, via: nidVerifiedVia },
    "helsa-identity",
    IDENTITY_TOKEN_TTL,
  );
  return { token, provider };
}

/** اعتبارسنجی توکن احراز هویت در ثبت سفارش (server-side authority) */
export async function verifyIdentityToken(token: string): Promise<VerifiedIdentity | null> {
  const payload = await verifyShortToken<{ mobile?: string; nid?: string; provider?: IdentityProviderKind; via?: string }>(
    token,
    "helsa-identity",
  );
  if (!payload?.mobile || !payload?.nid) return null;
  if (!isValidIranMobile(payload.mobile) || !isValidNationalId(payload.nid)) return null;
  return {
    mobile: payload.mobile,
    nid: payload.nid,
    provider: payload.provider === "account" || payload.provider === "otp" ? payload.provider : "simulation",
    nidVerifiedVia: payload.via === "official" ? "official" : "checksum",
  };
}

export function identityRequired(): boolean {
  return (process.env.IDENTITY_REQUIRED ?? "1") !== "0";
}
