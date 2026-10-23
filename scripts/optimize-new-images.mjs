#!/usr/bin/env node
/**
 * Optimize newly generated images: public/images/gen/*.jpg → /images/opt/
 * produces {name}.jpg (1400w) + {name}-{480,768,1080}.{webp,avif} + {name}.{webp,avif}
 * then regenerates src/data/image-variants.json from the opt directory.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const ROOT = new URL("..", import.meta.url).pathname;
const GEN = join(ROOT, "public/images/gen");
const OUT = join(ROOT, "public/images/opt");
const WIDTHS = [480, 768, 1080, 1400];

// آرگومان اختیاری: نام‌های خاص؛ پیش‌فرض فقط تصاویر جدیدِ هنوز-بدون-نسخهٔ-opt
const args = process.argv.slice(2).map((a) => a.replace(/\.jpg$/, ""));
const all = readdirSync(GEN).filter((f) => f.endsWith(".jpg"));
const optFiles = new Set(readdirSync(OUT));
// Self-healing: snapshot size-caps can silently drop individual variant files between
// sessions. A name counts as "existing" ONLY if its full variant set is present;
// incomplete names are regenerated from their gen/ master (idempotent, same settings).
const VARIANTS = (name) => [
  `${name}.jpg`, `${name}.webp`, `${name}.avif`,
  ...[480, 768, 1080, 1400].flatMap((w) => [`${name}-${w}.webp`, `${name}-${w}.avif`]),
];
const isComplete = (name) => VARIANTS(name).every((f) => optFiles.has(f));
const files = args.length ? args.map((a) => `${a}.jpg`) : all.filter((f) => !isComplete(f.replace(/\.jpg$/, "")));
if (!files.length) console.log("nothing new to optimize");
for (const f of files) {
  const name = f.replace(/\.jpg$/, "");
  const img = sharp(join(GEN, f), { failOn: "none" }).rotate();
  await img.clone().resize({ width: 1400, withoutEnlargement: true }).jpeg({ mozjpeg: true, quality: 82 }).toFile(join(OUT, `${name}.jpg`));
  for (const w of WIDTHS) {
    await img.clone().resize({ width: w }).webp({ quality: 80 }).toFile(join(OUT, `${name}-${w}.webp`));
    await img.clone().resize({ width: w }).avif({ quality: 62 }).toFile(join(OUT, `${name}-${w}.avif`));
  }
  await img.clone().resize({ width: 1400, withoutEnlargement: true }).webp({ quality: 80 }).toFile(join(OUT, `${name}.webp`));
  await img.clone().resize({ width: 1400, withoutEnlargement: true }).avif({ quality: 62 }).toFile(join(OUT, `${name}.avif`));
  console.log("optimized:", name);
}

// rebuild image-variants.json (منطق صحیح: پسوندهای عددی نام — مثل -2 — از عرض variant جدا می‌شوند)
const variants = {};
const KNOWN_WIDTHS = new Set([480, 768, 1080, 1400]);
for (const f of readdirSync(OUT)) {
  const m = f.match(/^(.+?)(?:-(\d+))?\.(webp|avif)$/);
  if (!m) continue;
  let [, name, w, ext] = m;
  let width = 0;
  if (w !== undefined) {
    if (KNOWN_WIDTHS.has(Number(w))) width = Number(w);
    else { name = `${name}-${w}`; width = 0; }
  }
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
writeFileSync(join(ROOT, "src/data/image-variants.json"), JSON.stringify(variants, null, 2));
console.log(`image-variants.json rebuilt: ${Object.keys(variants).length} entries`);
