import "server-only";
/**
 * اسنپ‌پی — خرید اقساطی (Part E).
 * دو حالت:
 *  1) واقعی: SNAP_PAY_API_KEY (+ SNAP_PAY_BASE) → قرارداد REST زیر؛
 *     تأیید نهایی فقط از استعلام سرور-به-سرور وضعیت اقساط.
 *  2) Sandbox: PAYMENTS_SANDBOX=1 (بدون کلید) → همان خط لولهٔ واقعی
 *     با درگاه شبیه‌ساز (توکن امضاشده) اجرا می‌شود.
 *
 * قرارداد واقعی (قابل تنظیم با env — مستند در docs/payments-iran.md):
 *   POST {SNAP_PAY_BASE}/api/v1/payment/request  → { payment_token, redirect_url }
 *   GET  {SNAP_PAY_BASE}/api/v1/payment/{token}/status → { status: APPROVED|REJECTED|CANCELLED }
 */
import { makeSimulatedInitiation } from "./simulator";
import type { GatewayOrder, InitiateResult, PaymentProviderDriver, VerifyResult } from "./types";

const SNAP_BASE = process.env.SNAP_PAY_BASE ?? "https://api.snappay.ir";

function configured(): boolean {
  return Boolean(process.env.SNAP_PAY_API_KEY);
}

async function realInitiate(order: GatewayOrder, callbackUrl: string): Promise<InitiateResult> {
  try {
    const res = await fetch(`${SNAP_BASE}/api/v1/payment/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SNAP_PAY_API_KEY}`,
      },
      body: JSON.stringify({
        amount: order.amount,
        callback_url: callbackUrl,
        order_id: order.code,
        installment: true,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const data = (await res.json().catch(() => null)) as { payment_token?: string; redirect_url?: string; message?: string } | null;
    if (!res.ok || !data?.payment_token || !data?.redirect_url) {
      return { ok: false, error: data?.message ?? "اسنپ‌پی درخواست را نپذیرفت." };
    }
    return { ok: true, url: data.redirect_url, authority: data.payment_token, provider: "snappay" };
  } catch {
    return { ok: false, error: "اتصال به اسنپ‌پی برقرار نشد؛ بعداً تلاش کنید." };
  }
}

async function realVerify(order: GatewayOrder, authority: string): Promise<VerifyResult> {
  try {
    const res = await fetch(`${SNAP_BASE}/api/v1/payment/${encodeURIComponent(authority)}/status`, {
      headers: { Authorization: `Bearer ${process.env.SNAP_PAY_API_KEY}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const data = (await res.json().catch(() => null)) as { status?: string; reference?: string } | null;
    if (!res.ok || !data?.status) return { state: "pending" };
    if (data.status === "APPROVED" || data.status === "PAID") return { state: "success", ref: data.reference ?? authority };
    if (data.status === "CANCELLED") return { state: "cancelled" };
    if (data.status === "REJECTED") return { state: "failed" };
    return { state: "pending" };
  } catch {
    return { state: "pending" };
  }
}

export const snapPayDriver: PaymentProviderDriver = {
  id: "snappay",
  label: "اسنپ‌پی (اقساطی)",
  initiate: (order, callbackUrl) =>
    configured() ? realInitiate(order, callbackUrl) : makeSimulatedInitiation("snappay", order, callbackUrl),
  verify: (order, authority) => (configured() ? realVerify(order, authority) : Promise.resolve({ state: "pending" as const })),
  refund: async () => ({ supported: true, message: "لغو اقساط/بازگشت وجه از پنل پذیرندهٔ اسنپ‌پی انجام می‌شود (API cancel آماده اتصال)." }),
};
