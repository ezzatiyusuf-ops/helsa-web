import { NextResponse } from "next/server";
import { clientKey, rateLimit, rateLimitedResponse } from "@/lib/security";
import { paymentMethodsFor } from "@/config/payments";
import { cardTransferSettings } from "@/config/card-transfer";

/**
 * GET /api/payments/methods?total=&province= — روش‌های پرداخت + واجدین بودن.
 * عمومی و بدون دادهٔ حساس؛ سرور مرجع نهایی واجدین بودن در ثبت سفارش است.
 */
export async function GET(req: Request) {
  const limited = rateLimit(clientKey(req, "pay-methods"), 30, 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);
  const url = new URL(req.url);
  const total = Math.max(0, Number(url.searchParams.get("total") ?? 0) || 0);
  const province = url.searchParams.get("province");
  const card = cardTransferSettings();
  const methods = paymentMethodsFor({ total, province, nidVerified: true }).map((m) =>
    m.id === "card"
      ? { ...m, enabled: m.enabled && card.enabled, disabledReason: m.enabled && !card.enabled ? card.disabledReason : m.disabledReason }
      : m,
  );
  return NextResponse.json(
    { ok: true, sandbox: process.env.PAYMENTS_SANDBOX === "1", methods },
    { headers: { "Cache-Control": "no-store" } },
  );
}
