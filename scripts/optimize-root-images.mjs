/**
 * فاز ۳ (Premium) — تولید variants بهینه برای تصاویر ریشهٔ public/images/*.jpg
 * خروجی: public/images/opt/{name}-{480,768,1080,1400}.{webp,avif} + opt/{name}.jpg
 * سپس بازسازی src/data/image-variants.json (همان فرمت بهینه‌ساز اصلی).
 * og-default.jpg skip — تصویر OG باید JPEG مطلق بماند.
 */
import { readdir, stat } from "node:fs/promises";
import { writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = "public/images";
const OUT = path.join(ROOT, "opt");
const WIDTHS = [480, 768, 1080, 1400];

const files = (await readdir(ROOT)).filter((f) => f.endsWith(".jpg") && f !== "og-default.jpg");
for (const f of files) {
  const name = f.replace(/\.jpg$/, "");
  const src = path.join(ROOT, f);
  const img = sharp(src, { failOn: "none" }).rotate();
  // نسخهٔ jpg اصلی در opt (۱۴۰۰، مثل سایر تصاویر)
  await sharp(src, { failOn: "none" }).rotate().resize({ width: 1400, withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true, progressive: true }).toFile(path.join(OUT, `${name}.jpg`));
  for (const w of WIDTHS) {
    await img.clone().resize({ width: w, withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(OUT, `${name}-${w}.webp`));
    await img.clone().resize({ width: w, withoutEnlargement: true }).avif({ quality: 62 }).toFile(path.join(OUT, `${name}-${w}.avif`));
  }
  console.log("✓", name);
}

// بازسازی image-variants.json (فرمت یکسان با optimize-new-images.mjs)
const variants = {};
for (const f of readdirSync(OUT)) {
  const m = f.match(/^(.+?)(?:-(\d+))?\.(webp|avif)$/);
  if (!m) continue;
  const [, name, w, ext] = m;
  variants[name] ??= { avif: [], webp: [], jpg: false };
  variants[name][ext === "webp" ? "webp" : "avif"].push(Number(w ?? 0));
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
console.log(`\n${files.length} root images → ${files.length * 10} files | image-variants.json: ${Object.keys(variants).length} entries`);
