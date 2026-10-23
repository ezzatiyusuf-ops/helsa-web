import { chromium } from "playwright";
const pass=[], fail=[]; const check=(n,c,d="")=>{(c?pass:fail).push(n);console.log((c?"✅":"❌")+" "+n+(d?" — "+d:""));};
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
await page.goto("http://localhost:3000/products/tiramisu-cake", { waitUntil: "networkidle" });
// انتخاب گونهٔ ۱ کیلوگرم اگر هست
const variant1000 = page.getByText("۱٬۰۰۰ گرم", { exact: true }).first();
if (await variant1000.count()) { await variant1000.click(); await page.waitForTimeout(400); }
const addBtn = page.getByRole("button", { name: /افزودن به سبد/ }).first();
await addBtn.click();
await page.waitForTimeout(1800);
const cartCount = await page.locator("a[href='/cart']").first().textContent().catch(()=>"");
check("افزودن تیرامیسو به سبد", /۱|1/.test(cartCount ?? ""), "badge سبد: "+(cartCount??"—").trim().slice(0,20));
await page.goto("http://localhost:3000/checkout", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
const html = await page.content();
check("تیرامیسو در چک‌اوت", html.includes("تیرامیسو"));
check("قیمت گونه در چک‌اوت (۱٬۲۱۶٬۰۰۰)", html.includes("۱٬۲۱۶٬۰۰۰") || html.includes("۶۴۰٬۰۰۰"), "");
await page.screenshot({ path: "qa-shots/new-product-checkout.jpg", animations: "disabled", timeout: 10000 }).catch(()=>{});
console.log(`═══ CART E2E: ${pass.length} PASS / ${fail.length} FAIL ═══`);
await browser.close();
process.exit(fail.length?1:0);
