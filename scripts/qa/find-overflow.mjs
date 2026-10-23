import { chromium } from "playwright";
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
for (const path of ["/", "/products", "/cart", "/checkout", "/mazeh-trays", "/mazeh-trays/build", "/gifts/corporate", "/blog", "/track", "/wholesale", "/login", "/account"]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000" + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  const res = await page.evaluate(() => {
    const doc = document.documentElement;
    const overflowPx = doc.scrollWidth - doc.clientWidth;
    const docW = doc.clientWidth;
    const offenders = [];
    window.__clipped = (el) => {
      let p = el.parentElement;
      while (p && p !== document.body) {
        const o = getComputedStyle(p).overflowX;
        if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") return true;
        p = p.parentElement;
      }
      return false;
    };
    document.querySelectorAll("body *").forEach((el) => {
      const r = el.getBoundingClientRect();
      if ((r.right > docW + 1 || r.left < -1) && !window.__clipped(el)) {
        offenders.push(el.tagName.toLowerCase() + "." + (el.getAttribute("class") || "").slice(0, 70) + " left=" + Math.round(r.left) + " right=" + Math.round(r.right));
      }
    });
    return { overflowPx, offenders: offenders.slice(0, 6) };
  });
  console.log(path.padEnd(22), "overflow=" + String(res.overflowPx).padStart(3) + "px", res.overflowPx > 1 ? "⚠️ " + res.offenders.join(" | ") : "✅");
  await ctx.close();
}
await browser.close();
