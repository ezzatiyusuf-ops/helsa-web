import "server-only";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  products,
  categories,
  productVariants,
  productImages,
  mazehTrays,
  mazehTrayItems,
  orders,
  orderItems,
  customers,
  inventoryMovements,
  accountingTransactions,
  adminAuditLogs,
  giftPackages,
  campaigns,
  contactMessages,
} from "@/db/schema";
import { AdminRuleError, type AdminPrincipal } from "@/lib/admin";
import { campaignAdminSchema } from "@/lib/admin-validation";
import type { z } from "zod";
import type { productAdminSchema, categoryAdminSchema, trayAdminSchema, inventorySchema, orderStatusSchema, accountingSchema } from "@/lib/admin-validation";

type ProductInput = z.infer<typeof productAdminSchema>;
type CategoryInput = z.infer<typeof categoryAdminSchema>;
type TrayInput = z.infer<typeof trayAdminSchema>;
type InventoryInput = z.infer<typeof inventorySchema>;
type OrderStatusInput = z.infer<typeof orderStatusSchema>;
type AccountingInput = z.infer<typeof accountingSchema>;

async function audit(admin: AdminPrincipal, action: string, entityType: string, entityId: string | number, before?: unknown, after?: unknown) {
  await db.insert(adminAuditLogs).values({
    adminEmail: admin.email,
    action,
    entityType,
    entityId: String(entityId),
    before: before as Record<string, unknown> | undefined,
    after: after as Record<string, unknown> | undefined,
  });
}

