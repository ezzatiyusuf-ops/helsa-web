/**
 * HELSA QA — real-browser customer journey (Playwright + system chromium).
 * Walks the PUBLIC UI exactly like a customer: register via form → build a tray
 * with real clicks → save/restore draft → cart → full checkout → order success
 * → tracking → account. Takes desktop+mobile screenshots for visual QA and
 * captures every console error.
 *
 * Run: npx tsx --env-file=.env scripts/qa-ui-journey.ts
 */
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = "http://localhost:3000";
const SHOTS = "qa-shots";
const _ts = Date.now() % 10_000_000;
const USER = {
  name: "سارا", family: "تستی",
  phone: `0912${String(3_000_000 + _ts).slice(-7)}`, email: `ui-${_ts}@helsa-test.ir`,
  password: process.env.QA_TEST_PASSWORD ?? "Sara#1385-test-only",
};

let pass = 0, fail = 0;
const fails: string[] = [];
function check(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; fails.push(name); console.log(`  ❌ ${name}${detail ? `  [${detail}]` : ""}`); }
}

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--font-render-hinting=none"],
  });

  const consoleErrors: string[] = [];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, baseURL: BASE });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message.slice(0, 200)}`));
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(`console: ${m.text().slice(0, 200)}`); });

  // ───────────────────────── 1. REGISTER via real form
  console.log("\n━━━ UI-1 · ثبت‌نام از طریق فرم عمومی ━━━");
  await page.goto("/register", { waitUntil: "networkidle" });
  // مثل کاربر واقعی: اگر بنر رضایت کوکی ظاهر شد، اول آن را بپذیر
  const consent = page.locator("button", { hasText: "پذیرش همه" }).first();
  try { await consent.click({ timeout: 3500 }); await page.waitForTimeout(400); } catch { /* بنر نبود */ }
  await page.getByPlaceholder("سارا").fill(USER.name);
  await page.getByPlaceholder("محمدی").fill(USER.family);
  await page.getByPlaceholder("09123456789").fill(USER.phone);
  await page.getByPlaceholder("you@example.com").fill(USER.email);
  const pw = page.locator('input[type="password"]');
  await pw.nth(0).fill(USER.password);
  await pw.nth(1).fill(USER.password);
  await page.locator('input[type="checkbox"]').first().check();
  await page.screenshot({ path: `${SHOTS}/01-register.png`, fullPage: false });
  await page.getByRole("button", { name: /ایجاد حساب/ }).click();
  await page.waitForTimeout(2500);
  const afterRegister = page.url();
  const loggedIn = await page.getByText("سارا تستی").first().isVisible().catch(() => false);
  check("ثبت‌نام از UI → ورود موفق (نام کاربر در هدر/صفحه)", loggedIn || !afterRegister.includes("register"), `url=${afterRegister}`);

  // ───────────────────────── 2. TRAY BUILDER via real clicks
  console.log("\n━━━ UI-2 · سازنده سینی — کلیک واقعی ━━━");
  await page.goto("/mazeh-trays/build", { waitUntil: "networkidle" });
  await page.screenshot({ path: `${SHOTS}/02-builder-step1.png` });
  const estimateSel = "aside[aria-label='خلاصه و قیمت زنده']";
  const priceBefore = await page.locator(`${estimateSel} .text-lg`).innerText().catch(() => "");
  // go to items step
  await page.getByRole("button", { name: /مزه|اقلام/ }).first().click();
  await page.waitForTimeout(400);
  // add 4 distinct items
  for (const item of ["خرمای مضافتی", "پنیر فتا", "پسته", "قهوه"]) {
    await page.getByRole("button", { name: `افزایش ${item}`, exact: false }).first().click();
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(600);
  const priceAfterItems = await page.locator(`${estimateSel} .text-lg`).innerText().catch(() => "");
  check("افزودن ۴ قلم → قیمت زنده به‌روزرسانی شد", priceAfterItems !== priceBefore && /[۰-۹0-9]/.test(priceAfterItems), `${priceBefore} → ${priceAfterItems}`);
  await page.screenshot({ path: `${SHOTS}/03-builder-items.png`, fullPage: true });
  // increase one qty
  await page.getByRole("button", { name: "افزایش پسته", exact: false }).first().click();
  await page.waitForTimeout(400);
  const priceAfterQty = await page.locator(`${estimateSel} .text-lg`).innerText().catch(() => "");
  check("افزایش تعداد → قیمت افزایش یافت", priceAfterQty !== priceAfterItems, `${priceAfterItems} → ${priceAfterQty}`);
  // change size (back to step 1)
  await page.getByRole("button", { name: /اندازه|پایه/ }).first().click();
  await page.waitForTimeout(300);
  await page.getByText("سازمانی", { exact: false }).first().click();
  await page.waitForTimeout(500);
  const priceAfterSize = await page.locator(`${estimateSel} .text-lg`).innerText().catch(() => "");
  check("تغییر اندازه به سازمانی → قیمت تغییر کرد", priceAfterSize !== priceAfterQty, `${priceAfterQty} → ${priceAfterSize}`);
  await page.screenshot({ path: `${SHOTS}/04-builder-size.png` });

  // review step + save draft
  await page.getByRole("button", { name: /بازبینی|ثبت/ }).first().click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/05-builder-review.png`, fullPage: true });
  await page.getByPlaceholder("مثلاً سینی دورهمی پاییز").fill("سینی تست ممیزی");
  await page.getByRole("button", { name: "ذخیره", exact: false }).last().click();
  await page.waitForTimeout(600);
  const draftSaved = await page.getByText("پیکربندی سینی ذخیره شد").isVisible().catch(() => false);
  check("ذخیره draft سینی (toast تأیید)", draftSaved);

  // reload → draft restored & loadable (drafts render on step 4)
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: /بازبینی و ثبت/ }).first().click();
  await page.waitForTimeout(600);
  const draftListed = await page.getByText("سینی تست ممیزی").first().isVisible().catch(() => false);
  check("بعد از رفرش، draft در فهرست است (localStorage)", draftListed);
  if (draftListed) {
    await page.locator("li", { hasText: "سینی تست ممیزی" }).getByRole("button", { name: "بارگذاری" }).click();
    await page.waitForTimeout(900);
    const loadedToast = await page.getByText("بارگذاری شد").first().isVisible().catch(() => false);
    const summaryLine = await page.locator("aside[aria-label='خلاصه و قیمت زنده']").innerText().catch(() => "");
    const hasPortions = /۵|پورشن/.test(summaryLine) && !/۰ پورشن/.test(summaryLine);
    check("بارگذاری draft → اقلام و پورشن‌ها برگشتند", Boolean(loadedToast) && hasPortions, summaryLine.replace(/\n/g, " ").slice(0, 90));
  }

  // add tray to cart
  await page.getByRole("button", { name: /افزودن سینی به سبد/ }).click();
  await page.waitForTimeout(1800);
  const trayToast = await page.getByText("سینی سفارشی با قیمت تأییدشده سرور به سبد اضافه شد").isVisible().catch(() => false);
  check("افزودن سینی سفارشی به سبد (قیمت سروری)", trayToast);

  // ───────────────────────── 3. PRODUCT PAGE + CART
  console.log("\n━━━ UI-3 · محصول و سبد خرید ━━━");
  await page.goto("/products/mazafati-dates", { waitUntil: "networkidle" });
  await page.screenshot({ path: `${SHOTS}/06-product.png`, fullPage: true });
  await page.getByRole("button", { name: /افزودن به سبد/ }).first().click();
  await page.waitForTimeout(1200);
  await page.goto("/cart", { waitUntil: "networkidle" });
  const body = await page.locator("body").innerText();
  check("سبد شامل سینی سفارشی است", body.includes("سینی سفارشی") || body.includes("سازمانی"), body.slice(0, 80));
  check("سبد شامل خرما مضافتی است", body.includes("مضافتی"));
  await page.screenshot({ path: `${SHOTS}/07-cart.png`, fullPage: true });

  // ───────────────────────── 4. CHECKOUT (full form flow)
  console.log("\n━━━ UI-4 · تسویه کامل از طریق فرم ━━━");
  const nextBtn = () => page.locator("button", { hasText: "گام بعد" }).last();
  await page.goto("/checkout", { waitUntil: "networkidle" });
  // step 1 (سبد) → step 2 (گیرنده)
  await nextBtn().click();
  await page.waitForTimeout(700);
  await page.getByPlaceholder("سارا").fill(USER.name).catch(() => {});
  await page.getByPlaceholder("محمدی").fill(USER.family).catch(() => {});
  await page.getByPlaceholder("۰۹۱۲۳۴۵۶۷۸۹").first().fill(USER.phone).catch(() => {});
  await page.screenshot({ path: `${SHOTS}/08-checkout-receiver.png` });
  // step 2 → 3 (آدرس)
  await nextBtn().click();
  await page.waitForTimeout(700);
  const addrForm = page.getByPlaceholder("نام و نام خانوادگی گیرنده");
  check("فرم آدرس ظاهر شد", await addrForm.isVisible().catch(() => false));
  await addrForm.fill("سارا تستی");
  await page.getByPlaceholder("مثلاً تهران").fill("تهران");
  await page.getByPlaceholder("خیابان، کوچه، پلاک").fill("خیابان آزادی، کوچه بهار، پلاک ۱۲");
  await page.getByPlaceholder("۱۰ رقم").fill("1234567890");
  await page.getByPlaceholder("۰۹۱۲۳۴۵۶۷۸۹").last().fill(USER.phone);
  const provSelect = page.locator("select").first();
  if (await provSelect.isVisible().catch(() => false)) await provSelect.selectOption({ label: "تهران" }).catch(() => {});
  await page.screenshot({ path: `${SHOTS}/09-checkout-address.png` });
  await page.getByRole("button", { name: "افزودن آدرس" }).click();
  await page.waitForTimeout(800);
  // step 3 → 4 (ارسال)
  await nextBtn().click();
  await page.waitForTimeout(700);
  const express = page.getByText("ارسال سریع", { exact: false }).first();
  check("گام ارسال قابل دسترسی است", await express.isVisible().catch(() => false));
  await express.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/10-checkout-shipping.png` });
  // step 4 → 5 (پرداخت)
  await nextBtn().click();
  await page.waitForTimeout(700);
  const cod = page.getByText("پرداخت در محل", { exact: false }).first();
  check("گام پرداخت قابل دسترسی است", await cod.isVisible().catch(() => false));
  await cod.click();
  await page.waitForTimeout(400);
  // step 5 → 6 (تأیید نهایی)
  await nextBtn().click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SHOTS}/11-checkout-confirm.png`, fullPage: true });
  const placeBtn = page.locator("button", { hasText: "ثبت سفارش" }).last();
  check("دکمه ثبت نهایی فعال است", await placeBtn.isEnabled().catch(() => false));
  await placeBtn.click();
  await page.waitForTimeout(4000);
  const successUrl = page.url();
  check("ثبت سفارش → صفحه موفقیت", successUrl.includes("success"), successUrl);
  const bodyS = await page.locator("body").innerText();
  const codeMatch = bodyS.match(/HLA-[A-Z0-9]+/);
  const orderCode = codeMatch ? codeMatch[0] : "";
  check(`کد سفارش نمایش داده شد (${orderCode})`, Boolean(orderCode));
  await page.screenshot({ path: `${SHOTS}/12-order-success.png`, fullPage: true });

  // ───────────────────────── 5. TRACKING
  console.log("\n━━━ UI-5 · پیگیری سفارش ━━━");
  await page.goto(`/track?code=${orderCode}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const prefilled = await page.locator("input").first().inputValue().catch(() => "");
  check("پیگیری: کد از URL پیش‌پر شد", prefilled.includes(orderCode), prefilled);
  await page.locator("input").last().fill(USER.phone);
  await page.getByRole("button", { name: "پیگیری", exact: false }).first().click();
  await page.waitForTimeout(1800);
  const trackBody = await page.locator("body").innerText();
  check("پیگیری: وضعیت سفارش نمایش داده شد", trackBody.includes(orderCode) && /در انتظار|پرداخت/.test(trackBody), trackBody.slice(0, 100));
  await page.screenshot({ path: `${SHOTS}/12-track.png`, fullPage: true });

  // ───────────────────────── 6. ACCOUNT DASHBOARD
  console.log("\n━━━ UI-6 · داشبورد مشتری ━━━");
  await page.goto("/account", { waitUntil: "networkidle" });
  const accBody = await page.locator("body").innerText();
  check("داشبورد: نام کاربر", accBody.includes("سارا"), accBody.slice(0, 60));
  await page.screenshot({ path: `${SHOTS}/13-account.png`, fullPage: true });
  await page.goto("/account/orders", { waitUntil: "networkidle" });
  const ordersBody = await page.locator("body").innerText();
  check("تاریخچه سفارش‌ها شامل سفارش جدید", Boolean(orderCode) && ordersBody.includes(orderCode));
  await page.screenshot({ path: `${SHOTS}/14-account-orders.png`, fullPage: true });

  // ───────────────────────── 7. MOBILE
  console.log("\n━━━ UI-7 · موبایل (۳۹۰×۸۴۴) ━━━");
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, baseURL: BASE, isMobile: true, hasTouch: true });
  const mp = await mctx.newPage();
  mp.on("pageerror", (e) => consoleErrors.push(`mobile pageerror: ${e.message.slice(0, 150)}`));
  for (const [path, shot] of [
    ["/", "15-m-home.png"], ["/mazeh-trays/build", "16-m-builder.png"],
    ["/products", "17-m-products.png"], ["/cart", "18-m-cart.png"],
  ] as const) {
    await mp.goto(path, { waitUntil: "networkidle" });
    await mp.waitForTimeout(600);
    await mp.screenshot({ path: `${SHOTS}/${shot}`, fullPage: false });
    const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(`موبایل ${path}: بدون اسکرول افقی`, overflow <= 1, `overflow=${overflow}px`);
  }
  // mobile builder interaction
  await mp.goto("/mazeh-trays/build", { waitUntil: "networkidle" });
  await mp.getByRole("button", { name: /مزه|اقلام/ }).first().click().catch(() => {});
  await mp.waitForTimeout(400);
  for (const item of ["خرمای مضافتی", "پنیر فتا", "پسته", "قهوه"]) {
    await mp.getByRole("button", { name: `افزایش ${item}`, exact: false }).first().click().catch(() => {});
    await mp.waitForTimeout(120);
  }
  const mPrice = await mp.locator("aside[aria-label='خلاصه و قیمت زنده'] .text-lg").innerText().catch(() => "");
  check("موبایل: افزودن اقلام با لمس → قیمت زنده", /[۰-۹0-9]/.test(mPrice), mPrice);
  await mp.screenshot({ path: `${SHOTS}/19-m-builder-items.png`, fullPage: true });

  // console error audit
  const realErrors = consoleErrors.filter((e) => !/favicon|404|net::ERR|the server responded with a status/i.test(e));
  check("بدون خطای کنسول/هیدریشن جاوااسکریپت", realErrors.length === 0, realErrors.slice(0, 3).join(" | "));

  console.log(`\n═══ UI JOURNEY: ${pass} PASS / ${fail} FAIL ═══`);
  if (fails.length) console.log("Failed:\n  - " + fails.join("\n  - "));
  fs.writeFileSync(`${SHOTS}/summary.json`, JSON.stringify({ pass, fail, orderCode, consoleErrors: realErrors }, null, 2));
  await browser.close();
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); });
