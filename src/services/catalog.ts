import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { products, productVariants, categories, mazehTrays, coupons, campaigns, reviews, producers } from "@/db/schema";
import { PRODUCTS } from "@/data/products";
import { CATEGORIES } from "@/data/categories";
import { TRAYS } from "@/data/trays";
import { COUPONS, CAMPAIGNS } from "@/data/content";
import type { Campaign, Category, Coupon, MazehTray, Product } from "@/types";

/** PostgreSQL → service → UI. Seed arrays are development-only resilience fallback. */
function toDate(v: Date | string): string { return v instanceof Date ? v.toISOString() : v; }

/**
 * شفافیت بیلد/production: اگر آخرین خواندن کاتالوگ از DB نباشد (fallback به seed)
 * این پرچم false است. generateStaticParams با آن، پیش‌رندرِ دادهٔ کهنه را دور می‌زند
 * و لاگ‌های بیلد صریح اعلام می‌کنند که چه اتفاقی افتاده است.
 */
let catalogDbHealthy = false;
export function wasCatalogDbHealthy(): boolean {
  return catalogDbHealthy;
}
const IS_BUILD_PHASE = process.env.NEXT_PHASE === "phase-production-build";
function warnBuildFallback(what: string): void {
  catalogDbHealthy = false;
  if (IS_BUILD_PHASE) {
    console.warn(
      `[HELSA build] دیتابیس در دسترس نیست — ${what} به دادهٔ seed برمی‌گردد. ` +
        "برای پیش‌رندر صحیح، DATABASE_URL را در محیط بیلد تنظیم کنید (PostgreSQL میزبانی‌شده).",
    );
  }
}

export async function getCategories(): Promise<Category[]> {
  try {
    const rows = await db.select().from(categories).where(eq(categories.isActive, true)).orderBy(asc(categories.sortOrder));
    catalogDbHealthy = true; // کوئری موفق — حتی اگر خالی
    if (rows.length) return rows.map((r) => ({
      id: r.id, name: r.name, slug: r.slug, description: r.description, shortDescription: r.shortDescription,
      image: r.image, imageAlt: r.imageAlt, icon: r.icon, subs: r.subs, sortOrder: r.sortOrder,
      isActive: r.isActive, seoTitle: r.seoTitle, seoDescription: r.seoDescription,
    }));
  } catch {
    warnBuildFallback("getCategories");
  }
  return CATEGORIES;
}


/** Non-empty value that still has meaning after stripping separators/whitespace. */
function meaningful(v: string | null | undefined): boolean {
  return Boolean(v && v.replace(/[؛;،,.\s-]/g, "").length >= 2);
}
function dateFeature(features: { label?: string; value?: string }[], label: string): string | null {
  const f = features?.find((x) => x?.label === label);
  return meaningful(f?.value) ? (f!.value as string) : null;
}

