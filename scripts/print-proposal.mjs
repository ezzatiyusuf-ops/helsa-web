/**
 * HELSA — چاپ پروپوزال راه‌اندازی تولید به PDF با کرومیوم Playwright.
 * ورودی: docs/helsa-production-proposal.html (خودکفا)
 * خروجی: docs/helsa-production-proposal.pdf
 * اجرا: node scripts/print-proposal.mjs
 */
import { chromium } from "playwright";
import { resolve } from "node:path";

const SRC = resolve("docs/helsa-production-proposal.html");
const OUT = resolve("docs/helsa-production-proposal.pdf");

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
