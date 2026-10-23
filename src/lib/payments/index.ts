import "server-only";
/**
 * HELSA — رجیستری درگاه‌های پرداخت + نهایی‌سازی تراکنش (Part D/H/I).
 *
 * امنیت:
 *  - موفقیت فقط از verify درگاه یا callback امضاشده؛ هرگز از کلاینت/URL.
 *  - نهایی‌سازی اتمی است: payments→paid فقط اگر pending باشد (جلوگیری از
 *    دوباره‌پرداخت/replay) + سفارش paid + فاکتور یکتا + اعلان ادمین + لاگ.
 *  - لاگ‌ها هرگز شامل کد ملی/موبایل نیستند.
 */
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { accountingTransactions, adminNotifications, orders, payments, paymentLogs } from "@/db/schema";
import { ensureInvoiceForOrder } from "@/services/invoicing";
import { zarinpalDriver } from "./zarinpal";
import { simulatorDriver } from "./simulator";
import { snapPayDriver } from "./snappay";
import { digiPayDriver } from "./digipay";
import type { GatewayOrder, PaymentProviderDriver } from "./types";
import { onlineGatewayEnabled, paymentsSandbox } from "@/config/payments";

export type { GatewayOrder, InitiateResult, VerifyResult, PaymentProviderDriver } from "./types";

/** درگاه فعال برای روش پرداخت — سوییچ فقط با env */
export function resolveProvider(method: GatewayOrder["method"]): PaymentProviderDriver | null {
  switch (method) {
    case "online": {
      if (process.env.GATEWAY_PROVIDER === "zarinpal" && process.env.GATEWAY_API_KEY) return zarinpalDriver;
      if (paymentsSandbox()) return simulatorDriver;
      return null;
    }
    case "snappay":
      return process.env.SNAP_PAY_API_KEY || paymentsSandbox() ? snapPayDriver : null;
    case "digipay":
      return process.env.DIGIPAY_API_KEY || paymentsSandbox() ? digiPayDriver : null;
    default:
      return null; // card/cod/wallet → دستی/آینده
  }
}

/** رویداد پرداخت را لاگ می‌کند — بدون دادهٔ حساس */
export async function logPayment(event: string, opts: {
  paymentId?: number | null;
  orderId?: number | null;
  provider?: string | null;
  method?: string | null;
  amount?: number | null;
  authority?: string | null;
  detail?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(paymentLogs).values({
      paymentId: opts.paymentId ?? null,
      orderId: opts.orderId ?? null,
      event: event.slice(0, 40),
      provider: opts.provider ?? null,
      method: opts.method ?? null,
      amount: opts.amount ?? null,
      authority: opts.authority ? opts.authority.slice(0, 160) : null,
      detail: opts.detail ?? {},
    });
  } catch {
    // لاگ هرگز جریان پرداخت را نمی‌شکند
  }
}

export type FinalizeResult = {
  state: "success" | "failed" | "cancelled" | "pending" | "duplicate";
  ref?: string;
  invoiceNumber?: string;
};

/**
 * نهایی‌سازی اتمیک پرداخت موفق — تنها مسیر تبدیل سفارش به «پرداخت‌شده»
 * برای روش‌های آنلاین. برای COD/کارت‌به‌کارت، تأیید دستی ادمین همین تابع
 * را با provider=manual صدا می‌زند.
 */
