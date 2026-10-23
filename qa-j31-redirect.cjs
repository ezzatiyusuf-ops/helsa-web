const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext()).newPage();
  // open-redirect attempt via ?next=
  await page.goto("http://localhost:3000/login?next=//evil.example.com&x=1", { waitUntil: "networkidle" });
  await page.fill('input[autocomplete="username"]', "09125556677");
  await page.fill('input[autocomplete="current-password"]', "SaraQa#2026");
  await page.click('button:has-text("ورود به حساب هلسا")');
  await page.waitForTimeout(2500);
  const url = page.url();
  console.log(url.startsWith("http://localhost:3000/account") ? "PASS: //evil rejected → /account" : `FAIL: ${url}`);
  // protocol-relative with path — لینک مهمان در نشست تازه (لاگین‌شده از /login بیرون رانده می‌شود)
  const fresh = await (await browser.newContext()).newPage();
  await fresh.goto("http://localhost:3000/login?next=/\\evil", { waitUntil: "networkidle" });
  const guest = await fresh.getAttribute('a:has-text("ادامه بدون ورود")', "href");
  console.log(guest === "/checkout" || guest.startsWith("/") && !guest.startsWith("//") ? `PASS: guest link safe (${guest})` : `FAIL: ${guest}`);
  await browser.close();
})();
