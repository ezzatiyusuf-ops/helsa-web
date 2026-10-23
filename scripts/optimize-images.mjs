#!/usr/bin/env node
/**
 * Image SEO pipeline — generates optimized variants for every mapped image:
 *   /images/opt/{name}.jpg          (mozjpeg, max 1400w)
 *   /images/opt/{name}-{w}.webp     (480 / 768 / 1080)
 *   /images/opt/{name}.webp         (1400w)
 *   /images/opt/{name}-{w}.avif     (480 / 768 / 1080)
 *   /images/opt/{name}.avif         (1400w)
 * Reads scripts/image-map.json (built by scripts/build-image-map.py).
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const ROOT = new URL("..", import.meta.url).pathname;
const map = JSON.parse(readFileSync(join(ROOT, "scripts/image-map.json"), "utf-8"));
const OUT_DIR = join(ROOT, "public/images/opt");
mkdirSync(OUT_DIR, { recursive: true });

const WIDTHS = [480, 768, 1080, 1400];
const jobs = Object.entries(map);
let origBytes = 0;
let outBytes = 0;

for (const [src, dst] of jobs) {
  const input = join(ROOT, "public", src);
  const base = dst.replace(/\.jpg$/, "");
  const name = base.split("/").pop();
  try {
    const img = sharp(input, { failOn: "none" }).rotate();
    const meta = await img.metadata();
    const srcSize = (await sharp(input).metadata()).size ?? 0;

    // optimized jpeg (largest width capped at 1400)
    const jpeg = img.clone().resize({ width: Math.min(meta.width ?? 1400, 1400), withoutEnlargement: true });
    await jpeg.jpeg({ quality: 82, mozjpeg: true }).toFile(join(OUT_DIR, `${name}.jpg`));

    for (const w of WIDTHS) {
      if ((meta.width ?? 0) <= w) continue;
      const resized = img.clone().resize({ width: w, withoutEnlargement: true });
      await resized.webp({ quality: 80, effort: 4 }).toFile(join(OUT_DIR, `${name}-${w}.webp`));
      await resized.avif({ quality: 55, effort: 3 }).toFile(join(OUT_DIR, `${name}-${w}.avif`));
    }
    // full-size webp/avif
    await img.clone().resize({ width: Math.min(meta.width ?? 1400, 1400), withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 }).toFile(join(OUT_DIR, `${name}.webp`));
    await img.clone().resize({ width: Math.min(meta.width ?? 1400, 1400), withoutEnlargement: true })
      .avif({ quality: 55, effort: 3 }).toFile(join(OUT_DIR, `${name}.avif`));

    origBytes += srcSize;
    console.log(`✓ ${name} (${meta.width}x${meta.height})`);
  } catch (e) {
    console.error(`✗ ${src}: ${e.message}`);
    process.exitCode = 1;
  }
}

// savings report
const { readdirSync, statSync } = await import("node:fs");
let total = 0;
for (const f of readdirSync(OUT_DIR)) total += statSync(join(OUT_DIR, f)).size;
outBytes = total;
const origDir = join(ROOT, "public/images/pexels");
let origTotal = 0;
try {
  for (const f of readdirSync(origDir)) origTotal += statSync(join(origDir, f)).size;
} catch {}
console.log(`\nsource pexels dir: ${(origTotal / 1024 / 1024).toFixed(1)}MB → optimized /images/opt: ${(outBytes / 1024 / 1024).toFixed(1)}MB (all formats, all widths)`);
writeFileSync(join(ROOT, "scripts/image-opt-report.json"), JSON.stringify({ mapped: jobs.length, optDirBytes: outBytes, origDirBytes: origTotal }, null, 2));
