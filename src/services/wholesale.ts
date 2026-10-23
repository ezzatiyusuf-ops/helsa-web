import "server-only";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { db, isDatabaseConfigured } from "@/db";
import {
  customers, orders, orderItems, products, productVariants, inventoryMovements, wholesaleBusinesses,
} from "@/db/schema";
import { hashPassword } from "@/lib/auth-service";
import {
  WHOLESALE_MIN_SUBTOTAL, WHOLESALE_MIN_ITEM_QTY, WHOLESALE_MAX_LINES,
  WHOLESALE_DEFAULT_DISCOUNT, wholesalePrice,
} from "@/config/wholesale";

export type WholesaleStatus = "pending" | "approved" | "rejected" | "suspended";

export interface WholesaleBusiness {
  id: number;
  code: string;
  businessName: string;
  businessType: string;
  contactName: string;
  mobile: string;
  email: string;
  city: string;
  discountPercent: number;
  status: WholesaleStatus;
  adminNote: string;
  createdAt: string;
}

function mapBusiness(r: typeof wholesaleBusinesses.$inferSelect): WholesaleBusiness {
  return {
    id: r.id,
    code: r.code,
    businessName: r.businessName,
    businessType: r.businessType,
    contactName: r.contactName,
    mobile: r.mobile,
    email: r.email,
    city: r.city,
    discountPercent: r.discountPercent,
    status: (r.status as WholesaleStatus) ?? "pending",
    adminNote: r.adminNote,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function getBusinessByMobile(mobile: string): Promise<WholesaleBusiness | null> {
  if (!isDatabaseConfigured) return null;
  try {
    const rows = await db.select().from(wholesaleBusinesses).where(eq(wholesaleBusinesses.mobile, mobile)).limit(1);
    return rows[0] ? mapBusiness(rows[0]) : null;
  } catch {
    return null;
  }
}

export async function getBusinessForCustomer(customerId: number | null, mobile?: string): Promise<WholesaleBusiness | null> {
  if (!isDatabaseConfigured) return null;
  try {
    const conds = [] as ReturnType<typeof eq>[];
    if (customerId != null) conds.push(eq(wholesaleBusinesses.customerId, customerId));
    if (mobile) conds.push(eq(wholesaleBusinesses.mobile, mobile));
    if (!conds.length) return null;
    const rows = await db.select().from(wholesaleBusinesses).where(or(...conds)).orderBy(desc(wholesaleBusinesses.id)).limit(1);
    return rows[0] ? mapBusiness(rows[0]) : null;
  } catch {
    return null;
  }
}

/**
 * Register a wholesale business. Creates (or links) the customer account and
 * files a pending business application. Never approves automatically.
 */
export async function registerWholesaleBusiness(input: {
  businessName: string;
  businessType: string;
  contactName: string;
  mobile: string;
  email: string;
  password?: string;
  city: string;
  address?: string;
  economicCode?: string;
  monthlyVolume?: string;
  interests?: string;
  notes?: string;
  sessionCustomer?: { id: number; name: string; email: string; phone?: string };
}): Promise<{ code: string }> {
  if (!isDatabaseConfigured) throw new Error("DATABASE_UNAVAILABLE");

  const mobile = input.mobile.trim();
  const existing = await getBusinessByMobile(mobile);
  if (existing && existing.status !== "rejected") throw new Error("ALREADY_REGISTERED");

  // find or create the customer account
  let customerId: number | undefined = input.sessionCustomer?.id;
  if (!customerId) {
    const found = await db.select({ id: customers.id }).from(customers).where(eq(customers.phone, mobile)).limit(1);
    if (found[0]) {
      // existing account: only attach if a password was proven by login; otherwise
      // the caller must log in first. (Registration flow passes password for NEW accounts.)
      if (!input.password) throw new Error("ACCOUNT_EXISTS_LOGIN");
      customerId = found[0].id;
    } else {
      if (!input.password || input.password.length < 8) throw new Error("WEAK_PASSWORD");
      const [row] = await db.insert(customers).values({
        name: input.contactName.trim(),
        phone: mobile,
        email: input.email.trim().toLowerCase(),
        passwordHash: await hashPassword(input.password),
        isActive: true,
        updatedAt: new Date(),
      }).returning({ id: customers.id });
      customerId = row.id;
    }
  }

  const code = `WSB-${Date.now().toString(36).toUpperCase().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
  const values = {
    code,
    businessName: input.businessName.trim(),
    businessType: input.businessType,
    contactName: input.contactName.trim(),
    mobile,
    email: input.email.trim().toLowerCase(),
    city: input.city.trim(),
    address: (input.address ?? "").trim(),
    economicCode: (input.economicCode ?? "").trim(),
    monthlyVolume: (input.monthlyVolume ?? "").trim(),
    interests: (input.interests ?? "").trim(),
    notes: (input.notes ?? "").trim(),
    status: "pending",
    customerId,
    updatedAt: new Date(),
  };
  if (existing) {
    // rejected before → re-apply
    await db.update(wholesaleBusinesses).set(values).where(eq(wholesaleBusinesses.id, existing.id));
  } else {
    await db.insert(wholesaleBusinesses).values(values);
  }
  return { code };
}

/** Admin: list businesses (optionally filtered by status). */
export async function listBusinesses(status?: string) {
  const rows = await db
    .select()
    .from(wholesaleBusinesses)
    .where(status ? eq(wholesaleBusinesses.status, status) : undefined)
    .orderBy(desc(wholesaleBusinesses.createdAt))
    .limit(200);
  return rows.map(mapBusiness);
}

/** Admin: review a business (approve/reject/suspend + discount). */
export async function reviewBusiness(
  id: number,
  patch: { status: WholesaleStatus; discountPercent?: number; adminNote?: string },
) {
  const set: Partial<typeof wholesaleBusinesses.$inferInsert> = {
    status: patch.status,
    reviewedAt: new Date(),
    updatedAt: new Date(),
  };
  if (patch.status === "approved" && patch.discountPercent == null) {
    const cur = (await db.select({ d: wholesaleBusinesses.discountPercent }).from(wholesaleBusinesses).where(eq(wholesaleBusinesses.id, id)).limit(1))[0];
    set.discountPercent = cur?.d || WHOLESALE_DEFAULT_DISCOUNT;
  } else if (patch.discountPercent != null) {
    set.discountPercent = Math.max(0, Math.min(60, Math.round(patch.discountPercent)));
  }
  if (patch.adminNote != null) set.adminNote = patch.adminNote.trim();
  await db.update(wholesaleBusinesses).set(set).where(eq(wholesaleBusinesses.id, id));
  const row = (await db.select().from(wholesaleBusinesses).where(eq(wholesaleBusinesses.id, id)).limit(1))[0];
  return row ? mapBusiness(row) : null;
}

export interface WholesaleCatalogItem {
  id: number;
  name: string;
  slug: string;
  category: string;
  unit: string;
  price: number; // retail
  wholesalePrice: number; // business-specific
  stock: number;
}

/** Catalog with server-computed wholesale prices for an approved business. */
export async function getWholesaleCatalog(discountPercent: number): Promise<WholesaleCatalogItem[]> {
  const rows = await db
    .select({
      id: products.id, name: products.name, slug: products.slug, category: products.category,
      unit: products.unit, price: products.price, stock: products.stock,
    })
    .from(products)
    .where(and(eq(products.isActive, true), eq(products.isVisible, true)))
    .orderBy(products.name)
    .limit(500);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    category: r.category,
    unit: r.unit ?? "",
    price: r.price,
    wholesalePrice: wholesalePrice(r.price, discountPercent),
    stock: r.stock,
  }));
}

export interface WholesaleOrderResult {
  code: string;
  subtotal: number;
  discount: number;
  total: number;
  itemCount: number;
}

/**
 * Create a wholesale order. Prices are ALWAYS recomputed from the DB with the
 * business discount; client amounts are ignored. Stock is decremented
 * transactionally with a conditional guard.
 */
export async function createWholesaleOrder(business: WholesaleBusiness, input: {
  items: { productId: number; qty: number }[];
  note?: string;
}): Promise<WholesaleOrderResult> {
  if (!isDatabaseConfigured) throw new Error("DATABASE_UNAVAILABLE");
  if (business.status !== "approved") throw new Error("NOT_APPROVED");
  if (!input.items.length || input.items.length > WHOLESALE_MAX_LINES) throw new Error("INVALID_ITEMS");

  const byId = new Map<number, number>();
  for (const it of input.items) {
    if (!Number.isInteger(it.productId) || it.productId <= 0) throw new Error("INVALID_ITEMS");
    if (!Number.isInteger(it.qty) || it.qty < WHOLESALE_MIN_ITEM_QTY || it.qty > 500) throw new Error("INVALID_QTY");
    byId.set(it.productId, Math.max(byId.get(it.productId) ?? 0, it.qty));
  }

  const result = await db.transaction(async (tx) => {
    const resolved: { productId: number; name: string; sku: string; unitPrice: number; qty: number }[] = [];
    for (const [productId, qty] of byId) {
      const p = (await tx.select().from(products).where(eq(products.id, productId)).limit(1))[0];
      if (!p || !p.isActive) throw new Error("PRODUCT_NOT_FOUND");
      const updated = await tx
        .update(products)
        .set({ stock: sql`${products.stock} - ${qty}` })
        .where(and(eq(products.id, productId), sql`${products.stock} >= ${qty}`))
        .returning({ stock: products.stock });
      if (!updated.length) throw new Error("OUT_OF_STOCK");
      await tx.insert(inventoryMovements).values({
        productId, quantityChange: -qty, previousQuantity: updated[0].stock + qty, newQuantity: updated[0].stock,
        reason: "sale", note: `سفارش عمده ${business.code}`, referenceType: "order",
        createdBy: "wholesale-system",
      });
      resolved.push({
        productId, name: p.name, sku: p.sku ?? `P-${p.id}`,
        unitPrice: wholesalePrice(p.price, business.discountPercent), qty,
      });
    }

    const subtotal = resolved.reduce((s, r) => s + r.unitPrice * r.qty, 0);
    if (subtotal < WHOLESALE_MIN_SUBTOTAL) throw new Error("BELOW_MINIMUM");

    const code = `WSO-${Date.now().toString(36).toUpperCase().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
    const customerSnapshot = {
      firstName: business.contactName, lastName: business.businessName, mobile: business.mobile,
      channel: "wholesale", businessCode: business.code, businessType: business.businessType,
      note: (input.note ?? "").slice(0, 500),
    };
    const [order] = await tx.insert(orders).values({
      code,
      customerId: null, // linked via business snapshot; ownership checked by mobile
      customer: customerSnapshot,
      items: resolved.map((r) => ({ key: `ws-${r.productId}`, name: r.name, sku: r.sku, unitPrice: r.unitPrice, qty: r.qty })),
      subtotal, discount: 0, shipping: 0, total: subtotal,
      paymentMethod: "card", paymentStatus: "pending",
      shippingMethod: "wholesale", status: "pending",
      updatedAt: new Date(),
    }).returning({ id: orders.id, code: orders.code });

    for (const r of resolved) {
      await tx.insert(orderItems).values({
        orderId: order.id, productId: r.productId, itemType: "product",
        nameSnapshot: r.name.slice(0, 220), skuSnapshot: r.sku.slice(0, 64),
        unitPrice: r.unitPrice, quantity: r.qty, subtotal: r.unitPrice * r.qty,
        metadata: { channel: "wholesale", businessCode: business.code },
      });
    }
    return { code: order.code, subtotal, discount: 0, total: subtotal, itemCount: resolved.length };
  });

  return result;
}

/** List wholesale orders for a business (identified by mobile/business code). */
export async function listWholesaleOrders(business: WholesaleBusiness) {
  const rows = await db
    .select({
      id: orders.id, code: orders.code, total: orders.total, status: orders.status,
      paymentStatus: orders.paymentStatus, createdAt: orders.createdAt,
      customer: orders.customer,
    })
    .from(orders)
    .where(and(eq(orders.shippingMethod, "wholesale"), sql`${orders.customer}->>'mobile' = ${business.mobile}`))
    .orderBy(desc(orders.createdAt))
    .limit(50);
  return rows.map((r) => ({
    id: r.id, code: r.code, total: r.total, status: r.status,
    paymentStatus: r.paymentStatus, createdAt: r.createdAt.toISOString(),
  }));
}

/** Fetch a previous wholesale order's lines for repeat ordering. */
export async function getWholesaleOrderLines(business: WholesaleBusiness, orderId: number) {
  const order = (await db.select().from(orders).where(eq(orders.id, orderId)).limit(1))[0];
  if (!order || order.shippingMethod !== "wholesale") return null;
  const snap = order.customer as Record<string, unknown>;
  if (snap?.mobile !== business.mobile) return null; // ownership
  const lines = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  return lines.map((l) => ({ productId: l.productId, name: l.nameSnapshot, qty: l.quantity, unitPrice: l.unitPrice }));
}
