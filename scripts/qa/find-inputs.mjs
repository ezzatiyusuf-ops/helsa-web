import { chromium } from "playwright";
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
for (const path of ["/contact", "/products/mazafati-dates"]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000" + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const res = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll("input, select, textarea").forEach((el) => {
      const id = el.getAttribute("id");
      const wrapped = el.closest("label");
      const hasLabel = (id && document.querySelector(`label[for="${id}"]`)) || wrapped;
      if (!hasLabel && !el.getAttribute("placeholder") && !el.getAttribute("aria-label")) {
        out.push({
          tag: el.tagName.toLowerCase(),
          type: el.getAttribute("type"),
          name: el.getAttribute("name"),
          cls: (el.getAttribute("class") || "").slice(0, 60),
          value: (el.value || "").slice(0, 20),
          parentCls: (el.parentElement?.getAttribute("class") || "").slice(0, 60),
        });
      }
    });
    return out;
  });
  console.log(path, JSON.stringify(res, null, 1));
  await ctx.close();
}
await browser.close();
