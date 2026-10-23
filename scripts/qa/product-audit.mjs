#!/usr/bin/env node
/**
 * HELSA — PART A: individual product audit (every product, one by one).
 * Real-customer behavior: logs in via the real /login UI (cookie + client session).
 * Usage: node scripts/qa/product-audit.mjs [--from N] [--to M] [--workers 3]
 * Results: scripts/qa/product-audit-results.json (merged, resume-safe)
 */
import { chromium } from "playwright";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const RESULTS = join(ROOT, "scripts/qa/product-audit-results.json");
const BASE = "http://localhost:3000";
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const ONLY = arg("--only", "");
const FROM = +arg("--from", 0);
const TO = +arg("--to", 1e9);
const WORKERS = +arg("--workers", 3);

const faDig = (s) => String(s ?? "").replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[,٬،\s]/g, "");
const norm = (s) => faDig(s).trim();
const fmt = (n) => Math.round(n).toLocaleString("fa-IR");

const loadResults = () => (existsSync(RESULTS) ? JSON.parse(readFileSync(RESULTS, "utf8")) : {});
const saveResults = (r) => writeFileSync(RESULTS, JSON.stringify(r, null, 1));

async function jsonLdOf(html) {
  const out = [];
  const re = /<script type="application\/ld\+json">(.*?)<\/script>/gs;
  let m;
  while ((m = re.exec(html))) {
    try { out.push(JSON.parse(m[1])); } catch { out.push({ "@type": "PARSE_ERROR" }); }
  }
  return out;
}

