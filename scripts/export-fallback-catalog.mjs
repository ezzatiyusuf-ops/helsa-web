#!/usr/bin/env node
/**
 * export-fallback-catalog.mjs — بازتولید fallback کاتالوگ از دیتابیس واقعی
 * ─────────────────────────────────────────────────────────────────────────
 * مشکل: src/data/products.ts فقط ۳۴ محصول seed داشت؛ وقتی DB در دسترس نیست
 * (بیلد بدون DB / اختلال runtime) کل سایت به «۳۴ محصول» برمی‌گشت در حالی که
 * کاتالوگ واقعی ۱۸۴تایی در DB است.
 *
 * این اسکریپت همان نگاشتِ services/catalog.ts:getProducts را اجرا می‌کند و
 * خروجی را به‌صورت لیترال TS در src/data/products.ts می‌نویسد تا fallback و DB
 * همیشه هم‌شمار و هم‌محتوا باشند. منبع: DATABASE_URL از .env (هرگز هاردکد نمی‌شود).
 *
 * اجرا:  npm run catalog:export   (پس از هر تغییر کاتالوگ در DB)
 */
import { readFileSync, writeFileSync } from "node:fs";
import pg from "pg";

// ── DATABASE_URL فقط از env (همان قاعدهٔ تولید) ──
let url = process.env.DATABASE_URL;
if (!url) {
  try {
    const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
    url = env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
  } catch { /* بدون .env */ }
}
if (!url) { console.error("✗ DATABASE_URL تنظیم نیست (env یا .env)"); process.exit(1); }

const EXCLUDED_FEATURES = ["نوع بسته‌بندی", "مواد اولیه", "محل تولید"];

const client = new pg.Client({ connectionString: url });
await client.connect();

const { rows } = await client.query(
  "SELECT * FROM products WHERE is_active = true AND is_visible = true ORDER BY id",
);
const { rows: variantRows } = await client.query(
  "SELECT * FROM product_variants WHERE is_active = true ORDER BY product_id, sort_order",
);
await client.end();

if (!rows.length) { console.error("✗ هیچ محصول فعالی در DB نیست — خروجی نوشته نشد"); process.exit(1); }

const byProduct = new Map();
for (const v of variantRows) {
  const list = byProduct.get(v.product_id) ?? [];
  list.push(v);
  byProduct.set(v.product_id, list);
}

// همان نگاشت getProducts (services/catalog.ts) — منبع واحد ساخت Product
const products = rows.map((r) => ({
  id: r.id, name: r.name, slug: r.slug, category: r.category, categoryId: r.category_id,
  sku: r.sku, brand: r.brand, shortDescription: r.short_description, price: r.price,
  oldPrice: r.old_price, discount: r.discount, discountStartsAt: r.discount_starts_at ?? null, weight: r.weight, image: r.image,
  gallery: r.gallery ?? [], description: r.description, rating: Number(r.rating), reviews: r.reviews,
  stock: r.stock, stockStatus: r.stock_status, lowStockThreshold: r.low_stock_threshold,
  minOrderQty: r.min_order_qty, maxOrderQty: r.max_order_qty, isActive: r.is_active,
  isFeatured: r.is_featured, isVisible: r.is_visible, badge: r.badge, tags: r.tags ?? [],
  variants: (byProduct.get(r.id) ?? []).map((v) => ({
    id: v.id, name: v.name, sku: v.sku, price: v.price, compareAtPrice: v.compare_at_price,
    stock: v.stock, weight: v.weight, unit: v.unit, flavor: v.flavor, isActive: v.is_active, sortOrder: v.sort_order,
  })),
  features: [
    ...(r.features ?? []).filter((f) => !EXCLUDED_FEATURES.includes(f.label)),
    ...(r.packaging ? [{ label: "نوع بسته‌بندی", value: r.packaging }] : []),
    ...(r.ingredients ? [{ label: "مواد اولیه", value: r.ingredients }] : []),
    ...(r.origin ? [{ label: "محل تولید", value: r.origin }] : []),
  ],
  nutrition: r.nutrition ?? [], storage: r.storage, packaging: r.packaging,
  ingredients: r.ingredients, origin: r.origin, unit: r.unit, imageAlt: r.image_alt,
  seoTitle: r.seo_title, seoDescription: r.seo_description, allergens: r.allergens ?? [],
  createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
}));

