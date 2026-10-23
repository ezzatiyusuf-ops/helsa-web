import { NextResponse } from "next/server";
import { getCategories, getProducts, getTrays } from "@/services/catalog";
import { getGiftPackages } from "@/services/gifts";
import { BLOG_POSTS } from "@/data/content";
import { normalizeFa } from "@/lib/format";

/**
 * HELSA instant search.
 * Quality goals (audited 2026-09):
 *  - token-AND matching (multi-word queries match regardless of word order/spacing)
 *  - Persian morphology tolerance ("خرمای" ≈ "خرما", "مضافتی" ≈ "مضافت")
 *  - English discovery via slug/sku (e.g. "mazafati" → mazafati-dates)
 *  - ranking: name/sku/tag hits outrank body-text hits
 *  - typo fallback: when nothing matches, retry with edit-distance ≤ 1 per token
 */

/** match variants for a normalized token: strip common Persian suffixes */
function variants(token: string): string[] {
  const v = [token];
  if (token.length > 3) {
    if (token.endsWith("ی")) v.push(token.slice(0, -1)); // خرمای → خرما
    if (token.endsWith("ان")) v.push(token.slice(0, -2));
    if (token.endsWith("های")) v.push(token.slice(0, -3));
    if (token.endsWith("ای")) v.push(token.slice(0, -1)); // پسته‌ای/تهرانِ ...
  }
  return v;
}

/** score a candidate: 3 = strong hit (name/sku/tags), 1 = body hit. null = token unmatched */
function scoreToken(token: string, strongHay: string, weakHay: string): number | null {
  for (const v of variants(token)) {
    if (v.length >= 2 && strongHay.includes(v)) return 3;
  }
  for (const v of variants(token)) {
    if (v.length >= 2 && weakHay.includes(v)) return 1;
  }
  return null;
}

function lev1(a: string, b: string): boolean {
  // true when edit distance(a,b) <= 1
  if (a === b) return true;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0, j = 0, diff = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++diff > 1) return false;
    if (la > lb) i++;
    else if (lb > la) j++;
    else { i++; j++; }
  }
  return true;
}

function fuzzyToken(token: string, hayWords: string[]): boolean {
  if (token.length < 3) return false;
  return hayWords.some((w) => Math.abs(w.length - token.length) <= 1 && lev1(token, w));
}

function searchEntity<T>(
  list: T[],
  q: string,
  fields: (item: T) => { strong: string; weak: string },
  limit: number,
): T[] {
  const tokens = normalizeFa(q).split(/\s+/).filter(Boolean);
  const scored: { item: T; score: number }[] = [];
  for (const item of list) {
    const { strong, weak } = fields(item);
    let score = 0;
    let all = true;
    for (const t of tokens) {
      const s = scoreToken(t, strong, weak);
      if (s == null) { all = false; break; }
      score += s;
    }
    if (all) { scored.push({ item, score }); continue; }
  }
  if (!scored.length && tokens.length) {
    // typo fallback: every token within edit-distance 1 of some word
    for (const item of list) {
      const { strong, weak } = fields(item);
      const words = `${strong} ${weak}`.split(/[\s‌,،.!؟?"'()\-_/]+/).filter(Boolean);
      if (tokens.every((t) => fuzzyToken(t, words) || scoreToken(t, strong, weak) != null)) {
        scored.push({ item, score: 1 });
      }
    }
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.item);
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json({ results: [], categories: [], trays: [], gifts: [] });

  const [products, categories, trays, gifts] = await Promise.all([getProducts(), getCategories(), getTrays(), getGiftPackages()]);

  const results = searchEntity(products, q, (p) => ({
    strong: normalizeFa([p.name, p.sku, ...p.tags].filter(Boolean).join(" ")),
    weak: normalizeFa([p.slug, p.category, p.shortDescription, p.description, p.ingredients, p.origin].filter(Boolean).join(" ")),
  }), 10).map((p) => ({ slug: p.slug, name: p.name, category: p.category, image: p.image, price: p.price, stock: p.stock, sku: p.sku }));

  const categoryResults = searchEntity(categories, q, (c) => ({
    strong: normalizeFa([c.name, c.slug].join(" ")),
    weak: normalizeFa([c.description, ...c.subs].join(" ")),
  }), 6).map((c) => ({ slug: c.slug, name: c.name, image: c.image }));

  const trayResults = searchEntity(trays, q, (t) => ({
    strong: normalizeFa([t.name, t.slug].join(" ")),
    weak: normalizeFa([t.shortDescription, t.description, ...t.contents.map((c) => c.title)].join(" ")),
  }), 6).map((t) => ({ slug: t.slug, name: t.name, image: t.image, price: t.basePrice, stock: t.stock ?? 0, kind: "tray" as const }));

  const blogResults = searchEntity(BLOG_POSTS, q, (b) => ({
    strong: normalizeFa([b.title, b.slug, ...b.tags ?? []].join(" ")),
    weak: normalizeFa([b.category, b.excerpt, ...b.body].join(" ")),
  }), 4).map((b) => ({ slug: b.slug, name: b.title, image: b.image, kind: "blog" as const }));

  return NextResponse.json({ results, categories: categoryResults, trays: trayResults, gifts: gifts.slice(0, 0), blog: blogResults });
}
