/** فاز ۱ — تست مگامنوی هدایا (دسکتاپ) + کشوی موبایل + گالری */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const shots = "qa-shots/premium";
const results = [];
const check = (name, pass, extra = "") => { results.push({ name, pass, extra }); console.log(`${pass ? "✅" : "❌"} ${name}${extra ? " — " + extra : ""}`); };

const browser = await chromium.launch();

// ── دسکتاپ: مگامنو ──
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(BASE + "/", { waitUntil: "networkidle" });
const giftsNav = page.locator("header").getByText("هدایا", { exact: true }).first();
await giftsNav.hover();
await page.waitForTimeout(600);
const menuPanel = page.locator("header .absolute.w-\\[640px\\]").first();
const panelVisible = await menuPanel.isVisible().catch(() => false);
check("مگامنوی هدایا باز می‌شود (پنل 640px)", panelVisible);
if (panelVisible) {
  const tiles = menuPanel.locator("a.group");
  const tileCount = await tiles.count();
  check("۸ کاشی هدیه", tileCount === 8, `${tileCount} کاشی`);
  const imgs = menuPanel.locator("img");
  let loaded = 0, webp480 = 0;
  for (let i = 0; i < await imgs.count(); i++) {
    const nw = await imgs.nth(i).evaluate((el) => el.naturalWidth);
    const src = await imgs.nth(i).getAttribute("src");
    if (nw > 0) loaded++;
    if (src && src.includes("-480.webp")) webp480++;
  }
  check("همهٔ تصاویر کاشی‌ها لود شدند", loaded === 8, `${loaded}/8`);
  check("تصاویر کاشی از نسخهٔ سبک 480webp", webp480 === 8, `${webp480}/8`);
  const ctaGifts = await menuPanel.getByText("مشاهده همه هدایا").isVisible();
  const ctaWhole = await menuPanel.getByText("استعلام سازمانی و عمده").isVisible();
  check("دکمهٔ CTA مشاهده همه", ctaGifts);
  check("دکمهٔ CTA استعلام عمده", ctaWhole);
  await page.screenshot({ path: `${shots}/menu-gifts-desktop.png`, clip: { x: 0, y: 0, width: 1440, height: 560 } });
  // کلیک کاشی → صفحهٔ درست (hover مجدد پیش از کلیک تا پنل باز بماند)
  await giftsNav.hover();
  await page.waitForTimeout(400);
  await menuPanel.getByText("هدایای مدیریتی").click();
  await page.waitForURL("**/gifts/corporate?cat=executive", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(500);
  check("کاشی «هدایای مدیریتی» → /gifts/corporate?cat=executive", page.url().includes("cat=executive"), page.url());
  await page.screenshot({ path: `${shots}/corporate-executive.png`, fullPage: false });
}
// regression: منوی محصولات
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.locator("header").getByText("محصولات", { exact: true }).first().hover();
await page.waitForTimeout(500);
const prodPanel = page.locator("header .absolute.w-\\[640px\\]").first();
check("رگرسیون: مگامنوی محصولات سالم", await prodPanel.isVisible().catch(() => false));
const prodTiles = await prodPanel.locator("a.group").count();
check("رگرسیون: ۸ کاشی محصولات", prodTiles === 8, `${prodTiles} کاشی`);
let prodWebp = 0;
for (let i = 0; i < await prodPanel.locator("img").count(); i++) {
  const src = await prodPanel.locator("img").nth(i).getAttribute("src");
  if (src?.includes("-480.webp")) prodWebp++;
}
check("کاشی‌های محصولات هم سبک شدند (480webp)", prodWebp === 8, `${prodWebp}/8`);
await page.screenshot({ path: `${shots}/menu-products-desktop.png`, clip: { x: 0, y: 0, width: 1440, height: 560 } });
await page.close();

// ── موبایل: کشوی هدایا ──
const m = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await m.goto(BASE + "/", { waitUntil: "networkidle" });
await m.locator("header button[aria-label*=\"منو\"], header button[aria-label*=\"میشه\"], header [aria-label*=\"باز کردن\"]").first().click().catch(async () => {
  // fallback: دکمه‌ای که drawer را باز می‌کند
  const btns = m.locator("header button");
  for (let i = 0; i < await btns.count(); i++) { const t = await btns.nth(i).textContent(); if (t && (t.includes("منو") || t.trim() === "")) { await btns.nth(i).click(); break; } }
});
await m.waitForTimeout(700);
const drawer = m.locator("text=هدایای سازمانی و پرمیوم");
check("کشوی موبایل: بخش هدایا", await drawer.isVisible().catch(() => false));
const mTiles = m.locator("div:has(> p:text(\"هدایای سازمانی و پرمیوم\")) a.group");
const mCount = await mTiles.count();
check("۸ کاشی هدیه در موبایل", mCount === 8, `${mCount} کاشی`);
let mLoaded = 0;
for (let i = 0; i < mCount; i++) {
  const nw = await mTiles.nth(i).locator("img").evaluate((el) => el.naturalWidth).catch(() => 0);
  if (nw > 0) mLoaded++;
}
check("تصاویر کاشی موبایل لود", mLoaded === mCount, `${mLoaded}/${mCount}`);
check("دکمهٔ استعلام عمده در موبایل", await m.getByText("استعلام خرید سازمانی و عمده").isVisible().catch(() => false));
await m.screenshot({ path: `${shots}/menu-gifts-mobile.png`, fullPage: false });
await m.close();

// ── گالری محصول: placeholder + thumbnail سبک + lightbox ──
const g = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const thumbReqs = [];
g.on("request", (r) => { if (r.url().includes("-480.")) thumbReqs.push(r.url().split("/").pop()); });
await g.goto(BASE + "/products/watermelon-rind-jam", { waitUntil: "networkidle" });
const mainGalSrc = await g.locator("main img").evaluateAll(els => els.find(e => (e.getAttribute("src") || "").includes("watermelon-rind-jam"))?.getAttribute("src") ?? "");
check("محصول مربای هندوانه با تصویر اختصاصی", mainGalSrc.includes("watermelon-rind-jam"), mainGalSrc);
const galImgs = g.locator("main picture img, main img");
check("گالری رندر شد", (await galImgs.count()) > 0);
check("thumbnailها از 480webp/avif", thumbReqs.length > 0, [...new Set(thumbReqs)].slice(0, 3).join(", "));
// lightbox
await g.getByLabel("نمایش تمام‌صفحه تصاویر").click();
await g.waitForTimeout(600);
const lightbox = g.locator('[role="dialog"][aria-label*="گالری"]');
check("lightbox تمام‌صفحه باز شد", await lightbox.isVisible());
await g.screenshot({ path: `${shots}/gallery-lightbox.png` });
await g.keyboard.press("ArrowLeft");
await g.keyboard.press("Escape");
await g.waitForTimeout(600);
check("بستن lightbox با Escape", !(await lightbox.isVisible().catch(() => true)));
await g.close();

await browser.close();
const fails = results.filter((r) => !r.pass).length;
console.log(`\n═══ نتیجه: ${results.length - fails}/${results.length} PASS ═══`);
process.exit(fails ? 1 : 0);
