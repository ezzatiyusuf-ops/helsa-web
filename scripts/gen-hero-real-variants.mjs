#!/usr/bin/env node
/**
 * HELSA — واریانت‌های تصاویر هیروی صفحهٔ اول (بنرهای اختصاصی برند):
 *   opt/{name}.jpg (mozjpeg ≤1400w) · {name}-{480,768,1080,1400}.webp/.avif · {name}.webp/.avif
 * + به‌روزرسانی src/data/image-variants.json و image-blur.json (LQIP ~16px webp).
 *
 * منبع حقیقت: public/images/gen/hero-*.jpg — بنرهای ۱۶:۹ اختصاصی (سبک برند: سنگ مات،
 * نور نرم بالا-چپ، سایه پایین-راست، رنگ طبیعی؛ تولیدشده با ارجاع به عکس‌های واقعی
 * محصولات در helsa-photo-edits/final-v2). مسترهای اصلی: helsa-photo-edits/hero-banner-v1/.
 * اسلایدهای محصولی، قیمت/نام/quickAdd را از کاتالوگ واقعی می‌گیرند (Hero.tsx).
 * اجرا:  node scripts/gen-hero-real-variants.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const ROOT = new URL("..", import.meta.url).pathname;
const OUT = join(ROOT, "public/images/opt");
const WIDTHS = [480, 768, 1080, 1400];

const HERO_NAMES = [
  "hero-piarom",
  "hero-mazafati",
  "hero-nuts-dried-fruits",
  "hero-date-chocolate",
  "hero-mazeh-tray",
];
const JOBS = HERO_NAMES.map((n) => [join(ROOT, "public/images/gen", `${n}.jpg`), n]);

const variantsPath = join(ROOT, "src/data/image-variants.json");
const blurPath = join(ROOT, "src/data/image-blur.json");
const variants = JSON.parse(readFileSync(variantsPath, "utf-8"));
const blur = JSON.parse(readFileSync(blurPath, "utf-8"));

for (const [src, name] of JOBS) {
  let img = sharp(src, { failOn: "none" }).rotate();
  const meta = await img.metadata();
  const baseW = Math.min(meta.width, 1400);

  await img.clone().resize({ width: baseW, withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toFile(join(OUT, `${name}.jpg`));
  await img.clone().resize({ width: baseW, withoutEnlargement: true }).webp({ quality: 80, effort: 4 }).toFile(join(OUT, `${name}.webp`));
  await img.clone().resize({ width: baseW, withoutEnlargement: true }).avif({ quality: 55, effort: 3 }).toFile(join(OUT, `${name}.avif`));

  const made = [];
  for (const w of WIDTHS) {
    if (meta.width <= w) continue;
    await img.clone().resize({ width: w, withoutEnlargement: true }).webp({ quality: 80, effort: 4 }).toFile(join(OUT, `${name}-${w}.webp`));
    await img.clone().resize({ width: w, withoutEnlargement: true }).avif({ quality: 55, effort: 3 }).toFile(join(OUT, `${name}-${w}.avif`));
    made.push(w);
  }
  variants[name] = { avif: made, webp: made, jpg: true };

  const lqip = await img.clone().resize({ width: 16 }).webp({ quality: 40, effort: 3 }).toBuffer();
  blur[name] = `data:image/webp;base64,${lqip.toString("base64")}`;
  console.log(`✓ ${name} (${meta.width}x${meta.height} → ${baseW}w, ${made.join("/") || "-"})`);
}

writeFileSync(variantsPath, JSON.stringify(variants, null, 2) + "\n");
writeFileSync(blurPath, JSON.stringify(blur, null, 2) + "\n");
console.log("json به‌روز شد: image-variants + image-blur");
