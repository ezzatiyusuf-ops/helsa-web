/**
 * رگرسیون قیمت و ارز — qa-price-regression.cjs (خواستهٔ #۱۱ ممیزی)
 * ├── هیچ «تومان تومان» (با هر فاصله/نیم‌فاصله) در هیچ صفحهٔ کلیدی
 * ├── هر بلوک قیمت حداکثر یک برچسب ارز کنار هر عدد
 * ├── باندهای بودجهٔ هدیه (لیبل استاتیک-داینامیک) دقیقاً یک «تومان»
 * ├── ماشین‌حساب هدیه سازمانی: خروجی برآورد دقیقاً یک «تومان»
 * ├── تصاویر کارت‌های سینی یکتا هستند (#۱۳)
 * └── اسکرین‌شات پایه از هر صفحه (بستر بازبینی بصری)
 */
const { chromium } = require("playwright");
const fs = require("fs");

const BASE = process.env.QA_BASE || "http://localhost:3000";
const PAGES = [
  ["home", "/"],
  ["products", "/products"],
  ["product-detail", "/products/premium-mixed-nuts"],
  ["mazeh-trays", "/mazeh-trays"],
  ["gifts", "/gifts"],
  ["gifts-corporate", "/gifts/corporate"],
  ["cart", "/cart"],
];
let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log(`PASS: ${m}`); };
const bad = (m, d = "") => { fail++; console.log(`FAIL: ${m} ${String(d).slice(0, 160)}`); };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  fs.mkdirSync("/tmp/price-shots", { recursive: true });

  for (const [name, path] of PAGES) {
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);
    const text = (await page.textContent("body").catch(() => "")) || "";
    // ۱) هیچ تکرار ارزی
    /تومان[\s\u200c]*تومان/.test(text) ? bad(`تکرار تومان در ${name}`) : ok(`بدون تکرار ارز در ${name}`);
    // ۲) الگوی عدد+تومان+عدد بدون فاصله (چسبیده)
    /٬\s*تومان[\d]/.test(text.replace(/\s+/g, " ")) ? bad(`الگوی چسبیده در ${name}`) : null;
    await page.screenshot({ path: `/tmp/price-shots/${name}.png` });
  }

  /* باندهای بودجهٔ هدیه — دقیقاً یک تومان در هر لیبل */
  await page.goto(`${BASE}/gifts`, { waitUntil: "domcontentloaded" });
  {
    const chips = await page.locator('[aria-label="انتخاب بودجه"] button').allTextContents().catch(() => []);
    const priced = chips.filter((c) => c.includes("تومان"));
    const nums = (c) => (c.match(/[۰-۹][۰-۹٬،.]*/g) || []).filter((n) => n.length >= 4).length;
    priced.length >= 2
      ? priced.every((c) => !/تومان[\s\u200c]*تومان/.test(c) && (c.match(/تومان/g) || []).length === nums(c))
        ? ok(`باندهای بودجه سالم (${priced.length} لیبل — هر عدد دقیقاً یک ارز)`)
        : bad("budget bands", chips.join(" | "))
      : bad("budget bands not found", chips.join(" | "));
  }

  /* ماشین‌حساب سازمانی — برآورد با یک تومان (روی /gifts) */
  await page.goto(`${BASE}/gifts`, { waitUntil: "domcontentloaded" });
  {
    const per = page.locator("#corp-per");
    if (await per.count()) {
      await per.selectOption("1000000");
      const qty = page.locator("select, input[type=number]").nth(1);
      const estimate = page.locator('p:has-text("برآورد اولیه:")').first();
      const t = (await estimate.textContent().catch(() => "")) || "";
      (t.match(/تومان/g) || []).length === 1 && /[۰-۹]٬۰۰۰٬۰۰۰/.test(t)
        ? ok(`ماشین‌حساب: خروجی تک-ارز («${t.trim().slice(0, 60)}»)`)
        : bad("calculator", t.slice(0, 100));
    } else bad("calculator not found");
  }

  /* کارت‌های سینی — تصاویر یکتا (#۱۳) */
  await page.goto(`${BASE}/mazeh-trays`, { waitUntil: "domcontentloaded" });
  {
    const srcs = await page.locator("main a[href^='/mazeh-trays/'] img").evaluateAll(
      (els) => els.map((e) => e.getAttribute("src")),
    ).catch(() => []);
    const meaningful = srcs.filter(Boolean).map((s) => s.split("?")[0]);
    const uniq = new Set(meaningful);
    meaningful.length >= 4 && uniq.size === meaningful.length
      ? ok(`تصاویر کارت سینی یکتا (${uniq.size}/${meaningful.length})`)
      : bad("tray images not unique", `${uniq.size}/${meaningful.length}: ${[...new Set(meaningful.filter((v, i) => meaningful.indexOf(v) !== i))].join(",")}`);
  }

  await browser.close();
  console.log(`\n═══ PRICE-REGRESSION RESULT: PASS=${pass} FAIL=${fail} ═══`);
  console.log(`اسکرین‌شات‌های پایه: /tmp/price-shots/ (${PAGES.length} صفحه)`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
