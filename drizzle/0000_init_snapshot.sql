CREATE TABLE "accounting_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar(24) NOT NULL,
	"amount" integer NOT NULL,
	"description" text NOT NULL,
	"reference_type" varchar(40),
	"reference_id" varchar(80),
	"status" varchar(24) DEFAULT 'posted' NOT NULL,
	"created_by" varchar(180) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"label" varchar(80) DEFAULT 'منزل' NOT NULL,
	"province" varchar(80) NOT NULL,
	"city" varchar(80) NOT NULL,
	"full_address" text NOT NULL,
	"postal_code" varchar(16) NOT NULL,
	"plate" varchar(20),
	"unit" varchar(20),
	"recipient" varchar(160) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_email" varchar(180) NOT NULL,
	"action" varchar(80) NOT NULL,
	"entity_type" varchar(60) NOT NULL,
	"entity_id" varchar(80),
	"before" jsonb,
	"after" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" varchar(40) NOT NULL,
	"title" varchar(160) NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"href" varchar(200),
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "allergens" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" varchar(80) NOT NULL,
	CONSTRAINT "allergens_label_unique" UNIQUE("label")
);
--> statement-breakpoint
CREATE TABLE "auth_challenges" (
	"id" serial PRIMARY KEY NOT NULL,
	"purpose" varchar(32) NOT NULL,
	"identifier" varchar(180) NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"expires_at" timestamp NOT NULL,
	"consumed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "banners" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(180) NOT NULL,
	"subtitle" text DEFAULT '' NOT NULL,
	"image" text NOT NULL,
	"image_alt" text NOT NULL,
	"href" text DEFAULT '/' NOT NULL,
	"placement" varchar(40) DEFAULT 'homepage' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"starts_at" timestamp,
	"ends_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beverage_pairings" (
	"id" serial PRIMARY KEY NOT NULL,
	"pair" varchar(200) NOT NULL,
	"drink" varchar(200) NOT NULL,
	"note" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"slug" varchar(200) NOT NULL,
	"banner" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"start_date" varchar(20) NOT NULL,
	"end_date" varchar(20) NOT NULL,
	"discount" integer DEFAULT 0 NOT NULL,
	"category" varchar(60) DEFAULT 'all' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "campaigns_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"short_description" text DEFAULT '' NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"image_alt" text DEFAULT '' NOT NULL,
	"icon" varchar(40) DEFAULT 'leaf' NOT NULL,
	"subs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"seo_title" varchar(180),
	"seo_description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"mobile" varchar(20) NOT NULL,
	"email" varchar(160) DEFAULT '' NOT NULL,
	"subject" varchar(200) DEFAULT '' NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "corporate_gift_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(30) NOT NULL,
	"company_name" varchar(200) NOT NULL,
	"contact_name" varchar(160) NOT NULL,
	"mobile" varchar(20) NOT NULL,
	"email" varchar(180) DEFAULT '' NOT NULL,
	"package_slug" varchar(200),
	"quantity" integer DEFAULT 1 NOT NULL,
	"occasion" varchar(120) DEFAULT '' NOT NULL,
	"desired_delivery_date" varchar(40) DEFAULT '' NOT NULL,
	"branding_requirements" text DEFAULT '' NOT NULL,
	"packaging_notes" text DEFAULT '' NOT NULL,
	"recipient_notes" text DEFAULT '' NOT NULL,
	"additional_notes" text DEFAULT '' NOT NULL,
	"indicative_total" integer,
	"status" varchar(32) DEFAULT 'new' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "corporate_gift_requests_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"code" varchar(40) PRIMARY KEY NOT NULL,
	"type" varchar(20) DEFAULT 'percent' NOT NULL,
	"value" integer NOT NULL,
	"minimum_purchase" integer DEFAULT 0 NOT NULL,
	"maximum_discount" integer,
	"start_date" varchar(20) NOT NULL,
	"end_date" varchar(20) NOT NULL,
	"usage_limit" integer DEFAULT 100 NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"product_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"category_slugs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"label" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"phone" varchar(20),
	"email" varchar(180),
	"password_hash" text,
	"password_updated_at" timestamp,
	"national_id" varchar(10),
	"nid_verified_at" timestamp,
	"identity_provider" varchar(24),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gift_packages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(200) NOT NULL,
	"kind" varchar(24) DEFAULT 'personal' NOT NULL,
	"short_description" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"image_alt" text DEFAULT '' NOT NULL,
	"base_price" integer NOT NULL,
	"old_price" integer,
	"stock" integer DEFAULT 0 NOT NULL,
	"min_qty" integer DEFAULT 1 NOT NULL,
	"max_qty" integer DEFAULT 20 NOT NULL,
	"contents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"occasions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"packaging_options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"allows_message" boolean DEFAULT true NOT NULL,
	"allows_recipient" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"seo_title" varchar(180),
	"seo_description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gift_packages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "gift_quotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"package_id" integer NOT NULL,
	"config" jsonb NOT NULL,
	"unit_price" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"total" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instagram_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"image_url" text NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"kind" varchar(16) DEFAULT 'post' NOT NULL,
	"title" text,
	"permalink" text,
	"product_slug" varchar(120),
	"likes" integer,
	"comments" integer,
	"posted_at" timestamp DEFAULT now() NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer,
	"tray_id" integer,
	"variant_id" integer,
	"quantity_change" integer NOT NULL,
	"previous_quantity" integer NOT NULL,
	"new_quantity" integer NOT NULL,
	"reason" varchar(32) NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_by" varchar(180) NOT NULL,
	"reference_type" varchar(40),
	"reference_id" varchar(80),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"number" varchar(60) NOT NULL,
	"order_id" integer NOT NULL,
	"customer_id" integer,
	"subtotal" integer DEFAULT 0 NOT NULL,
	"discount" integer DEFAULT 0 NOT NULL,
	"shipping" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"payment_method" varchar(32),
	"provider" varchar(50),
	"status" varchar(24) DEFAULT 'issued' NOT NULL,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_number_unique" UNIQUE("number"),
	CONSTRAINT "invoices_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "mazeh_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"code" varchar(30) NOT NULL,
	CONSTRAINT "mazeh_categories_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "mazeh_tray_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"tray_id" integer NOT NULL,
	"product_id" integer,
	"title" varchar(200) NOT NULL,
	"quantity" varchar(60) DEFAULT '' NOT NULL,
	"section" varchar(30) DEFAULT 'SAVORY' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mazeh_trays" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(200) NOT NULL,
	"sku" varchar(64),
	"short_description" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"image_alt" text DEFAULT '' NOT NULL,
	"base_price" integer NOT NULL,
	"old_price" integer,
	"cost_price" integer,
	"stock" integer DEFAULT 0 NOT NULL,
	"low_stock_threshold" integer DEFAULT 2 NOT NULL,
	"weight" varchar(60),
	"size" varchar(40) DEFAULT 'متوسط' NOT NULL,
	"serves_min" integer DEFAULT 2 NOT NULL,
	"serves_max" integer DEFAULT 6 NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"allergens" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pairings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"occasions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"contents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"storage" text DEFAULT '' NOT NULL,
	"freshness" text DEFAULT '' NOT NULL,
	"seo_title" varchar(180),
	"seo_description" text,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "mazeh_trays_slug_unique" UNIQUE("slug"),
	CONSTRAINT "mazeh_trays_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer,
	"tray_id" integer,
	"variant_id" integer,
	"item_type" varchar(20) DEFAULT 'product' NOT NULL,
	"name_snapshot" varchar(220) NOT NULL,
	"sku_snapshot" varchar(64),
	"unit_price" integer NOT NULL,
	"quantity" integer NOT NULL,
	"subtotal" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(30) NOT NULL,
	"customer_id" integer,
	"customer" jsonb NOT NULL,
	"address" jsonb,
	"items" jsonb NOT NULL,
	"subtotal" integer DEFAULT 0 NOT NULL,
	"discount" integer DEFAULT 0 NOT NULL,
	"shipping" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"coupon_code" varchar(40),
	"payment_status" varchar(32) DEFAULT 'pending' NOT NULL,
	"payment_method" varchar(32),
	"payment_reference" varchar(120),
	"shipping_method" varchar(80),
	"status" varchar(40) DEFAULT 'pending' NOT NULL,
	"note" text,
	"is_gift" boolean DEFAULT false NOT NULL,
	"gift_recipient" varchar(120),
	"gift_message" text,
	"gift_packaging" boolean DEFAULT false NOT NULL,
	"idempotency_key" varchar(64),
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "orders_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "party_packages" (
	"id" serial PRIMARY KEY NOT NULL,
	"max_guests" integer NOT NULL,
	"tray_slug" varchar(120) NOT NULL,
	"title" varchar(200) NOT NULL,
	"note" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"payment_id" integer,
	"order_id" integer,
	"event" varchar(40) NOT NULL,
	"provider" varchar(50),
	"method" varchar(32),
	"amount" integer,
	"authority" varchar(160),
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"provider" varchar(50) NOT NULL,
	"method" varchar(32) NOT NULL,
	"amount" integer NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"authority" varchar(160),
	"reference" varchar(160),
	"verified_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"url" text NOT NULL,
	"alt" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"requires_replacement" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"name" varchar(120) NOT NULL,
	"sku" varchar(64) NOT NULL,
	"price" integer NOT NULL,
	"compare_at_price" integer,
	"cost_price" integer,
	"stock" integer DEFAULT 0 NOT NULL,
	"weight" integer,
	"unit" varchar(24) DEFAULT 'گرم' NOT NULL,
	"flavor" varchar(80),
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_variants_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(200) NOT NULL,
	"category" varchar(120) NOT NULL,
	"category_id" integer,
	"sku" varchar(64) NOT NULL,
	"brand" varchar(100) DEFAULT 'هلسا ایرانیان' NOT NULL,
	"short_description" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price" integer NOT NULL,
	"old_price" integer,
	"cost_price" integer,
	"discount" integer DEFAULT 0 NOT NULL,
	"currency" varchar(12) DEFAULT 'TOMAN' NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"stock_status" varchar(24) DEFAULT 'in_stock' NOT NULL,
	"low_stock_threshold" integer DEFAULT 5 NOT NULL,
	"min_order_qty" integer DEFAULT 1 NOT NULL,
	"max_order_qty" integer,
	"weight" varchar(60) DEFAULT '' NOT NULL,
	"unit" varchar(32) DEFAULT 'بسته' NOT NULL,
	"packaging" text DEFAULT '' NOT NULL,
	"ingredients" text DEFAULT '' NOT NULL,
	"origin" text DEFAULT '' NOT NULL,
	"storage" text DEFAULT '' NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"image_alt" text DEFAULT '' NOT NULL,
	"image_status" varchar(32) DEFAULT 'seed_reference' NOT NULL,
	"gallery" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rating" real DEFAULT 0 NOT NULL,
	"reviews" integer DEFAULT 0 NOT NULL,
	"badge" varchar(40),
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"nutrition" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"allergens" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"seo_title" varchar(180),
	"seo_description" text,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug"),
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"customer_id" integer,
	"author" varchar(80) NOT NULL,
	"rating" integer NOT NULL,
	"title" varchar(120) NOT NULL,
	"text" text NOT NULL,
	"is_approved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipping_methods" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(40) NOT NULL,
	"label" varchar(120) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"estimated_time" varchar(100) DEFAULT '' NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shipping_methods_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"key" varchar(64) PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tray_customizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" varchar(30) NOT NULL,
	"option_id" varchar(40) NOT NULL,
	"label" varchar(120) NOT NULL,
	"price" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tray_occasions" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" varchar(80) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tray_quotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"config" jsonb NOT NULL,
	"total" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tray_sizes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(30) NOT NULL,
	"label" varchar(60) NOT NULL,
	"base_price" integer NOT NULL,
	"factor" real DEFAULT 1 NOT NULL,
	CONSTRAINT "tray_sizes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "wholesale_businesses" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(30) NOT NULL,
	"business_name" varchar(200) NOT NULL,
	"business_type" varchar(40) NOT NULL,
	"contact_name" varchar(160) NOT NULL,
	"mobile" varchar(20) NOT NULL,
	"email" varchar(180) DEFAULT '' NOT NULL,
	"city" varchar(80) DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"economic_code" varchar(40) DEFAULT '' NOT NULL,
	"monthly_volume" varchar(80) DEFAULT '' NOT NULL,
	"interests" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"discount_percent" integer DEFAULT 0 NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"customer_id" integer,
	"admin_note" text DEFAULT '' NOT NULL,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wholesale_businesses_code_unique" UNIQUE("code"),
	CONSTRAINT "wholesale_businesses_mobile_unique" UNIQUE("mobile")
);
--> statement-breakpoint
CREATE TABLE "wholesale_inquiries" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(30) NOT NULL,
	"business_type" varchar(40) NOT NULL,
	"company_name" varchar(200) NOT NULL,
	"contact_name" varchar(160) NOT NULL,
	"mobile" varchar(20) NOT NULL,
	"email" varchar(180) DEFAULT '' NOT NULL,
	"city" varchar(80) DEFAULT '' NOT NULL,
	"estimated_monthly_volume" varchar(80) DEFAULT '' NOT NULL,
	"product_interests" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"status" varchar(32) DEFAULT 'new' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wholesale_inquiries_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_quotes" ADD CONSTRAINT "gift_quotes_package_id_gift_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."gift_packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_tray_id_mazeh_trays_id_fk" FOREIGN KEY ("tray_id") REFERENCES "public"."mazeh_trays"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mazeh_tray_items" ADD CONSTRAINT "mazeh_tray_items_tray_id_mazeh_trays_id_fk" FOREIGN KEY ("tray_id") REFERENCES "public"."mazeh_trays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mazeh_tray_items" ADD CONSTRAINT "mazeh_tray_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_tray_id_mazeh_trays_id_fk" FOREIGN KEY ("tray_id") REFERENCES "public"."mazeh_trays"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_logs" ADD CONSTRAINT "payment_logs_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_logs" ADD CONSTRAINT "payment_logs_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wholesale_businesses" ADD CONSTRAINT "wholesale_businesses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounting_reference_unique" ON "accounting_transactions" USING btree ("type","reference_type","reference_id");--> statement-breakpoint
CREATE INDEX "accounting_type_created_idx" ON "accounting_transactions" USING btree ("type","created_at");--> statement-breakpoint
CREATE INDEX "addresses_customer_idx" ON "addresses" USING btree ("customer_id","is_default");--> statement-breakpoint
CREATE INDEX "admin_audit_entity_idx" ON "admin_audit_logs" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "admin_notifications_read_idx" ON "admin_notifications" USING btree ("is_read","created_at");--> statement-breakpoint
CREATE INDEX "auth_challenges_identifier_idx" ON "auth_challenges" USING btree ("identifier","purpose");--> statement-breakpoint
CREATE INDEX "categories_active_sort_idx" ON "categories" USING btree ("is_active","sort_order");--> statement-breakpoint
CREATE INDEX "corporate_gift_requests_status_idx" ON "corporate_gift_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_phone_unique" ON "customers" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_email_unique" ON "customers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "gift_packages_kind_active_idx" ON "gift_packages" USING btree ("kind","is_active");--> statement-breakpoint
CREATE INDEX "instagram_posts_active_idx" ON "instagram_posts" USING btree ("is_active","sort_order");--> statement-breakpoint
CREATE INDEX "inventory_product_created_idx" ON "inventory_movements" USING btree ("product_id","created_at");--> statement-breakpoint
CREATE INDEX "invoices_customer_idx" ON "invoices" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "mazeh_trays_active_idx" ON "mazeh_trays" USING btree ("active","featured");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_status_created_idx" ON "orders" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "orders_customer_idx" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_idempotency_idx" ON "orders" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "payment_logs_order_idx" ON "payment_logs" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payment_logs_event_idx" ON "payment_logs" USING btree ("event");--> statement-breakpoint
CREATE INDEX "payments_order_idx" ON "payments" USING btree ("order_id","status");--> statement-breakpoint
CREATE INDEX "payments_authority_idx" ON "payments" USING btree ("authority");--> statement-breakpoint
CREATE INDEX "product_images_product_idx" ON "product_images" USING btree ("product_id","sort_order");--> statement-breakpoint
CREATE INDEX "product_variants_product_idx" ON "product_variants" USING btree ("product_id","is_active");--> statement-breakpoint
CREATE INDEX "products_category_active_idx" ON "products" USING btree ("category","is_active","is_visible");--> statement-breakpoint
CREATE INDEX "products_stock_idx" ON "products" USING btree ("stock_status","stock");--> statement-breakpoint
CREATE INDEX "products_featured_idx" ON "products" USING btree ("is_featured");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_customer_product_unique" ON "reviews" USING btree ("customer_id","product_id");--> statement-breakpoint
CREATE INDEX "wholesale_businesses_status_idx" ON "wholesale_businesses" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "wholesale_inquiries_status_idx" ON "wholesale_inquiries" USING btree ("status","created_at");