export async function getProducts(): Promise<Product[]> {
  try {
    const [allRows, variantRows, reviewRows] = await Promise.all([
      db.select().from(products).where(and(eq(products.isActive, true), eq(products.isVisible, true))),
      db.select().from(productVariants).where(eq(productVariants.isActive, true)).orderBy(asc(productVariants.sortOrder)),
      // Real ratings only: aggregate from approved reviews, never from seeded product columns
      db.select({
        productId: reviews.productId,
        count: sql<number>`count(*)::int`,
        avg: sql<number>`round(avg(${reviews.rating})::numeric, 1)::float`,
      }).from(reviews).where(eq(reviews.isApproved, true)).groupBy(reviews.productId),
    ]);
    catalogDbHealthy = true; // کوئری موفق — حتی اگر خالی
    // ── دروازهٔ روزیته: محصولِ تولیدکنندهٔ منتشرنشده در کاتالوگ عمومی نمی‌آید ──
    const producerIds = [...new Set(allRows.map((r) => r.producerId).filter((v): v is number => v != null))];
    let publishedProducerIds = new Set<number>();
    if (producerIds.length) {
      const rowsPub = await db.select({ id: producers.id }).from(producers)
        .where(and(inArray(producers.id, producerIds), eq(producers.status, "published")));
      publishedProducerIds = new Set(rowsPub.map((r) => r.id));
    }
    const rows = allRows.filter((r) => r.producerId == null || publishedProducerIds.has(r.producerId));
    const variantsByProduct = new Map<number, typeof variantRows>();
    for (const variant of variantRows) variantsByProduct.set(variant.productId, [...(variantsByProduct.get(variant.productId) ?? []), variant]);
    const reviewsByProduct = new Map(reviewRows.map((r) => [r.productId, r]));
    if (rows.length) return rows.map((r) => ({
      id: r.id, name: r.name, slug: r.slug, category: r.category, categoryId: r.categoryId, sku: r.sku,
      brand: r.brand, shortDescription: r.shortDescription, price: r.price,
      // brief 2.4: strikethrough only when a real previous price has a (reached) start date
      oldPrice: r.oldPrice && r.discountStartsAt && r.discountStartsAt.getTime() <= Date.now() ? r.oldPrice : null,
      discount: r.oldPrice && r.discountStartsAt && r.discountStartsAt.getTime() <= Date.now() ? r.discount : 0,
      weight: r.weight, image: r.image, gallery: r.gallery, description: r.description,
      rating: reviewsByProduct.get(r.id)?.avg ?? 0, reviews: reviewsByProduct.get(r.id)?.count ?? 0,
      stock: r.stock, stockStatus: r.stockStatus, lowStockThreshold: r.lowStockThreshold, minOrderQty: r.minOrderQty,
      maxOrderQty: r.maxOrderQty, isActive: r.isActive, isFeatured: r.isFeatured, isVisible: r.isVisible,
      badge: r.badge, tags: r.tags,
      variants: (variantsByProduct.get(r.id) ?? []).map((v) => ({ id: v.id, name: v.name, sku: v.sku, price: v.price, compareAtPrice: v.compareAtPrice, stock: v.stock, weight: v.weight, unit: v.unit, flavor: v.flavor, isActive: v.isActive, sortOrder: v.sortOrder })),
      features: [
        // never render a field whose value is empty or separator-only (e.g. "؛")
        ...r.features.filter((f) => !["نوع بسته‌بندی", "مواد اولیه", "محل تولید", "تاریخ تولید", "تاریخ انقضا"].includes(f.label) && f.value && f.value.trim()),
        ...(meaningful(r.packaging) ? [{ label: "نوع بسته‌بندی", value: r.packaging!.trim() }] : []),
        ...(meaningful(r.ingredients) ? [{ label: "مواد اولیه", value: r.ingredients!.trim() }] : []),
        ...(meaningful(r.origin) ? [{ label: "محل تولید", value: r.origin!.trim() }] : []),
        ...(dateFeature(r.features, "تاریخ تولید") ? [{ label: "تاریخ تولید", value: dateFeature(r.features, "تاریخ تولید")! }] : []),
        ...(dateFeature(r.features, "تاریخ انقضا") ? [{ label: "تاریخ انقضا", value: dateFeature(r.features, "تاریخ انقضا")! }] : []),
      ],
      nutrition: r.nutrition, storage: r.storage, packaging: r.packaging, ingredients: r.ingredients, origin: r.origin,
      unit: r.unit, imageAlt: r.imageAlt, seoTitle: r.seoTitle, seoDescription: r.seoDescription,
      allergens: r.allergens, createdAt: toDate(r.createdAt),
    }));
  } catch {
    warnBuildFallback("getProducts");
  }
  // same strikethrough gate as the DB path (brief 2.4)
  return PRODUCTS.map((p) => {
    const started = p.discountStartsAt ? new Date(p.discountStartsAt).getTime() <= Date.now() : false;
    return started || !p.oldPrice ? p : { ...p, oldPrice: null, discount: 0 };
  });
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  return (await getProducts()).find((p) => p.slug === slug);
}

export async function getTrays(): Promise<MazehTray[]> {
  try {
    const rows = await db.select().from(mazehTrays).where(eq(mazehTrays.active, true));
    if (rows.length) return rows.map((r) => ({
      id: r.id, name: r.name, slug: r.slug, shortDescription: r.shortDescription, description: r.description,
      image: r.image, basePrice: r.basePrice, oldPrice: r.oldPrice, size: r.size, servesMin: r.servesMin,
      servesMax: r.servesMax, featured: r.featured, active: r.active, sku: r.sku, stock: r.stock,
      lowStockThreshold: r.lowStockThreshold, weight: r.weight, imageAlt: r.imageAlt,
      seoTitle: r.seoTitle, seoDescription: r.seoDescription, allergens: r.allergens,
      pairings: r.pairings, occasions: r.occasions,
      contents: r.contents.map((c) => ({ title: c.title, section: c.section as MazehTray["contents"][number]["section"], qty: c.qty, productId: c.productId })),
      storage: r.storage, freshness: r.freshness, createdAt: toDate(r.createdAt),
    }));
  } catch { /* development fallback */ }
  return TRAYS;
}

export async function getTrayBySlug(slug: string): Promise<MazehTray | undefined> {
  return (await getTrays()).find((t) => t.slug === slug);
}

export async function getCoupons(): Promise<Coupon[]> {
  try {
    const rows = await db.select().from(coupons);
    if (rows.length) return rows.map((r) => ({
      code: r.code, type: r.type as Coupon["type"], value: r.value, minimumPurchase: r.minimumPurchase,
      maximumDiscount: r.maximumDiscount, startDate: r.startDate, endDate: r.endDate,
      usageLimit: r.usageLimit, usedCount: r.usedCount, active: r.active, label: r.label,
    }));
  } catch { /* development fallback */ }
  return COUPONS;
}

export async function getCampaigns(): Promise<Campaign[]> {
  try {
    const rows = await db.select().from(campaigns);
    if (rows.length) return rows.map((r) => ({
      id: r.id, title: r.title, slug: r.slug, banner: r.banner, description: r.description,
      startDate: r.startDate, endDate: r.endDate, discount: r.discount, category: r.category, active: r.active,
    }));
  } catch { /* development fallback */ }
  return CAMPAIGNS;
}
