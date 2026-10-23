/**
 * HELSA — چاپ دفترچهٔ راهنمای سایت به PDF با کرومیوم Playwright.
 * ورودی: docs/helsa-site-guide.booklet.html (خودکفا)
 * خروجی: docs/helsa-site-guide.booklet.pdf
 * اجرا: node scripts/print-site-guide.mjs
 */
import { chromium } from "playwright";
import { resolve } from "node:path";

const SRC = resolve("docs/helsa-site-guide.booklet.html");
const OUT = resolve("docs/helsa-site-guide.booklet.pdf");

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`file://${SRC}`, { waitUntil: "networkidle" });
await page.emulateMedia({ media: "print" });
await page.pdf({
  path: OUT,
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
});
await browser.close();
console.log(`✓ PDF ساخته شد: ${OUT}`);
