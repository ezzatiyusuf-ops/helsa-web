import "server-only";
/**
 * دیجی‌پی — درگاه ماژولار (Part F).
 * قرارداد رسمی مستندات پذیرندگان (mydigipay.com/developers/docs/upg):
 *   1) لاگین:   POST {base}/oauth/token
 *      form-data: username, password, grant_type=password
 *      header: Authorization: Basic base64(client_id:client_secret)
 *      → { access_token, refresh_token, expires_in }
 *   2) تیکت خرید: POST {base}/tickets/business?type=11
 *      headers: Agent: WEB, Digipay-Version: 2022-02-02, Authorization: Bearer …
 *      body: { amount, cellNumber, providerId(=کد سفارش ما), callbackUrl }
 *      → { result:{status:0}, ticket, redirectUrl }
 *   3) نتیجه پرداخت: POST به callbackUrl پذیرنده
 *      { amount, providerId, trackingCode, rrn?, result: SUCCESS|FAILURE, type }
 *   4) تأیید پرداخت (الزامی — وگرنه خودکار مرجوع می‌شود):
 *      POST {base}/purchases/verify?type={type}  body: { trackingCode, providerId }
 *      ⚠️ طبق مستند: قبل از تأیید، amount و providerId را با تراکنش خود تطبیق دهید.
 *
 * بدون کلید پذیرنده و با PAYMENTS_SANDBOX=1 → همان خط لوله با شبیه‌ساز امن.
 */
import { makeSimulatedInitiation } from "./simulator";
import type { GatewayOrder, InitiateResult, PaymentProviderDriver, VerifyResult } from "./types";

const DIGIPAY_BASE = process.env.DIGIPAY_BASE ?? "https://api.mydigipay.com/digipay/api";
const DIGIPAY_VERSION = process.env.DIGIPAY_VERSION ?? "2022-02-02";

function configured(): boolean {
  return Boolean(process.env.DIGIPAY_USERNAME && process.env.DIGIPAY_PASSWORD && process.env.DIGIPAY_CLIENT_ID && process.env.DIGIPAY_CLIENT_SECRET);
}

/** توکن دسترسی پذیرنده — طبق قرارداد oauth2 (grant_type=password + Basic) */
async function accessToken(): Promise<string | null> {
  try {
    const basic = Buffer.from(`${process.env.DIGIPAY_CLIENT_ID}:${process.env.DIGIPAY_CLIENT_SECRET}`).toString("base64");
    const res = await fetch(`${DIGIPAY_BASE}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${basic}` },
      body: new URLSearchParams({ username: process.env.DIGIPAY_USERNAME!, password: process.env.DIGIPAY_PASSWORD!, grant_type: "password" }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const data = (await res.json().catch(() => null)) as { access_token?: string } | null;
    return res.ok ? (data?.access_token ?? null) : null;
  } catch {
    return null;
  }
}

async function realInitiate(order: GatewayOrder, callbackUrl: string): Promise<InitiateResult> {
  const token = await accessToken();
  if (!token) return { ok: false, error: "احراز پذیرندگی دیجی‌پی ناموفق بود." };
  try {
    const res = await fetch(`${DIGIPAY_BASE}/tickets/business?type=11`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        Authorization: `Bearer ${token}`,
        Agent: "WEB",
        "Digipay-Version": DIGIPAY_VERSION,
      },
      // providerId = کد یکتای سفارش ما؛ مبلغ همیشه از DB
      body: JSON.stringify({
        amount: order.amount,
        cellNumber: order.mobile ?? "",
        providerId: order.code,
        callbackUrl,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const data = (await res.json().catch(() => null)) as {
      result?: { status?: number; message?: string };
      ticket?: string;
      redirectUrl?: string;
    } | null;
    if (!res.ok || data?.result?.status !== 0 || !data?.ticket || !data?.redirectUrl) {
      return { ok: false, error: data?.result?.message ?? "دیجی‌پی درخواست را نپذیرفت." };
    }
    return { ok: true, url: data.redirectUrl, authority: data.ticket, provider: "digipay" };
  } catch {
    return { ok: false, error: "اتصال به دیجی‌پی برقرار نشد؛ بعداً تلاش کنید." };
  }
}

/**
 * تأیید سرور-به-سرور (purchases/verify).
 * طبق مستند دیجی‌پی، trackingCode+providerId از «نتیجه پرداخت» می‌آید؛
 * ما authority (ticket) را از ردیف payments و providerId را از کد سفارش می‌خوانیم
 * تا هیچ ورودی کلاینت مبنای تأیید نباشد.
 */
async function realVerify(order: GatewayOrder, authority: string): Promise<VerifyResult> {
  const token = await accessToken();
  if (!token) return { state: "pending" };
  try {
    const res = await fetch(`${DIGIPAY_BASE}/purchases/verify?type=11`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ trackingCode: authority, providerId: order.code }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const data = (await res.json().catch(() => null)) as { result?: { status?: number; message?: string }; trackingCode?: string; amount?: number } | null;
    if (!res.ok || !data?.result) return { state: "pending" };
    if (data.result.status === 0) {
      // دفاع عمیق: مبلغ برگشتی باید با سفارش DB بخواند (ضد دستکاری)
      if (typeof data.amount === "number" && data.amount !== order.amount) return { state: "failed" };
      return { state: "success", ref: data.trackingCode ?? authority };
    }
    return { state: "failed" };
  } catch {
    return { state: "pending" };
  }
}

export const digiPayDriver: PaymentProviderDriver = {
  id: "digipay",
  label: "دیجی‌پی",
  initiate: (order, callbackUrl) =>
    configured() ? realInitiate(order, callbackUrl) : makeSimulatedInitiation("digipay", order, callbackUrl),
  verify: (order, authority) => (configured() ? realVerify(order, authority) : Promise.resolve({ state: "pending" as const })),
  refund: async () => ({
    supported: true,
    message: "بازگشت وجه از سرویس refunds دیجی‌پی (§۸ مستندات — خرید به‌صورت دستی) با همان access_token پذیرنده.",
  }),
};
