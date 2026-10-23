import { NextResponse } from "next/server";
import { z } from "zod";
import { readSession, customerIdFromSession } from "@/lib/session";
import { createWholesaleOrder, getBusinessForCustomer, getWholesaleOrderLines, listWholesaleOrders } from "@/services/wholesale";
import { assertSameOrigin, clientKey, csrfRejectedResponse, rateLimit, rateLimitedResponse } from "@/lib/security";

const orderSchema = z.union([
  z.object({
    items: z.array(z.object({ productId: z.number().int().positive(), qty: z.number().int().positive() })).min(1).max(60),
    note: z.string().trim().max(500).optional(),
  }),
  z.object({ repeatOrderId: z.number().int().positive() }),
]);

export async function GET() {
  const session = await readSession();
  const customerId = customerIdFromSession(session);
  if (!session) return NextResponse.json({ ok: false, message: "ابتدا وارد شوید." }, { status: 401 });
  const business = await getBusinessForCustomer(customerId, session.phone);
  if (!business) return NextResponse.json({ ok: false, message: "حساب عمده یافت نشد." }, { status: 403 });
  const orders = await listWholesaleOrders(business);
  return NextResponse.json({ ok: true, orders });
}

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return csrfRejectedResponse();
  const limited = rateLimit(clientKey(req, "wholesale-order"), 10, 15 * 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);

  const session = await readSession();
  const customerId = customerIdFromSession(session);
  if (!session) return NextResponse.json({ ok: false, message: "ابتدا وارد شوید." }, { status: 401 });
  const business = await getBusinessForCustomer(customerId, session.phone);
  if (!business) return NextResponse.json({ ok: false, message: "حساب عمده یافت نشد." }, { status: 403 });

  const parsed = orderSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ ok: false, message: "سفارش عمده نامعتبر است." }, { status: 400 });

  try {
    // repeat order: lines are re-resolved from the previous wholesale order (server-side)
    let items: { productId: number; qty: number }[];
    let note: string | undefined;
    if ("repeatOrderId" in parsed.data) {
      const lines = await getWholesaleOrderLines(business, parsed.data.repeatOrderId);
      if (!lines) return NextResponse.json({ ok: false, message: "سفارش قبلی یافت نشد." }, { status: 404 });
      items = lines.map((l) => ({ productId: l.productId!, qty: l.qty }));
      note = "تکرار سفارش قبلی";
    } else {
      items = parsed.data.items;
      note = parsed.data.note;
    }

    const result = await createWholesaleOrder(business, { items, note });
    return NextResponse.json({
      ok: true,
      code: result.code,
      subtotal: result.subtotal,
      total: result.total,
      itemCount: result.itemCount,
      message: "سفارش عمده ثبت شد. کارشناس B2B برای صدور فاکتور و هماهنگی پرداخت با شما تماس می‌گیرد.",
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "ERROR";
    const map: Record<string, [string, number]> = {
      NOT_APPROVED: ["حساب عمده شما تأیید نشده است.", 403],
      INVALID_ITEMS: ["اقلام سفارش نامعتبر است.", 400],
      INVALID_QTY: ["حداقل تعداد هر کالا در سفارش عمده ۲ عدد است.", 400],
      PRODUCT_NOT_FOUND: ["برخی اقلام یافت نشدند.", 400],
      OUT_OF_STOCK: ["موجودی برخی اقلام کافی نیست.", 409],
      BELOW_MINIMUM: ["جمع سفارش عمده کمتر از حداقل مجاز است.", 400],
      DATABASE_UNAVAILABLE: ["سرویس در دسترس نیست.", 503],
    };
    const [message, status] = map[code] ?? ["ثبت سفارش عمده انجام نشد.", 500];
    return NextResponse.json({ ok: false, message }, { status });
  }
}
