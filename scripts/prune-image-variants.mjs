/**
 * هرسِ manifest واریانت تصویر — scripts/prune-image-variants.mjs
 * ─────────────────────────────────────────────────────────────
 * مسئله: src/data/image-variants.json (ساختهٔ دست/اسکریپت قدیمی) می‌تواند به فایل‌هایی
 * اشاره کند که روی دیسک نیستند. SmartImage از همین manifest، srcset می‌سازد ⇒ مرورگر
 * عرض ناموجود را انتخاب می‌کند و تصویر شکسته می‌شود (ریشهٔ باگ B-02).
 *
 * این اسکریپت manifest را به «واقعیت دیسک» هرس می‌کند:
 *   - برای هر عرض، فقط اگر هم AVIF و هم WebP موجود باشند نگه داشته می‌شود
 *     (چون هر دو <source> در یک <picture> از همان فهرست عرض‌ها ساخته می‌شوند)،
 *     و عرض 0 (فایل پایه) هم فقط اگر هر دو فایل پایه موجود باشند.
 *   - اگر JPEG پایه نباشد، کلید کامل حذف می‌شود (img نهایی بی‌فایل می‌ماند).
 *
 * اجرا:
 *   node scripts/prune-image-variants.mjs --check   # فقط گزارش (exit 1 اگر اختلاف)
 *   node scripts/prune-image-variants.mjs --fix     # بازنویسی manifest
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const ROOT = new URL("..", import.meta.url).pathname;
const MAP_PATH = `${ROOT}src/data/image-variants.json`;
const OPT = `${ROOT}public/images/opt/`;

const CHECK = process.argv.includes("--check");
const FIX = process.argv.includes("--fix");
if (!CHECK && !FIX) {
  console.log("استفاده: --check (گزارش) یا --fix (بازنویسی)");
  process.exit(2);
}

const map = JSON.parse(readFileSync(MAP_PATH, "utf-8"));
const next = {};
const report = { kept: 0, droppedKeys: [], droppedWidths: [], totalDroppedFiles: 0 };

for (const [name, v] of Object.entries(map)) {
  const jpgOk = v.jpg ? existsSync(`${OPT}${name}.jpg`) : false;
  if (!jpgOk) {
    report.droppedKeys.push(name);
    report.totalDroppedFiles += (v.avif?.length ?? 0) + (v.webp?.length ?? 0) + 1;
    continue;
  }
  const keep = (fmt) =>
    (v[fmt] ?? []).filter((w) => {
      const f = w === 0 ? `${name}.${fmt}` : `${name}-${w}.${fmt}`;
      const ok = existsSync(`${OPT}${f}`);
      if (!ok) report.droppedWidths.push({ name, fmt, w });
      return ok;
    });
  const avif = keep("avif");
  const webp = keep("webp");
  // عرض‌هایی که فقط در یکی از دو فرمت موجودند از هر دو حذف می‌شوند تا srcset هم‌تراز بماند
  const aligned = avif.filter((w) => webp.includes(w));
  const avifFinal = avif.filter((w) => aligned.includes(w));
  const webpFinal = webp.filter((w) => aligned.includes(w));
  next[name] = { avif: avifFinal, webp: webpFinal, jpg: true };
  report.kept++;
}

const droppedWidthCount = report.droppedWidths.length;
console.log(`کلیدها: ${Object.keys(map).length} → ${report.kept} (حذف کامل: ${report.droppedKeys.length})`);
console.log(`عرض‌های ناموجود: ${droppedWidthCount}`);
if (report.droppedKeys.length) console.log("کلیدهای حذف‌شده:", report.droppedKeys.join(", "));

if (CHECK) {
  const dirty = report.droppedKeys.length > 0 || droppedWidthCount > 0;
  console.log(dirty ? "✗ manifest با دیسک هم‌خوان نیست" : "✓ manifest با دیسک هم‌خوان است");
  process.exit(dirty ? 1 : 0);
}

writeFileSync(MAP_PATH, JSON.stringify(next, null, 0) + "\n");
console.log(`✓ بازنویسی شد: ${MAP_PATH}`);
