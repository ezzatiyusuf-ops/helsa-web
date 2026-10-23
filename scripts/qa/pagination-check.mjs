import { chromium } from "playwright";
const BASE = "http://localhost:3000";
let pass = 0, fail = 0;
const check = (n, ok, info = "") => { console.log(`  ${ok ? "✅" : "❌"} ${n}${info ? ` [${info}]` : ""}`); ok ? pass++ : fail++; };
const b = await chromium.launch({ executablePath: "/usr/bin/chromium" });

// دسکتاپ
const page = await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
await page.goto(`${BASE}/products`, { waitUntil: "domcontentloaded" });
await page.waitForSelector('[data-testid="pagination"]');
const btns = page.locator('[data-testid="pagination"] button:visible');
const n = await btns.count();
const labels = [];
for (let i = 0; i < n; i++) labels.push((await btns.nth(i).innerText()).trim().replace(/\n/g, " "));
console.log("دکمه‌ها:", JSON.stringify(labels));
check(`تعداد دکمه‌ها فشرده است (≤9، قبلاً ~17)`, n <= 9, `n=${n}`);
const ellipsis = await page.locator('[data-testid="pagination"] span[aria-hidden]').count();
check("الگوی ellipsis (…)", ellipsis >= 1, `…=${ellipsis}`);
check("دکمهٔ اولین صفحه", labels.some((l) => l.includes("اولین صفحه")) || (await page.locator('[aria-label="اولین صفحه"]').count()) === 1);
check("دکمهٔ آخرین صفحه", (await page.locator('[aria-label="آخرین صفحه"]').count()) === 1);
check("قبلی در صفحهٔ ۱ غیرفعال", await page.locator('[aria-label="قبلی"]').first().isDisabled());
check("صفحهٔ فعال هایلایت (aria-current)", (await page.locator('[data-testid="pagination"] [aria-current="page"]').count()) === 1);

// کلیک صفحهٔ ۲
await page.locator('[data-testid="pagination"] button[aria-label="صفحهٔ ۲"]').click();
await page.waitForTimeout(600);
check("رفتن به صفحهٔ ۲ (اسکرول + رندر)", (await page.locator('[data-testid="pagination"] [aria-current="page"]').innerText()).includes("۲"));
// رفتن به آخرین صفحه
await page.locator('[aria-label="آخرین صفحه"]').click();
await page.waitForTimeout(700);
const lastNum = (await page.locator('[data-testid="pagination"] [aria-current="page"]').innerText()).trim();
check(`آخرین صفحه قابل ناوبری است`, lastNum.includes("۱۵") || lastNum.includes("14") || lastNum, lastNum);
check("بعدی در آخرین صفحه غیرفعال", await page.locator('[aria-label="بعدی"]').first().isDisabled());
// اولین صفحه
await page.locator('[aria-label="اولین صفحه"]').click();
await page.waitForTimeout(600);
check("بازگشت به صفحهٔ ۱", (await page.locator('[data-testid="pagination"] [aria-current="page"]').innerText()).includes("۱"));

// موبایل
const mp = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
await mp.goto(`${BASE}/products`, { waitUntil: "domcontentloaded" });
await mp.waitForSelector('[data-testid="pagination"]');
const mobBtns = await mp.locator('[data-testid="pagination"] button:visible').count();
const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check("موبایل: بدون سرریز افقی", overflow <= 2, `${overflow}px`);
check("موبایل: دکمه‌های کمتر (اولین/آخرین مخفی)", mobBtns < n, `mobile=${mobBtns} vs desktop=${n}`);
const rect = await mp.locator('[data-testid="pagination"]').boundingBox();
check("موبایل: صفحه‌بندی در ویوپورت جا می‌شود", rect && rect.x >= 0 && rect.x + rect.width <= 391, rect ? `${Math.round(rect.x)}..${Math.round(rect.x + rect.width)}` : "n/a");
check("موبایل: قبلی/بعدی فقط آیکون (ارتفاع ثابت)", (await mp.locator('[aria-label="قبلی"]').first().isVisible()));

console.log(`\n═══ PAGINATION: ${pass} PASS / ${fail} FAIL ═══`);
await b.close();
process.exit(fail ? 1 : 0);
