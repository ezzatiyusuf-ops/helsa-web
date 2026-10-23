import "server-only";
/**
 * شبیه‌ساز درگاه — «حالت امن توسعه» (Part D).
 * فقط وقتی PAYMENTS_SANDBOX=1 فعال است؛ در پروداکشن هرگز.
 * کل خط لولهٔ امنیتی (توکن امضاشده، callback، جلوگیری از دوباره‌پرداخت،
 * فاکتور، لاگ) واقعی است — فقط «درگاه بیرونی» شبیه‌سازی می‌شود.
 */
import { signShortToken } from "@/lib/secrets";
import type { GatewayOrder, InitiateResult, PaymentProviderDriver, VerifyResult } from "./types";

export const SIM_AUDIENCE = "helsa-pay-sim";
export const SIM_TTL_SECONDS = 15 * 60; // هم‌اندازهٔ انقضای تراکنش

function originOf(callbackUrl: string): string {
  try {
    return new URL(callbackUrl).origin;
  } catch {
    return "";
  }
}

export interface SimTokenPayload {
  code: string;
  authority: string;
  amount: number;
  method: string;
  provider: string;
}

export async function signSimToken(payload: SimTokenPayload): Promise<string> {
  return signShortToken(payload, SIM_AUDIENCE, SIM_TTL_SECONDS);
}

export async function makeSimulatedInitiation(
  providerId: string,
  order: GatewayOrder,
  callbackUrl: string,
): Promise<InitiateResult> {
  const authority = `${providerId.toUpperCase()}-${crypto.randomUUID().slice(0, 13).toUpperCase()}`;
  const token = await signSimToken({
    code: order.code,
    authority,
    amount: order.amount,
    method: order.method,
    provider: providerId,
  });
  const base = originOf(callbackUrl);
  if (!base) return { ok: false, error: "خطای پیکربندی callback." };
  return {
    ok: true,
    url: `${base}/payment/simulator?token=${encodeURIComponent(token)}`,
    authority,
    provider: `${providerId}-sandbox`,
    expiresAt: new Date(Date.now() + SIM_TTL_SECONDS * 1000),
  };
}

export const simulatorDriver: PaymentProviderDriver = {
  id: "simulator",
  label: "شبیه‌ساز درگاه (توسعه)",
  initiate: (order, callbackUrl) => makeSimulatedInitiation("sim", order, callbackUrl),
  // در شبیه‌ساز، وضعیت نهایی فقط از مسیر callback امضاشده می‌آید؛
  // این تابع صادقانه pending برمی‌گرداند تا هیچ موفقیتی جعل نشود.
  verify: async () => ({ state: "pending" as const }),
};