/** لاگین واقعی از طریق UI — دقیقاً مثل مشتری */
async function loginViaUI(ctx) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input[type='password']", { timeout: 15000 });
  await page.waitForTimeout(1500);
  const idInput = page.locator('input[placeholder*="0912"], input[placeholder*="ایمیل"], input[type="text"]').first();
  await idInput.fill("sara.qa@helsa-test.ir", { timeout: 10000 });
  await page.locator("input[type='password']").first().fill("Sara#1385");
  await page.getByRole("button", { name: "ورود به هلسا" }).click();
  await page.waitForURL((u) => !String(u).includes("/login"), { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await page.close();
}

async function auditProduct(p, page) {
  const fails = [];
  const warn = [];
  const F = (x) => fails.push(x);
  const url = `${BASE}/products/${p.slug}`;
  const gallery = Array.isArray(p.gallery) ? p.gallery : [];

  // ── HTTP stage ──
  const res = await fetch(url);
  if (res.status !== 200) F(`HTTP ${res.status}`);
  const html = await res.text();
  const lds = await jsonLdOf(html);
  const types = lds.map((l) => l?.["@type"]).filter(Boolean);
  if (!types.includes("Product")) F("JSON-LD Product missing");
  if (!types.includes("BreadcrumbList")) F("JSON-LD Breadcrumb missing");
  if (!types.includes("FAQPage")) F("JSON-LD FAQ missing");
  const pd = lds.find((l) => l?.["@type"] === "Product");
  if (pd) {
    if (pd.sku !== p.sku) F(`JSON-LD SKU (${pd.sku}≠${p.sku})`);
    const lp = pd.offers?.price ?? pd.offers?.priceSpecification?.price;
    if (Number(lp) !== Number(p.price)) F(`JSON-LD price (${lp}≠${p.price})`);
    const avail = String(pd.offers?.availability ?? "");
    if (!avail.includes(p.stock > 0 ? "InStock" : "OutOfStock")) F(`availability ${avail}`);
  }
  const title = (html.match(/<title>(.*?)<\/title>/) ?? [])[1] ?? "";
  if (!title.includes((p.seoTitle || p.name).slice(0, 18))) F(`<title>: ${title.slice(0, 40)}`);
  if (!html.includes('property="og:title"')) F("og:title missing");
  if (!html.includes('rel="canonical"')) F("canonical missing");
  if (!html.includes('aria-label="مسیر صفحه"')) F("breadcrumb nav missing");
  for (const im of [p.image, ...gallery].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i)) {
    const r = await fetch(BASE + im, { method: "HEAD" }).catch(() => ({ status: 0 }));
    if (r.status !== 200) F(`img ${im.split("/").pop()}→${r.status}`);
  }

  // ── Desktop browser ──
  const errors = [];
  page.removeAllListeners("console");
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 80)); });
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 80)));
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForSelector("h1", { timeout: 15000 });
    await page.waitForTimeout(400);
    const h1 = (await page.locator("h1").allInnerTexts())[0] ?? "";
    if (norm(h1) !== norm(p.name)) F(`h1 (${h1.slice(0, 24)})`);
    if ((await page.locator("h1").count()) !== 1) F("h1≠1");
    const body = await page.locator("body").innerText();
    if (!body.includes(p.sku)) F("SKU hidden");
    if (!body.includes("خانه") || !body.includes("محصولات")) F("breadcrumb texts");
    if (!body.includes(fmt(p.price)) && !body.includes(String(p.price))) F("price hidden");
    if (p.stock > 0 && !/موجود در انبار|باقی مانده/.test(body)) F("stock text (in)");
    if (p.stock <= 0 && !body.includes("ناموجود")) F("stock text (out)");
    const broken = await page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src.split("/").pop()));
    if (broken.length) F(`broken: ${broken.join(",")}`);
    const noAlt = await page.evaluate(() => [...document.images].filter((i) => !(i.alt || "").trim() && !(i.getAttribute("aria-hidden") === "true" || i.closest("[aria-hidden='true']") || i.closest("[aria-label]:not([aria-label=''])"))).map((i) => i.src.split("/").pop()));
    if (noAlt.length) F(`noAlt: ${noAlt.join(",")}`);
    // گالری: ریل فقط برای چندتصویری الزامی است
    const thumbs = await page.locator('[role="tablist"][aria-label="تصاویر محصول"] button').count();
    if (gallery.length > 1 && thumbs < 2) F(`thumbs (${thumbs})`);
    if (gallery.length > 1 && thumbs >= 2) {
      await page.locator('[role="tablist"][aria-label="تصاویر محصول"] button').nth(1).click();
      await page.waitForTimeout(350);
      const t = norm(await page.locator("body").innerText());
      if (!t.includes("2/2") && !/\b2\s*\/\s*\d/.test(t)) warn.push("counter not updated");
    }
    // زوم
    const zoomOk = await page.evaluate(() => {
      const el = document.querySelector('[class*="group/gallery"]');
      if (!el) return false;
      el.dispatchEvent(new MouseEvent("mouseenter"));
      const span = el.querySelector("span[style]");
      return span && (span.style.transform || "").includes("scale");
    });
    if (!zoomOk) warn.push("zoom");
    // لایت‌باکس
    const lb = page.getByRole("button", { name: "نمایش تمام‌صفحه تصاویر" });
    if (await lb.count()) {
      await lb.click();
      await page.waitForTimeout(400);
      if (!(await page.locator('[role="dialog"][aria-label*="گالری"]').count())) F("lightbox open");
      await page.keyboard.press("Escape");
      let escOk = false;
      for (let t = 0; t < 30; t++) {
        await page.waitForTimeout(100);
        if (!(await page.locator('[role="dialog"][aria-label*="گالری"]').count())) { escOk = true; break; }
      }
      if (!escOk) F("lightbox Esc");
    } else F("lightbox btn");
    // تعداد
    const plus = page.getByRole("button", { name: "افزایش تعداد" });
    if (await plus.count()) {
      const before = norm(await page.locator(".tabular-nums").first().innerText());
      await plus.first().click();
      await page.waitForTimeout(250);
      const after = norm(await page.locator(".tabular-nums").first().innerText());
      if (before === after) warn.push("qty+");
    } else F("qty picker");
    // افزودن به سبد
    const addBtn = page.getByRole("button", { name: /افزودن به سبد خرید/ }).first();
    if (await addBtn.count()) {
      if (p.stock > 0) {
        if (await addBtn.isDisabled()) F("add disabled (in-stock)");
        await addBtn.click();
        await page.waitForTimeout(700);
      }
    } else F("add btn");
    // علاقه‌مندی (با session واقعی)
    const wish = page.locator('button[aria-label="افزودن به علاقه‌مندی‌ها"]').first();
    if (await wish.count()) {
      await wish.click();
      await page.waitForTimeout(600);
      if (await page.locator('button[aria-label="حذف از علاقه‌مندی‌ها"]').count()) {
        await page.locator('button[aria-label="حذف از علاقه‌مندی‌ها"]').first().click();
        await page.waitForTimeout(400);
      } else {
        const t = await page.locator("body").innerText();
        if (t.includes("وارد حساب")) F("wish requires login (session lost)");
        else warn.push("wish toggle");
      }
    } else F("wish btn");
    // اشتراک
    if (!(await page.getByRole("button", { name: "اشتراک‌گذاری محصول" }).count())) F("share btn");
    // مرتبط
    if (p.relatedCount > 0 && !(await page.locator("text=/محصولات مرتبط/").count())) warn.push("related");
    if (errors.length) F(`console: ${errors[0]}`);
  } catch (e) {
    F(`err: ${String(e).slice(0, 70)}`);
  }

  const score = Math.max(0, 100 - fails.length * 12 - warn.length * 3);
  return { slug: p.slug, name: p.name, sku: p.sku, score, fails, warn };
}

