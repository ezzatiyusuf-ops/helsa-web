import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { db, isDatabaseConfigured } from "@/db";
import { products } from "@/db/schema";
import { getProducts } from "@/services/catalog";
import { assertSameOrigin, clientKey, csrfRejectedResponse, rateLimit, rateLimitedResponse } from "@/lib/security";

/**
 * POST /api/products/cross-sell — پیشنهاد قطعی (deterministic) برای تکمیل سبد (CRO ج۳۷).
 * سیگنال‌های سبد (دستهٔ واقعی محصولات + نوع اقلام) → نگاشت ثابت به دسته‌های مکمل:
 *   خرما → شکلات خرما / آجیل / چای · آجیل → خرما / چای / شکلات خرما · شکلات → خرما / آجیل / چای
 *   چای → خرما / شکلات خرما / آجیل · سینی مزه → خرما / آجیل / چای / هدایا · هدیه → شکلات خرما / خرما پریمیوم / سینی مزه
 * فقط محصولات واقعیِ موجود و نمایان؛ حذف اقلام موجود در سبد؛ مرتب‌سازی قطعی (امتیاز×نظر، سپس id).
 */
const schema = z.object({
  items: z.array(z.object({
    key: z.string().min(2).max(64),
    kind: z.enum(["product", "tray", "custom-tray", "gift"]),
    id: z.union([z.number().int().positive(), z.string()]).optional(),
    slug: z.string().max(120).optional(),
  })).max(100).default([]),
});

const DATE_CATS = new Set(["dates", "date-products", "date-bars", "date-sugar"]);
const NUT_CATS = new Set(["nuts", "seeds", "peanuts", "dried-fruits", "nuts-dried-fruits"]);
const CHOC_CATS = new Set(["chocolate", "date-chocolate", "candy", "noghl"]);
const TEA_CATS = new Set(["herbal-tea"]);

/** نگاشت سیگنال → دسته‌های هدف (به‌ترتیب اولویت) */
const TARGETS: Record<string, string[]> = {
  dates: ["date-chocolate", "nuts", "herbal-tea"],
  nuts: ["dates", "herbal-tea", "date-chocolate"],
  chocolate: ["dates", "nuts", "herbal-tea"],
  tea: ["dates", "date-chocolate", "nuts"],
  tray: ["dates", "nuts", "herbal-tea"],
  gift: ["date-chocolate", "dates", "nuts"],
  other: ["dates", "nuts", "date-chocolate"],
};

function signalFor(kind: string, category?: string): string {
  if (kind === "tray" || kind === "custom-tray") return "tray";
  if (kind === "gift") return "gift";
  if (!category) return "other";
  if (DATE_CATS.has(category)) return "dates";
  if (NUT_CATS.has(category)) return "nuts";
  if (CHOC_CATS.has(category)) return "chocolate";
  if (TEA_CATS.has(category)) return "tea";
  return "other";
}

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return csrfRejectedResponse();
  const limited = rateLimit(clientKey(req, "cross-sell"), 30, 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);
  if (!isDatabaseConfigured) return NextResponse.json({ ok: false, items: [] }, { status: 200 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, items: [] }, { status: 200 });

  try {
    const cart = parsed.data.items;
    const cartProductIds = cart.filter((i) => i.kind === "product" && typeof i.id === "number").map((i) => i.id as number);
    const cartSlugs = new Set(cart.map((i) => i.slug).filter(Boolean) as string[]);

    // دستهٔ واقعی اقلام محصولی سبد — منبع حقیقت: دیتابیس
    let cartCats: string[] = [];
    if (cartProductIds.length) {
      const rows = await db.select({ category: products.category }).from(products).where(inArray(products.id, cartProductIds));
      cartCats = rows.map((r) => r.category);
    }
    const signals = new Set<string>();
    for (const i of cart) signals.add(signalFor(i.kind));
    for (const c of cartCats) signals.add(signalFor("product", c));

    // اولویت هدف‌ها: سیگنال‌های خاص‌تر مقدم
    const order = ["tray", "gift", "dates", "nuts", "chocolate", "tea", "other"];
    const targetCats: string[] = [];
    for (const s of order) {
      if (!signals.has(s)) continue;
      for (const t of TARGETS[s] ?? []) if (!targetCats.includes(t)) targetCats.push(t);
    }
    if (!targetCats.length) targetCats.push("dates", "nuts", "date-chocolate");

    const all = await getProducts();
    const score = (p: (typeof all)[number]) => p.rating * p.reviews * 1000 - p.id; // قطعی
    const pick = (cat: string) =>
      all
        .filter((p) => p.category === cat && p.stock > 0 && !cartSlugs.has(p.slug) && !(cartProductIds as unknown as number[]).includes(p.id))
        .sort((a, b) => score(b) - score(a))[0] ?? null;

    const seen = new Set<number>();
    const out: Array<Record<string, unknown>> = [];
    for (const cat of targetCats) {
      if (out.length >= 3) break;
      const p = pick(cat);
      if (p && !seen.has(p.id)) {
        seen.add(p.id);
        out.push({
          type: "product", id: p.id, slug: p.slug, name: p.name, price: p.price,
          image: p.image, weight: p.weight, rating: p.rating, reviews: p.reviews,
        });
      }
    }
    // پُر کردن تا ۳ با پرفروش‌های واقعی (اگر سبد سیگنال کمی داد)
    if (out.length < 2) {
      for (const p of [...all].sort((a, b) => score(b) - score(a))) {
        if (out.length >= 3) break;
        if (p.stock > 0 && !cartSlugs.has(p.slug) && !seen.has(p.id) && !(cartProductIds as unknown as number[]).includes(p.id)) {
          seen.add(p.id);
          out.push({ type: "product", id: p.id, slug: p.slug, name: p.name, price: p.price, image: p.image, weight: p.weight, rating: p.rating, reviews: p.reviews });
        }
      }
    }
    // کارت پیوندی هدیه/سینی — فقط وقتی سیگنال مرتبط هست و کارت محصولی جا نشده
    if ((signals.has("tray") || signals.has("gift")) && out.length < 4) {
      out.push(signals.has("gift")
        ? { type: "link", href: "/mazeh-trays", title: "سینی مزه هلسا", desc: "پذیرایی کامل با یک انتخاب" }
        : { type: "link", href: "/gifts", title: "هدایای هلسا", desc: "بسته‌بندی پرمیوم، آمادهٔ هدیه" });
    }
    return NextResponse.json({ ok: true, items: out });
  } catch {
    return NextResponse.json({ ok: false, items: [] }, { status: 200 });
  }
}
