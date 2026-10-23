import { chromium } from "playwright";
const pass=[], fail=[]; const check=(n,c,d="")=>{(c?pass:fail).push(n);console.log((c?"✅":"❌")+" "+n+(d?" — "+d:""));};
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
await page.getByPlaceholder("09123456789").fill("owner@helsa.dev");
await page.getByPlaceholder("••••••••").first().fill("Owner#Helsa1");
await page.getByRole("button", { name: /ورود|login/i }).first().click();
await page.waitForURL(/admin|account|\/$/, { timeout: 15000 }).catch(()=>{});
await page.goto("http://localhost:3000/admin/orders", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
const collectBtns = page.getByRole("button", { name: "ثبت دریافت وجه" });
const n = await collectBtns.count();
check("دکمهٔ «ثبت دریافت وجه» در پنل", n > 0, `count=${n}`);
if (n > 0) {
  await collectBtns.first().click();
  await page.waitForTimeout(2500);
  const paidCells = await page.getByText("paid").count();
  check("وضعیت پرداخت paid پس از تأیید", paidCells > 0, `paid=${paidCells}`);
  await page.screenshot({ path: "qa-shots/pay-10-admin-collect.jpg", fullPage: true, animations: "disabled", timeout: 10000 }).catch(()=>{});
}
console.log(`═══ ADMIN UI: ${pass.length} PASS / ${fail.length} FAIL ═══`);
await browser.close();
process.exit(fail.length ? 1 : 0);
