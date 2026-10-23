#!/usr/bin/env node
/**
 * HELSA — Responsive / Dimension Audit (گام «بازرسی» قبل از هر فیکس)
 * ۱۲ بریک‌پوینت × صفحات کلیدی + landscape — بدون تغییر هیچ چیزی، فقط اندازه‌گیری.
 * Output: scripts/qa/responsive-audit.json + خلاصه کنسول
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = "http://localhost:3000";
const PAGES = [
  "/", "/products", "/products/mazafati-dates", "/mazeh-trays", "/mazeh-trays/build",
  "/gifts", "/gifts/corporate", "/cart", "/checkout", "/login", "/register", "/track",
  "/wholesale", "/blog", "/about", "/contact", "/faq",
];
// ۱۲ بریک‌پوینت الزامی + لنداسکیپ
const VIEWPORTS = [
  { w: 320, h: 700, name: "320" }, { w: 360, h: 800, name: "360" }, { w: 375, h: 812, name: "375" },
  { w: 390, h: 844, name: "390" }, { w: 412, h: 915, name: "412" }, { w: 430, h: 932, name: "430" },
  { w: 480, h: 900, name: "480" }, { w: 768, h: 1024, name: "768" }, { w: 1024, h: 768, name: "1024" },
  { w: 1280, h: 800, name: "1280" }, { w: 1440, h: 900, name: "1440" }, { w: 1920, h: 1080, name: "1920" },
  { w: 844, h: 390, name: "390-landscape" }, { w: 932, h: 430, name: "430-landscape" },
];

const MEASURE = () => {
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const out = { vw, vh, problems: [], metrics: {} };
  const de = document.documentElement;

  // ۱) سرریز افقی سند
  const hOverflow = de.scrollWidth - de.clientWidth;
  out.metrics.hOverflow = hOverflow;
  if (hOverflow > 1) {
    // مقصرها: عناصری که از ویوپورت بیرون زده‌اند
    const culprits = [];
    for (const el of document.querySelectorAll("body *")) {
      const cs = getComputedStyle(el);
      if (cs.position === "fixed" || cs.display === "none" || cs.visibility === "hidden") continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (r.right > vw + 1 || r.left < -1) {
        culprits.push({
          tag: el.tagName.toLowerCase(),
          cls: String(el.className).slice(0, 60),
          left: Math.round(r.left), right: Math.round(r.right),
          id: el.id || undefined,
          text: (el.textContent || "").trim().slice(0, 24),
        });
        if (culprits.length >= 6) break;
      }
    }
    out.problems.push({ type: "h-overflow", value: hOverflow, culprits });
  }

  const footer = document.querySelector("footer");
  const header = document.querySelector("header");
  if (footer) {
    const fr = footer.getBoundingClientRect();
    out.metrics.footerTopFromDocBottom = Math.round(document.documentElement.scrollHeight - (fr.top + window.scrollY));
    // ۲) عناصر غیر-fixed که زیر انتهای فوتر می‌روند (محتوا زیر فوتر)
    const belowFooter = [];
    for (const el of document.querySelectorAll("main *, section *, body > *")) {
      const cs = getComputedStyle(el);
      if (["fixed", "sticky"].includes(cs.position)) continue;
      const r = el.getBoundingClientRect();
      if (r.height === 0) continue;
      const bottomDoc = r.bottom + window.scrollY;
      const footerBottomDoc = fr.bottom + window.scrollY;
      if (bottomDoc > footerBottomDoc + 4) {
        belowFooter.push({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 50), over: Math.round(bottomDoc - footerBottomDoc) });
        if (belowFooter.length >= 5) break;
      }
    }
    if (belowFooter.length) out.problems.push({ type: "below-footer", items: belowFooter });
  }
  if (header) out.metrics.headerH = Math.round(header.getBoundingClientRect().height);
  if (footer) out.metrics.footerH = Math.round(footer.getBoundingClientRect().height);

  // ۳) سوءاستفاده از 100vh/dvh: عنصر به ارتفاع کامل ویوپورت ولی محتوای کم
  const vhMisuse = [];
  for (const el of document.querySelectorAll("section, div")) {
    const cs = getComputedStyle(el);
    if (cs.display === "none") continue;
    const r = el.getBoundingClientRect();
    if (r.height >= vh * 0.98 && el.scrollHeight < r.height * 0.55 && r.height > 400) {
      vhMisuse.push({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 50), h: Math.round(r.height), contentH: el.scrollHeight });
      if (vhMisuse.length >= 4) break;
    }
  }
  if (vhMisuse.length) out.problems.push({ type: "vh-misuse", items: vhMisuse });

  // ۴) سکشن‌های بیش از حد بلند (۲.۵× ویوپورت در موبایل)
  const tallSections = [];
  for (const s of document.querySelectorAll("main section, body > section")) {
    const r = s.getBoundingClientRect();
    if (r.height > vh * 2.5 && vw < 500) {
      tallSections.push({ cls: String(s.className).slice(0, 50), h: Math.round(r.height) });
      if (tallSections.length >= 4) break;
    }
  }
  if (tallSections.length) out.problems.push({ type: "tall-section", items: tallSections });

  // ۵) عناصر fixed/sticky که محتوا/کنترل را می‌پوشانند
  const fixedCovers = [];
  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if (cs.position !== "fixed") continue;
    const r = el.getBoundingClientRect();
    if (r.width < 20 || r.height < 20) continue;
    // مرکز عنصر fixed چه چیزی را می‌پوشاند؟
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    el.style.visibility = "hidden";
    const under = document.elementFromPoint(cx, cy);
    el.style.visibility = "";
    if (under && under.tagName === "BUTTON" || under && under.closest("button, a, input, select")) {
      fixedCovers.push({ cls: String(el.className).slice(0, 40), covers: (under.textContent || "").trim().slice(0, 24) || under.tagName });
    }
  }
  if (fixedCovers.length) out.problems.push({ type: "fixed-covers-interactive", items: fixedCovers.slice(0, 4) });

  // ۶) اسکرول‌بارهای تودرتو
  const nested = [];
  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if (!["auto", "scroll"].includes(cs.overflowY)) continue;
    if (el.scrollHeight > el.clientHeight + 8 && el.clientHeight > 80) {
      nested.push({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 40), sh: el.scrollHeight, ch: el.clientHeight });
      if (nested.length >= 4) break;
    }
  }
  if (nested.length) out.problems.push({ type: "nested-scroll", items: nested });

  // ۷) ارتفاع هرو
  const hero = document.querySelector("main section:first-of-type, body section:first-of-type");
  if (hero) out.metrics.heroH = Math.round(hero.getBoundingClientRect().height);

  return out;
};

(async () => {
  const browser = await chromium.launch({ executablePath: "/usr/bin/chromium" });
  const report = {};
  const summary = {};
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, isMobile: vp.w < 500, hasTouch: vp.w < 500 });
    for (const path of PAGES) {
      const page = await ctx.newPage();
      try {
        await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 25000 });
        await page.waitForTimeout(700);
        // اسکرول به انتها برای فعال شدن lazy + سپس بالا
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(350);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(250);
        const m = await page.evaluate(MEASURE);
        const key = `${vp.name} ${path}`;
        report[key] = m;
        if (m.problems.length) {
          summary[key] = m.problems.map((p) => p.type + (p.type === "h-overflow" ? `(${p.value}px)` : ""));
        }
      } catch (e) {
        report[`${vp.name} ${path}`] = { error: String(e).slice(0, 80) };
        summary[`${vp.name} ${path}`] = ["load-error"];
      }
      await page.close();
    }
    await ctx.close();
  }
  writeFileSync("scripts/qa/responsive-audit.json", JSON.stringify(report, null, 1));
  const total = Object.keys(report).length;
  const withProblems = Object.keys(summary).length;
  console.log(`\n═══ RESPONSIVE AUDIT: ${total} page×viewport | ${withProblems} با مشکل ═══`);
  for (const [k, v] of Object.entries(summary)) console.log(`  ⚠️ ${k}: ${v.join(", ")}`);
  await browser.close();
  process.exit(0);
})();