// ── mobile pass (سبک، جدا از workers دسکتاپ) ──
async function mobilePass(p, mp) {
  const fails = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    const f = await mobilePassOnce(p, mp);
    if (!f.length) return [];
    if (attempt === 0) await mp.waitForTimeout(1500);
    else fails.push(...f);
  }
  return fails;
}
async function mobilePassOnce(p, mp) {
  const fails = [];
  try {
    await mp.goto(`${BASE}/products/${p.slug}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await mp.waitForSelector("h1", { timeout: 15000 });
    await mp.waitForTimeout(400);
    const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 2) fails.push(`h-overflow ${overflow}px`);
    const broken = await mp.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0).length);
    if (broken > 0) fails.push(`broken imgs ${broken}`);
  } catch (e) {
    fails.push(`mobile err ${String(e).slice(0, 50)}`);
  }
  return fails;
}

(async () => {
  const data = await (await fetch(`${BASE}/api/products`)).json();
  const all = data.products.map((p) => ({ ...p, relatedCount: data.products.filter((x) => x.category === p.category && x.id !== p.id).length }));
  const products = ONLY ? all.filter((p) => ONLY.split(",").includes(p.slug)) : all.slice(FROM, TO);
  console.log(`PART A audit: ${products.length} products (${FROM}..${FROM + products.length} of ${all.length}), workers=${WORKERS}`);

  const browser = await chromium.launch({ executablePath: "/usr/bin/chromium" });

  // دسکتاپ با لاگین واقعی UI
  const ctxD = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  await loginViaUI(ctxD);
  // موبایل (بدون لاگین — کافی است رندر/اورفلو را ببیند)
  const ctxM = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mp = await ctxM.newPage();

  const results = loadResults();
  const queue = [...products];
  let done = 0;
  async function worker(id) {
    const page = await ctxD.newPage();
    while (queue.length) {
      const p = queue.shift();
      if (!p) break;
      const r = await auditProduct(p, page);
      const mf = await mobilePass(p, mp);
      r.fails.push(...mf);
      if (mf.length) r.score = Math.max(0, r.score - mf.length * 12);
      results[p.slug] = r;
      done++;
      const mark = r.fails.length ? "❌" : r.warn.length ? "⚠️" : "✅";
      console.log(`${mark} [${FROM + done}/${all.length}] ${p.slug} → ${r.score}${r.fails.length ? " | " + r.fails.slice(0, 3).join(" ; ").slice(0, 100) : ""}`);
      if (done % 10 === 0) saveResults(results);
    }
    await page.close();
  }
  await Promise.all(Array.from({ length: WORKERS }, (_, i) => worker(i)));
  saveResults(results);
  mp.close();

  const rs = Object.values(results);
  const failed = rs.filter((r) => r.fails.length);
  console.log(`\n═══ PRODUCT AUDIT: ${rs.length} audited | ${rs.length - failed.length} clean | ${failed.length} failing ═══`);
  await browser.close();
  process.exit(0);
})();
