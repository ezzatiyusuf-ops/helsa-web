import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { trayQuotes } from "@/db/schema";
import { assertSameOrigin, clientKey, csrfRejectedResponse, rateLimit, rateLimitedResponse } from "@/lib/security";
import { isDatabaseConfigured } from "@/db";
import {
  BUILDER_SIZES,
  BUILDER_BASES,
  BUILDER_CATEGORIES,
  BUILDER_DECOR,
  BUILDER_DELIVERY_ESTIMATE,
  BUILDER_GIFT_WRAP,
  BUILDER_ARRANGEMENT_FEE,
  BUILDER_MESSAGE_FEE,
  BUILDER_DELIVERY_FEE,
  BUILDER_GUEST_MIN,
  BUILDER_GUEST_MAX,
  BUILDER_MIN_ITEMS,
  BUILDER_MAX_PORTIONS,
  BUILDER_MAX_ITEM_QTY,
  BUILDER_TAX_RATE,
  findBuilderItem,
  guestFactor,
} from "@/config/tray-builder";

/**
 * Server-side price authority for the advanced tray builder.
 * The client never computes a trusted price — it only renders this response.
 * The resulting quote id is referenced by the cart key `custom-quote-{id}`
 * and re-resolved (from DB) inside POST /api/orders before persisting.
 */

const itemSchema = z.object({ id: z.string().min(2).max(60), qty: z.number().int().min(1).max(BUILDER_MAX_ITEM_QTY) });

const schema = z.object({
  size: z.string().min(2).max(20),
  base: z.string().min(2).max(20),
  guests: z.number().int().min(BUILDER_GUEST_MIN).max(BUILDER_GUEST_MAX),
  items: z.array(itemSchema).min(1).max(40),
  decor: z.array(z.string().min(2).max(40)).max(10).optional(),
  giftWrap: z.string().min(2).max(20),
  message: z.boolean().optional(),
});

/**
 * GET /api/tray-builder/quote — public builder configuration (sizes, bases,
 * categories, decor, wraps, fees, limits, delivery estimate). Read-only and
 * rate-limited; consumed by the tray-builder UI and the Android client.
 */
export async function GET(req: Request) {
  const limited = rateLimit(clientKey(req, "tray-builder-config"), 30, 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);
  return NextResponse.json({
    ok: true,
    sizes: BUILDER_SIZES,
    bases: BUILDER_BASES,
    categories: BUILDER_CATEGORIES,
    decor: BUILDER_DECOR,
    giftWraps: BUILDER_GIFT_WRAP,
    fees: { arrangement: BUILDER_ARRANGEMENT_FEE, message: BUILDER_MESSAGE_FEE, delivery: BUILDER_DELIVERY_FEE, taxRate: BUILDER_TAX_RATE },
    limits: { guestMin: BUILDER_GUEST_MIN, guestMax: BUILDER_GUEST_MAX, minItems: BUILDER_MIN_ITEMS, maxPortions: BUILDER_MAX_PORTIONS, maxItemQty: BUILDER_MAX_ITEM_QTY },
    deliveryEstimate: BUILDER_DELIVERY_ESTIMATE,
  });
}


