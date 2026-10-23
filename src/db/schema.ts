import {
  pgTable,
  serial,
  text,
  integer,
  real,
  boolean,
  jsonb,
  timestamp,
  varchar,
  uniqueIndex,
  index,
  customType,
} from "drizzle-orm/pg-core";

/* ————————————————————— Catalog ————————————————————— */
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  description: text("description").notNull().default(""),
  shortDescription: text("short_description").notNull().default(""),
  image: text("image").notNull().default(""),
  imageAlt: text("image_alt").notNull().default(""),
  icon: varchar("icon", { length: 40 }).notNull().default("leaf"),
  subs: jsonb("subs").$type<string[]>().notNull().default([]),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  seoTitle: varchar("seo_title", { length: 180 }),
  seoDescription: text("seo_description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [index("categories_active_sort_idx").on(t.isActive, t.sortOrder)]);

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  category: varchar("category", { length: 120 }).notNull(), // stable category slug (legacy-compatible)
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
  sku: varchar("sku", { length: 64 }).notNull().unique(),
  brand: varchar("brand", { length: 100 }).notNull().default("هلسا ایرانیان"),
  shortDescription: text("short_description").notNull().default(""),
  description: text("description").notNull().default(""),
  price: integer("price").notNull(), // Toman, integer presentation unit
  oldPrice: integer("old_price"),
  /** real discount start (brief 2.4) — strikethrough renders only when set & reached */
  discountStartsAt: timestamp("discount_starts_at"),
  costPrice: integer("cost_price"),
  discount: integer("discount").notNull().default(0),
  currency: varchar("currency", { length: 12 }).notNull().default("TOMAN"),
  stock: integer("stock").notNull().default(0),
  stockStatus: varchar("stock_status", { length: 24 }).notNull().default("in_stock"),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
  minOrderQty: integer("min_order_qty").notNull().default(1),
  maxOrderQty: integer("max_order_qty"),
  weight: varchar("weight", { length: 60 }).notNull().default(""),
  unit: varchar("unit", { length: 32 }).notNull().default("بسته"),
  packaging: text("packaging").notNull().default(""),
  ingredients: text("ingredients").notNull().default(""),
  origin: text("origin").notNull().default(""),
  storage: text("storage").notNull().default(""),
  image: text("image").notNull().default(""),
  imageAlt: text("image_alt").notNull().default(""),
  imageStatus: varchar("image_status", { length: 32 }).notNull().default("seed_reference"),
  gallery: jsonb("gallery").$type<string[]>().notNull().default([]),
  rating: real("rating").notNull().default(0),
  reviews: integer("reviews").notNull().default(0),
  badge: varchar("badge", { length: 40 }),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  features: jsonb("features").$type<{ label: string; value: string }[]>().notNull().default([]),
  nutrition: jsonb("nutrition").$type<{ label: string; value: string }[]>().notNull().default([]),
  allergens: jsonb("allergens").$type<string[]>().notNull().default([]),
  /** روزیته — تولیدکنندهٔ این محصول (null = محصول معمولی هلسا) */
  producerId: integer("producer_id").references(() => producers.id, { onDelete: "set null" }),
  isActive: boolean("is_active").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  isVisible: boolean("is_visible").notNull().default(true),
  seoTitle: varchar("seo_title", { length: 180 }),
  seoDescription: text("seo_description"),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("products_category_active_idx").on(t.category, t.isActive, t.isVisible),
  index("products_stock_idx").on(t.stockStatus, t.stock),
  index("products_featured_idx").on(t.isFeatured),
]);

export const productVariants = pgTable("product_variants", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  sku: varchar("sku", { length: 64 }).notNull().unique(),
  price: integer("price").notNull(),
  compareAtPrice: integer("compare_at_price"),
  costPrice: integer("cost_price"),
  stock: integer("stock").notNull().default(0),
  weight: integer("weight"),
  unit: varchar("unit", { length: 24 }).notNull().default("گرم"),
  flavor: varchar("flavor", { length: 80 }),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [index("product_variants_product_idx").on(t.productId, t.isActive)]);

