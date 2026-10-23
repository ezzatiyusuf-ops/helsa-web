#!/usr/bin/env node
/**
 * qa-visual-audit.cjs — ممیزی خودکار صفحه‌به‌صفحه (UI/UX + تصویر + عملکرد)
 * برای هر صفحه × دسکتاپ/موبایل:
 *   - تصاویر: تعداد، شکسته (naturalWidth=0)، بدون alt، بدون width/height، lazy/eager، فرمت، بایت منتقل‌شده
 *   - شبکه: تعداد درخواست + مجموع بایت
 *   - LCP: مقدار (ms) + نوع المان
 *   - سرریز افقی (RTL)
 *   - خطای کنسول (فیلتر 4xx مورد انتظار)
 * خروجی: جدول markdown برای گزارش‌ها + exit code بر اساس موارد CRITICAL.
 */
const { chromium } = require("playwright");

const BASE = process.env.HELSA_BASE || "http://localhost:3000";
const PAGES = [
  "/", "/products", "/products/mazafati-dates", "/wholesale", "/wholesale/register",
  "/gifts", "/gifts/corporate", "/mazeh-trays", "/mazeh-trays/golden", "/mazeh-trays/build",
  "/cart", "/checkout", "/login", "/register", "/blog", "/track", "/about", "/contact",
];
const VIEWPORTS = [
  { name: "desktop", width: 1366, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

(async () => {
  const browser = await chromium.launch();
  const rows = [];
  let critical = 0;

  for (const vp of VIEWPORTS) {
    for (const path of PAGES) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await ctx.newPage();
      const consoleErrors = [];
      page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
      page.on("response", (r) => { if (r.status() >= 400 && !r.url().includes("_next/static")) consoleErrors.push(`${r.status()} ${r.url().slice(-60)}`); });

      let reqCount = 0, reqBytes = 0, imgCount = 0, imgBytes = 0, largestImg = { url: "", bytes: 0 };
      page.on("response", async (r) => {
        reqCount++;
        try {
          const h = r.headers();
          if (h["content-length"]) {
            const b = +h["content-length"];
            reqBytes += b;
            if (/\.(avif|webp|jpe?g|png)/.test(r.url()) || (h["content-type"] || "").startsWith("image/")) {
              imgCount++;
              imgBytes += b;
              if (b > largestImg.bytes) largestImg = { url: r.url().split("/").pop().slice(0, 40), bytes: b };
            }
          }
        } catch {}
      });

      let status = "ok";
      try {
        const resp = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 45000 }); // networkidle با autoplay/اسلایدر مثبت کاذب می‌داد
        if (resp && resp.status() === 404) status = "404";
      } catch (e) {
        status = "ERR";
      }
      if (status !== "ok") {
        rows.push({ vp: vp.name, path, status, note: status });
        await ctx.close();
        continue;
      }
      await page.waitForTimeout(1500);

      const audit = await page.evaluate(() => {
        const imgs = [...document.querySelectorAll("img")];
        const broken = imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src.split("/").pop().slice(0, 40));
        const noAlt = imgs.filter((i) => !i.hasAttribute("alt")).length; // alt="" دکوراتیو معتبر است — فقط نبودِ صفت خطاست
        const noDims = imgs.filter((i) => !i.hasAttribute("width") || !i.hasAttribute("height")).length;
        const lazy = imgs.filter((i) => i.loading === "lazy").length;
        const eager = imgs.filter((i) => i.loading === "eager" || i.getAttribute("fetchpriority") === "high").length;
        const avifWebp = imgs.filter((i) => /\.(avif|webp)$/.test(i.currentSrc || i.src)).length;
        const overflowX = document.documentElement.scrollWidth - document.documentElement.clientWidth;
        return { totalImgs: imgs.length, broken, noAlt, noDims, lazy, eager, avifWebp, overflowX };
      });

      // LCP
      const lcp = await page.evaluate(() => new Promise((resolve) => {
        let val = null, tag = "";
        try {
          new PerformanceObserver((l) => {
            const es = l.getEntries();
            if (es.length) { val = es[es.length - 1].startTime; tag = es[es.length - 1].element ? es[es.length - 1].element.tagName : "?"; }
          }).observe({ type: "largest-contentful-paint", buffered: true });
        } catch {}
        setTimeout(() => resolve({ val: val ? Math.round(val) : null, tag }), 350);
      }));

      const realErrors = consoleErrors.filter((e) => !/40[134]|429|\/api\//.test(e));
      const issues = [];
      if (audit.broken.length) { issues.push(`BROKEN_IMG:${audit.broken.join(",")}`); critical++; }
      if (audit.noAlt > 0) issues.push(`NO_ALT:${audit.noAlt}`);
      if (audit.overflowX > 1) { issues.push(`OVERFLOW_X:${audit.overflowX}px`); critical++; }
      if (realErrors.length) { issues.push(`CONSOLE:${realErrors.length}`); critical++; }
      if (!audit.avifWebp && audit.totalImgs > 3) issues.push("NO_MODERN_FORMAT");

      rows.push({
        vp: vp.name, path, status,
        imgs: audit.totalImgs, broken: audit.broken.length, noAlt: audit.noAlt, noDims: audit.noDims,
        lazy: audit.lazy, eager: audit.eager, modern: audit.avifWebp,
        imgKB: Math.round(imgBytes / 1024), allKB: Math.round(reqBytes / 1024), reqs: reqCount,
        lcp: lcp.val, lcpTag: lcp.tag, overflowX: audit.overflowX,
        issues: issues.join(" ") || "—",
      });
      await ctx.close();
    }
  }
  await browser.close();

  // ── خروجی markdown
  console.log(`\n| ویوپورت | صفحه | تصویر | شکسته | بدونalt | lazy/eager | مدرن | تصویرKB | کلKB | درخواست | LCP(ms) | سرریزX | موارد |`);
  console.log(`|---|---|---|---|---|---|---|---|---|---|---|---|---|`);
  for (const r of rows) {
    if (r.status !== "ok") { console.log(`| ${r.vp} | ${r.path} | ${r.status} | | | | | | | | | | ${r.note} |`); continue; }
    console.log(`| ${r.vp} | ${r.path} | ${r.imgs} | ${r.broken} | ${r.noAlt} | ${r.lazy}/${r.eager} | ${r.modern} | ${r.imgKB} | ${r.allKB} | ${r.reqs} | ${r.lcp ?? "—"} | ${r.overflowX} | ${r.issues} |`);
  }
  const okPages = rows.filter((r) => r.status === "ok").length;
  console.log(`\n═══ VISUAL AUDIT: ${okPages}/${rows.length} صفحه باز شد · CRITICAL=${critical} ═══`);
  process.exit(critical ? 1 : 0);
})().catch((e) => { console.error("SCRIPT ERROR:", e.message); process.exit(1); });
