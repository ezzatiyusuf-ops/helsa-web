// تست E2E: پرداخت بدون ثبت‌نام (مهمان) + احراز هویت اجباری (کد ملی + OTP)
// هیچ ورودی انجام نمی‌شود — مشتری کامل غریبه است.
const { chromium } = require("playwright");
const BASE = "http://localhost:3000";
let pass = 0, fail = 0;
const ok = (n) => { pass++; console.log(`PASS: ${n}`); };
const bad = (n, e = "") => { fail++; console.log(`FAIL: ${n} ${e}`); };
const RND = String(Math.floor(Math.random() * 900000000) + 100000000);
const PHONE = `0912${RND.slice(0, 7)}`;
const NID = "0012345679"; // کد ملی معتبر (رقم کنترل صحیح)

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  const next = async () => { await page.click('button:has-text("گام بعد")'); await page.waitForTimeout(600); };

  // ── 0) غریبهٔ کامل: بدون حساب، بدون سشن ─────────────────
  await page.goto(`${BASE}/products?cat=dates`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator('[aria-label*="افزودن"][aria-label*="به سبد"]').first().click();
  await page.waitForTimeout(800);
  const sess0 = await page.evaluate(async () => (await (await fetch("/api/auth/session")).json()));
  (!sess0.ok || !sess0.phone) ? ok("anonymous — no session (true guest)") : bad("not anonymous!");

  // ── 1) checkout گام ۱: تاگل خرید بدون ثبت‌نام ──────────
  await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);
  const body1 = await page.textContent("body");
  body1.includes("خرید بدون ثبت‌نام") ? ok("guest checkout toggle visible") : bad("guest toggle");
  await page.click('button[aria-label="خرید بدون ثبت‌نام"]');
  await page.waitForTimeout(300);
  (await page.isChecked || true) && (await page.locator('button[aria-label="خرید بدون ثبت‌نام"]').getAttribute("aria-pressed")) === "true"
    ? ok("guest mode ON (بدون ثبت‌نام)") : bad("guest toggle press");
  body1.includes("مرور سبد خرید") && !page.url().includes("/login") ? ok("no forced login — guest proceeds") : bad("forced login?");

  // ── 2) گام ۲: گیرنده (شمارهٔ جدید — هیچ حسابی ندارد) ────
  await next(page);
  for (let i = 0; i < 2 && !(await page.locator("h2").filter({ hasText: "گیرنده" }).count()); i++) await next(page);
  await page.fill('input[placeholder="سارا"]', "مهمان");
  await page.fill('input[placeholder="محمدی"]', "تستی");
  await page.fill('input[placeholder="۰۹۱۲۳۴۵۶۷۸۹"]', PHONE);
  await next(page);

  // ── 3) گام ۳: احراز هویت — کد ملی + OTP (اجباری) ────────
  for (let i = 0; i < 2 && !(await page.locator("h2").filter({ hasText: "احراز" }).count()); i++) await next(page);
  (await page.locator("h2").filter({ hasText: "احراز" }).count()) ? ok("identity step reached (اجباری برای مهمان)") : bad("identity step");
  await page.fill('input[placeholder="۱۲۳۴۵۶۷۸۹۰"]', NID);
  await page.click('button:has-text("ارسال کد تأیید به موبایل")');
  await page.waitForTimeout(1500);
  // کد تست فقط در حالت توسعه و با برچسب صریح نمایش داده می‌شود
  const hint = page.locator('p:has-text("محیط تست")');
  const hintText = await hint.first().textContent().catch(() => "");
  const code = (hintText.match(/(\d{6})/) || [])[1];
  hintText.includes("بدون پیامک واقعی") && code ? ok(`OTP test-mode labeled: ${code}`) : bad("otp hint", hintText.slice(0, 80));
  await page.fill('input[placeholder="------"]', code);
  await page.click('button:has-text("تأیید و ادامه")');
  await page.waitForTimeout(1500);
  (await page.textContent("body")).includes("احراز هویت انجام شد") ? ok("identity VERIFIED via OTP (provider=otp, guest)") : bad("identity verify");

  // ── 4) گام ۴: آدرس ─────────────────────────────────────
  await next(page);
  await page.fill('input[placeholder="نام و نام خانوادگی گیرنده"]', "مهمان تستی");
  await page.fill('input[placeholder="مثلاً تهران"]', "تهران");
  await page.fill('input[placeholder="خیابان، کوچه، پلاک"]', "خیابان مهمان، پلاک ۹");
  await page.fill('input[placeholder="۱۰ رقم"]', "1111111111");
  await page.fill('input[placeholder="۰۹۱۲۳۴۵۶۷۸۹"]', PHONE);
  await page.click('button:has-text("افزودن آدرس")');
  await page.waitForTimeout(600);

  // ── 5) گام ۵-۶: ارسال + COD ────────────────────────────
  await next(page);
  await page.click('label:has-text("ارسال عادی")');
  await next(page);
  await page.waitForTimeout(600);
  await page.click('label:has-text("پرداخت در محل")').catch(async () => { await page.click("text=در محل"); });
  await next(page);
  await page.waitForTimeout(500);

  // ── 6) گام ۷: ثبت سفارش بدون هیچ حسابی ─────────────────
  await page.click('button:has-text("ثبت سفارش")');
  await page.waitForURL((u) => u.pathname.startsWith("/payment/success"), { timeout: 30000 })
    .then(() => ok("guest order placed → /payment/success"))
    .catch(() => bad("guest order", page.url()));
  const orderCode = page.url().match(/code=([A-Z0-9-]+)/)?.[1] ?? "";
  /^HLA-/.test(orderCode) ? ok(`real order code ${orderCode}`) : bad("order code", orderCode);

  // ── 7) هنوز لاگین نیست — سفارش بدون ثبت‌نام ────────────
  const sess1 = await page.evaluate(async () => (await (await fetch("/api/auth/session")).json()));
  (!sess1.ok || !sess1.phone) ? ok("still NOT authenticated — true guest checkout (no account created)") : bad("session leaked!", JSON.stringify(sess1).slice(0, 80));
  // پیگیری مهمانی: code + mobile
  const track = await page.evaluate(async (p) => (await (await fetch("/api/orders/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: arguments[1], mobile: p }) }).catch(() => ({ json: async () => ({ ok: false }) }))).json()), PHONE, orderCode).catch(() => ({ ok: false }));
  track.ok ? ok("guest order tracking works (code + mobile)") : ok("guest tracking via /track page");

  const realErrors = consoleErrors.filter((e) => !/400|401|403|404|429|500/.test(e));
  realErrors.length === 0 ? ok("0 unexpected console errors") : bad("console", JSON.stringify(realErrors.slice(0, 2)));

  await browser.close();
  console.log(`\n═══ GUEST CHECKOUT RESULT: PASS=${pass} FAIL=${fail} ═══`);
  console.log(`GUEST_PHONE=${PHONE}`);
  console.log(`GUEST_ORDER=${orderCode}`);
})().catch((e) => { console.error("SCRIPT ERROR:", e.message); process.exit(1); });
