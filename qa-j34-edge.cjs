// ج۳۴ — Edge QA (بند ۲۸ بریف): شبکهٔ کند + خطای سرور روی /forgot-password
const { chromium } = require("playwright");
const BASE = "http://localhost:3000";
let pass = 0, fail = 0;
const ok = (n) => { pass++; console.log(`PASS: ${n}`); };
const bad = (n, e = "") => { fail++; console.log(`FAIL: ${n} ${e}`); };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

  // ── §28-24 SLOW NETWORK: 4s delayed API → loading state, disabled CTA, no double-submit ──
  await page.goto(`${BASE}/forgot-password`, { waitUntil: "networkidle" });
  let resolveSlow;
  const slowGate = new Promise((r) => { resolveSlow = r; });
  await page.route("**/api/auth/reset", async (route) => {
    await slowGate; // hold the request ~4s
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, demo: false, expiresAt: new Date(Date.now() + 600_000).toISOString() }) });
  });
  await page.fill('input[autocomplete="username"]', "09125556677");
  await page.click('button:has-text("ارسال کد تأیید")');
  await page.waitForTimeout(500);
  const busyBtn = await page.locator('button:has-text("در حال بررسی")').count();
  busyBtn === 1 ? ok("slow network → loading indicator (در حال بررسی…)") : bad("loading indicator");
  const disabled = await page.locator('button:has-text("در حال بررسی")').isDisabled();
  disabled ? ok("CTA disabled while busy (no double submit)") : bad("CTA not disabled");
  // still waiting — no error shown prematurely
  (await page.textContent("body")).includes("ارتباط با سرور") ? bad("premature error while in flight") : ok("no premature error while in flight");
  await page.waitForTimeout(3500);
  resolveSlow();
  await page.waitForTimeout(800);
  (await page.textContent("body")).includes("کد تأیید را وارد کنید") ? ok("slow response eventually processed → OTP step") : bad("otp step after slow");
  await page.unroute("**/api/auth/reset");

  // ── §28-25 SERVER FAILURE: HTTP 500 → customer-safe message, no stack/config leak ──
  await page.goto(`${BASE}/forgot-password`, { waitUntil: "networkidle" });
  await page.route("**/api/auth/reset", async (route) => {
    await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ ok: false }) });
  });
  await page.fill('input[autocomplete="username"]', "09125556677");
  await page.click('button:has-text("ارسال کد تأیید")');
  await page.waitForTimeout(700);
  const b500 = await page.textContent("body");
  b500.includes("در بازیابی رمز عبور مشکلی پیش آمد. لطفاً دوباره تلاش کنید.") ? ok("500 → server-failure message (exact brief text)") : bad("500 message", b500.slice(0, 120));
  !/stack|Error:|at \/|database|postgres|SMS_PROVIDER/i.test(b500) ? ok("no stack/config/db details on 500") : bad("technical leak on 500");

  // ── network-level failure (request aborted) → network message ──
  await page.goto(`${BASE}/forgot-password`, { waitUntil: "networkidle" });
  await page.route("**/api/auth/reset", async (route) => { await route.abort("connectionfailed"); });
  await page.fill('input[autocomplete="username"]', "09125556677");
  await page.click('button:has-text("ارسال کد تأیید")');
  await page.waitForTimeout(700);
  const bNet = await page.textContent("body");
  bNet.includes("ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.") ? ok("connection failure → network message (exact brief text)") : bad("network message", bNet.slice(0, 120));
  await page.unroute("**/api/auth/reset");

  // recovery: normal request works again after failures (no stuck state)
  await page.reload({ waitUntil: "networkidle" });
  await page.fill('input[autocomplete="username"]', "09125556677");
  await page.click('button:has-text("ارسال کد تأیید")');
  await page.waitForTimeout(800);
  const bRec = await page.textContent("body");
  (bRec.includes("کد تأیید را وارد کنید") || bRec.includes("ارسال کد بازیابی در حال حاضر امکان‌پذیر نیست"))
    ? ok("no stuck state after failures (flow reachable again)") : bad("stuck after failures");

  const realErrs = errs.filter((e) => !/401|400|500|Failed to load resource/.test(e));
  realErrs.length === 0 ? ok("0 unexpected console errors") : bad("console", JSON.stringify(realErrs.slice(0, 2)));

  await browser.close();
  console.log(`\n═══ EDGE RESULT: PASS=${pass} FAIL=${fail} ═══`);
})().catch((e) => { console.error("SCRIPT ERROR:", e.message); process.exit(1); });
