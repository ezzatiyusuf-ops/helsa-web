import { NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, isDatabaseConfigured } from "@/db";
import { customers, orderItems, orders, reviews } from "@/db/schema";
import { readSession } from "@/lib/session";
import { assertSameOrigin, clientKey, csrfRejectedResponse, rateLimit, rateLimitedResponse } from "@/lib/security";
import { consumeOtpChallenge } from "@/lib/identity";
import { toEnglishDigits } from "@/lib/nid";

/**
 * ثبت نظر — دو مسیر:
 *  ۱) کاربر واردشده: هویت از نشست (author از سشن، معتبر).
 *  ۲) مهمان: با تأیید مالکیت موبایل از طریق کد یک‌بارمصرف (OTP) — بدون ساخت حساب.
 *     اگر شمارهٔ تأییدشده با سفارش واقعیِ شامل همین محصول بخورد، نظر نشان
 *     «خریدار تأییدشده» می‌گیرد. همهٔ نظرها همچنان پیش از نمایش بازبینی می‌شوند.
 */
const clean = (s: string) => s.replace(/[<>\u0000-\u001f]/g, "");
const schema = z.object({
  productId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().transform(clean).pipe(z.string().min(2).max(120)),
  text: z.string().trim().transform(clean).pipe(z.string().min(5).max(1000)),
  // author from client is ignored for logged-in users; for guests a nickname is allowed
  author: z.string().trim().transform(clean).pipe(z.string().min(2).max(60)).optional(),
  // Guest flow — phone ownership proof
  phone: z.string().regex(/^09\d{9}$/).optional(),
  otpCode: z.string().regex(/^\d{4,8}$/).optional(),
});

/** آیا این شماره/حساب، سفارشِ شامل این محصول دارد؟ */
async function hasPurchased(input: { customerId?: number | null; phone?: string | null; productId: number }): Promise<boolean> {
  try {
    const conds = [];
    if (input.customerId) {
      const own = await db.select({ id: orders.id }).from(orders).where(eq(orders.customerId, input.customerId)).limit(20);
      if (own.length) {
        const ids = own.map((o) => o.id);
        const hit = await db
          .select({ id: orderItems.id })
          .from(orderItems)
          .where(and(inArray(orderItems.orderId, ids), eq(orderItems.productId, input.productId)))
          .limit(1);
        if (hit.length) return true;
      }
    }
    if (input.phone) {
      const hit = await db
        .select({ id: orderItems.id })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(and(sql`${orders.customer}->>'phone' = ${input.phone}`, eq(orderItems.productId, input.productId)))
        .limit(1);
      if (hit.length) return true;
    }
  } catch {
    /* تصمیم نمایش نشان نباید ثبت نظر را بشکند */
  }
  return false;
}

/**
 * GET /api/reviews?productId=N — نظرات تأییدشدهٔ یک محصول (برای نمایش در صفحهٔ محصول).
 * فقط ردیف‌های is_approved=true برگردانده می‌شوند؛ نمرهٔ کل و شمار نظرات کارت‌ها
 * از رکورد خودِ محصول می‌آیند (منبع واحد: products.rating / products.reviews).
 */
export async function GET(req: Request) {
  const limited = rateLimit(clientKey(req, "reviews-get"), 30, 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);
  if (!isDatabaseConfigured) return NextResponse.json({ ok: false, message: "سرویس نظرات در دسترس نیست." }, { status: 503 });
  const productId = Number(new URL(req.url).searchParams.get("productId"));
  if (!Number.isInteger(productId) || productId <= 0) {
    return NextResponse.json({ ok: false, message: "شناسهٔ محصول نامعتبر است." }, { status: 400 });
  }
  try {
    const rows = await db
      .select({
        id: reviews.id,
        author: reviews.author,
        rating: reviews.rating,
        title: reviews.title,
        text: reviews.text,
        verifiedPurchase: reviews.verifiedPurchase,
        createdAt: reviews.createdAt,
      })
      .from(reviews)
      .where(and(eq(reviews.productId, productId), eq(reviews.isApproved, true)))
      .orderBy(desc(reviews.createdAt))
      .limit(50);
    return NextResponse.json({
      ok: true,
      reviews: rows.map((r) => ({
        id: String(r.id),
        name: r.author?.trim() || "خریدار هلسا",
        date: r.createdAt?.toISOString() ?? "",
        rating: r.rating,
        title: r.title,
        text: r.text,
        verifiedPurchase: r.verifiedPurchase ?? false,
      })),
    });
  } catch (err) {
    console.error("[api/reviews] GET failed:", err);
    return NextResponse.json({ ok: false, message: "خواندن نظرات انجام نشد." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return csrfRejectedResponse();
  const limited = rateLimit(clientKey(req, "reviews"), 10, 15 * 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);
  if (!isDatabaseConfigured) return NextResponse.json({ ok: false, message: "سرویس نظرات در دسترس نیست." }, { status: 503 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "متن نظر نامعتبر است" }, { status: 400 });

  const session = await readSession();
  const d = parsed.data;

  let customerId: number | null = null;
  let author: string;
  let verifiedPhone: string | null = null;

  if (session) {
    author = session.name || "مشتری هلسا";
    if (session.sub.startsWith("customer:")) {
      customerId = Number(session.sub.split(":")[1]) || null;
    } else if (session.email) {
      const row = (await db.select({ id: customers.id, phone: customers.phone }).from(customers).where(eq(customers.email, session.email.toLowerCase())).limit(1))[0];
      customerId = row?.id ?? null;
      verifiedPhone = row?.phone ?? null;
    }
  } else {
    // مسیر مهمان — OTP الزامی است
    const phone = toEnglishDigits(d.phone ?? "");
    const code = toEnglishDigits(d.otpCode ?? "");
    if (!/^09\d{9}$/.test(phone) || !/^\d{4,8}$/.test(code)) {
      return NextResponse.json(
        { ok: false, message: "برای ثبت نظر بدون حساب، شمارهٔ موبایل و کد تأیید یک‌بارمصرف لازم است." },
        { status: 401 },
      );
    }
    const otpOk = await consumeOtpChallenge(phone, code).catch(() => false);
    if (!otpOk) {
      return NextResponse.json({ ok: false, message: "کد تأیید نامعتبر یا منقضی است؛ دوباره کد دریافت کنید." }, { status: 401 });
    }
    verifiedPhone = phone;
    author = d.author?.trim() || "مشتری هلسا";
  }

  const verifiedPurchase = await hasPurchased({ customerId, phone: verifiedPhone, productId: d.productId });

  try {
    await db.insert(reviews).values({
      productId: d.productId,
      customerId,
      author,
      rating: d.rating,
      title: d.title,
      text: d.text,
      isApproved: false,
      verifiedPhone,
      verifiedPurchase,
    });
  } catch (e) {
    // لاگ بدون دادهٔ حساس — فقط نوع/قید خطا برای دیباگ
    const err = e as { code?: string; constraint?: string; message?: string };
    console.error("[reviews] insert failed:", err.code, err.constraint, (err.message ?? "").slice(0, 120));
    return NextResponse.json({ ok: false, message: "ثبت نظر ممکن نشد." }, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    verifiedPurchase,
    message: verifiedPurchase
      ? "نظر شما ثبت شد (خریدار تأییدشده)؛ پس از بررسی نمایش داده می‌شود."
      : "نظر شما ثبت شد؛ پس از بررسی نمایش داده می‌شود.",
  });
}
