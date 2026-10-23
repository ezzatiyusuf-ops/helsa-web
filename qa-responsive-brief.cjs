/* ریسپانسیو سکشن‌های جدید بریف در ۸ عرض */
const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const widths = [320, 360, 390, 430, 768, 1024, 1280, 1440];
  let fail = 0;
  for (const w of widths) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 } });
    await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const cards = await page.locator('section[aria-label="پیشنهاد ویژه امروز"] article.prem-card').count();
    const occ = await page.locator('a[href="/mehmani"]').count();
    const timer = await page.locator('[role="timer"]').count();
    const bad = overflow > 1 || cards !== 4 || occ < 1;
    if (bad) fail++;
    console.log(`${bad ? "FAIL" : "OK  "} ${w}px · overflow=${overflow} · prem-cards=${cards} · مناسبت=${occ} · timer=${timer}`);
    await page.close();
  }
  await browser.close();
  console.log(fail ? `RESPONSIVE FAIL=${fail}` : "RESPONSIVE 8/8 OK");
  process.exit(fail ? 1 : 0);
})();
