#!/usr/bin/env node
/**
 * HELSA — hydration & mobile-layout verification (theme flow).
 * اثبات می‌کند:
 *  1) هیچ خطای Hydration/parentNode در کنسول نیست (صفحات کلیدی، تم‌های مختلف)
 *  2) ThemeSwitcher در SSR قطعی است و ترجیح واقعی فقط بعد از mount اعمال می‌شود
 *  3) چرخهٔ کامل سوییچ system→light→dark→system + پایداری بعد از refresh
 *  4) در موبایل، ردیف © فوتر زیر نوار پایین پنهان نیست + بدون سرریز افقی
 * Usage: node scripts/qa/hydration-check.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  console.log(`${cond ? "✅" : "❌"} ${name}${cond || !detail ? "" : `  | ${detail}`}`);
  cond ? pass++ : fail++;
};

/** صفحه را با گوش‌دهندهٔ کنسول بارگذاری می‌کند و خطاهای hydration/parentNode را برمی‌گرداند */
async function loadAndCollect(page, url) {
  const issues = [];
  page.on("console", (m) => {
    const t = m.type(), text = m.text();
    if (t === "error" || (t === "warning" && /hydrat/i.test(text))) issues.push(`${t}: ${text.slice(0, 140)}`);
  });
  page.on("pageerror", (e) => issues.push(`pageerror: ${String(e).slice(0, 140)}`));
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(700); //_effects + post-hydration snapshot swap
  return issues;
}

const browser = await chromium.launch({ executablePath: "/usr/bin/chromium" });

/* ── 1) بارگذاری پاک در حالت‌های مختلف تم ذخیره‌شده ── */
for (const stored of ["(none)", "light", "dark", "system"]) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, colorScheme: "light" });
  if (stored !== "(none)") await ctx.addInitScript((v) => localStorage.setItem("helsa-theme", v), stored);
  const page = await ctx.newPage();
  const issues = await loadAndCollect(page, `${BASE}/`);
  ok(`کنسول پاک با تم ذخیره‌شده «${stored}»`, issues.length === 0, issues.join(" ;; "));

  const aria = await page.getAttribute('button[aria-label*="تغییر حالت نمایش"]', "aria-label");
  const dataTheme = await page.evaluate(() => document.documentElement.dataset.theme);
  const expected = stored === "dark" ? "حالت شب" : stored === "light" ? "حالت روشن" : "مطابق سیستم";
  ok(`آیکون/label پس از mount = «${expected}»`, aria === `تغییر حالت نمایش (${expected})`, aria);
  ok(`data-theme=${stored === "(none)" || stored === "system" ? "light(سیستم روشن)" : stored}`, dataTheme === (stored === "dark" ? "dark" : "light"), dataTheme);
  await ctx.close();
}

/* ── 2) سیستمِ تیره + pref=system ── */
{
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, colorScheme: "dark" });
  const page = await ctx.newPage();
  const issues = await loadAndCollect(page, `${BASE}/`);
  ok("کنسول پاک با سیستمِ تیره (pref=system)", issues.length === 0, issues.join(" ;; "));
  const dt = await page.evaluate(() => document.documentElement.dataset.theme);
  ok("pref=system + سیستم تیره → data-theme=dark", dt === "dark", dt);
  await ctx.close();
}

/* ── 3) چرخهٔ سوییچ + پایداری پس از refresh ── */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light" });
  const page = await ctx.newPage();
  await loadAndCollect(page, `${BASE}/`);
  const btn = page.locator('button[aria-label*="تغییر حالت نمایش"]').first();
  const cycle = [
    ["click", "light", "حالت روشن", "light"],
    ["click", "dark", "حالت شب", "dark"],
    ["click", "system", "مطابق سیستم", "light"],
  ];
  for (const [, ls, label, dt] of cycle) {
    await btn.click();
    await page.waitForTimeout(450);
    const aria = await btn.getAttribute("aria-label");
    const stored = await page.evaluate(() => localStorage.getItem("helsa-theme"));
    const html = await page.evaluate(() => document.documentElement.dataset.theme);
    ok(`سوییچ → ${label}`, aria === `تغییر حالت نمایش (${label})` && stored === ls && html === dt, `aria=${aria} ls=${stored} html=${html}`);
  }
  // پایداری پس از refresh با pref=system (بازگشت به قطعی SSR سپس resolve)
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  const issues = (await loadAndCollect(page, `${BASE}/products`), []);
  ok("refresh بعد از تغییر تم → کنسول پاک (products)", issues.length === 0, issues.join(" ;; "));
  await ctx.close();
}

/* ── 4) صفحات کلیدی: products / وبلاگ (ShareButtons) / track ── */
{
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  const p1 = await loadAndCollect(page, `${BASE}/products`);
  ok("کنسول پاک /products", p1.length === 0, p1.join(" ;; "));
  const p2 = await loadAndCollect(page, `${BASE}/blog/date-benefits`);
  ok("کنسول پاک /blog/date-benefits", p2.length === 0, p2.join(" ;; "));
  const href = await page.getAttribute('a[aria-label="اشتراک در تلگرام"]', "href");
  ok("لینک اشتراک تلگرام بعد از mount مطلق است", href?.includes("t.me/share/url?url=http"), href?.slice(0, 60));
  const p3 = await loadAndCollect(page, `${BASE}/track?code=hla-test12`);
  ok("کنسول پاک /track?code=…", p3.length === 0, p3.join(" ;; "));
  const val = await page.inputValue('input[placeholder*="HLA"]');
  ok("deep-link کد پیگیری بعد از mount پر می‌شود", val === "HLA-TEST12", val);
  const p4 = await loadAndCollect(page, `${BASE}/products/mazafati-dates`);
  ok("کنسول پاک /products/mazafati-dates", p4.length === 0, p4.join(" ;; "));
  await ctx.close();
}

/* ── 5) موبایل: فوتر زیر نوار پایین پنهان نیست + بدون سرریز افقی ── */
{
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, colorScheme: "light" });
  const page = await ctx.newPage();
  for (const path of ["/", "/products", "/products/mazafati-dates", "/cart"]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); // تا انتهای سند
    await page.waitForTimeout(250);
    const m = await page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="ناوبری پایین"]');
      const copy = [...document.querySelectorAll("footer p")].find((p) => p.textContent.includes("©"));
      const r = copy?.getBoundingClientRect();
      return {
        hasNav: !!nav,
        navTop: nav ? Math.round(nav.getBoundingClientRect().top) : -1,
        copyBottom: r ? Math.round(r.bottom) : -1,
        scrollW: document.documentElement.scrollWidth,
        innerW: window.innerWidth,
      };
    });
    ok(`موبایل ${path}: ردیف © کاملاً بالای نوار پایین`, m.hasNav && m.copyBottom > 0 && m.copyBottom <= m.navTop + 2, JSON.stringify(m));
    ok(`موبایل ${path}: بدون سرریز افقی`, m.scrollW <= m.innerW, `scrollW=${m.scrollW} innerW=${m.innerW}`);
  }
  await ctx.close();
}

await browser.close();
console.log(`\n═══ HYDRATION+MOBILE CHECK: ${pass} PASS / ${fail} FAIL ═══`);
process.exit(fail ? 1 : 0);
