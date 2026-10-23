import { chromium } from "playwright";
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.goto("http://localhost:3000/checkout", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
const res = await page.evaluate(() => {
  const doc = document.documentElement;
  const base = doc.scrollWidth - doc.clientWidth;
  const grid = document.querySelector(".container-x.grid");
  const results = [];
  const kids = grid ? grid.children : [];
  for (const col of kids) {
    for (const el of col.querySelectorAll("*")) {
      const prev = el.style.display;
      el.style.display = "none";
      const o = doc.scrollWidth - doc.clientWidth;
      el.style.display = prev;
      if (o <= 1 && o < base) {
        results.push({ tag: el.tagName.toLowerCase(), cls: (el.getAttribute("class") || "").slice(0, 90), text: (el.textContent || "").trim().slice(0, 40), fixedOverflow: o });
      }
    }
  }
  return { base, results: results.slice(0, 8) };
});
console.log("baseline overflow:", res.base, "px");
console.log(JSON.stringify(res.results, null, 1));
await browser.close();