export const productImages = pgTable("product_images", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  alt: text("alt").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  requiresReplacement: boolean("requires_replacement").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("product_images_product_idx").on(t.productId, t.sortOrder)]);

/* ————————————————————— Mazeh trays ————————————————————— */
export const mazehTrays = pgTable("mazeh_trays", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  sku: varchar("sku", { length: 64 }).unique(),
  shortDescription: text("short_description").notNull().default(""),
  description: text("description").notNull().default(""),
  image: text("image").notNull().default(""),
  imageAlt: text("image_alt").notNull().default(""),
  basePrice: integer("base_price").notNull(),
  oldPrice: integer("old_price"),
  costPrice: integer("cost_price"),
  stock: integer("stock").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(2),
  weight: varchar("weight", { length: 60 }),
  size: varchar("size", { length: 40 }).notNull().default("متوسط"),
  servesMin: integer("serves_min").notNull().default(2),
  servesMax: integer("serves_max").notNull().default(6),
  featured: boolean("featured").notNull().default(false),
  active: boolean("active").notNull().default(true),
  allergens: jsonb("allergens").$type<string[]>().notNull().default([]),
  pairings: jsonb("pairings").$type<string[]>().notNull().default([]),
  occasions: jsonb("occasions").$type<string[]>().notNull().default([]),
  contents: jsonb("contents").$type<{ title: string; section: string; qty: string; productId?: number }[]>().notNull().default([]),
  storage: text("storage").notNull().default(""),
  freshness: text("freshness").notNull().default(""),
  seoTitle: varchar("seo_title", { length: 180 }),
  seoDescription: text("seo_description"),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [index("mazeh_trays_active_idx").on(t.active, t.featured)]);

