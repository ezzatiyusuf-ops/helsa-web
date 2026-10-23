// ج۳۱ — UI QA: real server orders render in the dashboard (customer with 1 delivered order)
const { chromium } = require("playwright");
const BASE = "http://localhost:3000";
let pass = 0, fail = 0;
const ok = (n) => { pass++; console.log(`PASS: ${n}`); };
const bad = (n, e = "") => { fail++; console.log(`FAIL: ${n} ${e}`); };

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[autocomplete="username"]', "09125556677");
  await page.fill('input[autocomplete="current-password"]', "SaraQa#2026");
  await page.click('button:has-text("ورود به حساب هلسا")');
  await page.waitForURL("**/account", { timeout: 10000 }).then(() => ok("login as order-owner")).catch(() => bad("login", page.url()));

  await page.goto(`${BASE}/account/orders`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500); // server orders fetch + merge
  const body = await page.textContent("body");
  body.includes("HLA-B0EC6B31") ? ok("REAL server order HLA-B0EC6B31 listed") : bad("server order not listed");
  body.includes("تحویل شده") ? ok("delivered status badge") : bad("status");
  const n = await page.locator("text=HLA-").count();
  n >= 1 ? ok(`${n} order card(s)`) : bad("no order cards");

  // order detail page (server-backed record via merged store)
  await page.click('a:has-text("HLA-B0EC6B31")');
  await page.waitForTimeout(900);
  const detail = await page.textContent("body");
  detail.includes("محصولات") && detail.includes("آدرس ارسال") ? ok("order detail renders items+address") : bad("detail");
  detail.includes("۴۰۵") || detail.includes("۴۰۵٬۰۰۰") || detail.includes("405,000") || detail.includes("۴۰۵،۰۰۰") ? ok("real total 405,000 renders") : bad("total", detail.slice(0, 80));

  const realErrs = errs.filter((e) => !e.includes("401"));
  realErrs.length === 0 ? ok("0 console errors") : bad("console", JSON.stringify(realErrs.slice(0, 2)));
  await page.screenshot({ path: "qa-shots/ux/j31-account-orders.png", fullPage: true });

  await browser.close();
  console.log(`\n═══ ORDERS RESULT: PASS=${pass} FAIL=${fail} ═══`);
})().catch((e) => { console.error("SCRIPT ERROR:", e.message); process.exit(1); });
