/*
 * Additive development catalog seed.
 * Command: npx tsx --env-file=.env scripts/seed-catalog.ts
 *
 * IMPORTANT: Prices, stock counts and third-party photographs are DEVELOPMENT
 * seed values/references. Review them in /admin before production. Product image
 * rows are marked requiresReplacement=true when they are external references.
 */
import { eq, sql } from "drizzle-orm";
import { db } from "../src/db";
import { categories, products, productVariants, productImages, inventoryMovements, mazehTrays, shippingMethods } from "../src/db/schema";
import { CATALOG_CATEGORIES, CATALOG_PRODUCTS } from "./catalog-data";

const money = (n: number) => Math.round(n / 1000) * 1000;
const skuPart = (index: number) => `CAT-${String(index + 1).padStart(4, "0")}`;

async function alignSequence(table: string) {
  await db.execute(sql.raw(`SELECT setval(pg_get_serial_sequence('${table}','id'), coalesce((SELECT max(id) FROM ${table}),0)+1, false)`));
}

async function main() {
  console.log("HELSA catalog seed (additive)…");
  await alignSequence("categories");
  await alignSequence("products");
  await alignSequence("mazeh_trays");

  const categoryIds = new Map<string, number>();
  for (let i = 0; i < CATALOG_CATEGORIES.length; i++) {
    const c = CATALOG_CATEGORIES[i];
    const row = (await db.insert(categories).values({
      name: c.name,
      slug: c.slug,
      description: c.description,
      shortDescription: c.description.slice(0, 180),
      image: c.image,
      imageAlt: `تصویر دسته ${c.name} هلسا`,
      icon: "leaf",
      subs: c.subs,
      sortOrder: 20 + i,
      isActive: true,
      seoTitle: `${c.name} هلسا | خرید آنلاین`,
      seoDescription: `${c.description}. مشاهده محصولات، قیمت و موجودی به‌روز در هلسا مارکت.`,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: categories.slug,
      set: {
        name: c.name, description: c.description, shortDescription: c.description.slice(0, 180), image: c.image,
        imageAlt: `تصویر دسته ${c.name} هلسا`, subs: c.subs, isActive: true,
        seoTitle: `${c.name} هلسا | خرید آنلاین`, seoDescription: `${c.description}. مشاهده محصولات، قیمت و موجودی به‌روز در هلسا مارکت.`, updatedAt: new Date(),
      },
    }).returning({ id: categories.id }))[0];
    categoryIds.set(c.slug, row.id);
  }

  for (let i = 0; i < CATALOG_PRODUCTS.length; i++) {
    const p = CATALOG_PRODUCTS[i];
    const category = CATALOG_CATEGORIES.find((c) => c.slug === p.category);
    if (!category) throw new Error(`Unknown category ${p.category}`);
    const sku = skuPart(i);
    const short = `${p.name}، از مجموعه ${category.name} هلسا؛ مناسب مصرف روزانه و پذیرایی.`;
    const description = `${p.name} از محصولات منتخب هلسا در دسته ${category.name} است. این محصول با تمرکز بر طعم، بافت و بسته‌بندی مناسب عرضه می‌شود. مبدأ ثبت‌شده: ${p.origin ?? "ایران"}. ${p.storage ?? "در جای خشک و خنک نگهداری شود."}`;
    const product = (await db.insert(products).values({
      name: p.name,
      slug: p.slug,
      category: p.category,
      categoryId: categoryIds.get(p.category),
      sku,
      brand: "هلسا ایرانیان",
      shortDescription: short,
      description,
      price: p.price,
      oldPrice: null,
      discount: 0,
      stock: p.stock,
      stockStatus: p.stock <= 0 ? "out_of_stock" : p.stock <= 5 ? "low_stock" : "in_stock",
      lowStockThreshold: 5,
      minOrderQty: 1,
      maxOrderQty: 20,
      weight: p.weights?.length ? `${p.weights[0]} گرم` : "یک بسته",
      unit: "بسته",
      packaging: p.packaging ?? "بسته‌بندی بهداشتی هلسا",
      ingredients: p.ingredients ?? p.name,
      origin: p.origin ?? "ایران",
      storage: p.storage ?? "در جای خشک و خنک، دور از نور مستقیم نگهداری شود",
      image: p.image ?? category.image,
      imageAlt: `تصویر ${p.name} هلسا`,
      imageStatus: (p.image ?? category.image).startsWith("/") ? "brand_asset" : "seed_reference",
      gallery: [p.image ?? category.image],
      rating: 0,
      reviews: 0,
      tags: [category.name, p.name],
      features: [
        { label: "وزن", value: p.weights?.length ? `${p.weights[0]} گرم` : "یک بسته" },
        { label: "نوع بسته‌بندی", value: p.packaging ?? "بسته‌بندی بهداشتی هلسا" },
        { label: "محل تولید", value: p.origin ?? "ایران" },
        { label: "مواد اولیه", value: p.ingredients ?? p.name },
      ],
      nutrition: [],
      allergens: [],
      isActive: true,
      isFeatured: Boolean(p.featured),
      isVisible: true,
      seoTitle: `خرید ${p.name} هلسا`,
      seoDescription: `${short} قیمت و موجودی به‌روز را در هلسا مارکت مشاهده کنید.`,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: products.slug,
      set: {
        name: p.name, category: p.category, categoryId: categoryIds.get(p.category), shortDescription: short, description,
        price: p.price, stock: p.stock, stockStatus: p.stock <= 0 ? "out_of_stock" : p.stock <= 5 ? "low_stock" : "in_stock",
        packaging: p.packaging ?? "بسته‌بندی بهداشتی هلسا", ingredients: p.ingredients ?? p.name, origin: p.origin ?? "ایران",
        storage: p.storage ?? "در جای خشک و خنک، دور از نور مستقیم نگهداری شود", image: p.image ?? category.image,
        imageAlt: `تصویر ${p.name} هلسا`, isActive: true, isVisible: true, seoTitle: `خرید ${p.name} هلسا`, seoDescription: `${short} قیمت و موجودی به‌روز را در هلسا مارکت مشاهده کنید.`, updatedAt: new Date(),
      },
    }).returning({ id: products.id, sku: products.sku }))[0];

    const variants: Array<{ name: string; sku: string; price: number; stock: number; weight?: number; flavor?: string; sortOrder: number }> = [];
    if (p.flavors?.length) {
      p.flavors.forEach((flavor, v) => variants.push({ name: `${flavor} - ۵۰۰ گرم`, sku: `${product.sku}-F${v + 1}`, price: money(p.price * (1 + v * 0.03)), stock: Math.max(1, Math.floor(p.stock / p.flavors!.length)), weight: 500, flavor, sortOrder: v }));
    } else if (p.weights?.length) {
      const mult: Record<number, number> = { 250: 0.55, 500: 1, 1000: 1.9 };
      p.weights.forEach((weight, v) => variants.push({ name: `${weight.toLocaleString("fa-IR")} گرم`, sku: `${product.sku}-W${weight}`, price: money(p.price * (mult[weight] ?? weight / 500)), stock: Math.max(1, Math.floor(p.stock / p.weights!.length)), weight, sortOrder: v }));
    }
    for (const v of variants) {
      await db.insert(productVariants).values({ productId: product.id, ...v, unit: "گرم", isActive: true }).onConflictDoUpdate({ target: productVariants.sku, set: { name: v.name, price: v.price, stock: v.stock, weight: v.weight, flavor: v.flavor, isActive: true, sortOrder: v.sortOrder, updatedAt: new Date() } });
    }

    const existingImage = await db.select({ id: productImages.id }).from(productImages).where(eq(productImages.productId, product.id)).limit(1);
    if (!existingImage.length) {
      await db.insert(productImages).values({ productId: product.id, url: p.image ?? category.image, alt: `تصویر ${p.name} هلسا`, isPrimary: true, sortOrder: 0, requiresReplacement: !(p.image ?? category.image).startsWith("/") });
    }
    const existingMovement = await db.select({ id: inventoryMovements.id }).from(inventoryMovements).where(eq(inventoryMovements.productId, product.id)).limit(1);
    if (!existingMovement.length) {
      await db.insert(inventoryMovements).values({ productId: product.id, quantityChange: p.stock, previousQuantity: 0, newQuantity: p.stock, reason: "ورود کالا", note: "موجودی اولیه seed توسعه", createdBy: "catalog-seed" });
    }
  }

  // Extend existing trays in-place without deleting data or changing contents.
  const trayRows = await db.select().from(mazehTrays);
  for (let i = 0; i < trayRows.length; i++) {
    const t = trayRows[i];
    await db.update(mazehTrays).set({
      sku: t.sku ?? `TRAY-${String(i + 1).padStart(3, "0")}`,
      stock: t.stock > 0 ? t.stock : 8,
      lowStockThreshold: 2,
      imageAlt: t.imageAlt || `${t.name} شامل اقلام پذیرایی هلسا`,
      seoTitle: t.seoTitle ?? `${t.name} | سفارش سینی مزه هلسا`,
      seoDescription: t.seoDescription ?? t.shortDescription,
      updatedAt: new Date(),
    }).where(eq(mazehTrays.id, t.id));
  }

  for (const method of [
    { code: "standard", label: "ارسال عادی", description: "ارسال با روش استاندارد فروشگاه", estimatedTime: "۲ تا ۴ روز کاری", price: 85_000, sortOrder: 1 },
    { code: "express", label: "ارسال سریع", description: "ویژه محدوده‌های پشتیبانی‌شده تهران", estimatedTime: "طبق هماهنگی سفارش", price: 120_000, sortOrder: 2 },
    { code: "pickup", label: "تحویل حضوری", description: "تحویل با هماهنگی قبلی", estimatedTime: "هماهنگی تلفنی", price: 0, sortOrder: 3 },
  ]) {
    await db.insert(shippingMethods).values(method).onConflictDoUpdate({ target: shippingMethods.code, set: { ...method, isActive: true, updatedAt: new Date() } });
  }

  console.log(`catalog seed complete: ${CATALOG_CATEGORIES.length} categories, ${CATALOG_PRODUCTS.length} products`);
  process.exit(0);
}

main().catch((error) => { console.error(error); process.exit(1); });