export const mazehTrayItems = pgTable("mazeh_tray_items", {
  id: serial("id").primaryKey(),
  trayId: integer("tray_id").notNull().references(() => mazehTrays.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  title: varchar("title", { length: 200 }).notNull(),
  quantity: varchar("quantity", { length: 60 }).notNull().default(""),
  section: varchar("section", { length: 30 }).notNull().default("SAVORY"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const mazehCategories = pgTable("mazeh_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  code: varchar("code", { length: 30 }).notNull().unique(),
});
export const traySizes = pgTable("tray_sizes", {
  id: serial("id").primaryKey(), code: varchar("code", { length: 30 }).notNull().unique(),
  label: varchar("label", { length: 60 }).notNull(), basePrice: integer("base_price").notNull(), factor: real("factor").notNull().default(1),
});
export const trayOccasions = pgTable("tray_occasions", { id: serial("id").primaryKey(), label: varchar("label", { length: 80 }).notNull() });
export const trayCustomizations = pgTable("tray_customizations", {
  id: serial("id").primaryKey(), groupId: varchar("group_id", { length: 30 }).notNull(), optionId: varchar("option_id", { length: 40 }).notNull(),
  label: varchar("label", { length: 120 }).notNull(), price: integer("price").notNull(),
});
export const beveragePairings = pgTable("beverage_pairings", {
  id: serial("id").primaryKey(), pair: varchar("pair", { length: 200 }).notNull(), drink: varchar("drink", { length: 200 }).notNull(), note: text("note").notNull().default(""),
});
export const allergens = pgTable("allergens", { id: serial("id").primaryKey(), label: varchar("label", { length: 80 }).notNull().unique() });
export const partyPackages = pgTable("party_packages", {
  id: serial("id").primaryKey(), maxGuests: integer("max_guests").notNull(), traySlug: varchar("tray_slug", { length: 120 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(), note: text("note").notNull().default(""),
});

/* ————————————————————— Customers & addresses ————————————————————— */
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 180 }),
  passwordHash: text("password_hash"),
  passwordUpdatedAt: timestamp("password_updated_at"),
  /** هویت پرداخت (Part A/B) — هرگز در لاگ‌ها نوشته نمی‌شود */
  nationalId: varchar("national_id", { length: 10 }),
  nidVerifiedAt: timestamp("nid_verified_at"),
  identityProvider: varchar("identity_provider", { length: 24 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [uniqueIndex("customers_phone_unique").on(t.phone), uniqueIndex("customers_email_unique").on(t.email)]);

/** Hashed OTP / password-reset challenges. Codes themselves are never stored. */
export const authChallenges = pgTable("auth_challenges", {
  id: serial("id").primaryKey(),
  purpose: varchar("purpose", { length: 32 }).notNull(), // otp_login | password_reset
  identifier: varchar("identifier", { length: 180 }).notNull(),
  codeHash: text("code_hash").notNull(),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(5),
  expiresAt: timestamp("expires_at").notNull(),
  consumedAt: timestamp("consumed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("auth_challenges_identifier_idx").on(t.identifier, t.purpose)]);

export const addresses = pgTable("addresses", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 80 }).notNull().default("منزل"),
  province: varchar("province", { length: 80 }).notNull(),
  city: varchar("city", { length: 80 }).notNull(),
  fullAddress: text("full_address").notNull(),
  postalCode: varchar("postal_code", { length: 16 }).notNull(),
  plate: varchar("plate", { length: 20 }), unit: varchar("unit", { length: 20 }),
  recipient: varchar("recipient", { length: 160 }).notNull(), phone: varchar("phone", { length: 20 }).notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(), updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [index("addresses_customer_idx").on(t.customerId, t.isDefault)]);

/* ————————————————————— Promotions ————————————————————— */
export const coupons = pgTable("coupons", {
  code: varchar("code", { length: 40 }).primaryKey(), type: varchar("type", { length: 20 }).notNull().default("percent"),
  value: integer("value").notNull(), minimumPurchase: integer("minimum_purchase").notNull().default(0), maximumDiscount: integer("maximum_discount"),
  startDate: varchar("start_date", { length: 20 }).notNull(), endDate: varchar("end_date", { length: 20 }).notNull(),
  usageLimit: integer("usage_limit").notNull().default(100), usedCount: integer("used_count").notNull().default(0),
  productIds: jsonb("product_ids").$type<number[]>().notNull().default([]), categorySlugs: jsonb("category_slugs").$type<string[]>().notNull().default([]),
  active: boolean("active").notNull().default(true), label: text("label").notNull().default(""),
  // F-07: کوپن «فقط اولین خرید» — با سفارش قبلی مشتری (حساب یا موبایل) راستی‌آزمایی می‌شود
  firstOrderOnly: boolean("first_order_only").notNull().default(false),
});

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(), title: varchar("title", { length: 200 }).notNull(), slug: varchar("slug", { length: 200 }).notNull().unique(),
  banner: text("banner").notNull().default(""), description: text("description").notNull().default(""),
  startDate: varchar("start_date", { length: 20 }).notNull(), endDate: varchar("end_date", { length: 20 }).notNull(),
  discount: integer("discount").notNull().default(0), category: varchar("category", { length: 60 }).notNull().default("all"), active: boolean("active").notNull().default(true),
});

export const banners = pgTable("banners", {
  id: serial("id").primaryKey(), title: varchar("title", { length: 180 }).notNull(), subtitle: text("subtitle").notNull().default(""),
  image: text("image").notNull(), imageAlt: text("image_alt").notNull(), href: text("href").notNull().default("/"),
  placement: varchar("placement", { length: 40 }).notNull().default("homepage"),
  isActive: boolean("is_active").notNull().default(true), sortOrder: integer("sort_order").notNull().default(0),
  startsAt: timestamp("starts_at"), endsAt: timestamp("ends_at"), createdAt: timestamp("created_at").defaultNow().notNull(), updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/* ————————————————————— Orders, payments & shipping ————————————————————— */
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(), code: varchar("code", { length: 30 }).notNull().unique(),
  customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),
  customer: jsonb("customer").$type<Record<string, unknown>>().notNull(),
  address: jsonb("address").$type<Record<string, unknown>>(),
  items: jsonb("items").$type<Record<string, unknown>[]>().notNull(), // backward-compatible immutable snapshot
  subtotal: integer("subtotal").notNull().default(0), discount: integer("discount").notNull().default(0),
  shipping: integer("shipping").notNull().default(0), total: integer("total").notNull().default(0),
  couponCode: varchar("coupon_code", { length: 40 }),
  paymentStatus: varchar("payment_status", { length: 32 }).notNull().default("pending"),
  /** مشارکت حمایتی داوطلبانه (تومان) — در جمع سفارش هست، در حسابداری جدا از فروش */
  supportContribution: integer("support_contribution").notNull().default(0),
  paymentMethod: varchar("payment_method", { length: 32 }), paymentReference: varchar("payment_reference", { length: 120 }),
  shippingMethod: varchar("shipping_method", { length: 80 }), status: varchar("status", { length: 40 }).notNull().default("pending"),
  /** یادداشت سفارش مشتری (§۲۰) — متن آزادِ پاک‌شده، حداکثر ۵۰۰ کاراکتر */
  note: text("note"),
  /** §۲۱ گزینهٔ هدیه — پرچم + نام گیرندهٔ هدیه + پیام + درخواست بسته‌بندی (بدون ادعای قیمتی) */
  isGift: boolean("is_gift").notNull().default(false),
  giftRecipient: varchar("gift_recipient", { length: 120 }),
  giftMessage: text("gift_message"),
  giftPackaging: boolean("gift_packaging").notNull().default(false),
  idempotencyKey: varchar("idempotency_key", { length: 64 }),
  paidAt: timestamp("paid_at"), createdAt: timestamp("created_at").defaultNow().notNull(), updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [index("orders_status_created_idx").on(t.status, t.createdAt), index("orders_customer_idx").on(t.customerId), uniqueIndex("orders_idempotency_idx").on(t.idempotencyKey)]);

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(), orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  trayId: integer("tray_id").references(() => mazehTrays.id, { onDelete: "set null" }),
  variantId: integer("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  itemType: varchar("item_type", { length: 20 }).notNull().default("product"),
  nameSnapshot: varchar("name_snapshot", { length: 220 }).notNull(), skuSnapshot: varchar("sku_snapshot", { length: 64 }),
  unitPrice: integer("unit_price").notNull(), quantity: integer("quantity").notNull(), subtotal: integer("subtotal").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("order_items_order_idx").on(t.orderId)]);

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(), orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 50 }).notNull(), method: varchar("method", { length: 32 }).notNull(),
  amount: integer("amount").notNull(), status: varchar("status", { length: 32 }).notNull().default("pending"),
  authority: varchar("authority", { length: 160 }), reference: varchar("reference", { length: 160 }),
  verifiedAt: timestamp("verified_at"), expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(), updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [index("payments_order_idx").on(t.orderId, t.status), index("payments_authority_idx").on(t.authority)]);

