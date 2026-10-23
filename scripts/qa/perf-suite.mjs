/**
 * فازهای ۷/۸/۹ — پرفورمنس موبایل+دسکتاپ، تکرارپذیر (۳ بار)، CWV خام
 * سرد = اولین بازدید کانتکست تازه؛ گرم = بازدید دوم همان کانتکست (SW+HTTP cache)
 * + بازبینی هندسی یکپارچگی بصری مگامنو + سرریز افقی موبایل
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = "http://localhost:3000";
const PAGES = [
  { name: "خانه", path: "/" },
  { name: "محصولات", path: "/products" },
  { name: "هدایا", path: "/gifts" },
  { name: "سازندهٔ سینی", path: "/mazeh" },
  { name: "وبلاگ", path: "/blog" },
];
const VIEWPORTS = [
  { name: "موبایل", width: 390, height: 844, mobile: true, cpu: 4 },
  { name: "دسکتاپ", width: 1440, height: 900, mobile: false, cpu: 1 },
];
const REPEATS = 3;

const INIT = `(() => {
  window.__cwv = { fcp: 0, lcp: 0, cls: 0 };
  try {
    new PerformanceObserver((l) => { const e = l.getEntries(); if (e.length) window.__cwv.fcp = e[e.length - 1].startTime; }).observe({ type: "paint", buffered: true });
    new PerformanceObserver((l) => { const e = l.getEntries(); if (e.length) window.__cwv.lcp = e[e.length - 1].startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cwv.cls += e.value; }).observe({ type: "layout-shift", buffered: true });
  } catch {}
})();`;

const browser = await chromium.launch();
const out = [];

async function visit(page, path) {
  let transferred = 0, requests = 0;
  const onRes = async (r) => { requests++; try { transferred += (await r.body()).length; } catch {} };
  page.on("response", onRes);
  const t0 = Date.now();
  await page.goto(BASE + path, { waitUntil: "load", timeout: 45000 });
  const loadMs = Date.now() - t0;
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); } window.scrollTo(0, 0); });
  await page.waitForTimeout(2500); // جمع‌آوری LCP/CLS پس از اسکرول
  const cwv = await page.evaluate(() => window.__cwv);
  const broken = await page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0).length);
  page.off("response", onRes);
  return { loadMs, transferred, requests, broken, ...cwv };
}

for (const vp of VIEWPORTS) {
  for (const p of PAGES) {
    for (let run = 1; run <= REPEATS; run++) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.mobile, hasTouch: vp.mobile,
        deviceScaleFactor: vp.mobile ? 2 : 1,
      });
      const page = await ctx.newPage();
      await page.addInitScript(INIT);
      const cdp = await ctx.newCDPSession(page);
      if (vp.cpu > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: vp.cpu });
      const cold = await visit(page, p.path);
      out.push({ page: p.name, vp: vp.name, run, warm: false, ...cold });
      const warm = await visit(page, p.path);
      out.push({ page: p.name, vp: vp.name, run, warm: true, ...warm });
      await ctx.close();
    }
    console.log(`✓ ${p.name} (${vp.name})`);
  }
}

// ── فاز ۹: یکپارچگی بصری هندسی ──
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto(BASE + "/", { waitUntil: "networkidle" });
const visual = {};
for (const navText of ["هدایا", "محصولات"]) {
  await page.locator("header").getByText(navText, { exact: true }).first().hover();
  await page.waitForTimeout(500);
  const panel = page.locator("header .absolute.w-\\[640px\\]").first();
  const cards = panel.locator("a.group");
  const boxes = [];
  for (let i = 0; i < await cards.count(); i++) boxes.push(await cards.nth(i).boundingBox());
  const xs = new Set(), xe = new Set();
  boxes.forEach((b) => { xs.add(Math.round(b.x)); xe.add(Math.round(b.x + b.width)); });
  visual[navText] = { cards: boxes.length, equalWidths: new Set(boxes.map((b) => Math.round(b.width))).size === 1, leftAligned: xs.size === 4, rightAligned: xe.size === 4, widths: [...new Set(boxes.map((b) => Math.round(b.width)))] };
}
const m = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })).newPage();
for (const p of PAGES) {
  await m.goto(BASE + p.path, { waitUntil: "load" });
  await m.waitForTimeout(700);
  visual[`overflow:${p.name}`] = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}
writeFileSync("qa-shots/premium/perf-results.json", JSON.stringify({ perf: out, visual }, null, 1));
await browser.close();

const fmt = (n) => (n / 1048576).toFixed(2) + "MB";
const med = (arr) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
console.log("\nصفحه | دید | حالت | بارگذاری | حجم | درخواست | FCP | LCP | CLS | خراب");
for (const p of PAGES) for (const vp of VIEWPORTS) for (const warm of [false, true]) {
  const g = out.filter((r) => r.page === p.name && r.vp === vp.name && r.warm === warm);
  console.log(`${p.name} | ${vp.name} | ${warm ? "گرم" : "سرد"} | ${med(g.map((r) => r.loadMs))}ms | ${fmt(med(g.map((r) => r.transferred)))} | ${med(g.map((r) => r.requests))} | ${Math.round(med(g.map((r) => r.fcp)))}ms | ${Math.round(med(g.map((r) => r.lcp)))}ms | (med(g.map((r) => r.cls))).toFixed(3) | ${g.reduce((a, r) => a + r.broken, 0)}`.replace("(med(g.map((r) => r.cls))).toFixed(3)", (med(g.map((r) => r.cls))).toFixed(3)));
}
console.log("\n── یکپارچگی بصری ──");
for (const [k, v] of Object.entries(visual)) console.log(k, "→", JSON.stringify(v));
