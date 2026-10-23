import { chromium } from "playwright";
const PAGES = ["/", "/products", "/products/mazafati-dates", "/mazeh-trays", "/mazeh-trays/build", "/gifts/corporate", "/blog", "/checkout", "/cart", "/login", "/track", "/wholesale"];
const APIS = ["/api/health", "/api/products", "/api/search?q=خرما", "/api/trays", "/api/gifts"];

const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

console.log("── صفحات (سرد اول، سپس گرم) — FCP / DCL / Load / انتقال ──");
for (const p of PAGES) {
  // cold (new context cache disabled via hard reload later); measure once cold-ish then warm
  const t0 = Date.now();
  await page.goto("http://localhost:3000" + p, { waitUntil: "load", timeout: 45000 });
  const nav = await page.evaluate(() => {
    const n = performance.getEntriesByType("navigation")[0];
    const fcp = performance.getEntriesByName("first-contentful-paint")[0];
    const res = performance.getEntriesByType("resource");
    const transfer = res.reduce((s, r) => s + (r.transferSize || 0), 0) + (n?.transferSize || 0);
    return {
      fcp: Math.round(fcp?.startTime ?? 0),
      dcl: Math.round(n?.domContentLoadedEventEnd ?? 0),
      load: Math.round(n?.loadEventEnd ?? 0),
      kb: Math.round(transfer / 1024),
    };
  });
  const wall = Date.now() - t0;
  // warm
  const t1 = Date.now();
  await page.goto("http://localhost:3000" + p, { waitUntil: "load", timeout: 45000 });
  const warm = Date.now() - t1;
  console.log(`${p.padEnd(26)} FCP=${String(nav.fcp).padStart(5)}ms  DCL=${String(nav.dcl).padStart(5)}ms  Load=${String(nav.load).padStart(5)}ms  transfer=${String(nav.kb).padStart(4)}KB  warm=${String(warm).padStart(4)}ms (wall ${wall}ms)`);
}

console.log("\n── APIها (میانگین ۵ درخواست) ──");
for (const a of APIS) {
  const ts = [];
  for (let i = 0; i < 5; i++) {
    const t = Date.now();
    await page.goto("http://localhost:3000" + a, { waitUntil: "load", timeout: 30000 }).catch(() => {});
    ts.push(Date.now() - t);
  }
  const avg = Math.round(ts.reduce((s, x) => s + x, 0) / ts.length);
  const min = Math.min(...ts);
  console.log(`${a.padEnd(26)} avg=${String(avg).padStart(4)}ms  min=${String(min).padStart(4)}ms`);
}
await browser.close();