/** فاکتور رسمی — دقیقاً یکی برای هر سفارش (unique orderId) */
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  number: varchar("number", { length: 60 }).notNull().unique(),
  orderId: integer("order_id").notNull().unique().references(() => orders.id, { onDelete: "cascade" }),
  customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),
  subtotal: integer("subtotal").notNull().default(0),
  discount: integer("discount").notNull().default(0),
  shipping: integer("shipping").notNull().default(0),
  total: integer("total").notNull().default(0),
  /** بخش مشارکت حمایتی در جمع فاکتور */
  supportAmount: integer("support_amount").notNull().default(0),
  paymentMethod: varchar("payment_method", { length: 32 }),
  provider: varchar("provider", { length: 50 }),
  status: varchar("status", { length: 24 }).notNull().default("issued"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("invoices_customer_idx").on(t.customerId)]);

/** لاگ رویدادهای پرداخت — بدون هیچ دادهٔ حساس شخصی (NID/موبایل ممنوع) */
export const paymentLogs = pgTable("payment_logs", {
  id: serial("id").primaryKey(),
  paymentId: integer("payment_id").references(() => payments.id, { onDelete: "set null" }),
  orderId: integer("order_id").references(() => orders.id, { onDelete: "cascade" }),
  event: varchar("event", { length: 40 }).notNull(),
  provider: varchar("provider", { length: 50 }),
  method: varchar("method", { length: 32 }),
  amount: integer("amount"),
  authority: varchar("authority", { length: 160 }),
  detail: jsonb("detail").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("payment_logs_order_idx").on(t.orderId), index("payment_logs_event_idx").on(t.event)]);

