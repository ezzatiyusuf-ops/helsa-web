/**
 * بازتولید variantهای تصویر — scripts/regen-image-variants.mjs
 * ─────────────────────────────────────────────────────────────
 * هر فایلی که در src/data/image-variants.json انتظار می‌رود ولی در
 * public/images/opt نیست را از منبع اصلی بازتولید می‌کند:
 *   منبع: public/images/gen/{name}.jpg  (تصاویر تولیدی اختصاصی)
 *         یا public/images/{name}.jpg   (در صورت وجود)
 *   خروجی: opt/{name}-{480,768,1080,1400}.avif/.webp · opt/{name}.avif/.webp · opt/{name}.jpg
 *
 * کاربرد: ریکاوری بعد از حذف/گم‌شدن فایل‌ها (مثلاً سقف حجم snapshot سندباکس).
 * اجرا:  node scripts/regen-image-variants.mjs [--check]
 *   --check فقط گزارش می‌دهد، چیزی نمی‌نویسد (exit 1 اگر کمبود باشد).
 */
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const CHECK = process.argv.includes("--check");
const ROOT = new URL("..", import.meta.url).pathname;
const map = JSON.parse(readFileSync(`${ROOT}src/data/image-variants.json`, "utf-8"));

const WIDTHS = [480, 768, 1080, 1400];
let missing = [];
let expected = 0;

for (const [name, v] of Object.entries(map)) {
  const files = [];
  for (const fmt of ["avif", "webp"]) {
    for (const w of v[fmt] ?? []) files.push(w === 0 ? `${name}.${fmt}` : `${name}-${w}.${fmt}`);
  }
  if (v.jpg) files.push(`${name}.jpg`);
  for (const f of files) {
    expected++;
    if (!existsSync(`${ROOT}public/images/opt/${f}`)) missing.push({ name, f });
  }
}

console.log(`[regen] فایل مورد انتظار: ${expected} · گم‌شده: ${missing.length}`);
if (missing.length === 0) { console.log("[regen] ✓ کامل — هیچ کمبودی نیست"); process.exit(0); }
if (CHECK) { for (const m of missing) console.log("  ✗", m.f); process.exit(1); }

const byName = {};
for (const m of missing) byName[m.name] = true;
let done = 0, skipped = 0;

for (const name of Object.keys(byName)) {
  const src = [`${ROOT}public/images/gen/${name}.jpg`, `${ROOT}public/images/${name}.jpg`].find(existsSync);
  if (!src) { console.warn(`  ⚠ منبعی برای ${name} پیدا نشد — رد شد`); skipped++; continue; }
  const image = sharp(src, { failOn: "none" });
  const meta = await image.metadata();
  const jobs = [];

  for (const fmt of ["avif", "webp"]) {
    const list = map[name][fmt] ?? [];
    for (const w of list) {
      const target = w === 0 ? `${name}.${fmt}` : `${name}-${w}.${fmt}`;
      if (existsSync(`${ROOT}public/images/opt/${target}`)) continue;
      const pipe = sharp(src, { failOn: "none" }).resize({ width: Math.min(w === 0 ? (meta.width ?? 1400) : w, meta.width ?? 9999), withoutEnlargement: true });
      const buf = fmt === "avif" ? await pipe.avif({ quality: 50, effort: 4 }).toBuffer() : await pipe.webp({ quality: 78 }).toBuffer();
      jobs.push([target, buf]);
    }
  }
  if (map[name].jpg && !existsSync(`${ROOT}public/images/opt/${name}.jpg`)) {
    const buf = await sharp(src, { failOn: "none" }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    jobs.push([`${name}.jpg`, buf]);
  }

  for (const [target, buf] of jobs) { writeFileSync(`${ROOT}public/images/opt/${target}`, buf); done++; }
  console.log(`  ✓ ${name}: ${jobs.length} فایل بازتولید شد (${src.includes("/gen/") ? "gen" : "root"})`);
}

console.log(`[regen] مجموع: ${done} فایل نوشته شد · ${skipped} ست بدون منبع رد شد`);
// تأیید نهایی
{
  let remain = 0;
  for (const m of missing) if (!existsSync(`${ROOT}public/images/opt/${m.f}`)) remain++;
  console.log(`[regen] کمبود باقی‌مانده: ${remain}`);
  process.exit(remain ? 1 : 0);
}
