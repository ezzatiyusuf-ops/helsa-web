#!/usr/bin/env node
/**
 * product-photo.mjs — الگوی ثابت عکس محصول هلسا (درخواست کاربر: «یک الگو ثابت
 * داشته باشیم تا همهٔ عکس‌ها یکدست و با یک فرمت در سایت قرار بگیرن» + «عکس ادیت
 * کن بهتر کن» — ادیت فتوگرافیک، بدون جعل محصول)
 * ─────────────────────────────────────────────────────────────────────────────
 * هر عکس واقعی محصول را با همین قالب یکسان پرداخت می‌کند:
 *   ۱) جهت EXIF اصلاح می‌شود (عکس موبایل)
 *   ۲) ادیت فتوگرافیک (توسعهٔ دهی، نه دستکاری): روشنایی +۷٪ · اشباع +۲۸٪ ·
 *      کنتراست ×۱٫۰۹ حول میانگین · شارپ ملایم — رنگ/شکل محصول جعل نمی‌شود
 *   ۳) عکس به‌صورت «کارت شناور»: گوشه‌های گرد + سایهٔ نرم روی بوم کرم —
 *      تفکیک از پس‌زمینه و عمق (علت «جالب نبودن» نسخهٔ قبلی، ترکیبشدن
 *      پس‌زمینهٔ عکس با بوم و بی‌عمقی بود)
 *   ۴) بوم مربع ۱۴۰۰×۱۴۰۰ با پس‌زمینهٔ کرم برند (#FAF7F0)؛ کارت در جعبهٔ ۹۴٪
 *      بوم (بدون برش محصول — fit:inside)
 *   ۵) واریانت‌های استاندارد: -480/-768/-1080 webp+avif + پایه webp/avif/jpg
 *      (کیفیت‌ها همان regen-image-variants: webp 78 · avif 50)
 *   ۶) منبع مربع در public/images/gen/{name}.jpg برای ریکاوری
 *      (npm run images:regen)
 *   ۷) src/data/image-variants.json به‌روز می‌شود
 *
 * اجرا:  node scripts/product-photo.mjs <عکس-ورودی> <نام-محصول> [ --no-manifest ]
 * مثال: node scripts/product-photo.mjs ~/uploads/IMG_3467.jpg lahijan-black-tea
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import sharp from "sharp";

const [,, input, name, ...flags] = process.argv;
if (!input || !name) {
  console.error("استفاده: node scripts/product-photo.mjs <عکس-ورودی> <نام-محصول> [--no-manifest]");
  process.exit(1);
}
if (!existsSync(input)) { console.error(`✗ فایل ورودی پیدا نشد: ${input}`); process.exit(1); }
if (!/^[a-z0-9-]+$/.test(name)) { console.error("✗ نام باید فقط حروف انگلیسی کوچک/عدد/خط تیره باشد (مثل lahijan-black-tea)"); process.exit(1); }

const ROOT = new URL("..", import.meta.url).pathname;
const CANVAS = 1400;          // بوم مربع اصلی
const MARGIN = 0.94;          // کارت عکس حداکثر ۹۴٪ بوم
const BG = { r: 250, g: 247, b: 240 }; // #FAF7F0 کرم برند
const WIDTHS = [480, 768, 1080];

// ── پارامترهای ادیت فتوگرافیک (توسعهٔ دهی استاندارد؛ محصول جعل نمی‌شود) ──
// قابل بازنویسی با فلگ: --b=1.08 --s=1.0 --c=1.05 --no-edit
const flagNum = (re, dflt) => { const f = flags.find((v) => re.test(v)); return f ? parseFloat(f.split("=")[1]) : dflt; };
const BRIGHTNESS = flags.includes("--no-edit") ? 1 : flagNum(/^--b=/, 1.07);   // +۷٪ نور (پیش‌فرض عکس خام گوشی)
const SATURATION = flags.includes("--no-edit") ? 1 : flagNum(/^--s=/, 1.28);   // +۲۸٪ اشباع (عکس خام معمولاً کدر است)
const CONTRAST = flags.includes("--no-edit") ? 1 : flagNum(/^--c=/, 1.09);     // ×۱٫۰۹ حول میانگین
const SHARPEN = { sigma: 1, m1: 0.4, m2: 0.6 }; // شارپ ملایم

// ── پارامترهای کارت شناور ──
const RADIUS = 30;          // گوشهٔ گرد کارت (px روی بوم ۱۴۰۰)
const SHADOW_BLUR = 26;     // مات بودن سایه
const SHADOW_DY = 16;       // پایین‌افتادگی سایه
const SHADOW_OPACITY = 0.16;

const updateManifest = !flags.includes("--no-manifest");

mkdirSync(`${ROOT}public/images/gen`, { recursive: true });
mkdirSync(`${ROOT}public/images/opt`, { recursive: true });

// ── ۱) بارگذاری + EXIF + اندازهٔ کارت (fit داخل جعبهٔ ۹۴٪، بدون برش) ──
const fitted = await sharp(input, { failOn: "none" })
  .rotate()
  .resize({ width: Math.round(CANVAS * MARGIN), height: Math.round(CANVAS * MARGIN), fit: "inside" })
  .toBuffer({ resolveWithObject: true });
const w = fitted.info.width;
const h = fitted.info.height;
console.log(`  کارت عکس: ${w}×${h}`);

// ── ۲) ادیت فتوگرافیک ──
const enhanced = await sharp(fitted.data)
  .modulate({ brightness: BRIGHTNESS, saturation: SATURATION })
  .linear(CONTRAST, -(CONTRAST - 1) * 128) // کنتراست حول میانگین (۱۲۸ ثابت می‌ماند)
  .sharpen(SHARPEN)
  .toBuffer();

// ── ۳) گوشه گرد + خط مویی ظریف دور کارت ──
const roundedSvg = (fill, opacity = 1) =>
  Buffer.from(`<svg width="${w}" height="${h}"><rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="${RADIUS}" fill="${fill}" fill-opacity="${opacity}"/></svg>`);
const hairlineSvg = Buffer.from(
  `<svg width="${w}" height="${h}"><rect x="0.75" y="0.75" width="${w - 1.5}" height="${h - 1.5}" rx="${RADIUS}" fill="none" stroke="rgba(13,23,18,0.10)" stroke-width="1.5"/></svg>`
);
const card = await sharp(enhanced)
  .composite([
    { input: roundedSvg("#000"), blend: "dest-in" }, // گوشه‌های گرد
    { input: hairlineSvg, blend: "over" },            // خط مویی
  ])
  .png()
  .toBuffer();

// ── ۴) سایهٔ نرم (مستطیل گرد سیاهِ مات‌شده) ──
const shadow = await sharp(roundedSvg("#000", SHADOW_OPACITY))
  .blur(SHADOW_BLUR)
  .png()
  .toBuffer();

// ── ۵) بوم کرم + چیدمان مرکزی ──
const x = Math.round((CANVAS - w) / 2);
const y = Math.round((CANVAS - h) / 2);
const masterPng = await sharp({
  create: { width: CANVAS, height: CANVAS, channels: 4, background: { r: BG.r, g: BG.g, b: BG.b, alpha: 1 } },
})
  .composite([
    { input: shadow, left: x, top: y + SHADOW_DY },
    { input: card, left: x, top: y },
  ])
  .png()
  .toBuffer();

// منبع ریکاوری در gen/ (jpg با پس‌زمینهٔ کرم)
await sharp(masterPng).jpeg({ quality: 88 }).toFile(`${ROOT}public/images/gen/${name}.jpg`);

// ── ۶) واریانت‌ها ──
const jobs = [];
for (const fmt of ["avif", "webp"]) {
  for (const wv of WIDTHS) {
    const buf = await sharp(masterPng).resize({ width: wv })
      [fmt](fmt === "avif" ? { quality: 50, effort: 4 } : { quality: 78 }).toBuffer();
    jobs.push([`${name}-${wv}.${fmt}`, buf]);
  }
  const base = await sharp(masterPng)
    [fmt](fmt === "avif" ? { quality: 50, effort: 4 } : { quality: 78 }).toBuffer();
  jobs.push([`${name}.${fmt}`, base]);
}
jobs.push([`${name}.jpg`, await sharp(masterPng).jpeg({ quality: 85 }).toBuffer()]);

for (const [file, buf] of jobs) {
  writeFileSync(`${ROOT}public/images/opt/${file}`, buf);
  const kb = (buf.length / 1024).toFixed(0);
  console.log(`  ✓ opt/${file} (${kb}KiB)`);
}

// ── ۷) manifest ──
if (updateManifest) {
  const mapPath = `${ROOT}src/data/image-variants.json`;
  const map = JSON.parse(readFileSync(mapPath, "utf-8"));
  map[name] = { avif: [0, ...WIDTHS], webp: [0, ...WIDTHS], jpg: true };
  writeFileSync(mapPath, JSON.stringify(map, null, 2) + "\n");
  console.log(`  ✓ image-variants.json («${name}» ثبت/به‌روز شد)`);
}

console.log(`\n✓ الگوی ثابت + ادیت فتوگرافیک اعمال شد: «${name}»`);
console.log(`  ادیت: روشنایی ×${BRIGHTNESS} · اشباع ×${SATURATION} · کنتراست ×${CONTRAST} · شارپ · کارت گرد + سایه`);
console.log(`  آدرس برای DB/اپ: /images/opt/${name}.jpg`);
console.log(`  منبع ریکاوری: public/images/gen/${name}.jpg (بازتولید: npm run images:regen)`);
