import "server-only";
/**
 * HELSA payment facade — لایهٔ سازگاری برای importهای قبلی.
 * منطق واقعی در src/lib/payments/* lives (رجیستری چند-درگاهی).
 */
import { resolveProvider } from "./payments";
import type { GatewayOrder, InitiateResult, VerifyResult } from "./payments";
import { PAY_STATES } from "@/config/payments";
import type { PayState } from "@/config/payments";

export type { GatewayOrder as PaymentOrder } from "./payments";
export type GatewayRedirect = InitiateResult;

export async function buildGatewayRedirect(order: GatewayOrder, callbackUrl: string): Promise<GatewayRedirect> {
  const provider = resolveProvider(order.method);
  if (!provider) return { ok: false, error: "درگاه پرداخت پیکربندی نشده است." };
  return provider.initiate(order, callbackUrl);
}

export async function verifyPaymentServerSide(order: GatewayOrder, remoteRef?: string): Promise<{ state: PayState; ref?: string }> {
  if (order.method === "card" || order.method === "cod") return { state: "pending" };
  const provider = resolveProvider(order.method);
  if (!provider) return { state: "unconfigured" };
  if (!remoteRef) return { state: "pending" };
  const r: VerifyResult = await provider.verify(order, remoteRef);
  return { state: r.state, ref: r.ref };
}

export function paymentStateLabel(state: PayState): string {
  return PAY_STATES[state] ?? state;
}
