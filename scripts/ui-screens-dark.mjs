// اسکرین‌شات تم تیره + بررسی کنتراست محاسبه‌شده در مرورگر — شاهد بصری برای A-05
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
const BASE = process.argv[2] || "http://127.0.0.1:3000";
const OUT = "/home/user/helsa-audit/shots";
await mkdir(OUT, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, locale: "fa-IR" });
await ctx.addInitScript(() => localStorage.setItem("helsa-theme", "dark"));
const page = await ctx.newPage();
for (const [name, path] of [["dark-home", "/"], ["dark-products", "/products"]]) {
  await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}
// خواندن رنگ واقعی محاسبه‌شده برای متن‌های faint در تم تیره
const probe = await page.evaluate(() => {
  const el = document.querySelector(".text-faint") || document.querySelector('[class*="text-faint"]');
  if (!el) return null;
  let p = el;
  let bg = "rgba(0, 0, 0, 0)";
  while (p) {
    const c = getComputedStyle(p).backgroundColor;
    if (c && c !== "rgba(0, 0, 0, 0)" && c !== "transparent") { bg = c; break; }
    p = p.parentElement;
  }
  return { theme: document.documentElement.dataset.theme, color: getComputedStyle(el).color, bg, sample: el.textContent?.trim().slice(0, 30) };
});
console.log(JSON.stringify(probe));
await b.close();
