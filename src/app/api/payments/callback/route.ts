import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, payments } from "@/db/schema";
import { assertSameOrigin, clientKey, csrfRejectedResponse, rateLimit, rateLimitedResponse } from "@/lib/security";
import { verifyShortToken } from "@/lib/secrets";
import { SIM_AUDIENCE } from "@/lib/payments/simulator";
import { finalizePaidOrder, logPayment, markPaymentOutcome } from "@/lib/payments";

/**
 * POST /api/payments/callback — بازگشت امن از درگاه (Part D).
 *
 * در حالت واقعی، پارامترهای درگاه (Authority/Status) فقط «کلید استعلام» هستند و
 * حقیقت از verify سرور-به-سرور می‌آید (مسیر /api/payments/verify).
 * این نقطهٔ پایانی مخصوص شبیه‌ساز توسعه است: نتیجه فقط از توکن امضاشدهٔ
 * سرور (aud=helsa-pay-sim) پذیرفته می‌شود — جعل/بازپخش غیرممکن است و
 * کل خط لولهٔ واقعی (اتمیک‌بودن، فاکتور، لاگ، replay-block) اجرا می‌شود.
 */
const schema = z.object({
  token: z.string().min(20).max(2000),
  outcome: z.enum(["success", "failed", "cancelled"]),
});

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return csrfRejectedResponse();
  const limited = rateLimit(clientKey(req, "pay-callback"), 30, 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, message: "داده نامعتبر است" }, { status: 400 });

  const payload = await verifyShortToken<{ code?: string; authority?: string; amount?: number; method?: string; provider?: string }>(
    parsed.data.token,
    SIM_AUDIENCE,
  );
  if (!payload?.code || !payload.authority) {
    return Response.json({ ok: false, message: "توکن درگاه نامعتبر یا منقضی است." }, { status: 401 });
  }

  const order = (await db.select().from(orders).where(eq(orders.code, payload.code)).limit(1))[0];
  if (!order) return Response.json({ ok: false, message: "سفارش یافت نشد" }, { status: 404 });

  // تطبیق authority با ردیف پرداختِ همین سفارش (ضد جعل)
  const payRow = (
    await db
      .select()
      .from(payments)
      .where(and(eq(payments.orderId, order.id), eq(payments.authority, payload.authority)))
      .orderBy(desc(payments.id))
      .limit(1)
  )[0];
  if (!payRow) {
    await logPayment("callback_authority_mismatch", { orderId: order.id, method: order.paymentMethod, authority: payload.authority });
    return Response.json({ ok: false, message: "شناسهٔ تراکنش با سفارش هم‌خوان نیست." }, { status: 400 });
  }

  // انقضای تراکنش (timeout handling)
  if (payRow.expiresAt && payRow.expiresAt.getTime() < Date.now() && payRow.status === "pending") {
    await db.update(payments).set({ status: "expired", updatedAt: new Date() }).where(eq(payments.id, payRow.id));
    await logPayment("payment_expired", { paymentId: payRow.id, orderId: order.id, provider: payRow.provider, method: payRow.method, amount: payRow.amount, authority: payload.authority });
    return Response.json({ ok: false, message: "مهلت پرداخت به پایان رسیده است؛ لطفاً دوباره پرداخت را شروع کنید.", state: "expired" }, { status: 409 });
  }

  // دوباره‌پرداخت / بازپخش: اگر قبلاً نهایی شده، وضعیت موجود را صادقانه برگردان
  if (payRow.status === "paid") {
    await logPayment("duplicate_callback_blocked", { paymentId: payRow.id, orderId: order.id, provider: payRow.provider, method: payRow.method, amount: payRow.amount, authority: payload.authority, detail: { attemptedOutcome: parsed.data.outcome } });
    return Response.json({ ok: true, state: "success", duplicate: true, redirect: `/payment/success?code=${encodeURIComponent(order.code)}&state=success` });
  }
  if (payRow.status === "failed" || payRow.status === "cancelled" || payRow.status === "expired") {
    return Response.json({ ok: false, message: "این تراکنش قبلاً بسته شده است؛ برای تلاش مجدد پرداخت را از سفارش شروع کنید.", state: payRow.status }, { status: 409 });
  }

  const provider = payRow.provider ?? payload.provider ?? "sandbox";

  if (parsed.data.outcome === "success") {
    const result = await finalizePaidOrder(order.code, {
      provider,
      method: payRow.method ?? order.paymentMethod ?? "online",
      ref: `SIM-${payRow.id}`,
      authority: payload.authority,
    });
    if (result.state === "success" || result.state === "duplicate") {
      return Response.json({
        ok: true,
        state: "success",
        invoice: result.invoiceNumber,
        redirect: `/payment/success?code=${encodeURIComponent(order.code)}&state=success`,
      });
    }
    return Response.json({ ok: false, message: "نهایی‌سازی پرداخت انجام نشد؛ با پشتیبانی تماس بگیرید.", state: result.state }, { status: 500 });
  }

  await markPaymentOutcome(order.code, parsed.data.outcome, {
    provider,
    method: payRow.method ?? order.paymentMethod ?? "online",
    authority: payload.authority,
    detail: { simulator: true },
  });
  return Response.json({
    ok: true,
    state: parsed.data.outcome,
    redirect: `/payment/failed?code=${encodeURIComponent(order.code)}`,
  });
}
