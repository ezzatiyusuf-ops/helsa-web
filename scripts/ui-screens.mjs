// اسکرین‌شات شواهد UI — اجرا: node scripts/ui-screens.mjs [baseUrl]
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.argv[2] || "http://127.0.0.1:3000";
const OUT = "/home/user/helsa-audit/shots";
const PAGES = [
  ["home", "/", "full"],
  ["products", "/products", 1400],
  ["pdp", "/products/mazafati-dates", 1400],
  ["cart", "/cart", "full"],
  ["trays", "/mazeh-trays", 1400],
  ["rooziteh", "/rooziteh", "full"],
  ["login", "/login", 900],
];
const VIEWPORTS = [
  ["desktop", { width: 1440, height: 1000 }],
  ["mobile", { width: 390, height: 844 }],
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const errs = [];
for (const [vpName, vp] of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, locale: "fa-IR" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errs.push(`${vpName} js: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errs.push(`${vpName} console: ${m.text().slice(0, 160)}`); });
  for (const [name, path, height] of PAGES) {
    await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/${name}-${vpName}.png`, fullPage: height === "full" });
    // سنجش سرریز افقی — شایع‌ترین باگ ریسپانسیو
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 1) errs.push(`${vpName} ${path}: سرریز افقی ${overflow}px`);
  }
  await ctx.close();
}
await browser.close();
console.log(errs.length ? errs.join("\n") : "بدون خطای کنسول و بدون سرریز افقی");
