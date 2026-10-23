#!/usr/bin/env node
/**
 * HELSA — per-product scoring (100-point) از داده‌های واقعی:
 *  1) product-audit-results.json (ممیزی مرورگر ۱۷۲ محصول)
 *  2) /api/products (کامل بودن داده + نوع تصویر)
 * خروجی: scripts/qa/product-scores.json + scripts/qa/product-table.md
 */
import { readFileSync, writeFileSync } from "node:fs";

const audit = JSON.parse(readFileSync("scripts/qa/product-audit-results.json", "utf8"));
const products = (await (await fetch("http://localhost:3000/api/products")).json()).products;

// تصاویر اشتراکی عمومی (قبل از اصلاح) — محصولات هنوز-متصل به این‌ها «تصویر عمومی» دارند
const response = await fetch("http://localhost:3000/api/products");
const all = (await response.json()).products;
const imgCount = {};
for (const p of all) imgCount[p.image] = (imgCount[p.image] ?? 0) + 1;

const NUTRITION_NA = new Set(["spices", "distillates", "herbal-tea", "rosebuds"]); // مصرف اندک — nutrition لازم نیست

const rows = [];
const summary = { pass: 0, improve: 0, high: 0, blocker: 0 };

for (const p of all) {
  const a = audit[p.slug] ?? { score: 0, fails: ["NOT AUDITED"], warn: [] };
  const problems = [];
  const fixes = [];

  // ── 1. Visual/Functional (20) — از fails/warn ممیزی
  let visual = 20;
  if (a.fails?.length) { visual = Math.max(0, 20 - a.fails.length * 6); problems.push(...a.fails.slice(0, 2)); }
  else if (a.warn?.length) visual = Math.max(14, 20 - a.warn.length * 2);

  // ── 2. Image Quality (15) — سه سطح: اختصاصی/هم‌نوع/ناهم‌خوان
  let image = 15;
  const base = (p.image ?? "").split("/").pop().replace(/\.jpg$/, "");
  const FAMILY = {
    dates: ["medjool-dates"], "date-bars": ["medjool-dates", "date-bar"], "date-sugar": ["medjool-dates", "date-sugar"],
    nuts: ["premium-mixed-nuts", "akbari-pistachios", "four-nut-mix", "party-nuts", "special-yalda-nuts", "economic-nuts", "walnut-kernels"],
    "nuts-dried-fruits": ["premium-mixed-nuts", "golden-raisins", "dried-figs", "dried-mulberries", "dried-apricots", "dried-plums", "dried-fruit-mix"],
    "dried-fruits": ["golden-raisins", "dried-figs", "dried-mulberries", "dried-apricots", "dried-plums", "dried-fruit-mix"],
    honey: ["natural-gon-honey", "honey-jar"], legumes: ["mung-beans", "split-peas", "lentils", "chickpeas", "red-beans", "pinto-beans", "roasted-chickpeas"],
    "rock-candy": ["rock-candy", "saffron-rock-candy"], barberry: ["barberry"], candy: ["candy"], noghl: ["noghl"],
    oils: ["olive-oil", "sesame-oil"], peanuts: ["peanuts-raw", "peanuts-roasted"], "halva-tahini": ["halva-arde"],
    "peanut-butter": ["peanut-butter"], "sesame-bars": ["sesame-bar"], seeds: ["pumpkin-seeds", "sunflower-seeds", "watermelon-seeds"],
    spices: ["sumac", "spice-blend", "black-pepper", "red-pepper", "turmeric", "cinnamon", "golpar"],
    distillates: ["distillate"], "herbal-tea": ["herbal-tea", "lahijan-black-tea", "fruit-tea"], rosebuds: ["rosebuds"],
    cheese: ["cheese"], olives: ["olives-green", "olives-black"], pickles: ["pickles"],
    chocolate: ["chocolate-assorted"], "date-chocolate": ["date-chocolate", "handmade-date-chocolate"],
    "biscuits-cakes": ["biscuits", "date-cake"], "special-packs": ["gift-pack"], saffron: ["saffron-negin"],
    "date-products": ["handmade-date-chocolate", "date-chocolate-walnut", "date-powder", "chocolate-coated-dates"],
    tahini: ["tahini"], syrups: ["date-syrup", "grape-syrup", "mulberry-syrup"],
  };
  const family = FAMILY[p.category] ?? [];
  const typed = family.includes(base);
  const dedicated = (imgCount[p.image] ?? 1) === 1;
  if (dedicated) { /* تصویر اختصاصی: 15 */ }
  else if (typed) { image = 12; fixes.push("تصویر اختصاصی‌تر برای متمایز شدن از هم‌خانواده"); }
  else { image = 8; problems.push(`تصویر ناهم‌خوان («${base}» برای دستهٔ ${p.category})`); fixes.push("تصویر اختصاصی محصول (در صف تولید)"); }
  if (!(p.imageAlt ?? "").trim()) { image -= 4; problems.push("بدون alt"); fixes.push("alt توصیفی"); }

  // ── 3. Data Completeness (15)
  let data = 15;
  const fields = [
    ["shortDescription", p.shortDescription], ["ingredients", p.ingredients], ["origin", p.origin],
    ["packaging", p.packaging], ["seoTitle", p.seoTitle], ["seoDescription", p.seoDescription],
    ["imageAlt", p.imageAlt],
  ];
  const missing = fields.filter(([, v]) => !String(v ?? "").trim()).map(([k]) => k);
  if (!NUTRITION_NA.has(p.category) && !(Array.isArray(p.nutrition) && p.nutrition.length)) missing.push("nutrition");
  if (missing.length) { data = Math.max(0, 15 - missing.length * 3); problems.push(`داده ناقص: ${missing.join(",")}`); fixes.push("تکمیل فیلدها"); }

  // ── 4. Responsive (15) — از fails موبایل (h-overflow/broken)
  const mobFails = (a.fails ?? []).filter((f) => f.includes("mobile") || f.includes("h-overflow"));
  const responsive = mobFails.length ? Math.max(0, 15 - mobFails.length * 8) : 15;

  // ── 5. Detail Page (10) — h1/sku/galeri/lightbox از fails
  const dtFails = (a.fails ?? []).filter((f) => /h1|SKU|thumbs|lightbox|broken|noAlt|img |JSON-LD|title|og:|canonical|breadcrumb/i.test(f));
  const detail = dtFails.length ? Math.max(0, 10 - dtFails.length * 3) : 10;

  // ── 6. Price/Variant (10) — قیمت نمایش + variant معتبر
  let price = 10;
  if (!(p.price > 0)) { price = 4; problems.push("قیمت صفر/نامعتبر"); }
  if (Array.isArray(p.variants) && p.variants.some((v) => v.stock < 0)) { price -= 4; problems.push("variant با موجودی منفی"); }

  // ── 7. UX/CTA (5) — add-to-cart/wishlist از fails
  const uxFails = (a.fails ?? []).filter((f) => /add|wish|qty/i.test(f));
  const ux = uxFails.length ? Math.max(0, 5 - uxFails.length * 3) : 5;

  // ── 8. SEO (5) — JSON-LD/og/canonical از fails
  const seoFails = (a.fails ?? []).filter((f) => /JSON-LD|og:|canonical|<title>|availability/i.test(f));
  const seo = seoFails.length ? Math.max(0, 5 - seoFails.length * 2) : 5;

  // ── 9. Technical (5) — console errors
  const techFails = (a.fails ?? []).filter((f) => /console|err:/i.test(f));
  const tech = techFails.length ? 0 : 5;

  const score = Math.round(visual + image + data + responsive + detail + price + ux + seo + tech);
  let status = "🟢 PASS";
  if (score < 70 || (a.fails ?? []).some((f) => /HTTP 4|HTTP 5|broken/.test(f))) { status = "🔴 BLOCKER"; summary.blocker++; }
  else if (score < 80) { status = "🟠 HIGH"; summary.high++; }
  else if (score < 95) { status = "🟡 NEEDS IMPROVEMENT"; summary.improve++; }
  else summary.pass++;

  rows.push({
    slug: p.slug, name: p.name, score, status,
    parts: { visual, image, data, responsive, detail, price, ux, seo, tech },
    problems: [...new Set(problems)].slice(0, 3),
    fix: [...new Set(fixes)].slice(0, 2),
  });
}

