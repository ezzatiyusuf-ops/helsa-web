import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db, isDatabaseConfigured } from "@/db";
import {
  products, productVariants, mazehTrays, trayQuotes, giftQuotes, giftPackages, coupons, customers, addresses,
  orders, orderItems, payments, shippingMethods, inventoryMovements,
} from "@/db/schema";
import { methodEligibility, type PaymentMethodId } from "@/config/payments";
import { cardTransferSettings } from "@/config/card-transfer";
import { isValidContribution, supportContributionEnabled } from "@/config/support";
import { orderTotal as computeOrderTotal } from "@/lib/money";
import { identityRequired, verifyIdentityToken } from "@/lib/identity";
import { resolveProvider } from "@/lib/payments";
import { assertSameOrigin, clientKey, csrfRejectedResponse, rateLimit, rateLimitedResponse } from "@/lib/security";
import { customerIdFromSession, readSession } from "@/lib/session";
import { SHIPPING } from "@/config/shipping";

const itemSchema = z.object({
  key: z.string().min(2),
  name: z.string().optional(), // display-only; server resolves immutable snapshot
  price: z.number().optional(), // ignored
  qty: z.number().int().positive().max(99),
  image: z.string().optional(),
  weight: z.string().optional(),
  meta: z.string().optional(),
});
const customerSchema = z.object({
  firstName: z.string().trim().transform((s) => s.replace(/[<>\u0000-\u001f]/g, "")).pipe(z.string().min(2)),
  lastName: z.string().trim().transform((s) => s.replace(/[<>\u0000-\u001f]/g, "")).pipe(z.string().min(2)),
  mobile: z.string().regex(/^09\d{9}$/), email: z.string().email().optional().or(z.literal("")),
});
const addressSchema = z.object({
  province: z.string().min(2), city: z.string().min(1), full: z.string().min(5),
  // Iranian postal code: exactly 10 digits (mirrors the checkout client; server is the authority)
  postal: z.string().regex(/^\d{10}$/, "کد پستی باید ۱۰ رقم باشد"),
  plate: z.string().optional().default(""), unit: z.string().optional().default(""),
  recipient: z.string().trim().transform((s) => s.replace(/[<>\u0000-\u001f]/g, "")).pipe(z.string().min(2)), phone: z.string().regex(/^09\d{9}$/),
  label: z.string().trim().transform((s) => s.replace(/[<>\u0000-\u001f]/g, "")).default("منزل"), default: z.boolean().default(false),
});
const schema = z.object({
  customer: customerSchema,
  address: addressSchema,
  items: z.array(itemSchema).min(1).max(100),
  couponCode: z.string().nullable().optional(),
  shippingMethod: z.string().min(2),
  paymentMethod: z.enum(["online", "snappay", "digipay", "card", "cod", "wallet"]),
  /** توکن احراز هویت (کد ملی + موبایل تأییدشده) — امضاشده و کوتاه‌مدت */
  identityToken: z.string().min(20).max(2000).optional(),
  // client-generated UUID per checkout attempt — makes duplicate submissions safe
  idempotencyKey: z.string().regex(/^[A-Za-z0-9-]{8,64}$/).optional(),
  // sent by the UI for display parity only; server always recalculates all totals
  subtotal: z.number().optional(), discount: z.number().optional(), shipping: z.number().optional(), total: z.number().optional(),
  /** مشارکت حمایتی داوطلبانه — پیش‌فرض ۰ */
  supportContribution: z.number().int().min(0).max(2_000_000).optional().default(0),
  // §۲۰ یادداشت سفارش — متن آزاد؛ کنترل‌کاراکترها و تگ‌ها پاک می‌شوند (هم‌راستا با بقیهٔ فیلدها)
  note: z.string().trim().transform((s) => s.replace(/[<>\u0000-\u001f]/g, "")).pipe(z.string().max(500)).nullable().optional(),
  // §۲۱ گزینهٔ هدیه — فقط وقتی isGift فعال است معنی دارد؛ سرور فیلدهای بی‌پرچم را نول می‌کند
  isGift: z.boolean().optional().default(false),
  giftRecipient: z.string().trim().transform((s) => s.replace(/[<>\u0000-\u001f]/g, "")).pipe(z.string().min(2).max(120)).nullable().optional(),
  giftMessage: z.string().trim().transform((s) => s.replace(/[<>\u0000-\u001f]/g, "")).pipe(z.string().max(300)).nullable().optional(),
  giftPackaging: z.boolean().optional().default(false),
});

