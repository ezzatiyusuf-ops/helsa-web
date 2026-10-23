/**
 * بازسازی صحیح src/data/image-variants.json از محتوای public/images/opt
 * قاعده: فقط پسوندهای عرض معلوم (480/768/1080/1400) به‌عنوان variant شناخته می‌شوند؛
 * فایل‌های بدون پسوند عرض = پایه (1400 → 0). نام‌های دیجیتال‌دار مثل medjool-dates-2 سالم می‌مانند.
 */
import { writeFileSync, readdirSync, statSync, existsSync } from "node:fs";

const OUT = "public/images/opt";
const WIDTHS = new Set([480, 768, 1080, 1400]);
const variants = {};
for (const f of readdirSync(OUT)) {
  const m = f.match(/^(.+?)(?:-(\d+))?\.(webp|avif)$/);
  if (!m) continue;
  let [, name, w, ext] = m;
  let width;
  if (w !== undefined && WIDTHS.has(Number(w))) width = Number(w);
  else if (w !== undefined && !WIDTHS.has(Number(w))) {
    // پسوند عددی جزو عرض‌ها نیست → بخشی از خود نام است (مثل -2)
    name = `${name}-${w}`;
    width = 0;
  } else width = 0;
  variants[name] ??= { avif: [], webp: [], jpg: false };
  variants[name][ext === "webp" ? "webp" : "avif"].push(width);
}
for (const f of readdirSync(OUT)) {
  const m = f.match(/^(.+)\.jpg$/);
  if (m && variants[m[1]]) variants[m[1]].jpg = true;
}
for (const v of Object.values(variants)) {
  v.avif = [...new Set(v.avif)].sort((a, b) => a - b);
  v.webp = [...new Set(v.webp)].sort((a, b) => a - b);
}
writeFileSync("src/data/image-variants.json", JSON.stringify(variants, null, 2));
const bad = Object.entries(variants).filter(([k, v]) => (v.avif.length || v.webp.length) && (!v.avif.includes(0) || !v.webp.includes(0) || !v.jpg));
console.log(`manifest: ${Object.keys(variants).length} مدخل | مدخل‌های ناقص: ${bad.length}`);
for (const [k] of bad) console.log("  ناقص:", k);
