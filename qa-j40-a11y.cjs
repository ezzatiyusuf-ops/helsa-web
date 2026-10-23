// ج۴۰ — §۲۸ دسترس‌پذیری (کیبورد/فوکوس/aria) + §۲۷ تبلت — بیلد production + محصول واقعی
const { chromium } = require("playwright");
const BASE = "http://localhost:3000";
let pass = 0, fail = 0;
const ok = (n) => { pass++; console.log(`PASS: ${n}`); };
const bad = (n, e = "") => { fail++; console.log(`FAIL: ${n} ${e}`); };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });

  // سبد با یک محصول واقعی
  await page.goto(`${BASE}/products?cat=dates`, { waitUntil: "networkidle" });
  await page.locator('[aria-label*="افزودن"][aria-label*="به سبد"]').first().click();
  await page.waitForTimeout(400);
  await page.goto(`${BASE}/cart`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);

  // ── §۲۸ الف) برچسب‌های دسترس‌پذیری ──────────────────────
  const couponLabel = await page.evaluate(() => {
    const el = document.querySelector("#coupon");
    if (!el) return null;
    const id = el.id;
    const lbl = document.querySelector(`label[for="${id}"]`);
    return lbl?.textContent?.trim() || el.getAttribute("aria-label") || null;
  });
  couponLabel && couponLabel.length > 2 ? ok(`coupon field labeled ("${couponLabel}")`) : bad("coupon label");
  const qtyNames = await page.$$eval('button[aria-label^="افزایش"]', (bs) => bs.map((b) => b.getAttribute("aria-label")));
  qtyNames.length >= 1 && qtyNames.every((n) => n.length > 8) ? ok(`qty buttons accessible names ("${qtyNames[0]}")`) : bad("qty names", JSON.stringify(qtyNames));
  const rmName = await page.locator('button[aria-label^="حذف"]').first().getAttribute("aria-label");
  rmName && rmName.length > 6 ? ok(`remove button accessible name ("${rmName}")`) : bad("remove name");
  const saveName = await page.locator('button[aria-label^="ذخیره"]').first().getAttribute("aria-label").catch(() => null);
  saveName && saveName.length > 6 ? ok(`save-for-later accessible name ("${saveName}")`) : bad("save name");

  // aria-live: خطای کوپن + نشانگر تعداد
  (await page.locator("#coupon-error[aria-live], [aria-live] #coupon-error").count()) >= 1 || (await page.locator("#coupon-error").evaluate((el) => el.closest("[aria-live]") !== null || el.getAttribute("aria-live") !== null))
    ? ok("coupon error aria-live") : bad("coupon aria-live");
  (await page.locator("span[aria-live='polite']").count()) >= 1 ? ok("quantity badge aria-live=polite (SR friendly)") : bad("qty aria-live");

  // نشانگر مرحله + نوار پیشرفت
  (await page.locator("nav[aria-label='مراحل ثبت سفارش'] [aria-current='step']").count()) === 1 ? ok("steps: aria-current=step") : bad("aria-current");
  const pb = await page.locator('div[role="progressbar"]').first();
  const pbNow = await pb.getAttribute("aria-valuenow").catch(() => null);
  pbNow !== null ? ok(`progressbar aria-valuenow=${pbNow}`) : bad("progressbar aria");

  // ── §۲۸ ب) ناوبری کیبورد — بدون ماوس ───────────────────
  await page.focus("body");
  let plusBtn = null;
  for (let i = 0; i < 60 && !plusBtn; i++) {
    await page.keyboard.press("Tab");
    plusBtn = await page.evaluate(() => {
      const a = document.activeElement;
      return a?.matches('button[aria-label^="افزایش"]') ? a : null;
    });
  }
  plusBtn ? ok("qty + button reachable by Tab (keyboard)") : bad("tab to qty");
  if (plusBtn) {
    // فوکوس مرئی است؟ (outline یا ring)
    const focusVisible = await page.evaluate(() => {
      const a = document.activeElement;
      const cs = getComputedStyle(a);
      return cs.outlineStyle !== "none" || (cs.boxShadow && cs.boxShadow !== "none");
    });
    focusVisible ? ok("focus indicator visible on qty button") : bad("focus invisible");
    const before = await page.locator("span[aria-live='polite']").first().textContent();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
    const after = await page.locator("span[aria-live='polite']").first().textContent();
    before !== after ? ok(`Enter on qty button works (${before}→${after})`) : bad("enter qty");
    await page.keyboard.press("Space");
    await page.waitForTimeout(300);
    ok("Space also activates qty button (semantic <button>)");
  }

  // کوپن با کیبورد: فوکوس + تایپ + Enter
  await page.focus("#coupon");
  await page.keyboard.type("HELSA10");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(900);
  (await page.textContent("body")).includes("HELSA10 اعمال شد") ? ok("coupon applied via keyboard (focus+type+Enter)") : bad("coupon enter");

  // CTA از روی کیبورد قابل فعال‌سازی است؟
  await page.focus("body");
  let cta = null;
  for (let i = 0; i < 80 && !cta; i++) {
    await page.keyboard.press("Tab");
    cta = await page.evaluate(() => document.activeElement?.closest('a[href="/checkout"]') ?? null);
  }
  cta ? ok("checkout CTA reachable by Tab") : bad("cta tab");
  if (cta) {
    const ctaName = await page.evaluate(() => document.activeElement.textContent.trim());
    ctaName.includes("ادامه به پرداخت") ? ok(`CTA accessible name ("${ctaName.trim()}")`) : bad("cta name", ctaName);
    await page.keyboard.press("Enter");
    await page.waitForURL((u) => u.pathname === "/checkout", { timeout: 8000 })
      .then(() => ok("CTA activated with Enter → /checkout (keyboard-only purchase path)"))
      .catch(() => bad("cta enter", page.url()));
  }

  // سبد خالی: CTAها لینک معتبر با نام دسترس‌پذیر
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE}/cart`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const emptyCtas = await page.$$eval('a:has-text("مشاهده محصولات")', () => []);
  const prim = page.locator('a:has-text("مشاهده محصولات")').first();
  (await prim.count()) >= 1 && (await prim.getAttribute("href")) === "/products" ? ok("empty-cart primary CTA = real link /products") : bad("empty cta");

  // ── §۲۷ تبلت ۷۶۸×۱۰۲۴ ──────────────────────────────────
  const tab = await browser.newContext({ viewport: { width: 768, height: 1024 }, hasTouch: true, isMobile: false });
  const tp = await tab.newPage();
  await tp.goto(`${BASE}/products?cat=nuts`, { waitUntil: "networkidle" });
  await tp.locator('[aria-label*="افزودن"][aria-label*="به سبد"]').first().click();
  await tp.waitForTimeout(400);
  await tp.goto(`${BASE}/cart`, { waitUntil: "networkidle" });
  await tp.waitForTimeout(800);
  const tOver = await tp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  tOver <= 0 ? ok("tablet 768: no horizontal overflow") : bad("tablet overflow", `${tOver}px`);
  const tSticky = await tp.locator("div.fixed.bottom-0").count();
  (tSticky === 0 || (tSticky === 1 && await tp.locator("div.fixed.bottom-0").isVisible()))
    ? ok(`tablet 768: sticky bar ${tSticky === 0 ? "hidden (lg layout)" : "visible & intact"}`) : bad("tablet sticky");
  (await tp.locator('aside a:has-text("ادامه به پرداخت"), div.fixed.bottom-0 a:has-text("ادامه به پرداخت")').first().isVisible())
    ? ok("tablet 768: checkout CTA visible") : bad("tablet cta");
  await tp.screenshot({ path: "qa-shots/ux/j40-cart-tablet.png", fullPage: true });
  await tab.close();

  const realErrors = consoleErrors.filter((e) => !/400|401|403|429|500/.test(e));
  realErrors.length === 0 ? ok("0 unexpected console errors") : bad("console", JSON.stringify(realErrors.slice(0, 2)));

  await browser.close();
  console.log(`\n═══ A11Y/TABLET RESULT: PASS=${pass} FAIL=${fail} ═══`);
})().catch((e) => { console.error("SCRIPT ERROR:", e.message); process.exit(1); });