export async function getAdminDashboard() {
  const startDay = new Date(); startDay.setHours(0, 0, 0, 0);
  const startMonth = new Date(startDay.getFullYear(), startDay.getMonth(), 1);

  const [today, month, orderStats, stockStats, customerCount, inventoryValue, accounting, productStats, contactMessageCount, activeCampaignCount] = await Promise.all([
    db.select({ value: sql<number>`coalesce(sum(${orders.total}),0)::int` }).from(orders).where(and(eq(orders.paymentStatus, "paid"), sql`${orders.createdAt} >= ${startDay}`)),
    db.select({ value: sql<number>`coalesce(sum(${orders.total}),0)::int` }).from(orders).where(and(eq(orders.paymentStatus, "paid"), sql`${orders.createdAt} >= ${startMonth}`)),
    db.select({ total: sql<number>`count(*)::int`, pending: sql<number>`count(*) filter (where ${orders.status} = 'pending')::int` }).from(orders),
    db.select({ low: sql<number>`count(*) filter (where ${products.stock} > 0 and ${products.stock} <= ${products.lowStockThreshold})::int`, out: sql<number>`count(*) filter (where ${products.stock} <= 0)::int` }).from(products).where(eq(products.isActive, true)),
    db.select({ value: sql<number>`count(*)::int` }).from(customers),
    db.select({ value: sql<number>`coalesce(sum(coalesce(${products.costPrice},${products.price}) * ${products.stock}),0)::bigint` }).from(products).where(eq(products.isActive, true)),
    db.select({
      income: sql<number>`coalesce(sum(${accountingTransactions.amount}) filter (where ${accountingTransactions.type}='SALE'),0)::bigint`,
      expenses: sql<number>`coalesce(sum(${accountingTransactions.amount}) filter (where ${accountingTransactions.type} in ('EXPENSE','PURCHASE')),0)::bigint`,
      refunds: sql<number>`coalesce(sum(${accountingTransactions.amount}) filter (where ${accountingTransactions.type}='REFUND'),0)::bigint`,
    }).from(accountingTransactions),
    db.select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${products.isActive} and ${products.isVisible})::int`,
    }).from(products),
    db.select({ value: sql<number>`count(*)::int` }).from(contactMessages),
    db.select({ value: sql<number>`count(*)::int` }).from(campaigns).where(eq(campaigns.active, true)),
  ]);

  return {
    productsTotal: Number(productStats[0]?.total ?? 0),
    productsActive: Number(productStats[0]?.active ?? 0),
    contactMessages: Number(contactMessageCount[0]?.value ?? 0),
    activeCampaigns: Number(activeCampaignCount[0]?.value ?? 0),
    salesToday: Number(today[0]?.value ?? 0),
    salesMonth: Number(month[0]?.value ?? 0),
    orders: Number(orderStats[0]?.total ?? 0),
    pendingOrders: Number(orderStats[0]?.pending ?? 0),
    lowStock: Number(stockStats[0]?.low ?? 0),
    outOfStock: Number(stockStats[0]?.out ?? 0),
    customers: Number(customerCount[0]?.value ?? 0),
    inventoryValue: Number(inventoryValue[0]?.value ?? 0),
    accounting: accounting[0] ?? { income: 0, expenses: 0, refunds: 0 },
  };
}

export async function listAdminProducts(filters: { q?: string; category?: string; stock?: string; active?: string }) {
  const clauses = [];
  if (filters.q) clauses.push(or(ilike(products.name, `%${filters.q}%`), ilike(products.sku, `%${filters.q}%`), ilike(products.slug, `%${filters.q}%`))!);
  if (filters.category) clauses.push(eq(products.category, filters.category));
  if (filters.stock === "low") clauses.push(and(sql`${products.stock} > 0`, sql`${products.stock} <= ${products.lowStockThreshold}`)!);
  if (filters.stock === "out") clauses.push(sql`${products.stock} <= 0`);
  if (filters.stock === "available") clauses.push(sql`${products.stock} > 0`);
  if (filters.active === "true") clauses.push(eq(products.isActive, true));
  if (filters.active === "false") clauses.push(eq(products.isActive, false));
  return db.select().from(products).where(clauses.length ? and(...clauses) : undefined).orderBy(desc(products.updatedAt));
}

export async function getAdminProduct(id: number) {
  const rows = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!rows[0]) return null;
  const [variants, images] = await Promise.all([
    db.select().from(productVariants).where(eq(productVariants.productId, id)).orderBy(asc(productVariants.sortOrder)),
    db.select().from(productImages).where(eq(productImages.productId, id)).orderBy(asc(productImages.sortOrder)),
  ]);
  return { ...rows[0], variants, images };
}


/** Storefront publish gate — a product cannot go live without mandatory label data. */
function assertPublishable(input: {
  isActive?: boolean; isVisible?: boolean; weight?: string; ingredients?: string; storage?: string;
  packaging?: string; origin?: string; allergens?: string[]; prodDate?: string; expDate?: string;
}) {
  if (!(input.isActive && input.isVisible)) return; // drafts / hidden products may stay incomplete
  const missing: string[] = [];
  if (!input.weight?.trim()) missing.push("وزن");
  if (!input.ingredients?.trim()) missing.push("مواد اولیه");
  if (!input.storage?.trim()) missing.push("شرایط نگهداری");
  if (!input.packaging?.trim()) missing.push("نوع بسته‌بندی");
  if (!input.origin?.trim()) missing.push("محل تولید");
  if (!input.allergens?.length) missing.push("آلرژن‌ها");
  if (!input.prodDate?.trim()) missing.push("تاریخ تولید");
  if (!input.expDate?.trim()) missing.push("تاریخ انقضا");
  if (missing.length) throw new Error(`انتشار محصول در فروشگاه نیازمند تکمیل این فیلدهاست: ${missing.join("، ")}`);
}

/** Replace/add the two batch-date feature entries; empty input removes them. */
function withDateFeatures(existing: unknown, prodDate: string, expDate: string): { label: string; value: string }[] {
  const list: { label: string; value: string }[] = Array.isArray(existing)
    ? (existing as { label?: string; value?: string }[]).filter(
        (f): f is { label: string; value: string } => typeof f?.label === "string" && f.label !== "تاریخ تولید" && f.label !== "تاریخ انقضا",
      )
    : [];
  if (prodDate.trim()) list.push({ label: "تاریخ تولید", value: prodDate.trim() });
  if (expDate.trim()) list.push({ label: "تاریخ انقضا", value: expDate.trim() });
  return list;
}

export async function createProduct(input: ProductInput, admin: AdminPrincipal) {
  return db.transaction(async (tx) => {
    const categoryRow = await tx.select({ id: categories.id }).from(categories).where(eq(categories.slug, input.category)).limit(1);
    if (!categoryRow[0]) throw new Error("دسته‌بندی انتخاب‌شده وجود ندارد.");
    const discount = input.oldPrice && input.oldPrice > input.price ? Math.round(((input.oldPrice - input.price) / input.oldPrice) * 100) : 0;
    assertPublishable(input);
    const { variants, prodDate, expDate, ...productInput } = input;
    const dupe = await tx.select({ id: products.id }).from(products).where(eq(products.slug, input.slug)).limit(1);
    if (dupe[0]) throw new Error("PRODUCT_SLUG_EXISTS");
    const inserted = await tx.insert(products).values({
      ...productInput,
      discountStartsAt: input.discountStartsAt ? new Date(`${input.discountStartsAt}T00:00:00`) : null,
      categoryId: categoryRow[0].id,
      discount,
      stockStatus: input.stock > 0 ? (input.stock <= input.lowStockThreshold ? "low_stock" : "in_stock") : "out_of_stock",
      imageStatus: "admin_selected",
      imageAlt: input.imageAlt,
      allergens: input.allergens,
      features: withDateFeatures([], prodDate, expDate),
      updatedAt: new Date(),
    }).returning();
    const product = inserted[0];
    if (variants.length) await tx.insert(productVariants).values(variants.map((v) => ({ ...v, productId: product.id })));
    await tx.insert(productImages).values({ productId: product.id, url: input.image, alt: input.imageAlt, isPrimary: true, sortOrder: 0, requiresReplacement: false });
    await tx.insert(inventoryMovements).values({ productId: product.id, quantityChange: input.stock, previousQuantity: 0, newQuantity: input.stock, reason: "ورود کالا", note: "ایجاد محصول", createdBy: admin.email });
    await tx.insert(adminAuditLogs).values({ adminEmail: admin.email, action: "CREATE", entityType: "PRODUCT", entityId: String(product.id), after: product as unknown as Record<string, unknown> });
    return product;
  });
}

export async function updateProduct(id: number, input: ProductInput, admin: AdminPrincipal) {
  // slug uniqueness on update (excluding the product itself)
  const dupe = await db.select({ id: products.id }).from(products).where(eq(products.slug, input.slug)).limit(1);
  if (dupe[0] && dupe[0].id !== id) throw new Error("PRODUCT_SLUG_EXISTS");
  return db.transaction(async (tx) => {
    const before = (await tx.select().from(products).where(eq(products.id, id)).limit(1))[0];
    if (!before) throw new Error("محصول یافت نشد.");
    assertPublishable(input);
    const categoryRow = await tx.select({ id: categories.id }).from(categories).where(eq(categories.slug, input.category)).limit(1);
    if (!categoryRow[0]) throw new Error("دسته‌بندی انتخاب‌شده وجود ندارد.");
    const discount = input.oldPrice && input.oldPrice > input.price ? Math.round(((input.oldPrice - input.price) / input.oldPrice) * 100) : 0;
    const updated = (await tx.update(products).set({
      name: input.name, slug: input.slug, category: input.category, categoryId: categoryRow[0].id, sku: input.sku,
      shortDescription: input.shortDescription, description: input.description, price: input.price, oldPrice: input.oldPrice,
      discountStartsAt: input.discountStartsAt ? new Date(`${input.discountStartsAt}T00:00:00`) : null,
      costPrice: input.costPrice, discount, stock: input.stock, stockStatus: input.stock > 0 ? (input.stock <= input.lowStockThreshold ? "low_stock" : "in_stock") : "out_of_stock",
      lowStockThreshold: input.lowStockThreshold, minOrderQty: input.minOrderQty, maxOrderQty: input.maxOrderQty,
      weight: input.weight, unit: input.unit, packaging: input.packaging, ingredients: input.ingredients, origin: input.origin,
      storage: input.storage, image: input.image, imageAlt: input.imageAlt, imageStatus: "admin_selected",
      allergens: input.allergens, features: withDateFeatures(before.features, input.prodDate, input.expDate),
      isActive: input.isActive, isFeatured: input.isFeatured, isVisible: input.isVisible, seoTitle: input.seoTitle,
      seoDescription: input.seoDescription, badge: input.badge, updatedAt: new Date(), archivedAt: input.isActive ? null : before.archivedAt ?? new Date(),
    }).where(eq(products.id, id)).returning())[0];

    const existingVariants = await tx.select({ id: productVariants.id }).from(productVariants).where(eq(productVariants.productId, id));
    if (existingVariants.length) await tx.delete(productVariants).where(eq(productVariants.productId, id));
    if (input.variants.length) await tx.insert(productVariants).values(input.variants.map(({ id: _id, ...v }) => ({ ...v, productId: id })));
    await tx.delete(productImages).where(and(eq(productImages.productId, id), eq(productImages.isPrimary, true)));
    await tx.insert(productImages).values({ productId: id, url: input.image, alt: input.imageAlt, isPrimary: true, sortOrder: 0, requiresReplacement: false });
    if (before.stock !== input.stock) await tx.insert(inventoryMovements).values({ productId: id, quantityChange: input.stock - before.stock, previousQuantity: before.stock, newQuantity: input.stock, reason: "اصلاح موجودی", note: "ویرایش محصول", createdBy: admin.email });
    await tx.insert(adminAuditLogs).values({ adminEmail: admin.email, action: "UPDATE", entityType: "PRODUCT", entityId: String(id), before: before as unknown as Record<string, unknown>, after: updated as unknown as Record<string, unknown> });
    return updated;
  });
}

export async function archiveProduct(id: number, admin: AdminPrincipal) {
  const before = (await db.select().from(products).where(eq(products.id, id)).limit(1))[0];
  if (!before) throw new Error("محصول یافت نشد.");
  const updated = (await db.update(products).set({ isActive: false, isVisible: false, archivedAt: new Date(), updatedAt: new Date() }).where(eq(products.id, id)).returning())[0];
  await audit(admin, "ARCHIVE", "PRODUCT", id, before, updated);
  return updated;
}

export async function listAdminCategories() {
  return db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name));
}
export async function createCategory(input: CategoryInput, admin: AdminPrincipal) {
  const row = (await db.insert(categories).values(input).returning())[0];
  await audit(admin, "CREATE", "CATEGORY", row.id, undefined, row);
  return row;
}
export async function updateCategory(id: number, input: Partial<CategoryInput>, admin: AdminPrincipal) {
  const before = (await db.select().from(categories).where(eq(categories.id, id)).limit(1))[0];
  if (!before) throw new Error("دسته‌بندی یافت نشد.");
  const row = (await db.update(categories).set({ ...input, updatedAt: new Date() }).where(eq(categories.id, id)).returning())[0];
  await audit(admin, "UPDATE", "CATEGORY", id, before, row);
  return row;
}
export async function archiveCategory(id: number, admin: AdminPrincipal) {
  return updateCategory(id, { isActive: false }, admin);
}

export async function listAdminTrays() { return db.select().from(mazehTrays).orderBy(desc(mazehTrays.updatedAt)); }
export async function getAdminTray(id: number) {
  const row = (await db.select().from(mazehTrays).where(eq(mazehTrays.id, id)).limit(1))[0];
  if (!row) return null;
  const items = await db.select().from(mazehTrayItems).where(eq(mazehTrayItems.trayId, id)).orderBy(asc(mazehTrayItems.sortOrder));
  return { ...row, items };
}
export async function createTray(input: TrayInput, admin: AdminPrincipal) {
  return db.transaction(async (tx) => {
    const row = (await tx.insert(mazehTrays).values(input).returning())[0];
    if (input.contents.length) await tx.insert(mazehTrayItems).values(input.contents.map((c, i) => ({ trayId: row.id, title: c.title, quantity: c.qty, section: c.section, sortOrder: i })));
    await tx.insert(adminAuditLogs).values({ adminEmail: admin.email, action: "CREATE", entityType: "TRAY", entityId: String(row.id), after: row as unknown as Record<string, unknown> });
    return row;
  });
}
export async function updateTray(id: number, input: TrayInput, admin: AdminPrincipal) {
  return db.transaction(async (tx) => {
    const before = (await tx.select().from(mazehTrays).where(eq(mazehTrays.id, id)).limit(1))[0];
    if (!before) throw new Error("سینی یافت نشد.");
    const row = (await tx.update(mazehTrays).set({ ...input, updatedAt: new Date(), archivedAt: input.active ? null : before.archivedAt ?? new Date() }).where(eq(mazehTrays.id, id)).returning())[0];
    await tx.delete(mazehTrayItems).where(eq(mazehTrayItems.trayId, id));
    if (input.contents.length) await tx.insert(mazehTrayItems).values(input.contents.map((c, i) => ({ trayId: id, title: c.title, quantity: c.qty, section: c.section, sortOrder: i })));
    await tx.insert(adminAuditLogs).values({ adminEmail: admin.email, action: "UPDATE", entityType: "TRAY", entityId: String(id), before: before as unknown as Record<string, unknown>, after: row as unknown as Record<string, unknown> });
    return row;
  });
}
export async function archiveTray(id: number, admin: AdminPrincipal) {
  const before = (await db.select().from(mazehTrays).where(eq(mazehTrays.id, id)).limit(1))[0];
  if (!before) throw new Error("سینی یافت نشد.");
  const row = (await db.update(mazehTrays).set({ active: false, archivedAt: new Date(), updatedAt: new Date() }).where(eq(mazehTrays.id, id)).returning())[0];
  await audit(admin, "ARCHIVE", "TRAY", id, before, row);
  return row;
}

export async function listInventory(filters: { status?: string; q?: string }) {
  const clauses = [];
  if (filters.q) clauses.push(or(ilike(products.name, `%${filters.q}%`), ilike(products.sku, `%${filters.q}%`))!);
  if (filters.status === "low") clauses.push(and(sql`${products.stock} > 0`, sql`${products.stock} <= ${products.lowStockThreshold}`)!);
  if (filters.status === "out") clauses.push(sql`${products.stock} <= 0`);
  if (filters.status === "available") clauses.push(sql`${products.stock} > ${products.lowStockThreshold}`);
  const rows = await db.select({ id: products.id, name: products.name, sku: products.sku, stock: products.stock, lowStockThreshold: products.lowStockThreshold, stockStatus: products.stockStatus, isActive: products.isActive }).from(products).where(clauses.length ? and(...clauses) : undefined).orderBy(asc(products.stock));
  return rows;
}

export async function changeInventory(id: number, input: InventoryInput, admin: AdminPrincipal) {
  return db.transaction(async (tx) => {
    const before = (await tx.select().from(products).where(eq(products.id, id)).limit(1))[0];
    if (!before) throw new Error("محصول یافت نشد.");
    let next = before.stock;
    if (input.mode === "increase") next += input.quantity;
    if (input.mode === "decrease") next = Math.max(0, next - input.quantity);
    if (input.mode === "set") next = input.quantity;
    if (input.mode === "unavailable") next = 0;
    const status = next <= 0 ? "out_of_stock" : next <= before.lowStockThreshold ? "low_stock" : "in_stock";
    const row = (await tx.update(products).set({ stock: next, stockStatus: status, updatedAt: new Date() }).where(eq(products.id, id)).returning())[0];
    await tx.insert(inventoryMovements).values({ productId: id, quantityChange: next - before.stock, previousQuantity: before.stock, newQuantity: next, reason: input.reason, note: input.note, createdBy: admin.email });
    await tx.insert(adminAuditLogs).values({ adminEmail: admin.email, action: "INVENTORY_UPDATE", entityType: "PRODUCT", entityId: String(id), before: { stock: before.stock }, after: { stock: next, reason: input.reason } });
    return row;
  });
}

export async function listInventoryMovements(productId?: number) {
  return db.select().from(inventoryMovements).where(productId ? eq(inventoryMovements.productId, productId) : undefined).orderBy(desc(inventoryMovements.createdAt)).limit(200);
}

export async function listAdminOrders(q?: string) {
  return db.select().from(orders).where(q ? ilike(orders.code, `%${q}%`) : undefined).orderBy(desc(orders.createdAt));
}

export async function updateOrderStatus(id: number, input: OrderStatusInput, admin: AdminPrincipal) {
  return db.transaction(async (tx) => {
    const before = (await tx.select().from(orders).where(eq(orders.id, id)).limit(1))[0];
    if (!before) throw new Error("سفارش یافت نشد.");
    // قاعدهٔ گذار وضعیت — گذارهای بی‌معنا (مثل delivered → pending) سمت سرور مسدود می‌شوند.
    const ALLOWED: Record<string, string[]> = {
      pending: ["paid", "preparing", "cancelled"],
      paid: ["preparing", "cancelled", "refunded"],
      preparing: ["shipped", "cancelled", "refunded", "paid"],
      shipped: ["transit", "delivered", "refunded", "preparing"],
      transit: ["delivered", "refunded", "shipped"],
      delivered: ["refunded"],
      cancelled: ["pending", "refunded"],
      refunded: [],
    };
    if (before.status !== input.status && !(ALLOWED[before.status] ?? []).includes(input.status)) {
      throw new AdminRuleError(`گذار وضعیت «${before.status} → ${input.status}» مجاز نیست. گزینه‌های مجاز از «${before.status}»: ${(ALLOWED[before.status] ?? []).join("، ") || "هیچ — وضعیت نهایی"}`);
    }
    const paymentStatus = input.paymentStatus ?? before.paymentStatus;
    const row = (await tx.update(orders).set({ status: input.status, paymentStatus, paymentReference: input.paymentReference, paidAt: paymentStatus === "paid" ? before.paidAt ?? new Date() : before.paidAt, updatedAt: new Date() }).where(eq(orders.id, id)).returning())[0];

    // Idempotent accounting: the unique reference index prevents duplicate SALE/REFUND rows.
    if (paymentStatus === "paid") {
      await tx.insert(accountingTransactions).values({ type: "SALE", amount: before.total, description: `فروش سفارش ${before.code}`, referenceType: "ORDER", referenceId: before.code, createdBy: admin.email }).onConflictDoNothing();
    }
    // فاکتور یکتای سفارش — هم‌راستایی مالی (Part I)؛ outside tx helper uses its own client
    if (paymentStatus === "paid" && before.paymentStatus !== "paid") {
      const { ensureInvoiceForOrder } = await import("@/services/invoicing");
      await ensureInvoiceForOrder(id).catch(() => null);
    }
    if (input.status === "refunded") {
      await tx.insert(accountingTransactions).values({ type: "REFUND", amount: before.total, description: `مرجوعی سفارش ${before.code}`, referenceType: "ORDER", referenceId: before.code, createdBy: admin.email }).onConflictDoNothing();
    }

    // بازگردانی موجودی هنگام لغو/مرجوعی — فقط در گذر از وضعیت فعال (idempotent)
    const ACTIVE_STATUSES = ["pending", "paid", "preparing", "shipped", "transit", "delivered"];
    const RESTOCK_STATUSES = ["cancelled", "refunded"];
    if (RESTOCK_STATUSES.includes(input.status) && ACTIVE_STATUSES.includes(before.status)) {
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, id));
      for (const it of items) {
        if (it.productId) {
          const p = (await tx.select({ stock: products.stock, low: products.lowStockThreshold }).from(products).where(eq(products.id, it.productId)).limit(1))[0];
          if (p) {
            const next = p.stock + it.quantity;
            await tx.update(products).set({
              stock: next,
              stockStatus: next <= 0 ? "out_of_stock" : next <= p.low ? "low_stock" : "in_stock",
              updatedAt: new Date(),
            }).where(eq(products.id, it.productId));
            await tx.insert(inventoryMovements).values({ productId: it.productId, variantId: it.variantId ?? null, quantityChange: it.quantity, previousQuantity: p.stock, newQuantity: next, reason: "مرجوعی", note: `بازگردانی سفارش ${before.code}`, createdBy: admin.email, referenceType: "ORDER", referenceId: before.code });
          }
          if (it.variantId) {
            await tx.update(productVariants).set({ stock: sql`${productVariants.stock} + ${it.quantity}`, updatedAt: new Date() }).where(eq(productVariants.id, it.variantId));
          }
        }
        if (it.trayId) {
          const t = (await tx.select({ stock: mazehTrays.stock }).from(mazehTrays).where(eq(mazehTrays.id, it.trayId)).limit(1))[0];
          if (t) {
            await tx.update(mazehTrays).set({ stock: sql`${mazehTrays.stock} + ${it.quantity}`, updatedAt: new Date() }).where(eq(mazehTrays.id, it.trayId));
            await tx.insert(inventoryMovements).values({ trayId: it.trayId, quantityChange: it.quantity, previousQuantity: t.stock, newQuantity: t.stock + it.quantity, reason: "مرجوعی", note: `بازگردانی سفارش ${before.code}`, createdBy: admin.email, referenceType: "ORDER", referenceId: before.code });
          }
        }
        if (it.itemType === "gift") {
          const packId = Number((it.metadata as Record<string, unknown> | null)?.packageId);
          if (Number.isInteger(packId)) {
            await tx.update(giftPackages).set({ stock: sql`${giftPackages.stock} + ${it.quantity}`, updatedAt: new Date() }).where(eq(giftPackages.id, packId));
          }
        }
      }
    }
    await tx.insert(adminAuditLogs).values({ adminEmail: admin.email, action: "STATUS_UPDATE", entityType: "ORDER", entityId: String(id), before: { status: before.status, paymentStatus: before.paymentStatus }, after: { status: row.status, paymentStatus: row.paymentStatus } });
    return row;
  });
}

export async function listCustomers(q?: string) {
  const customerRows = await db.select().from(customers).where(q ? or(ilike(customers.name, `%${q}%`), ilike(customers.phone, `%${q}%`), ilike(customers.email, `%${q}%`)) : undefined).orderBy(desc(customers.createdAt));
  const orderTotals = await db.select({ customerId: orders.customerId, orders: sql<number>`count(*)::int`, total: sql<number>`coalesce(sum(${orders.total}),0)::bigint` }).from(orders).where(sql`${orders.customerId} is not null`).groupBy(orders.customerId);
  const totals = new Map(orderTotals.map((r) => [r.customerId, r]));
  return customerRows.map((c) => ({ ...c, orderCount: totals.get(c.id)?.orders ?? 0, totalPurchases: Number(totals.get(c.id)?.total ?? 0) }));
}

export async function getAccounting(from?: Date, to?: Date) {
  const clauses = [];
  if (from) clauses.push(sql`${accountingTransactions.createdAt} >= ${from}`);
  if (to) clauses.push(sql`${accountingTransactions.createdAt} <= ${to}`);
  const rows = await db.select().from(accountingTransactions).where(clauses.length ? and(...clauses) : undefined).orderBy(desc(accountingTransactions.createdAt)).limit(500);
  const summary = rows.reduce((acc, r) => {
    if (r.type === "SALE") acc.sales += r.amount;
    if (r.type === "REFUND") acc.refunds += r.amount;
    if (r.type === "EXPENSE" || r.type === "PURCHASE") acc.expenses += r.amount;
    return acc;
  }, { sales: 0, refunds: 0, expenses: 0 });
  const pending = await db.select({ value: sql<number>`coalesce(sum(${orders.total}),0)::bigint` }).from(orders).where(eq(orders.paymentStatus, "pending"));
  return { rows, summary: { ...summary, received: summary.sales - summary.refunds, pending: Number(pending[0]?.value ?? 0) } };
}

export async function createAccounting(input: AccountingInput, admin: AdminPrincipal) {
  const row = (await db.insert(accountingTransactions).values({ ...input, createdBy: admin.email }).returning())[0];
  await audit(admin, "CREATE", "ACCOUNTING", row.id, undefined, row);
  return row;
}

export async function adminSearch(q: string) {
  const like = `%${q}%`;
  const [productRows, categoryRows, trayRows, orderRows, customerRows] = await Promise.all([
    db.select({ id: products.id, label: products.name, meta: products.sku }).from(products).where(or(ilike(products.name, like), ilike(products.sku, like))).limit(8),
    db.select({ id: categories.id, label: categories.name, meta: categories.slug }).from(categories).where(ilike(categories.name, like)).limit(8),
    db.select({ id: mazehTrays.id, label: mazehTrays.name, meta: mazehTrays.sku }).from(mazehTrays).where(ilike(mazehTrays.name, like)).limit(8),
    db.select({ id: orders.id, label: orders.code, meta: orders.status }).from(orders).where(ilike(orders.code, like)).limit(8),
    db.select({ id: customers.id, label: customers.name, meta: customers.phone }).from(customers).where(or(ilike(customers.name, like), ilike(customers.phone, like), ilike(customers.email, like))).limit(8),
  ]);
  return { products: productRows, categories: categoryRows, trays: trayRows, orders: orderRows, customers: customerRows };
}

/* ————————————————— کمپین‌ها (§ادمین بریف) ————————————————— */

export type CampaignInput = z.infer<typeof campaignAdminSchema>;

export async function listAdminCampaigns() {
  return db.select().from(campaigns).orderBy(desc(campaigns.id));
}

export async function createCampaign(input: CampaignInput, admin: AdminPrincipal) {
  const dupe = await db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.slug, input.slug)).limit(1);
  if (dupe[0]) throw new Error("CAMPAIGN_SLUG_EXISTS");
  return db.transaction(async (tx) => {
    const inserted = (await tx.insert(campaigns).values(input).returning())[0];
    await tx.insert(adminAuditLogs).values({ adminEmail: admin.email, action: "CREATE", entityType: "CAMPAIGN", entityId: String(inserted.id), after: inserted as unknown as Record<string, unknown> });
    return inserted;
  });
}

export async function updateCampaign(id: number, input: CampaignInput, admin: AdminPrincipal) {
  const dupe = await db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.slug, input.slug)).limit(1);
  if (dupe[0] && dupe[0].id !== id) throw new Error("CAMPAIGN_SLUG_EXISTS");
  return db.transaction(async (tx) => {
    const before = (await tx.select().from(campaigns).where(eq(campaigns.id, id)).limit(1))[0];
    if (!before) throw new Error("کمپین یافت نشد.");
    const updated = (await tx.update(campaigns).set(input).where(eq(campaigns.id, id)).returning())[0];
    await tx.insert(adminAuditLogs).values({ adminEmail: admin.email, action: "UPDATE", entityType: "CAMPAIGN", entityId: String(id), before: before as unknown as Record<string, unknown>, after: updated as unknown as Record<string, unknown> });
    return updated;
  });
}
