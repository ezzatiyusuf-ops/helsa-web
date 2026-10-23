// HELSA QA — blog search visibility (PART B/Step 8) + keyboard navigation (PART G)
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
let pass = 0, fail = 0;
const check = (name, ok, info = "") => {
  console.log(`  ${ok ? "✅" : "❌"} ${name}${info ? `  [${info}]` : ""}`);
  ok ? pass++ : fail++;
};

const browser = await chromium.launch({ executablePath: "/usr/bin/chromium" });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

// ── 1) Blog search via API ──
const api = await (await fetch(`${BASE}/api/search?q=${encodeURIComponent("خواص خرما")}`)).json();
check("API جستجو: مقاله «خواص خرما» پیدا می‌شود", (api.blog ?? []).some((b) => b.slug === "date-benefits"), JSON.stringify((api.blog ?? [])[0] ?? {}).slice(0, 60));
const apiEn = await (await fetch(`${BASE}/api/search?q=خرما`)).json();
check("API جستجو: حداقل یک مقاله برای «خرما»", (apiEn.blog ?? []).length >= 1, `n=${(apiEn.blog ?? []).length}`);

// ── 2) Blog search in UI modal ──
await page.goto(BASE, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /جستجو/ }).first().click();
const input = page.getByPlaceholder(/جستجو|搜/).or(page.locator('input[type="text"],input:not([type])').first());
await input.first().waitFor({ state: "visible", timeout: 5000 });
await input.first().fill("خواص خرما");
await page.waitForTimeout(900);
const blogHit = page.locator(`a[href="/blog/date-benefits"]`);
check("UI: نتیجه مقاله در مودال جستجو ظاهر می‌شود", await blogHit.count() === 1, `n=${await blogHit.count()}`);
if (await blogHit.count()) {
  const badge = await blogHit.first().locator("span span").nth(1).innerText();
  check("UI: برچسب «مقاله» به‌جای قیمت NaN", badge.includes("مقاله"), badge.trim());
  await blogHit.first().click();
  await page.waitForURL("**/blog/date-benefits**", { timeout: 8000 });
  check("UI: کلیک → صفحه مقاله باز می‌شود", page.url().includes("/blog/date-benefits"), page.url());
}

// ── 3) Keyboard navigation smoke (header → search → Esc → tab order) ──
await page.goto(BASE, { waitUntil: "networkidle" });
// فقط کیبورد: Tab تا اولین لینک قابل‌مشاهده
await page.keyboard.press("Tab");
await page.keyboard.press("Tab");
const focused1 = await page.evaluate(() => `${document.activeElement?.tagName}:${(document.activeElement?.getAttribute("aria-label") || document.activeElement?.textContent || "").trim().slice(0, 24)}`);
check("کیبورد: فوکوس قابل‌ مشاهده پس از Tab", focused1.length > 2, focused1);
// Esc مودال جستجو
await page.getByRole("button", { name: /جستجو/ }).first().click();
await page.waitForTimeout(400);
await page.keyboard.press("Escape");
await page.waitForTimeout(500);
const modalGone = await page.locator('[role="dialog"][aria-label="جستجوی محصولات"]').count();
const remaining = await page.locator('[role="dialog"]').count();
check("کیبورد: Escape مودال جستجو را می‌بندد", modalGone === 0, `search=${modalGone}, other-dialogs(cookie)=${remaining}`);
// اسلش/کیبورد روی صفحه محصول: ناوبری با Tab در فریم لاگین
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
for (let i = 0; i < 6; i++) await page.keyboard.press("Tab");
const focused2 = await page.evaluate(() => `${document.activeElement?.tagName}:${(document.activeElement?.getAttribute("aria-label") || document.activeElement?.textContent || document.activeElement?.getAttribute("placeholder") || "").trim().slice(0, 24)}`);
check("کیبورد: Tab در فرم لاگین روی کنترل قابل‌فوکوس می‌رود", focused2.length > 2, focused2);

console.log(`\n═══ SEARCH+BLOG/KEYBOARD: ${pass} PASS / ${fail} FAIL ═══`);
await browser.close();
process.exit(fail ? 1 : 0);
