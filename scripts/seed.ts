/* Seed script: npx tsx scripts/seed.ts */
import { db } from "../src/db";
import {
  products,
  categories,
  mazehTrays,
  mazehTrayItems,
  coupons,
  campaigns,
  traySizes,
  trayOccasions,
  trayCustomizations,
  beveragePairings,
  allergens,
  partyPackages,
  mazehCategories,
} from "../src/db/schema";
import { PRODUCTS } from "../src/data/products";
import { CATEGORIES } from "../src/data/categories";
import { TRAYS, BEVERAGE_PAIRINGS, ALLERGEN_OPTIONS } from "../src/data/trays";
import { COUPONS, CAMPAIGNS } from "../src/data/content";
import { TRAY_SIZES, MAZEH_OPTIONS, OCCASIONS, PARTY_RULES } from "../src/config/mazeh";

async function main() {
  console.log("seeding…");
  await db.delete(mazehTrayItems);
  await db.delete(mazehTrays);
  await db.delete(products);
  await db.delete(categories);
  await db.delete(coupons);
  await db.delete(campaigns);
  await db.delete(traySizes);
  await db.delete(trayOccasions);
  await db.delete(trayCustomizations);
  await db.delete(beveragePairings);
  await db.delete(allergens);
  await db.delete(partyPackages);
  await db.delete(mazehCategories);

  await db.insert(categories).values(
    CATEGORIES.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      image: c.image,
      icon: c.icon,
      subs: c.subs,
      sortOrder: c.sortOrder,
    })),
  );

  await db.insert(products).values(
    PRODUCTS.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      category: p.category,
      sku: p.sku,
      price: p.price,
      oldPrice: p.oldPrice,
      discount: p.discount,
      weight: p.weight,
      image: p.image,
      gallery: p.gallery,
      description: p.description,
      rating: p.rating,
      reviews: p.reviews,
      stock: p.stock,
      badge: p.badge,
      tags: p.tags,
      features: p.features,
      nutrition: p.nutrition,
      storage: p.storage,
      allergens: p.allergens,
      createdAt: new Date(p.createdAt),
    })),
  );

  await db.insert(mazehTrays).values(
    TRAYS.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      shortDescription: t.shortDescription,
      description: t.description,
      image: t.image,
      basePrice: t.basePrice,
      oldPrice: t.oldPrice,
      size: t.size,
      servesMin: t.servesMin,
      servesMax: t.servesMax,
      featured: t.featured,
      active: t.active,
      allergens: t.allergens,
      pairings: t.pairings,
      occasions: t.occasions,
      contents: t.contents,
      storage: t.storage,
      freshness: t.freshness,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.createdAt),
    })),
  );

  const itemRows = TRAYS.flatMap((t) =>
    t.contents.map((c) => ({
      trayId: t.id,
      productId: c.productId ?? null,
      title: c.title,
      quantity: c.qty,
      section: c.section,
    })),
  );
  await db.insert(mazehTrayItems).values(itemRows);

  await db.insert(coupons).values(
    COUPONS.map((c) => ({
      code: c.code,
      type: c.type,
      value: c.value,
      minimumPurchase: c.minimumPurchase,
      maximumDiscount: c.maximumDiscount,
      startDate: c.startDate,
      endDate: c.endDate,
      usageLimit: c.usageLimit,
      active: c.active,
      label: c.label,
    })),
  );

  await db.insert(campaigns).values(
    CAMPAIGNS.map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      banner: c.banner,
      description: c.description,
      startDate: c.startDate,
      endDate: c.endDate,
      discount: c.discount,
      category: c.category,
      active: c.active,
    })),
  );

  await db.insert(traySizes).values(
    TRAY_SIZES.map((s) => ({ code: s.id, label: s.label, basePrice: s.base, factor: s.factor })),
  );
  await db.insert(trayOccasions).values(OCCASIONS.map((o) => ({ label: o })));
  await db.insert(trayCustomizations).values(
    MAZEH_OPTIONS.map((o) => ({ groupId: o.group, optionId: o.id, label: o.label, price: o.price })),
  );
  await db.insert(beveragePairings).values(
    BEVERAGE_PAIRINGS.map((b) => ({ pair: b.pair, drink: b.drink, note: b.note })),
  );
  await db.insert(allergens).values(ALLERGEN_OPTIONS.map((a) => ({ label: a })));
  await db.insert(partyPackages).values(
    PARTY_RULES.map((r) => ({ maxGuests: r.max, traySlug: r.traySlug, title: r.title, note: r.note })),
  );
  await db.insert(mazehCategories).values([
    { name: "مزه‌های شور", code: "SAVORY" },
    { name: "مزه‌های شیرین", code: "SWEET" },
    { name: "مغزها و آجیل", code: "NUTS" },
    { name: "میوه تازه", code: "FRUIT" },
    { name: "نان و کراکر", code: "BREAD" },
    { name: "دیپ‌ها و مربا", code: "DIP" },
    { name: "چیدمان و امضای هلسا", code: "DECORATION" },
  ]);

  console.log("seed complete:", PRODUCTS.length, "products,", TRAYS.length, "trays");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
