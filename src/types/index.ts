export type CategorySlug = "dates" | "date-products" | "nuts" | "dried-fruits" | "natural";

export interface Category {
  id: number;
  name: string;
  slug: CategorySlug | string;
  description: string;
  shortDescription?: string;
  image: string;
  imageAlt?: string;
  isActive?: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  icon: string;
  subs: string[];
  sortOrder: number;
}

export interface ProductFeature {
  label: string;
  value: string;
}

export interface ProductVariant {
  id: number;
  name: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  weight: number | null;
  unit: string;
  flavor: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  category: string;
  categoryId?: number | null;
  sku: string;
  brand?: string;
  shortDescription?: string;
  price: number;
  oldPrice: number | null;
  discountStartsAt?: string | null;
  discount: number;
  weight: string;
  image: string;
  gallery: string[];
  description: string;
  rating: number;
  reviews: number;
  stock: number;
  stockStatus?: string;
  lowStockThreshold?: number;
  minOrderQty?: number;
  maxOrderQty?: number | null;
  isActive?: boolean;
  isFeatured?: boolean;
  isVisible?: boolean;
  badge: string | null;
  tags: string[];
  variants?: ProductVariant[];
  features: ProductFeature[];
  nutrition: { label: string; value: string }[];
  storage: string;
  packaging?: string;
  ingredients?: string;
  origin?: string;
  unit?: string;
  imageAlt?: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  allergens: string[];
  createdAt: string;
}

export type TraySection = "SAVORY" | "SWEET" | "NUTS" | "FRUIT" | "BREAD" | "DIP" | "DECORATION";

export interface TrayContentItem {
  title: string;
  section: TraySection;
  qty: string;
  productId?: number;
}

export interface MazehTray {
  id: number;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  image: string;
  basePrice: number;
  oldPrice: number | null;
  size: string;
  servesMin: number;
  servesMax: number;
  featured: boolean;
  active: boolean;
  sku?: string | null;
  stock?: number;
  lowStockThreshold?: number;
  weight?: string | null;
  imageAlt?: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  allergens: string[];
  pairings: string[];
  occasions: string[];
  contents: TrayContentItem[];
  storage: string;
  freshness: string;
  createdAt: string;
}

export interface Coupon {
  code: string;
  type: "percent" | "fixed";
  value: number;
  minimumPurchase: number;
  maximumDiscount: number | null;
  startDate: string;
  endDate: string;
  usageLimit: number;
  usedCount?: number;
  active: boolean;
  label: string;
}

export interface Campaign {
  id: number;
  title: string;
  slug: string;
  banner: string;
  description: string;
  startDate: string;
  endDate: string;
  discount: number;
  category: string;
  active: boolean;
}

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  image: string;
  date: string;
  readMinutes: number;
  tags?: string[];
  body: string[]; // پاراگراف‌ها؛ سطرهای «## …» به‌عنوان تیتر بخش رندر می‌شوند (فهرست مطالب خودکار)
  author?: { name: string; role?: string; href?: string };
  hub?: string; // شناسهٔ دستهٔ مرکز سلامت هلسا (فاز ۶)
}

export interface GiftPackage {
  id: number;
  name: string;
  slug: string;
  kind: "personal" | "corporate";
  shortDescription: string;
  description: string;
  image: string;
  imageAlt?: string;
  basePrice: number;
  oldPrice: number | null;
  stock: number;
  minQty: number;
  maxQty: number;
  contents: string[];
  occasions: string[];
  packagingOptions: { id: string; label: string; price: number }[];
  allowsMessage: boolean;
  allowsRecipient: boolean;
  isActive: boolean;
  isFeatured: boolean;
}

export interface CartItem {
  key: string;
  kind: "product" | "tray" | "custom-tray" | "gift";
  id: number | string;
  name: string;
  slug?: string;
  image: string;
  price: number;
  qty: number;
  weight?: string;
  meta?: string;
}

export interface QuoteLine {
  label: string;
  amount: number;
}

export interface TrayQuote {
  id?: number;
  lines: QuoteLine[];
  total: number;
  guests: number;
  sizeLabel: string;
}

export interface BuilderSelection {
  size: string;
  base: string;
  savory: string[];
  sweet: string[];
  nuts: string[];
  fruit: string[];
  guests: number;
  occasion: string;
  decor: string[];
  messageText: string;
}

export interface DecorOption {
  id: string;
  label: string;
  price: number;
  desc?: string;
}

export const TRAY_DECOR_OPTIONS: DecorOption[] = [
  { id: "medallion", label: "مدالیون طلای هلسا", price: 50_000, desc: "امضای کلاسیک هلسا" },
  { id: "flower", label: "گل طبیعی", price: 100_000, desc: "چیدمان با گل‌های فصل" },
  { id: "candles", label: "شمع معطر", price: 80_000, desc: "حضور گرم و نور ملایم" },
];
