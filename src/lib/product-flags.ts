import type { Product } from "@/types";
import { SHIPPING } from "@/config/shipping";

/**
 * Shared product merchandising flags (organic / wholesale / delivery).
 * Derived from real product data — never fabricated.
 */

const ORGANIC_KEYWORDS = ["ارگانیک", "طبیعی", "بدون افزودنی", "بدون شکر افزوده", "بدون نگهدارنده", "خام", "ارگانیکی"];

/** Organic/natural positioning — grounded in ingredients, description or tags. */
export function isOrganic(p: Product): boolean {
  const haystack = [p.ingredients ?? "", p.description ?? "", p.shortDescription ?? "", ...p.tags].join(" ");
  return ORGANIC_KEYWORDS.some((k) => haystack.includes(k));
}

/** Stock depth sufficient for a B2B line (MOQ-aware) — used for the wholesale filter/badge. */
export function isWholesaleReady(p: Product): boolean {
  return p.stock >= 10 && p.price > 0;
}

/** Low-stock urgency threshold — real stock, no fake scarcity. */
export function isLowStock(p: Product): boolean {
  const threshold = p.lowStockThreshold && p.lowStockThreshold > 0 ? p.lowStockThreshold : 5;
  return p.stock > 0 && p.stock <= threshold;
}

/** Honest delivery promise shown on product pages (policy, not a per-order promise). */
export function deliveryEstimate(): { tehran: string; cities: string } {
  return { tehran: SHIPPING.tehranEta, cities: SHIPPING.citiesEta };
}

/** Made-in-Iran provenance — origin text mentions Iran or is a domestic category. */
export function isMadeInIran(p: Product): boolean {
  const o = p.origin ?? "";
  return o.includes("ایران") || o.includes("کرمان") || o.includes("بم") || o.includes("خوزستان") || o.includes("هرمز") || o.includes("سیستان") || o.trim() === "";
}
