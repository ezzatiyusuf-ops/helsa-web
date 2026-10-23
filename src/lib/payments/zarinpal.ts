import "server-only";
/**
 * درگاه شاپرکی زرین‌پال (v4) — درایور واقعی.
 * سوییچ از شبیه‌ساز به این درگاه فقط با env است:
 *   GATEWAY_PROVIDER=zarinpal + GATEWAY_API_KEY={merchant_id}
 */
import type { GatewayOrder, InitiateResult, PaymentProviderDriver, VerifyResult } from "./types";

const ZARINPAL_BASE = process.env.GATEWAY_SANDBOX === "1" ? "https://sandbox.zarinpal.com" : "https://payment.zarinpal.com";
const ZARINPAL_STARTPAY =
  process.env.GATEWAY_SANDBOX === "1" ? "https://sandbox.zarinpal.com/pg/StartPay" : "https://www.zarinpal.com/pg/StartPay";
const CURRENCY = (process.env.GATEWAY_CURRENCY ?? "IRT").toUpperCase() === "IRR" ? "IRR" : "IRT";

async function zarinpalRequest(order: GatewayOrder, callbackUrl: string): Promise<InitiateResult> {
  const merchantId = process.env.GATEWAY_API_KEY!;
  let json: unknown;
  try {
    const res = await fetch(`${ZARINPAL_BASE}/pg/v4/payment/request.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        merchant_id: merchantId,
        amount: order.amount,
        currency: CURRENCY,
        description: `سفارش ${order.code} — فروشگاه هلسا`,
        callback_url: callbackUrl,
        metadata: { order_id: order.code, ...(order.mobile ? { mobile: order.mobile } : {}) },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    json = await res.json().catch(() => null);
  } catch {
    return { ok: false, error: "اتصال به درگاه پرداخت برقرار نشد؛ لطفاً چند لحظه بعد دوباره تلاش کنید." };
  }
  const data = (json as { data?: { authority?: string; code?: number } } | null)?.data;
  if (!data?.authority || (data.code !== undefined && data.code !== 100)) {
    return { ok: false, error: "درگاه پرداخت درخواست را نپذیرفت. در صورت کسر مبلغ، طی ۷۲ ساعت بازگشت داده می‌شود." };
  }
  return { ok: true, url: `${ZARINPAL_STARTPAY}/${encodeURIComponent(data.authority)}`, authority: data.authority, provider: "zarinpal" };
}

async function zarinpalVerify(order: GatewayOrder, authority: string): Promise<VerifyResult> {
  const merchantId = process.env.GATEWAY_API_KEY!;
  let json: unknown;
  try {
    const res = await fetch(`${ZARINPAL_BASE}/pg/v4/payment/verify.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      // مبلغ همیشه از سفارش DB (بدون اعتماد به کلاینت)
      body: JSON.stringify({ merchant_id: merchantId, amount: order.amount, currency: CURRENCY, authority }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    json = await res.json().catch(() => null);
  } catch {
    return { state: "pending" }; // خطای شبکه → retry؛ هرگز failed قطعی نمی‌سازیم
  }
  const data = (json as { data?: { code?: number; ref_id?: number | string } } | null)?.data;
  if (data?.code === 100 || data?.code === 101) {
    return { state: "success", ref: data.ref_id !== undefined ? String(data.ref_id) : authority };
  }
  if (data?.code === -503 || data?.code === -504) return { state: "pending" };
  return { state: "failed" };
}

export const zarinpalDriver: PaymentProviderDriver = {
  id: "zarinpal",
  label: "زرین‌پال (شاپرک)",
  initiate: zarinpalRequest,
  verify: zarinpalVerify,
  refund: async () => ({
    supported: true,
    message: "بازگشت وجه زرین‌پال از پنل پذیرندگی (Transaction → Refund) یا API v4 refund انجام می‌شود.",
  }),
};
