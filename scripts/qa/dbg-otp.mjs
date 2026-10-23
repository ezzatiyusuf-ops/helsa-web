import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
page.on("response", async (r) => {
  if (r.url().includes("/api/")) {
    const body = await r.text().catch(() => "");
    console.log(r.status(), r.url().replace("http://localhost:3000", ""), body.slice(0, 120));
  }
});
await page.goto("http://localhost:3000/products/piaram-dates", { waitUntil: "networkidle" });
await page.getByRole("button", { name: /افزودن به سبد/ }).first().click();
await page.waitForTimeout(1500);
await page.goto("http://localhost:3000/checkout", { waitUntil: "networkidle" });
await page.getByRole("button", { name: "گام بعد" }).click();
await page.getByPlaceholder("سارا").fill("سارا");
await page.getByPlaceholder("محمدی").fill("محمدی");
await page.getByPlaceholder("۰۹۱۲۳۴۵۶۷۸۹").first().fill("09120000015");
await page.getByRole("button", { name: "گام بعد" }).click();
await page.waitForTimeout(600);
await page.locator('input[inputmode="numeric"]').first().fill("1234567891");
await page.getByRole("button", { name: /ارسال کد تأیید/ }).click();
await page.waitForTimeout(2500);
const html = await page.content();
console.log("otpSent in DOM:", html.includes("------"), "| dev hint:", /محیط توسعه/.test(html));
await page.screenshot({ path: "qa-shots/dbg-otp.jpg" });
await browser.close();