export async function finalizePaidOrder(
  orderCode: string,
  opts: { provider: string; method: string; ref?: string; authority?: string | null; manualBy?: string },
): Promise<FinalizeResult> {
  const order = (await db.select().from(orders).where(eq(orders.code, orderCode)).limit(1))[0];
  if (!order) return { state: "failed" };

  const result = await db.transaction(async (tx) => {
    // فقط ردیف pending به paid می‌رود → دوباره‌پرداخت/replay غیرممکن است
    const paidRows = await tx
      .update(payments)
      .set({
        status: "paid",
        reference: opts.ref ?? null,
        verifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(payments.orderId, order.id), eq(payments.status, "pending")))
      .returning({ id: payments.id });

    if (!paidRows.length) {
      const existing = (await tx.select({ status: payments.status }).from(payments).where(eq(payments.orderId, order.id)).orderBy(desc(payments.id)).limit(1))[0];
      if (existing?.status === "paid") return { state: "duplicate" as const };
      return { state: "pending" as const };
    }

    await tx
      .update(orders)
      .set({
        paymentStatus: "paid",
        status: order.status === "pending" ? "paid" : order.status,
        paymentReference: opts.ref ?? order.paymentReference,
        paidAt: order.paidAt ?? new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    // هم‌خوانی مالی (Part I): SALE یکتا — reference یکتا از دوباره‌ثبت جلوگیری می‌کند
    // مشارکت حمایتی جدا از فروش: SALE = کالا+ارسال، SUPPORT = مشارکت
    const support = Math.max(0, order.supportContribution ?? 0);
    const sales = Math.max(0, order.total - support);
    if (sales > 0) {
      await tx
        .insert(accountingTransactions)
        .values({
          type: "SALE", amount: sales, description: `فروش سفارش ${order.code}`,
          referenceType: "ORDER", referenceId: order.code, createdBy: opts.manualBy ?? "payment",
        })
        .onConflictDoNothing();
    }
    if (support > 0) {
      await tx
        .insert(accountingTransactions)
        .values({
          type: "SUPPORT", amount: support,
          description: `مشارکت حمایتی داوطلبانه — سفارش ${order.code}`,
          referenceType: "ORDER", referenceId: `${order.code}-SUPPORT`, createdBy: opts.manualBy ?? "payment",
        })
        .onConflictDoNothing();
    }

    return { state: "success" as const, paymentId: paidRows[0].id };
  });

  if (result.state === "success") {
    // فاکتور یکتا + اعلان ادمین (خارج از تراکنشِ بحرانی؛ idempotent)
    const invoice = await ensureInvoiceForOrder(order.id);
    await db.insert(adminNotifications).values({
      kind: "order_paid",
      title: `پرداخت دریافت شد — ${order.code}`,
      body: `سفارش ${order.code} به مبلغ ${order.total.toLocaleString("fa-IR")} تومان${opts.manualBy ? ` (تأیید: ${opts.manualBy})` : ""} پرداخت شد. فاکتور: ${invoice?.number ?? "—"}`,
      href: "/admin/orders",
    });
    await logPayment("verify_success", {
      paymentId: result.paymentId,
      orderId: order.id,
      provider: opts.provider,
      method: opts.method,
      amount: order.total,
      authority: opts.authority,
      detail: { ref: opts.ref, manual: Boolean(opts.manualBy) },
    });
    return { state: "success", ref: opts.ref, invoiceNumber: invoice?.number };
  }
  return result;
}

/** علامت‌گذاری تراکنش ناموفق/لغوش (سفارش pending می‌ماند؛ retry ممکن است) */
export async function markPaymentOutcome(
  orderCode: string,
  status: "failed" | "cancelled",
  opts: { provider: string; method: string; authority?: string | null; detail?: Record<string, unknown> },
): Promise<void> {
  const order = (await db.select({ id: orders.id }).from(orders).where(eq(orders.code, orderCode)).limit(1))[0];
  if (!order) return;
  const rows = await db
    .update(payments)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(payments.orderId, order.id), eq(payments.status, "pending")))
    .returning({ id: payments.id });
  await logPayment(status === "failed" ? "verify_failed" : "payment_cancelled", {
    paymentId: rows[0]?.id ?? null,
    orderId: order.id,
    provider: opts.provider,
    method: opts.method,
    authority: opts.authority,
    detail: opts.detail,
  });
}

export function gatewayAvailableFor(method: GatewayOrder["method"]): boolean {
  if (method === "online") return onlineGatewayEnabled();
  return resolveProvider(method) !== null;
}
