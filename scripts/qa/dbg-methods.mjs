import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
page.on("request", (r) => { if (r.url().includes("/api/payments/methods")) console.log("REQ:", r.url().replace("http://localhost:3000","")); });
page.on("response", async (r) => { if (r.url().includes("/api/payments/methods")) console.log("RES:", (await r.text()).slice(0,300)); });
await page.goto("http://localhost:3000/products/piaram-dates", { waitUntil: "networkidle" });
await page.getByRole("button", { name: /افزودن به سبد/ }).first().click();
await page.waitForTimeout(1500);
await page.goto("http://localhost:3000/checkout", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
const states = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('input[name="pay"]')).map((i) => ({ value: i.value, disabled: i.disabled, checked: i.checked }));
});
console.log("RADIOS @step1:", JSON.stringify(states));
// برو مستقیم به گام ۶
for (let k = 0; k < 5; k++) { await page.getByRole("button", { name: "گام بعد" }).click().catch(()=>{}); await page.waitForTimeout(300); }
await page.waitForTimeout(1500);
const states6 = await page.evaluate(() => Array.from(document.querySelectorAll('input[name="pay"]')).map((i) => ({ value: i.value, disabled: i.disabled })));
console.log("RADIOS @step6:", JSON.stringify(states6));
const reasons = await page.evaluate(() => Array.from(document.querySelectorAll('span')).filter(s=>/حداقل|سقف|غیرفعال|فعال است/.test(s.textContent||"")).map(s=>s.textContent?.trim()));
console.log("REASONS:", JSON.stringify(reasons.slice(0,6)));
await browser.close();
