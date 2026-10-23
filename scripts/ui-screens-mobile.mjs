// اسکرین‌شات موبایل (بدون fullPage تا در بازبینی خوانا بماند)
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
const BASE = process.argv[2] || "http://127.0.0.1:3000";
const OUT = "/home/user/helsa-audit/shots";
await mkdir(OUT, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "fa-IR", deviceScaleFactor: 2 });
const page = await ctx.newPage();
for (const [name, path] of [["home-m-hero", "/"], ["products-m-top", "/products"], ["pdp-m-top", "/products/mazafati-dates"], ["cart-m-top", "/cart"]]) {
  await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}
await b.close();
console.log("ok");
