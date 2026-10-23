import { NextResponse } from "next/server";
import { z } from "zod";
import { inArray } from "drizzle-orm";
import { db, isDatabaseConfigured } from "@/db";
import { products, mazehTrays } from "@/db/schema";
import { assertSameOrigin, clientKey, csrfRejectedResponse, rateLimit, rateLimitedResponse } from "@/lib/security";

/**
 * POST /api/cart/check — سلامت سبد خرید در برابر دادهٔ واقعی سرور (CRO ج۳۷).
 * برای هر قلم: قیمت به‌روز (تشخیص تغییر قیمت)، موجودی واقعی و آستانهٔ کم‌موجودی.
 * اقلام مبتنی بر پیش‌فاکتور (سینی سفارشی/هدیه) در ثبت سفارش سمت سرور اعتبارسنجی می‌شوند.
 * فقط دادهٔ عمومی کاتالوگ — همان چیزی که صفحهٔ محصول هم نشان می‌دهد.
 */
const schema = z.object({
  items: z.array(z.object({
    key: z.string().min(2).max(64),
    kind: z.enum(["product", "tray", "custom-tray", "gift"]),
    id: z.union([z.number().int().positive(), z.string()]).optional(),
    qty: z.number().int().min(1).max(99),
    price: z.number().min(0),
  })).min(1).max(100),
});

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return csrfRejectedResponse();
  const limited = rateLimit(clientKey(req, "cart-check"), 30, 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);
  if (!isDatabaseConfigured) return NextResponse.json({ ok: false, message: "سرویس در دسترس نیست." }, { status: 503 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "داده نامعتبر است." }, { status: 400 });

  try {
    const productIds = parsed.data.items.filter((i) => i.kind === "product" && typeof i.id === "number").map((i) => i.id as number);
    const trayIds = parsed.data.items.filter((i) => i.kind === "tray" && typeof i.id === "number").map((i) => i.id as number);

    const productRows = productIds.length
      ? await db.select({ id: products.id, price: products.price, stock: products.stock, lowStock: products.lowStockThreshold, stockStatus: products.stockStatus, isActive: products.isActive, isVisible: products.isVisible })
          .from(products).where(inArray(products.id, productIds))
      : [];
    const trayRows = trayIds.length
      ? await db.select({ id: mazehTrays.id, price: mazehTrays.basePrice, stock: mazehTrays.stock, active: mazehTrays.active })
          .from(mazehTrays).where(inArray(mazehTrays.id, trayIds))
      : [];

    const productMap = new Map(productRows.map((p) => [p.id, p]));
    const trayMap = new Map(trayRows.map((t) => [t.id, t]));

    const checks = parsed.data.items.map((item) => {
      if (item.kind === "product" && typeof item.id === "number") {
        const p = productMap.get(item.id);
        if (!p || !p.isActive || !p.isVisible) return { key: item.key, checked: true, available: false };
        return {
          key: item.key,
          checked: true,
          available: p.stock > 0,
          price: p.price,
          stock: p.stock,
          lowStock: p.lowStock,
          maxQty: Math.min(99, p.stock),
        };
      }
      if (item.kind === "tray" && typeof item.id === "number") {
        const t = trayMap.get(item.id);
        if (!t || !t.active) return { key: item.key, checked: true, available: false };
        return { key: item.key, checked: true, available: t.stock > 0, price: t.price, stock: t.stock, lowStock: 5, maxQty: Math.min(99, t.stock) };
      }
      // custom-tray / gift: پیش‌فاکتور سروری — در ثبت سفارش اعتبارسنجی می‌شود
      return { key: item.key, checked: false };
    });

    return NextResponse.json({ ok: true, items: checks });
  } catch {
    return NextResponse.json({ ok: false, message: "بررسی سبد انجام نشد." }, { status: 500 });
  }
}
