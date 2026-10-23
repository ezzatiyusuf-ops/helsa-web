import { z } from "zod";

const urlOrPath = z.string().min(1).refine(
  (v) => v.startsWith("/") || /^https?:\/\//.test(v),
  "آدرس تصویر باید مسیر داخلی یا URL معتبر باشد",
);

export const productAdminSchema = z.object({
  name: z.string().trim().min(2, "نام محصول الزامی است").max(200),
  slug: z.string().trim().min(2).max(200).regex(/^[a-z0-9-]+$/, "slug فقط شامل حروف انگلیسی کوچک، عدد و خط تیره است"),
  category: z.string().trim().min(2),
  sku: z.string().trim().min(2).max(64),
  shortDescription: z.string().trim().max(400).default(""),
  description: z.string().trim().min(5).max(5000),
  price: z.number().int().nonnegative(),
  oldPrice: z.number().int().nonnegative().nullable().optional(),
  // brief 2.4 — strikethrough requires a real start date; "" or null disables it
  discountStartsAt: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "تاریخ شروع تخفیف باید به قالب YYYY-MM-DD باشد").nullable().optional().or(z.literal("")),
  costPrice: z.number().int().nonnegative().nullable().optional(),
  stock: z.number().int().nonnegative(),
  lowStockThreshold: z.number().int().nonnegative().default(5),
  minOrderQty: z.number().int().positive().default(1),
  maxOrderQty: z.number().int().positive().nullable().optional(),
  weight: z.string().trim().max(60).default(""),
  unit: z.string().trim().max(32).default("بسته"),
  packaging: z.string().trim().max(500).default(""),
  ingredients: z.string().trim().max(1000).default(""),
  origin: z.string().trim().max(500).default(""),
  storage: z.string().trim().max(1000).default(""),
  image: urlOrPath,
  imageAlt: z.string().trim().min(2).max(300),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isVisible: z.boolean().default(true),
  seoTitle: z.string().trim().max(180).nullable().optional(),
  seoDescription: z.string().trim().max(320).nullable().optional(),
  badge: z.string().trim().max(40).nullable().optional(),
  // label data required for storefront publishing (enforced in services/admin.ts)
  allergens: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  prodDate: z.string().trim().max(12).default(""),
  expDate: z.string().trim().max(12).default(""),
  variants: z.array(z.object({
    id: z.number().int().positive().optional(),
    name: z.string().trim().min(1).max(120),
    sku: z.string().trim().min(2).max(64),
    price: z.number().int().nonnegative(),
    compareAtPrice: z.number().int().nonnegative().nullable().optional(),
    costPrice: z.number().int().nonnegative().nullable().optional(),
    stock: z.number().int().nonnegative(),
    weight: z.number().int().positive().nullable().optional(),
    unit: z.string().trim().max(24).default("گرم"),
    flavor: z.string().trim().max(80).nullable().optional(),
    isActive: z.boolean().default(true),
    sortOrder: z.number().int().default(0),
  })).default([]),
});

export const categoryAdminSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/),
  description: z.string().trim().max(2000).default(""),
  shortDescription: z.string().trim().max(400).default(""),
  image: urlOrPath,
  imageAlt: z.string().trim().min(2).max(300),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  seoTitle: z.string().trim().max(180).nullable().optional(),
  seoDescription: z.string().trim().max(320).nullable().optional(),
});

export const trayAdminSchema = z.object({
  name: z.string().trim().min(2).max(200),
  slug: z.string().trim().min(2).max(200).regex(/^[a-z0-9-]+$/),
  sku: z.string().trim().min(2).max(64),
  shortDescription: z.string().trim().max(400).default(""),
  description: z.string().trim().min(5).max(5000),
  image: urlOrPath,
  imageAlt: z.string().trim().min(2).max(300),
  basePrice: z.number().int().nonnegative(),
  oldPrice: z.number().int().nonnegative().nullable().optional(),
  // brief 2.4 — strikethrough requires a real start date; "" or null disables it
  discountStartsAt: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "تاریخ شروع تخفیف باید به قالب YYYY-MM-DD باشد").nullable().optional().or(z.literal("")),
  costPrice: z.number().int().nonnegative().nullable().optional(),
  stock: z.number().int().nonnegative(),
  lowStockThreshold: z.number().int().nonnegative().default(2),
  weight: z.string().trim().max(60).nullable().optional(),
  size: z.string().trim().min(1).max(40),
  servesMin: z.number().int().positive(),
  servesMax: z.number().int().positive(),
  featured: z.boolean().default(false),
  active: z.boolean().default(true),
  contents: z.array(z.object({ title: z.string().min(1), section: z.string().min(1), qty: z.string().default("") })).default([]),
  storage: z.string().trim().max(1000).default(""),
  freshness: z.string().trim().max(1000).default(""),
  seoTitle: z.string().trim().max(180).nullable().optional(),
  seoDescription: z.string().trim().max(320).nullable().optional(),
}).refine((v) => v.servesMax >= v.servesMin, { path: ["servesMax"], message: "حداکثر مهمان باید از حداقل بیشتر باشد" });

export const inventorySchema = z.object({
  mode: z.enum(["increase", "decrease", "set", "unavailable"]),
  quantity: z.number().int().nonnegative(),
  reason: z.enum(["ورود کالا", "فروش", "اصلاح موجودی", "مرجوعی", "ضایعات"]),
  note: z.string().trim().max(500).default(""),
});

export const orderStatusSchema = z.object({
  status: z.enum(["pending", "paid", "preparing", "shipped", "transit", "delivered", "cancelled", "refunded"]),
  paymentStatus: z.enum(["pending", "paid", "failed", "refunded"]).optional(),
  paymentReference: z.string().trim().max(120).nullable().optional(),
});

export const accountingSchema = z.object({
  type: z.enum(["EXPENSE", "PURCHASE", "ADJUSTMENT"]),
  amount: z.number().int().positive(),
  description: z.string().trim().min(3).max(1000),
});

// ── کمپین‌ها (§ادمین بریف) — بازهٔ تاریخ میلادی YYYY-MM-DD؛ شمارش‌معکوس صفحهٔ اصلی
// فقط در ۲۴ ساعت پایانی کمپینِ فعال نمایش داده می‌شود (گیت سمت سرور در FlashOfferStrip).
const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاریخ باید میلادی و به قالب YYYY-MM-DD باشد");

export const campaignAdminSchema = z
  .object({
    title: z.string().trim().min(2, "عنوان کمپین الزامی است").max(200),
    slug: z.string().trim().min(2).max(200).regex(/^[a-z0-9-]+$/, "slug فقط شامل حروف انگلیسی کوچک، عدد و خط تیره است"),
    banner: z.string().trim().max(500).default(""),
    description: z.string().trim().max(2000).default(""),
    startDate: ymd,
    endDate: ymd,
    discount: z.number().int().min(0).max(100).default(0),
    category: z.string().trim().max(60).default("all"),
    active: z.boolean().default(true),
  })
  .refine((c) => c.endDate >= c.startDate, { message: "تاریخ پایان باید بعد از تاریخ شروع باشد", path: ["endDate"] });
