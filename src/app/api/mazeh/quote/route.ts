import { NextResponse } from "next/server";
import { z } from "zod";
import { TRAY_SIZES, TRAY_BASES, MAZEH_OPTIONS, GUEST_OPTIONS, OCCASIONS, DECORATION_FEE, DELIVERY_FEE } from "@/config/mazeh";
import { db } from "@/db";
import { trayQuotes } from "@/db/schema";
import { assertSameOrigin, clientKey, csrfRejectedResponse, rateLimit, rateLimitedResponse } from "@/lib/security";
import { isDatabaseConfigured } from "@/db";

/**
 * Server-side price authority for the "build your own tray" feature.
 * The client never computes a trusted price — it only renders this response.
 */
const DECOR_OPTIONS: { id: string; label: string; price: number }[] = [
  { id: "medallion", label: "مدالیون طلای هلسا", price: 50_000 },
  { id: "flower", label: "گل طبیعی", price: 100_000 },
  { id: "candles", label: "شمع معطر", price: 80_000 },
];
const MESSAGE_FEE = 30_000;

const schema = z.object({
  size: z.string(),
  base: z.string(),
  savory: z.array(z.string()),
  sweet: z.array(z.string()),
  nuts: z.array(z.string()),
  fruit: z.array(z.string()),
  guests: z.number().int().min(2).max(60),
  occasion: z.string(),
  decor: z.array(z.string()).optional(),
  message: z.boolean().optional(),
});

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return csrfRejectedResponse();
  const limited = rateLimit(clientKey(req, "mazeh-quote"), 20, 15 * 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);
  if (!isDatabaseConfigured) return NextResponse.json({ ok: false, message: "برای قیمت‌گذاری سینی اتصال پایگاه داده لازم است." }, { status: 503 });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, message: "پیکربندی سینی نامعتبر است" }, { status: 400 });
  const s = parsed.data;

  const size = TRAY_SIZES.find((x) => x.id === s.size);
  const base = TRAY_BASES.find((x) => x.id === s.base);
  if (!size || !base) return NextResponse.json({ ok: false, message: "اندازه یا پایه سینی نامعتبر است" }, { status: 400 });
  if (!GUEST_OPTIONS.includes(s.guests as (typeof GUEST_OPTIONS)[number]) && s.guests > 30)
    return NextResponse.json({ ok: false, message: "تعداد مهمان نامعتبر است" }, { status: 400 });
  if (!OCCASIONS.includes(s.occasion)) return NextResponse.json({ ok: false, message: "مناسبت نامعتبر است" }, { status: 400 });

  const pick = (ids: string[], group: string) =>
    ids.map((id) => MAZEH_OPTIONS.find((o) => o.id === id && o.group === group)).filter((o): o is (typeof MAZEH_OPTIONS)[number] => !!o);

  const savory = pick(s.savory, "savory");
  const sweet = pick(s.sweet, "sweet");
  const nuts = pick(s.nuts, "nuts");
  const fruit = pick(s.fruit, "fruit");
  const chosen = [...savory, ...sweet, ...nuts, ...fruit];
  if (chosen.length < 4) return NextResponse.json({ ok: false, message: "برای ساخت سینی حداقل ۴ قلم مزه انتخاب کنید" }, { status: 400 });

  // guest factor scales food volume
  const guestFactor = 0.6 + s.guests * 0.09;
  const foodRaw = chosen.reduce((sum, o) => sum + o.price, 0) * guestFactor;
  const food = Math.round(foodRaw / 10000) * 10000;
  const decoration = DECORATION_FEE;
  const delivery = DELIVERY_FEE;

  const decorChosen = (s.decor ?? []).map((id) => DECOR_OPTIONS.find((d) => d.id === id)).filter(Boolean);
  const decorPrice = decorChosen.reduce((sum, d) => sum + (d as (typeof DECOR_OPTIONS)[number]).price, 0);
  const messagePrice = s.message ? MESSAGE_FEE : 0;

  const total = size.base + base.price + food + decoration + decorPrice + messagePrice + delivery;

  const lines = [
    { label: `پایه سینی (${size.label} · ${base.label})`, amount: size.base + base.price },
    { label: `مزه‌ها و مغزها (${chosen.length.toLocaleString("fa-IR")} قلم · ضریب ${s.guests.toLocaleString("fa-IR")} نفر)`, amount: food },
    { label: "چیدمان پایه هلسا", amount: decoration },
    ...decorChosen.map((d) => ({ label: `تزئین: ${(d as (typeof DECOR_OPTIONS)[number]).label}`, amount: (d as (typeof DECOR_OPTIONS)[number]).price })),
    ...(messagePrice ? [{ label: "چاپ کارت پیام اختصاصی", amount: messagePrice }] : []),
    { label: "ارسال یخچال‌دار", amount: delivery },
  ];

  let quoteId: number | undefined;
  try {
    const inserted = await db.insert(trayQuotes).values({ config: s as unknown as Record<string, unknown>, total }).returning({ id: trayQuotes.id });
    quoteId = inserted[0]?.id;
  } catch {
    return NextResponse.json({ ok: false, message: "برای ثبت سینی سفارشی اتصال پایگاه داده لازم است" }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    quote: { id: quoteId, lines, total, guests: s.guests, sizeLabel: `${size.label} · ${base.label}` },
  });
}