/** اعلان‌های پنل ادمین (مثلاً «سفارش پرداخت شد») */
export const adminNotifications = pgTable("admin_notifications", {
  id: serial("id").primaryKey(),
  kind: varchar("kind", { length: 40 }).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  body: text("body").notNull().default(""),
  href: varchar("href", { length: 200 }),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("admin_notifications_read_idx").on(t.isRead, t.createdAt)]);

export const shippingMethods = pgTable("shipping_methods", {
  id: serial("id").primaryKey(), code: varchar("code", { length: 40 }).notNull().unique(), label: varchar("label", { length: 120 }).notNull(),
  description: text("description").notNull().default(""), estimatedTime: varchar("estimated_time", { length: 100 }).notNull().default(""),
  price: integer("price").notNull().default(0), isActive: boolean("is_active").notNull().default(true), sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(), updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/* ————————————————————— Inventory & accounting ————————————————————— */
export const inventoryMovements = pgTable("inventory_movements", {
  id: serial("id").primaryKey(), productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  trayId: integer("tray_id").references(() => mazehTrays.id, { onDelete: "set null" }),
  variantId: integer("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  quantityChange: integer("quantity_change").notNull(), previousQuantity: integer("previous_quantity").notNull(), newQuantity: integer("new_quantity").notNull(),
  reason: varchar("reason", { length: 32 }).notNull(), note: text("note").notNull().default(""), createdBy: varchar("created_by", { length: 180 }).notNull(),
  referenceType: varchar("reference_type", { length: 40 }), referenceId: varchar("reference_id", { length: 80 }), createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("inventory_product_created_idx").on(t.productId, t.createdAt)]);

export const accountingTransactions = pgTable("accounting_transactions", {
  id: serial("id").primaryKey(), type: varchar("type", { length: 24 }).notNull(), amount: integer("amount").notNull(),
  description: text("description").notNull(), referenceType: varchar("reference_type", { length: 40 }), referenceId: varchar("reference_id", { length: 80 }),
  status: varchar("status", { length: 24 }).notNull().default("posted"), createdBy: varchar("created_by", { length: 180 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("accounting_reference_unique").on(t.type, t.referenceType, t.referenceId),
  index("accounting_type_created_idx").on(t.type, t.createdAt),
]);

export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: serial("id").primaryKey(), adminEmail: varchar("admin_email", { length: 180 }).notNull(), action: varchar("action", { length: 80 }).notNull(),
  entityType: varchar("entity_type", { length: 60 }).notNull(), entityId: varchar("entity_id", { length: 80 }),
  before: jsonb("before").$type<Record<string, unknown>>(), after: jsonb("after").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("admin_audit_entity_idx").on(t.entityType, t.entityId, t.createdAt)]);

/* ————————————————————— Reviews & contact ————————————————————— */
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(), productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }), author: varchar("author", { length: 80 }).notNull(),
  rating: integer("rating").notNull(), title: varchar("title", { length: 120 }).notNull(), text: text("text").notNull(),
  isApproved: boolean("is_approved").notNull().default(false), createdAt: timestamp("created_at").defaultNow().notNull(),
  /** §نظرات مهمان — شمارهٔ تأییدشده با OTP (فقط برای نظرهای بدون حساب) */
  verifiedPhone: varchar("verified_phone", { length: 20 }),
  /** نشان «خریدار تأییدشده» — تطبیق شماره/حساب با سفارش واقعی */
  verifiedPurchase: boolean("verified_purchase").notNull().default(false),
}, (t) => [uniqueIndex("reviews_customer_product_unique").on(t.customerId, t.productId)]);

