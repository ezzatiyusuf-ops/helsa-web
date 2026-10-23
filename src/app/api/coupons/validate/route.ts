import { NextResponse } from "next/server";
import { z } from "zod";
import { getCoupons } from "@/services/catalog";
import { assertSameOrigin, clientKey, csrfRejectedResponse, rateLimit, rateLimitedResponse } from "@/lib/security";

const schema = z.object({
  code: z.string().trim().min(2).max(40),
  subtotal: z.number().min(0).max(500_000_000),
});

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return csrfRejectedResponse();
  const limited = rateLimit(clientKey(req, "coupon"), 20, 15 * 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "داده نامعتبر است" }, { status: 400 });

  const { code, subtotal } = parsed.data;
  const coupons = await getCoupons();
  const coupon = coupons.find((c) => c.code.toLowerCase() === code.toLowerCase());
  // Generic failure messaging reduces coupon-oracle abuse.
  if (!coupon || !coupon.active) return NextResponse.json({ ok: false, message: "کد تخفیف معتبر نیست" }, { status: 404 });
  const now = new Date().toISOString().slice(0, 10);
  if (now < coupon.startDate || now > coupon.endDate) return NextResponse.json({ ok: false, message: "کد تخفیف معتبر نیست" }, { status: 404 });
  // fully-redeemed codes must fail here too, not only at order time
  if ((coupon.usedCount ?? 0) >= coupon.usageLimit) return NextResponse.json({ ok: false, message: "کد تخفیف معتبر نیست" }, { status: 404 });
  if (subtotal < coupon.minimumPurchase) {
    return NextResponse.json({
      ok: false,
      message: `حداقل خرید برای این کد ${coupon.minimumPurchase.toLocaleString("fa-IR")} تومان است`,
    });
  }

  return NextResponse.json({
    ok: true,
    message: "کد تخفیف اعمال شد",
    coupon: {
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      minimumPurchase: coupon.minimumPurchase,
      maximumDiscount: coupon.maximumDiscount,
      label: coupon.label,
      // do not leak internal usage counters
    },
  });
}