type ResolvedItem = {
  key: string; itemType: "product" | "tray" | "custom-tray" | "gift"; productId?: number; trayId?: number; variantId?: number;
  name: string; sku?: string; unitPrice: number; quantity: number; subtotal: number; category?: string;
  metadata: Record<string, unknown>;
};

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return csrfRejectedResponse();
  const limited = rateLimit(clientKey(req, "orders-create"), 10, 15 * 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);
  if (!isDatabaseConfigured) return Response.json({ ok: false, message: "برای ثبت سفارش اتصال پایگاه داده لازم است" }, { status: 503 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, message: parsed.error.issues[0]?.message ?? "اطلاعات سفارش نامعتبر است" }, { status: 400 });
  const data = parsed.data;
  if (data.paymentMethod === "wallet") return Response.json({ ok: false, message: "کیف پول هلسا به‌زودی فعال می‌شود؛ لطفاً روش دیگری انتخاب کنید." }, { status: 400 });
  if (data.paymentMethod === "card" && !cardTransferSettings().enabled) {
    return Response.json({ ok: false, message: cardTransferSettings().disabledReason ?? "پرداخت کارت‌به‌کارت در حال حاضر فعال نیست." }, { status: 503 });
  }
  if ((data.paymentMethod === "online" || data.paymentMethod === "snappay" || data.paymentMethod === "digipay") && !resolveProvider(data.paymentMethod)) {
    return Response.json({ ok: false, message: "این روش پرداخت در حال حاضر پیکربندی نشده است" }, { status: 503 });
  }

  // ── احراز هویت (Part A/B): بدون توکن معتبر، سفارش ثبت نمی‌شود ──
  let verifiedNid: string | null = null;
  if (identityRequired()) {
    if (!data.identityToken) return Response.json({ ok: false, message: "برای ثبت سفارش، احراز هویت (کد ملی و شمارهٔ تأییدشده) الزامی است." }, { status: 401 });
    const identity = await verifyIdentityToken(data.identityToken);
    if (!identity) return Response.json({ ok: false, message: "احراز هویت منقضی یا نامعتبر است؛ دوباره مرحلهٔ احراز را انجام دهید." }, { status: 401 });
    if (identity.mobile !== data.customer.mobile) {
      return Response.json({ ok: false, message: "شمارهٔ همراه سفارش با شمارهٔ احرازشده هم‌خوان نیست." }, { status: 400 });
    }
    verifiedNid = identity.nid;
  }

  // idempotency: a retried/double-clicked checkout returns the original order
  if (data.idempotencyKey) {
    const existing = (await db.select({ code: orders.code, subtotal: orders.subtotal, discount: orders.discount, shipping: orders.shipping, total: orders.total, items: orders.items }).from(orders).where(eq(orders.idempotencyKey, data.idempotencyKey)).limit(1))[0];
    if (existing) {
      return Response.json({ ok: true, duplicate: true, payState: "pending", ...existing, items: existing.items as unknown as { name: string }[] });
    }
  }

  try {
    const result = await db.transaction(async (tx) => {
      const resolved: ResolvedItem[] = [];
      for (const cart of data.items) {
        const variantMatch = cart.key.match(/^p-(\d+)-v-(\d+)$/);
        const productMatch = cart.key.match(/^p-(\d+)$/);
        const trayMatch = cart.key.match(/^t-(\d+)$/);
        const quoteMatch = cart.key.match(/^custom-quote-(\d+)$/);
        const giftMatch = cart.key.match(/^gift-quote-(\d+)$/);

        if (variantMatch) {
          const productId = Number(variantMatch[1]); const variantId = Number(variantMatch[2]);
          const row = (await tx.select({ p: products, v: productVariants }).from(productVariants).innerJoin(products, eq(productVariants.productId, products.id)).where(and(eq(products.id, productId), eq(productVariants.id, variantId), eq(products.isActive, true), eq(products.isVisible, true), eq(productVariants.isActive, true))).limit(1))[0];
          if (!row || row.v.stock < cart.qty || row.p.stock < cart.qty) throw new Error("موجودی گونه انتخاب‌شده کافی نیست");
          resolved.push({ key: cart.key, itemType: "product", productId, variantId, name: `${row.p.name} - ${row.v.name}`, sku: row.v.sku, unitPrice: row.v.price, quantity: cart.qty, subtotal: row.v.price * cart.qty, category: row.p.category, metadata: { weight: row.v.weight, unit: row.v.unit, flavor: row.v.flavor } });
        } else if (productMatch) {
          const id = Number(productMatch[1]);
          const p = (await tx.select().from(products).where(and(eq(products.id, id), eq(products.isActive, true), eq(products.isVisible, true))).limit(1))[0];
          if (!p || p.stock < cart.qty) throw new Error("موجودی محصول کافی نیست");
          resolved.push({ key: cart.key, itemType: "product", productId: id, name: p.name, sku: p.sku, unitPrice: p.price, quantity: cart.qty, subtotal: p.price * cart.qty, category: p.category, metadata: { weight: p.weight, unit: p.unit } });
        } else if (trayMatch) {
          const id = Number(trayMatch[1]);
          const t = (await tx.select().from(mazehTrays).where(and(eq(mazehTrays.id, id), eq(mazehTrays.active, true))).limit(1))[0];
          if (!t || t.stock < cart.qty) throw new Error("موجودی سینی کافی نیست");
          resolved.push({ key: cart.key, itemType: "tray", trayId: id, name: t.name, sku: t.sku ?? undefined, unitPrice: t.basePrice, quantity: cart.qty, subtotal: t.basePrice * cart.qty, category: "mazeh-trays", metadata: { size: t.size, servesMin: t.servesMin, servesMax: t.servesMax, contents: t.contents } });
        } else if (quoteMatch) {
          const quoteId = Number(quoteMatch[1]);
          const q = (await tx.select().from(trayQuotes).where(eq(trayQuotes.id, quoteId)).limit(1))[0];
          if (!q) throw new Error("قیمت سینی سفارشی معتبر نیست؛ دوباره سینی را بسازید");
          resolved.push({ key: cart.key, itemType: "custom-tray", name: "سینی مزه سفارشی هلسا", sku: `QUOTE-${quoteId}`, unitPrice: q.total, quantity: cart.qty, subtotal: q.total * cart.qty, category: "mazeh-trays", metadata: { quoteId, config: q.config } });
        } else if (giftMatch) {
          const quoteId = Number(giftMatch[1]);
          const q = (await tx.select().from(giftQuotes).where(eq(giftQuotes.id, quoteId)).limit(1))[0];
          if (!q) throw new Error("قیمت هدیه معتبر نیست؛ دوباره هدیه را بسازید");
          // gift quote already encodes unit*qty trusted total; enforce exact qty match
          if (cart.qty !== q.quantity) throw new Error("تعداد هدیه با پیش‌فاکتور سرور هم‌خوان نیست");
          const pack = (await tx.select().from(giftPackages).where(eq(giftPackages.id, q.packageId)).limit(1))[0];
          if (!pack || !pack.isActive) throw new Error("بسته هدیه در دسترس نیست");
          if (pack.stock < q.quantity) throw new Error("موجودی هدیه کافی نیست");
          resolved.push({
            key: cart.key,
            itemType: "gift",
            productId: undefined,
            name: pack.name,
            sku: `GIFT-${pack.slug}`,
            unitPrice: q.unitPrice,
            quantity: q.quantity,
            subtotal: q.total,
            category: "gifts",
            metadata: { giftQuoteId: q.id, packageId: pack.id, config: q.config },
          });
          // decrease gift stock
          const changed = await tx.update(giftPackages)
            .set({ stock: sql`${giftPackages.stock} - ${q.quantity}`, updatedAt: new Date() })
            .where(and(eq(giftPackages.id, pack.id), gte(giftPackages.stock, q.quantity)))
            .returning({ stock: giftPackages.stock });
          if (!changed.length) throw new Error("موجودی هدیه هم‌زمان تغییر کرده است");
        } else {
          throw new Error("یکی از اقلام سبد معتبر نیست");
        }
      }

      const subtotal = resolved.reduce((sum, item) => sum + item.subtotal, 0);
      let discount = 0;
      let couponCode: string | null = null;
      if (data.couponCode) {
        const coupon = (await tx.select().from(coupons).where(eq(coupons.code, data.couponCode.toUpperCase())).limit(1))[0];
        const today = new Date().toISOString().slice(0, 10);
        if (!coupon || !coupon.active || today < coupon.startDate || today > coupon.endDate || coupon.usedCount >= coupon.usageLimit) throw new Error("کد تخفیف معتبر نیست یا ظرفیت آن تمام شده است");
        if (subtotal < coupon.minimumPurchase) throw new Error("حداقل مبلغ خرید برای این کد تأمین نشده است");
        // F-07: کوپن‌های «فقط اولین خرید» — سابقهٔ سفارش با همین موبایل (مهمان یا حساب)
        // بررسی می‌شود؛ سفارش‌های لغوشده مسیر بازگشت به «اولین خرید» را باز می‌کنند.
        if (coupon.firstOrderOnly) {
          const prior = await tx.select({ id: orders.id }).from(orders).where(
            and(
              sql`${orders.customer}->>'mobile' = ${data.customer.mobile}`,
              sql`${orders.status} <> 'cancelled'`,
            ),
          ).limit(1);
          if (prior.length) throw new Error("این کد تخفیف فقط برای اولین خرید قابل استفاده است.");
        }
        const eligible = resolved.filter((item) => (!coupon.productIds.length || (item.productId && coupon.productIds.includes(item.productId))) && (!coupon.categorySlugs.length || (item.category && coupon.categorySlugs.includes(item.category))));
        const eligibleSubtotal = eligible.reduce((sum, item) => sum + item.subtotal, 0);
        if (eligibleSubtotal <= 0) throw new Error("این کد برای اقلام سبد شما قابل استفاده نیست");
        const raw = coupon.type === "percent" ? Math.round(eligibleSubtotal * coupon.value / 100) : coupon.value;
        discount = Math.min(raw, coupon.maximumDiscount ?? raw);
        couponCode = coupon.code;
      }

      const method = (await tx.select().from(shippingMethods).where(and(eq(shippingMethods.code, data.shippingMethod), eq(shippingMethods.isActive, true))).limit(1))[0];
      if (!method) throw new Error("روش ارسال انتخاب‌شده در دسترس نیست");
      const shipping = subtotal - discount >= SHIPPING.freeThreshold ? 0 : method.price; // central config (brief 2.2)
      // ── مشارکت حمایتی داوطلبانه ──
      const supportInput = supportContributionEnabled() ? (data.supportContribution ?? 0) : 0;
      if (supportInput !== 0 && !isValidContribution(supportInput)) {
        throw new Error("مبلغ مشارکت داوطلبانه باید بین ۵٬۰۰۰ تا ۲٬۰۰۰٬۰۰۰ تومان باشد.");
      }
      const supportContribution = supportInput;
      const total = computeOrderTotal({ subtotal, discount, shipping, support: supportContribution });

      // واجدین بودن روش پرداخت — سرور مرجع است (نه UI)
      const el = methodEligibility(data.paymentMethod as PaymentMethodId, {
        total,
        province: data.address?.province,
        nidVerified: verifiedNid !== null,
      });
      if (!el.ok) throw new Error(el.reason ?? "این روش پرداخت برای سفارش شما در دسترس نیست");

      const code = `HLA-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

      const customer = (await tx.insert(customers).values({ name: `${data.customer.firstName} ${data.customer.lastName}`, phone: data.customer.mobile, email: data.customer.email || null, updatedAt: new Date() }).onConflictDoUpdate({
        target: customers.phone,
        set: {
          name: `${data.customer.firstName} ${data.customer.lastName}`,
          // never clobber an existing account email with an empty checkout field —
          // email is only replaced when the customer actually provided one
          email: data.customer.email ? data.customer.email : sql`${customers.email}`,
          updatedAt: new Date(),
        },
      }).returning())[0];
      if (verifiedNid) {
        await tx.update(customers).set({
          nationalId: verifiedNid,
          nidVerifiedAt: new Date(),
          identityProvider: "checkout",
          updatedAt: new Date(),
        }).where(eq(customers.id, customer.id));
      }
      const addressSnapshot = { ...data.address };
      const sameAddress = await tx.select({ id: addresses.id }).from(addresses).where(and(eq(addresses.customerId, customer.id), eq(addresses.postalCode, data.address.postal), eq(addresses.fullAddress, data.address.full))).limit(1);
      if (!sameAddress.length) await tx.insert(addresses).values({ customerId: customer.id, label: data.address.label, province: data.address.province, city: data.address.city, fullAddress: data.address.full, postalCode: data.address.postal, plate: data.address.plate, unit: data.address.unit, recipient: data.address.recipient, phone: data.address.phone, isDefault: data.address.default });

      const customerSnapshot = {
        ...data.customer,
        ...(verifiedNid ? { nationalId: verifiedNid, nidVerified: true, identityProvider: "checkout" } : {}),
      } as unknown as Record<string, unknown>;
      const order = (await tx.insert(orders).values({ code, customerId: customer.id, customer: customerSnapshot, address: addressSnapshot, items: resolved as unknown as Record<string, unknown>[], subtotal, discount, shipping, total, couponCode, paymentStatus: "pending", paymentMethod: data.paymentMethod, shippingMethod: method.code, status: "pending", note: data.note?.trim() || null, isGift: data.isGift, giftRecipient: data.isGift ? data.giftRecipient?.trim() || null : null, giftMessage: data.isGift ? data.giftMessage?.trim() || null : null, giftPackaging: data.isGift ? data.giftPackaging : false, idempotencyKey: data.idempotencyKey ?? null, supportContribution, updatedAt: new Date() }).returning())[0];
      await tx.insert(orderItems).values(resolved.map((item) => ({ orderId: order.id, productId: item.productId, trayId: item.trayId, variantId: item.variantId, itemType: item.itemType, nameSnapshot: item.name, skuSnapshot: item.sku, unitPrice: item.unitPrice, quantity: item.quantity, subtotal: item.subtotal, metadata: item.metadata })));
      const autoMethods = new Set(["online", "snappay", "digipay"]);
      const payProvider = autoMethods.has(data.paymentMethod)
        ? (resolveProvider(data.paymentMethod)?.id ?? "manual")
        : "manual";
      await tx.insert(payments).values({
        orderId: order.id,
        provider: payProvider,
        method: data.paymentMethod,
        amount: total,
        status: "pending",
        ...(autoMethods.has(data.paymentMethod) ? { expiresAt: new Date(Date.now() + 15 * 60_000) } : {}),
      });

      for (const item of resolved) {
        if (item.productId) {
          const p = (await tx.select({ stock: products.stock }).from(products).where(eq(products.id, item.productId)).limit(1))[0];
          const changed = await tx.update(products).set({ stock: sql`${products.stock} - ${item.quantity}`, stockStatus: sql`case when ${products.stock} - ${item.quantity} <= 0 then 'out_of_stock' when ${products.stock} - ${item.quantity} <= ${products.lowStockThreshold} then 'low_stock' else 'in_stock' end`, updatedAt: new Date() }).where(and(eq(products.id, item.productId), gte(products.stock, item.quantity))).returning({ stock: products.stock });
          if (!changed.length) throw new Error("موجودی محصول هم‌زمان تغییر کرده است؛ سبد را بازبینی کنید");
          if (item.variantId) {
            const v = (await tx.select({ stock: productVariants.stock }).from(productVariants).where(eq(productVariants.id, item.variantId)).limit(1))[0];
            const vChanged = await tx.update(productVariants).set({ stock: sql`${productVariants.stock} - ${item.quantity}`, updatedAt: new Date() }).where(and(eq(productVariants.id, item.variantId), gte(productVariants.stock, item.quantity))).returning({ stock: productVariants.stock });
            if (!vChanged.length) throw new Error("موجودی گونه هم‌زمان تغییر کرده است");
            await tx.insert(inventoryMovements).values({ productId: item.productId, variantId: item.variantId, quantityChange: -item.quantity, previousQuantity: v.stock, newQuantity: v.stock - item.quantity, reason: "فروش", note: `رزرو سفارش ${code}`, createdBy: "order-system", referenceType: "ORDER", referenceId: code });
          } else {
            await tx.insert(inventoryMovements).values({ productId: item.productId, quantityChange: -item.quantity, previousQuantity: p.stock, newQuantity: p.stock - item.quantity, reason: "فروش", note: `رزرو سفارش ${code}`, createdBy: "order-system", referenceType: "ORDER", referenceId: code });
          }
        }
        if (item.trayId) {
          const t = (await tx.select({ stock: mazehTrays.stock }).from(mazehTrays).where(eq(mazehTrays.id, item.trayId)).limit(1))[0];
          const changed = await tx.update(mazehTrays).set({ stock: sql`${mazehTrays.stock} - ${item.quantity}`, updatedAt: new Date() }).where(and(eq(mazehTrays.id, item.trayId), gte(mazehTrays.stock, item.quantity))).returning({ stock: mazehTrays.stock });
          if (!changed.length) throw new Error("موجودی سینی هم‌زمان تغییر کرده است");
          await tx.insert(inventoryMovements).values({ trayId: item.trayId, quantityChange: -item.quantity, previousQuantity: t.stock, newQuantity: t.stock - item.quantity, reason: "فروش", note: `رزرو سفارش ${code}`, createdBy: "order-system", referenceType: "ORDER", referenceId: code });
        }
      }
      if (couponCode) await tx.update(coupons).set({ usedCount: sql`${coupons.usedCount} + 1` }).where(eq(coupons.code, couponCode));
      return { code, subtotal, discount, shipping, total, supportContribution, payState: "pending" as const, items: resolved };
    });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    // concurrent duplicate with the same idempotency key lost the race — the winner's order is the answer
    const msg = error instanceof Error ? error.message : "";
    if (data.idempotencyKey && /duplicate key|unique constraint|23505/i.test(msg)) {
      const existing = (await db.select({ code: orders.code, subtotal: orders.subtotal, discount: orders.discount, shipping: orders.shipping, total: orders.total, items: orders.items }).from(orders).where(eq(orders.idempotencyKey, data.idempotencyKey)).limit(1))[0];
      if (existing) return Response.json({ ok: true, duplicate: true, payState: "pending", ...existing, items: existing.items as unknown as { name: string }[] });
    }
    return Response.json({ ok: false, message: error instanceof Error ? error.message : "ثبت سفارش انجام نشد" }, { status: 400 });
  }
}

export async function GET() {
  if (!isDatabaseConfigured) return Response.json({ ok: false, message: "سرویس سفارش‌ها در دسترس نیست؛ پیکربندی پایگاه داده لازم است." }, { status: 503 });
  const session = await readSession();
  if (!session) return Response.json({ ok: false, message: "برای مشاهده سفارش‌ها وارد شوید." }, { status: 401 });

  // Ownership is resolved strictly server-side: signed session → customer row.
  const customerId = customerIdFromSession(session);
  let customer: typeof customers.$inferSelect | null = null;
  if (customerId != null) {
    customer = (await db.select().from(customers).where(eq(customers.id, customerId)).limit(1))[0] ?? null;
  }
  if (!customer && session.phone) {
    customer = (await db.select().from(customers).where(eq(customers.phone, session.phone)).limit(1))[0] ?? null;
  }
  if (!customer && session.email) {
    customer = (await db.select().from(customers).where(eq(customers.email, session.email)).limit(1))[0] ?? null;
  }
  if (!customer) return Response.json({ ok: true, orders: [] });

  const rows = await db.select().from(orders).where(eq(orders.customerId, customer.id)).orderBy(desc(orders.createdAt)).limit(50);
  return Response.json({ ok: true, orders: rows.map(mapOrderForAccount) });
}

/** DB order row → the same OrderRecord shape the account dashboard renders. */
function mapOrderForAccount(row: typeof orders.$inferSelect) {
  const customerSnap = (row.customer ?? {}) as Record<string, unknown>;
  const addressSnap = (row.address ?? {}) as Record<string, unknown>;
  const rawItems = Array.isArray(row.items) ? (row.items as Record<string, unknown>[]) : [];
  const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
  const num = (v: unknown, fallback = 0) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
  const name = str(customerSnap.firstName, "") || str(customerSnap.name, "").split(" ")[0];
  const family = str(customerSnap.lastName, "") || str(customerSnap.name, "").split(" ").slice(1).join(" ");
  const payState = row.paymentStatus === "paid" ? "success" : row.paymentStatus === "failed" ? "failed" : row.paymentStatus === "cancelled" ? "cancelled" : "pending";
  return {
    code: row.code,
    supportContribution: row.supportContribution ?? 0,
    note: str(row.note) || undefined,
    isGift: row.isGift === true,
    giftRecipient: str(row.giftRecipient) || undefined,
    giftMessage: str(row.giftMessage) || undefined,
    giftPackaging: row.giftPackaging === true,
    date: (row.createdAt ?? row.updatedAt ?? new Date()).toISOString(),
    customer: {
      firstName: name || "مشتری",
      lastName: family || "هلسا",
      mobile: str(customerSnap.mobile, ""),
      email: str(customerSnap.email, "") || undefined,
    },
    ...(row.address
      ? {
          address: {
            id: `srv-${row.code}`,
            province: str(addressSnap.province),
            city: str(addressSnap.city),
            full: str(addressSnap.full),
            postal: str(addressSnap.postal),
            plate: str(addressSnap.plate),
            unit: str(addressSnap.unit),
            recipient: str(addressSnap.recipient),
            phone: str(addressSnap.phone),
            label: str(addressSnap.label, "ارسال"),
            default: false,
          },
        }
      : {}),
    items: rawItems.map((it) => {
      const meta = (it.metadata ?? {}) as Record<string, unknown>;
      return {
        key: str(it.key),
        name: str(it.name),
        price: num(it.unitPrice),
        qty: num(it.quantity, 1),
        image: "/images/opt/hero-nuts-dried-fruits.jpg",
        weight: meta.weight != null ? String(meta.weight) : undefined,
      };
    }),
    subtotal: row.subtotal,
    discount: row.discount,
    shipping: row.shipping,
    total: row.total,
    couponCode: row.couponCode ?? null,
    shippingMethod: str(row.shippingMethod),
    paymentMethod: str(row.paymentMethod),
    payState,
    payRef: row.paymentReference ?? undefined,
    status: row.status,
  };
}