export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(), name: varchar("name", { length: 120 }).notNull(), mobile: varchar("mobile", { length: 20 }).notNull(),
  email: varchar("email", { length: 160 }).notNull().default(""), subject: varchar("subject", { length: 200 }).notNull().default(""),
  message: text("message").notNull().default(""), createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const trayQuotes = pgTable("tray_quotes", {
  id: serial("id").primaryKey(), config: jsonb("config").$type<Record<string, unknown>>().notNull(), total: integer("total").notNull(), createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ————————————————————— HELSA Gifts ————————————————————— */
export const giftPackages = pgTable("gift_packages", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  kind: varchar("kind", { length: 24 }).notNull().default("personal"), // personal | corporate
  shortDescription: text("short_description").notNull().default(""),
  description: text("description").notNull().default(""),
  image: text("image").notNull().default(""),
  imageAlt: text("image_alt").notNull().default(""),
  basePrice: integer("base_price").notNull(),
  oldPrice: integer("old_price"),
  stock: integer("stock").notNull().default(0),
  minQty: integer("min_qty").notNull().default(1),
  maxQty: integer("max_qty").notNull().default(20),
  contents: jsonb("contents").$type<string[]>().notNull().default([]),
  occasions: jsonb("occasions").$type<string[]>().notNull().default([]),
  packagingOptions: jsonb("packaging_options").$type<{ id: string; label: string; price: number }[]>().notNull().default([]),
  allowsMessage: boolean("allows_message").notNull().default(true),
  allowsRecipient: boolean("allows_recipient").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  seoTitle: varchar("seo_title", { length: 180 }),
  seoDescription: text("seo_description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [index("gift_packages_kind_active_idx").on(t.kind, t.isActive)]);

export const giftQuotes = pgTable("gift_quotes", {
  id: serial("id").primaryKey(),
  packageId: integer("package_id").notNull().references(() => giftPackages.id, { onDelete: "cascade" }),
  config: jsonb("config").$type<Record<string, unknown>>().notNull(),
  unitPrice: integer("unit_price").notNull(),
  quantity: integer("quantity").notNull().default(1),
  total: integer("total").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const wholesaleInquiries = pgTable("wholesale_inquiries", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 30 }).notNull().unique(),
  businessType: varchar("business_type", { length: 40 }).notNull(), // restaurant | cafe | supermarket | wholesaler | other
  companyName: varchar("company_name", { length: 200 }).notNull(),
  contactName: varchar("contact_name", { length: 160 }).notNull(),
  mobile: varchar("mobile", { length: 20 }).notNull(),
  email: varchar("email", { length: 180 }).notNull().default(""),
  city: varchar("city", { length: 80 }).notNull().default(""),
  estimatedMonthlyVolume: varchar("estimated_monthly_volume", { length: 80 }).notNull().default(""),
  productInterests: text("product_interests").notNull().default(""),
  notes: text("notes").notNull().default(""),
  status: varchar("status", { length: 32 }).notNull().default("new"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [index("wholesale_inquiries_status_idx").on(t.status, t.createdAt)]);

/**
 * Wholesale B2B portal — registered businesses with approval workflow.
 * Pricing policy: per-business cooperation discount (percent) applied
 * server-side on catalog prices; never client-trusted.
 */
export const wholesaleBusinesses = pgTable("wholesale_businesses", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 30 }).notNull().unique(), // WSB-xxxxxxxx
  businessName: varchar("business_name", { length: 200 }).notNull(),
  businessType: varchar("business_type", { length: 40 }).notNull(), // supermarket | restaurant | cafe | hotel | distributor | corporate
  contactName: varchar("contact_name", { length: 160 }).notNull(),
  mobile: varchar("mobile", { length: 20 }).notNull().unique(),
  email: varchar("email", { length: 180 }).notNull().default(""),
  city: varchar("city", { length: 80 }).notNull().default(""),
  address: text("address").notNull().default(""),
  economicCode: varchar("economic_code", { length: 40 }).notNull().default(""), // شناسه ملی / کد اقتصادی
  monthlyVolume: varchar("monthly_volume", { length: 80 }).notNull().default(""),
  interests: text("interests").notNull().default(""),
  notes: text("notes").notNull().default(""),
  discountPercent: integer("discount_percent").notNull().default(0), // set by admin after approval
  status: varchar("status", { length: 32 }).notNull().default("pending"), // pending | approved | rejected | suspended
  customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),
  adminNote: text("admin_note").notNull().default(""),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [index("wholesale_businesses_status_idx").on(t.status, t.createdAt)]);

export const corporateGiftRequests = pgTable("corporate_gift_requests", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 30 }).notNull().unique(),
  companyName: varchar("company_name", { length: 200 }).notNull(),
  contactName: varchar("contact_name", { length: 160 }).notNull(),
  mobile: varchar("mobile", { length: 20 }).notNull(),
  email: varchar("email", { length: 180 }).notNull().default(""),
  packageSlug: varchar("package_slug", { length: 200 }),
  quantity: integer("quantity").notNull().default(1),
  occasion: varchar("occasion", { length: 120 }).notNull().default(""),
  desiredDeliveryDate: varchar("desired_delivery_date", { length: 40 }).notNull().default(""),
  brandingRequirements: text("branding_requirements").notNull().default(""),
  packagingNotes: text("packaging_notes").notNull().default(""),
  recipientNotes: text("recipient_notes").notNull().default(""),
  additionalNotes: text("additional_notes").notNull().default(""),
  indicativeTotal: integer("indicative_total"),
  status: varchar("status", { length: 32 }).notNull().default("new"), // new | reviewing | quoted | closed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [index("corporate_gift_requests_status_idx").on(t.status, t.createdAt)]);

/* ————————————————————— Instagram & social feed ————————————————————— */
/** پست‌های منتخب اینستاگرام (curated) — از پنل ادمین مدیریت می‌شوند.
 *  اگر INSTAGRAM_ACCESS_TOKEN + INSTAGRAM_USER_ID تنظیم شود، فید زنده از
 *  Graph API خوانده می‌شود و این جدول به‌عنوان fallback می‌ماند.
 *  likes/comments فقط برای دادهٔ واقعیِ API پر می‌شوند (هرگز جعل نمی‌شود). */
export const instagramPosts = pgTable("instagram_posts", {
  id: serial("id").primaryKey(),
  imageUrl: text("image_url").notNull(),
  caption: text("caption").notNull().default(""),
  /** «post» = پست گرید | «story» = استوری دایره‌ای */
  kind: varchar("kind", { length: 16 }).notNull().default("post"),
  /** عنوان کوتاه (برای استوری‌ها و متن جایگزین) */
  title: text("title"),
  permalink: text("permalink"),
  productSlug: varchar("product_slug", { length: 120 }),
  likes: integer("likes"),
  comments: integer("comments"),
  postedAt: timestamp("posted_at").defaultNow().notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [index("instagram_posts_active_idx").on(t.isActive, t.sortOrder)]);

/**
 * تنظیمات زمان-اجرا (KV) — مثل اعتبارنامهٔ اینستاگرام که از پنل ادمین
 * بدون ری‌استارت ذخیره/حذف می‌شود (اولویت خواندن: DB → env).
 */
export const siteSettings = pgTable("site_settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/* ————————————————————— کارت‌به‌کارت ————————————————————— */

const bytea = customType<{ data: Buffer; driverData: Buffer; notNull: true; default: false }>({
  dataType() { return "bytea"; },
});

/**
 * رسید کارت‌به‌کارت. آپلود رسید هرگز سفارش را پرداخت‌شده نمی‌کند؛ وضعیت این ردیف
 * از payments.status جداست (state machine: src/lib/card-payment.ts).
 */
export const paymentReceipts = pgTable("payment_receipts", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  paymentId: integer("payment_id").references(() => payments.id, { onDelete: "set null" }),
  status: varchar("status", { length: 32 }).notNull().default("receipt_submitted"),
  amountDeclared: integer("amount_declared").notNull().default(0),
  transferDate: varchar("transfer_date", { length: 40 }).notNull().default(""),
  trackingNumber: varchar("tracking_number", { length: 64 }).notNull().default(""),
  payerCardLast4: varchar("payer_card_last4", { length: 4 }).notNull().default(""),
  payerName: varchar("payer_name", { length: 120 }).notNull().default(""),
  fileName: varchar("file_name", { length: 160 }).notNull().default(""),
  mimeType: varchar("mime_type", { length: 80 }).notNull().default(""),
  fileSize: integer("file_size").notNull().default(0),
  fileSha256: varchar("file_sha256", { length: 64 }).notNull().default(""),
  submittedBySub: varchar("submitted_by_sub", { length: 80 }).notNull().default(""),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  reviewedBy: varchar("reviewed_by", { length: 180 }),
  reviewStartedAt: timestamp("review_started_at"),
  decidedAt: timestamp("decided_at"),
  decisionReason: text("decision_reason").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("payment_receipts_order_idx").on(t.orderId, t.createdAt),
  index("payment_receipts_status_idx").on(t.status, t.createdAt),
  uniqueIndex("payment_receipts_file_sha_unique").on(t.orderId, t.fileSha256),
]);

export const paymentReceiptFiles = pgTable("payment_receipt_files", {
  receiptId: integer("receipt_id").primaryKey().references(() => paymentReceipts.id, { onDelete: "cascade" }),
  data: bytea("data").notNull(),
});

/* ————————————————————— روزیته: تولیدکنندگان ————————————————————— */

export const producers = pgTable("producers", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  displayName: varchar("display_name", { length: 160 }).notNull(),
  region: varchar("region", { length: 120 }).notNull().default(""),
  craft: varchar("craft", { length: 160 }).notNull().default(""),
  bio: text("bio").notNull().default(""),
  story: text("story").notNull().default(""),
  /** ادعای خودِ تولیدکننده — بدون تأیید حقوقی/رسمی هلسا، نشان رسمی داده نمی‌شود */
  socialImpact: text("social_impact").notNull().default(""),
  certifications: jsonb("certifications").$type<string[]>().notNull().default([]),
  avatarImage: varchar("avatar_image", { length: 400 }).notNull().default(""),
  coverImage: varchar("cover_image", { length: 400 }).notNull().default(""),
  contactName: varchar("contact_name", { length: 160 }).notNull().default(""),
  contactPhone: varchar("contact_phone", { length: 20 }).notNull().default(""),
  contactEmail: varchar("contact_email", { length: 160 }).notNull().default(""),
  /** submitted | approved | published | unavailable | rejected */
  status: varchar("status", { length: 24 }).notNull().default("submitted"),
  submittedBySub: varchar("submitted_by_sub", { length: 80 }).notNull().default(""),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  reviewedBy: varchar("reviewed_by", { length: 180 }),
  reviewedAt: timestamp("reviewed_at"),
  decisionReason: text("decision_reason").notNull().default(""),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [index("producers_status_idx").on(t.status, t.submittedAt)]);