export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return csrfRejectedResponse();
  const limited = rateLimit(clientKey(req, "tray-builder-quote"), 30, 15 * 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);
  if (!isDatabaseConfigured)
    return NextResponse.json({ ok: false, message: "برای قیمت‌گذاری سینی اتصال پایگاه داده لازم است." }, { status: 503 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ ok: false, message: "پیکربندی سینی نامعتبر است" }, { status: 400 });
  const s = parsed.data;

  const size = BUILDER_SIZES.find((x) => x.id === s.size);
  const base = BUILDER_BASES.find((x) => x.id === s.base);
  if (!size || !base)
    return NextResponse.json({ ok: false, message: "اندازه یا پایه سینی نامعتبر است" }, { status: 400 });

  // dedupe item ids, keep the max qty per id (defensive; client sends unique ids)
  const byId = new Map<string, number>();
  for (const it of s.items) byId.set(it.id, Math.max(byId.get(it.id) ?? 0, it.qty));
  const entries = [...byId.entries()].map(([id, qty]) => ({ id, qty }));

  const chosen = entries
    .map((e) => ({ item: findBuilderItem(e.id), qty: e.qty }))
    .filter((x): x is { item: NonNullable<ReturnType<typeof findBuilderItem>>; qty: number } => !!x.item);

  const invalidIds = entries.filter((e) => !findBuilderItem(e.id));
  if (invalidIds.length)
    return NextResponse.json({ ok: false, message: "برخی اقلام انتخاب‌شده معتبر نیستند" }, { status: 400 });

  const portions = chosen.reduce((sum, c) => sum + c.qty, 0);
  if (chosen.length < BUILDER_MIN_ITEMS)
    return NextResponse.json(
      { ok: false, message: `برای ساخت سینی حداقل ${BUILDER_MIN_ITEMS.toLocaleString("fa-IR")} قلم متفاوت انتخاب کنید` },
      { status: 400 },
    );
  if (portions > BUILDER_MAX_PORTIONS)
    return NextResponse.json(
      { ok: false, message: `مجموع پورشن‌ها نمی‌تواند بیش از ${BUILDER_MAX_PORTIONS.toLocaleString("fa-IR")} باشد` },
      { status: 400 },
    );

  const decor = BUILDER_DECOR.filter((d) => (s.decor ?? []).includes(d.id));
  const wrap = BUILDER_GIFT_WRAP.find((w) => w.id === s.giftWrap) ?? BUILDER_GIFT_WRAP[0];
  const message = s.message ? BUILDER_MESSAGE_FEE : 0;

  const foodRaw = chosen.reduce((sum, c) => sum + c.item.price * c.qty, 0) * guestFactor(s.guests);
  const food = Math.round(foodRaw / 10_000) * 10_000;

  const lines = [
    { label: `پایه سینی (${size.label} · ${base.label})`, amount: size.base + base.price },
    { label: `مزه‌ها و اقلام (${portions.toLocaleString("fa-IR")} پورشن · ضریب ${s.guests.toLocaleString("fa-IR")} نفر)`, amount: food },
    { label: "چیدمان پایه هلسا", amount: BUILDER_ARRANGEMENT_FEE },
    ...decor.map((d) => ({ label: `تزئین: ${d.label}`, amount: d.price })),
    ...(wrap.price ? [{ label: `بسته‌بندی هدیه: ${wrap.label}`, amount: wrap.price }] : []),
    ...(message ? [{ label: "چاپ کارت پیام اختصاصی", amount: message }] : []),
    { label: "ارسال یخچال‌دار", amount: BUILDER_DELIVERY_FEE },
  ];
  if (BUILDER_TAX_RATE > 0) {
    const subtotal = lines.reduce((sum, l) => sum + l.amount, 0);
    lines.push({ label: `مالیات بر ارزش افزوده (${(BUILDER_TAX_RATE * 100).toLocaleString("fa-IR")}٪)`, amount: Math.round((subtotal * BUILDER_TAX_RATE) / 10_000) * 10_000 });
  }
  const total = lines.reduce((sum, l) => sum + l.amount, 0);

  const config = {
    builder: "advanced",
    size: s.size,
    base: s.base,
    guests: s.guests,
    items: chosen.map((c) => ({ id: c.item.id, label: c.item.label, qty: c.qty })),
    decor: decor.map((d) => d.id),
    giftWrap: wrap.id,
    message: Boolean(s.message),
    sizeLabel: `${size.label} · ${base.label}`,
  };

  let quoteId: number;
  try {
    const inserted = await db.insert(trayQuotes).values({ config, total }).returning({ id: trayQuotes.id });
    quoteId = inserted[0].id;
  } catch {
    return NextResponse.json({ ok: false, message: "برای ثبت سینی سفارشی اتصال پایگاه داده لازم است" }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    quote: { id: quoteId, lines, total, guests: s.guests, sizeLabel: `${size.label} · ${base.label}` },
  });
}