const header = `/**
 * ⚠️ فایل AUTO-GENERATED — ویرایش دستی نکنید.
 * منبع: دیتابیس (${rows.length} محصول فعال) — بازتولید: npm run catalog:export
 * نقش: fallback کاتالوگ وقتی DB در دسترس نیست (بیلد بدون DB / اختلال runtime).
 * نگاشت این فایل با services/catalog.ts:getProducts یکسان است تا شمارش/قیمت/موجودی
 * در هر دو حالت (DB و fallback) هم‌ارز بمانند.
 */
import type { Product } from "@/types";

`;

const body = `export const PRODUCTS: Product[] = ${JSON.stringify(products, null, 2)};

export function productBySlug(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}
`;

writeFileSync(new URL("../src/data/products.ts", import.meta.url), header + body);
console.log(`✓ fallback کاتالوگ بازتولید شد: ${products.length} محصول (${variantRows.length} واریانت فعال)`);

// ═══ اینستاگرام: پست‌ها/استوری‌های منتخبِ فعال → src/data/instagram.ts (دیتای آفلاین) ═══
// همان نگاشت getCuratedPosts/getCuratedStories در services/instagram.ts
const igClient = new pg.Client({ connectionString: url });
await igClient.connect();
const { rows: igRows } = await igClient.query(
  "SELECT id, kind, image_url, caption, title, permalink, product_slug, likes, comments, posted_at FROM instagram_posts WHERE is_active = true ORDER BY sort_order ASC, posted_at DESC",
);
await igClient.end();

const igSort = (r) => ({
  id: Number(r.id),
  imageUrl: String(r.image_url),
  permalink: r.permalink ?? null,
  productSlug: r.product_slug ?? null,
  postedAt: r.posted_at instanceof Date ? r.posted_at.toISOString() : String(r.posted_at),
});
const igPosts = igRows.filter((r) => r.kind === "post").slice(0, 16).map((r) => ({
  ...igSort(r),
  caption: r.caption ?? "",
  likes: r.likes === null || r.likes === undefined ? null : Number(r.likes),
  comments: r.comments === null || r.comments === undefined ? null : Number(r.comments),
}));
const igStories = igRows.filter((r) => r.kind === "story").slice(0, 24).map((r) => ({
  ...igSort(r),
  title: r.title ?? null,
}));

const igHeader = `/**
 * ⚠️ فایل AUTO-GENERATED — ویرایش دستی نکنید.
 * منبع: دیتابیس (پست‌ها/استوری‌های منتخب فعال اینستاگرام) — بازتولید: npm run catalog:export
 * نقش: دیتای آفلاین سکشن اینستاگرام صفحهٔ اصلی وقتی DB در دسترس نیست.
 * محتوا همان رکوردهای واقعیِ منتخب است — هیچ دادهٔ جعلی (لایک/کامنت ساختگی) تولید نمی‌شود.
 */
export interface OfflineInstagramPost {
  id: number; imageUrl: string; caption: string; permalink: string | null; productSlug: string | null;
  likes: number | null; comments: number | null; postedAt: string;
}
export interface OfflineInstagramStory {
  id: number; imageUrl: string; title: string | null; permalink: string | null; productSlug: string | null; postedAt: string;
}

`;

const igBody = `export const FALLBACK_INSTAGRAM_POSTS: OfflineInstagramPost[] = ${JSON.stringify(igPosts, null, 2)};

export const FALLBACK_INSTAGRAM_STORIES: OfflineInstagramStory[] = ${JSON.stringify(igStories, null, 2)};
`;
writeFileSync(new URL("../src/data/instagram.ts", import.meta.url), igHeader + igBody);
console.log(`✓ دیتای آفلاین اینستاگرام: ${igPosts.length} پست + ${igStories.length} استوری`);
if (!igPosts.length) console.warn("⚠ هیچ پست فعالی export نشد — سکشن اینستاگرام بدون DB خالی خواهد بود!");
if (products.length !== 184) console.warn(`⚠ شمارش ${products.length} ≠ ۱۸۴ — اگر کاتالوگ واقعاً تغییر کرده اشکالی ندارد؛ فقط آگاه باش.`);
