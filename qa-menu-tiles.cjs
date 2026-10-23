const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ args: ["--no-sandbox"] });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  // باز کردن منوی همبرگری
  await p.click('button[aria-label*="منو"], button[aria-label*="Menu"]')
    .catch(() => p.locator('button:has(svg)', { hasText: "" }).first().click());
  await p.waitForTimeout(1200);
  const menu = p.locator('[role="dialog"][aria-label="منوی اصلی"]');
  console.log("منو باز شد:", (await menu.count()) === 1);
  // کاشی‌های سلامت
  const sec = menu.locator("text=مرکز سلامت و رسانهٔ هلسا").locator("..");
  const tiles = menu.locator('a[href="/health-center"], a[href="/health-center/mental-health"], a[href="/guides"], a[href="/blog"]');
  console.log("تعداد کاشی سلامت:", await tiles.count());
  const imgs = [];
  for (const t of await tiles.all()) {
    imgs.push({ href: await t.getAttribute("href"), img: await t.locator("img").getAttribute("src"), txt: (await t.textContent()).trim().slice(0, 30) });
  }
  console.log(JSON.stringify(imgs, null, 1));
  // تصاویر واقعاً لود شدند؟
  const loaded = await menu.locator('a[href="/health-center"] img, a[href*="health"] img, a[href="/guides"] img, a[href="/blog"] img').evaluateAll(els => els.map(e => ({ src: e.getAttribute("src"), ok: e.complete && e.naturalWidth > 0 })));
  console.log("لود تصاویر:", JSON.stringify(loaded));
  // اسکرین‌شات برای آرشیو
  await menu.screenshot({ path: "/tmp/menu-mobile.png" });
  console.log("خطای کنسول:", errors.length);
  await b.close();
})();
