/**
 * pwa-audit.mjs — ممیزی واقعی PWA (فاز ۸)
 * ─────────────────────────────────────────────────────────────────────────────
 *   ۱) manifest: فیلدهای لازم + ابعاد واقعی هر آیکون + وجود فایل
 *   ۲) maskable: وجود آیکون maskable (برش اندروید)
 *   ۳) service worker: ثبت و فعال شدن
 *   ۴) آفلاین واقعی: با قطع شبکه، ناوبری به صفحهٔ کش‌نشده باید /offline بدهد
 *   ۵) مسیرهای حساس هرگز کش نشوند (account/admin/checkout/payment/api)
 *   ۶) کش استاتیک پر می‌شود
 * اجرا: node scripts/pwa-audit.mjs [baseUrl]
 */
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://127.0.0.1:3000";
const fails = [], warns = [], ok = [];
const pass = (m) => ok.push(m);
const fail = (m) => fails.push(m);
const warn = (m) => warns.push(m);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fa-IR" });
const page = await ctx.newPage();

// ── ۱) manifest ──────────────────────────────────────────────────────────────
await page.goto(BASE + "/", { waitUntil: "networkidle" });
const manifestHref = await page.getAttribute('link[rel="manifest"]', "href");
if (!manifestHref) fail("manifest: تگ <link rel=manifest> وجود ندارد");
else pass(`manifest لینک شده: ${manifestHref}`);

const manifest = await page.evaluate(async (href) => (await fetch(href)).json(), manifestHref);
for (const k of ["name", "short_name", "start_url", "display", "theme_color", "background_color", "icons"]) {
  if (!manifest[k]) fail(`manifest: فیلد «${k}» خالی است`);
}
if (manifest.display !== "standalone" && manifest.display !== "fullscreen") warn(`display=${manifest.display}`);
if (!manifest.lang) warn("manifest: lang تعریف نشده");
else pass(`manifest: ${manifest.icons.length} آیکون · display=${manifest.display} · lang=${manifest.lang}`);

for (const icon of manifest.icons ?? []) {
  const res = await page.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    try { await img.decode(); } catch { return null; }
    return { w: img.naturalWidth, h: img.naturalHeight };
  }, icon.src);
  if (!res) { fail(`آیکون بارگذاری نشد: ${icon.src}`); continue; }
  const [ew, eh] = (icon.sizes || "0x0").split("x").map(Number);
  if (res.w !== ew || res.h !== eh) fail(`آیکون ${icon.src}: ابعاد واقعی ${res.w}x${res.h} با manifest ${icon.sizes} نمی‌خواند`);
  else pass(`آیکون ${icon.src} = ${res.w}x${res.h} (${icon.purpose || "any"})`);
}
if (!(manifest.icons ?? []).some((i) => (i.purpose || "").includes("maskable"))) {
  fail("maskable icon وجود ندارد (اندروید آیکون را برش می‌دهد)");
}

// ── ۲) meta های نصب ──────────────────────────────────────────────────────────
const meta = await page.evaluate(() => ({
  themeColor: document.querySelector('meta[name="theme-color"]')?.getAttribute("content") || "",
  apple: document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute("href") || "",
  viewport: document.querySelector('meta[name="viewport"]')?.getAttribute("content") || "",
}));
if (!meta.themeColor) fail("meta theme-color ندارد");
else if (meta.themeColor.toLowerCase() !== (manifest.theme_color || "").toLowerCase()) {
  warn(`theme_color ناهم‌خوان: meta=${meta.themeColor} · manifest=${manifest.theme_color}`);
} else pass(`theme-color = ${meta.themeColor} (هم‌خوان با manifest)`);
if (!meta.apple) warn("apple-touch-icon ندارد");
else pass(`apple-touch-icon = ${meta.apple}`);
if (!/width=device-width/.test(meta.viewport)) fail("viewport بدون width=device-width");

// ── ۳) service worker ────────────────────────────────────────────────────────
const sw = await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? { scope: reg.scope, state: reg.active?.state || "" } : null;
});
if (!sw) fail("service worker ثبت نشده");
else pass(`service worker فعال · scope=${sw.scope} · state=${sw.state}`);

// ── ۴) آفلاین واقعی ──────────────────────────────────────────────────────────
await page.goto(BASE + "/offline", { waitUntil: "networkidle" });
await ctx.setOffline(true);
let offlineOk = false;
try {
  await page.goto(BASE + "/blog", { waitUntil: "domcontentloaded", timeout: 15000 });
  const body = await page.evaluate(() => document.body.innerText.slice(0, 400));
  offlineOk = /آفلاین|آنتن|اینترنت|offline/i.test(body);
} catch { offlineOk = false; }
if (offlineOk) pass("قطع شبکه: ناوبری به صفحهٔ کش‌نشده → صفحهٔ آفلاین نمایش داده شد");
else fail("قطع شبکه: صفحهٔ آفلاین نمایش داده نشد (کاربر صفحهٔ خطای مرورگر می‌بیند)");

// ── ۵) مسیرهای حساس کش نشوند ────────────────────────────────────────────────
await ctx.setOffline(false);
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
const cachedSensitive = await page.evaluate(async () => {
  const bad = [];
  for (const name of await caches.keys()) {
    const cache = await caches.open(name);
    for (const req of await cache.keys()) {
      const u = new URL(req.url);
      if (/^\/(account|admin|checkout|payment|api)(\/|$)/.test(u.pathname)) bad.push(`${name} → ${u.pathname}`);
    }
  }
  return bad;
});
if (cachedSensitive.length) fail(`مسیر حساس در کش: ${cachedSensitive.slice(0, 3).join(", ")}`);
else pass("هیچ مسیر حساسی (account/admin/checkout/payment/api) در کش نیست");

// ── ۶) کش استاتیک ───────────────────────────────────────────────────────────
const cacheInfo = await page.evaluate(async () => {
  const out = [];
  for (const name of await caches.keys()) {
    const c = await caches.open(name);
    out.push({ name, count: (await c.keys()).length });
  }
  return out;
});
if (cacheInfo.some((c) => c.count > 0)) pass(`کش‌ها: ${cacheInfo.map((c) => `${c.name}=${c.count}`).join(" · ")}`);
else warn("هیچ کش پر شده‌ای دیده نشد");

await browser.close();

console.log("\n── یافته‌های سالم ──");
for (const o of ok) console.log("  ✓", o);
if (warns.length) { console.log("\n── هشدار ──"); for (const w of warns) console.log("  ▲", w); }
if (fails.length) { console.log("\n── ناموفق ──"); for (const f of fails) console.log("  ✗", f); }
console.log(`\nنتیجه: ${ok.length} سالم · ${warns.length} هشدار · ${fails.length} ناموفق`);
process.exit(fails.length ? 1 : 0);
