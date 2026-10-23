#!/usr/bin/env node
/**
 * gen-image-variants.mjs — ساخت/بازسازی واریانت‌های تصویر برای نام‌های دلخواه
 * ─────────────────────────────────────────────────────────────────────────────
 * منبع: public/images/gen/{name}.jpg
 * خروجی: opt/{name}.jpg · {name}.webp/.avif · {name}-{480,768,1080,1400}.webp/.avif
 *        + به‌روزرسانی src/data/image-variants.json و image-blur.json (LQIP)
 * اجرا:  node scripts/gen-image-variants.mjs name1 name2 ...
 *        node scripts/gen-image-variants.mjs --from-file scripts/owner-image-map.txt
 */
import { readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const ROOT = new URL("..", import.meta.url).pathname;
const OUT = join(ROOT, "public/images/opt");
const WIDTHS = [480, 768, 1080, 1400];

const args = process.argv.slice(2);
let names = args.filter((a) => !a.startsWith("--"));
const fi = args.findIndex((a) => a === "--from-file");
if (fi !== -1) {
  const file = args[fi + 1];
  names = readFileSync(join(ROOT, file), "utf-8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split(/\s+/)[0]);
}
names = [...new Set(names)];
if (!names.length) { console.error("استفاده: node scripts/gen-image-variants.mjs <name...> | --from-file <map>"); process.exit(1); }

const variantsPath = join(ROOT, "src/data/image-variants.json");
const blurPath = join(ROOT, "src/data/image-blur.json");
const variants = JSON.parse(readFileSync(variantsPath, "utf-8"));
const blur = JSON.parse(readFileSync(blurPath, "utf-8"));

let ok = 0, bad = 0;
for (const name of names) {
  const src = join(ROOT, "public/images/gen", `${name}.jpg`);
  if (!existsSync(src)) { console.error(`✗ منبع نیست: ${src}`); bad++; continue; }

  // پاک‌سازی واریانت‌های قبلی (تغییر محتوا نباید فایل کهنه بگذارد)
  const stale = [`${name}.jpg`, `${name}.webp`, `${name}.avif`];
  for (const w of WIDTHS) stale.push(`${name}-${w}.webp`, `${name}-${w}.avif`);
  for (const f of stale) { const p = join(OUT, f); if (existsSync(p)) rmSync(p); }

  const img = sharp(src, { failOn: "none" }).rotate();
  const meta = await img.metadata();
  const baseW = Math.min(meta.width, 1400);

  await img.clone().resize({ width: baseW, withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toFile(join(OUT, `${name}.jpg`));
  await img.clone().resize({ width: baseW, withoutEnlargement: true }).webp({ quality: 78, effort: 4 }).toFile(join(OUT, `${name}.webp`));
  await img.clone().resize({ width: baseW, withoutEnlargement: true }).avif({ quality: 50, effort: 4 }).toFile(join(OUT, `${name}.avif`));

  const made = [];
  for (const w of WIDTHS) {
    if (meta.width <= w) continue;
    await img.clone().resize({ width: w, withoutEnlargement: true }).webp({ quality: 78, effort: 4 }).toFile(join(OUT, `${name}-${w}.webp`));
    await img.clone().resize({ width: w, withoutEnlargement: true }).avif({ quality: 50, effort: 4 }).toFile(join(OUT, `${name}-${w}.avif`));
    made.push(w);
  }
  // ورودی «۰» = نسخهٔ تمام‌عرض (سازگار با قالب موجود manifest)
  variants[name] = { avif: [0, ...made], webp: [0, ...made], jpg: true };

  const lqip = await img.clone().resize({ width: 16 }).webp({ quality: 40, effort: 3 }).toBuffer();
  blur[name] = `data:image/webp;base64,${lqip.toString("base64")}`;
  console.log(`  ✓ ${name} (${meta.width}x${meta.height} → ${baseW}w · ${made.join("/") || "-"})`);
  ok++;
}

writeFileSync(variantsPath, JSON.stringify(variants, null, 2) + "\n");
writeFileSync(blurPath, JSON.stringify(blur, null, 2) + "\n");
console.log(`[variants] ${ok} نام ساخته شد · ${bad} خطا · manifest به‌روز شد`);
process.exit(bad ? 1 : 0);