rows.sort((a, b) => a.score - b.score || a.slug.localeCompare(b.slug));
const avg = Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length);

// JSON برای گزارش
writeFileSync("scripts/qa/product-scores.json", JSON.stringify({ summary: { ...summary, avg, total: rows.length }, rows }, null, 1));

// جدول Markdown (۱۷۲ ردیف)
let md = `| # | محصول | Slug | تصویر | داده | ریسپانسیو | UX | سئو | فنی | امتیاز | وضعیت | اصلاح لازم |\n|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
const fa = (n) => `‏${n}`;
rows.forEach((r, i) => {
  md += `| ${i + 1} | ${r.name} | \`${r.slug}\` | ${r.parts.image}/15 | ${r.parts.data}/15 | ${r.parts.responsive}/15 | ${r.parts.ux}/5 | ${r.parts.seo}/5 | ${r.parts.tech}/5 | **${r.score}** | ${r.status} | ${r.fix.join(" + ") || "—"} |\n`;
});
writeFileSync("scripts/qa/product-table.md", md);

console.log(`total=${rows.length} avg=${avg}`);
console.log(`🟢 PASS(≥95)=${summary.pass} | 🟡 IMPROVE=${summary.improve} | 🟠 HIGH=${summary.high} | 🔴 BLOCKER=${summary.blocker}`);
console.log("پایین‌ترین ۵:", rows.slice(0, 5).map((r) => `${r.slug}(${r.score})`).join(", "));
console.log("بالاترین ۵:", rows.slice(-5).map((r) => `${r.slug}(${r.score})`).join(", "));
const common = {};
for (const r of rows) for (const pr of r.problems) common[pr] = (common[pr] ?? 0) + 1;
console.log("شایع‌ترین مشکلات:", Object.entries(common).sort((a, b) => b[1] - a[1]).slice(0, 5));
