// ج۳۱ — UI QA: login/account experience (Playwright, production build)
const { chromium } = require("playwright");

const BASE = "http://localhost:3000";
const PHONE = "09120009485";
const PW = "NewPass#2026";
let pass = 0, fail = 0;
const ok = (name) => { pass++; console.log(`PASS: ${name}`); };
const bad = (name, extra = "") => { fail++; console.log(`FAIL: ${name} ${extra}`); };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  const failedImages = [];
  page.on("response", (r) => { if (r.request().resourceType() === "image" && r.status() >= 400) failedImages.push(r.url()); });

  // ── §0 fixture: ensure the QA user exists (DB may be restored from a pre-run backup) ──
  const reg = await page.request.post(`${BASE}/api/auth/register`, {
    headers: { "Content-Type": "application/json", "Origin": BASE },
    data: { name: "کیوای", family: "هلسا", phone: PHONE, email: "qa-j31-ui@helsa-test.ir", password: PW },
  });
  if (reg.ok()) console.log("PASS: QA fixture registered");
  else if (reg.status() === 409) console.log("PASS: QA fixture already exists");
  else bad("QA fixture", String(reg.status()));
  await ctx.clearCookies(); // the fixture login must not leak into the anonymous UI flow

  // ── §1 login page structure ─────────────────────────────
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  const h1 = await page.textContent("h1");
  h1.includes("ورود به حساب هلسا") ? ok("h1 = ورود به حساب هلسا") : bad("h1", h1);
  const body = await page.textContent("body");
  body.includes("برای مشاهده سفارش‌ها، پیگیری خریدها و استفاده از مزایای حساب هلسا وارد شوید.")
    ? ok("supporting copy") : bad("supporting copy");
  (await page.locator('a:has-text("Google")').count()) === 0 ? ok("no decorative Google button (unconfigured)") : bad("google button shown");
  (await page.locator('a:has-text("Apple")').count()) === 0 ? ok("no decorative Apple button (unconfigured)") : bad("apple button shown");
  body.includes("ادامه بدون ورود") ? ok("guest checkout link (supported by architecture)") : bad("guest link");
  body.includes("رمز عبور را فراموش کرده‌اید") ? ok("forgot password link") : bad("forgot link");
  body.includes("scrypt") && body.includes("HttpOnly") ? ok("honest trust row") : bad("trust row");
  (await page.locator('button:has-text("ورود با کد یک‌بارمصرف")').count()) === 1 ? ok("OTP method toggle") : bad("otp toggle");
  body.includes("ساخت حساب جدید") ? ok("register CTA") : bad("register CTA");
  (await page.locator('input[autocomplete="username"]').count()) === 1 ? ok("autocomplete=username") : bad("autocomplete");
  (await page.locator('input[autocomplete="current-password"]').count()) === 1 ? ok("autocomplete=current-password") : bad("autocomplete pw");
  (await page.locator('button[aria-label*="رمز"]').count()) >= 1 ? ok("password visibility toggle (aria)") : bad("pw toggle");

  // dataLayer: login_view
  const ev1 = await page.evaluate(() => (window.dataLayer || []).filter((e) => e.event === "login_view").length);
  ev1 >= 1 ? ok("analytics login_view") : bad("login_view", String(ev1));

  // ── §2 register page ────────────────────────────────────
  await page.goto(`${BASE}/register`, { waitUntil: "networkidle" });
  const rbody = await page.textContent("body");
  rbody.includes("ساخت حساب جدید") ? ok("register h1") : bad("register h1");
  ["نام", "نام خانوادگی", "شماره موبایل"].every((f) => rbody.includes(f)) && !rbody.includes("تکرار رمز عبور")
    ? ok("register fields (مرحلهٔ ۱: هویت؛ تکرار رمز حذف)") : bad("register fields");
  rbody.includes("قوانین و مقررات") ? ok("terms acceptance") : bad("terms");
  rbody.includes("۲۰۰ هزار تومان") && rbody.includes("خبرنامه") ? ok("first-purchase honest note (newsletter-backed)") : bad("gift note");

  // مرحلهٔ ۲ (ایمیل/رمز) بعد از «ادامه» + قدرت رمز
  const s1 = page.locator('input[placeholder=" "]');
  await s1.nth(0).fill("آزمون"); await s1.nth(1).fill("فرم"); await s1.nth(2).fill("09123331100");
  await page.click('button:has-text("ادامه")');
  await page.waitForTimeout(600);
  const rbody2 = await page.textContent("body");
  rbody2.includes("ایمیل") && rbody2.includes("رمز عبور") ? ok("register step2 fields (امنیت حساب)") : bad("step2 fields");
  await page.fill('input[autocomplete="new-password"]', "Test1234!");
  await page.waitForTimeout(200);
  (await page.locator("text=قدرت رمز").count()) >= 1 ? ok("password strength meter") : bad("strength meter");

  // ── §3 login flow: wrong password → Persian error ───────
  await page.goto(`${BASE}/login?next=/account/orders`, { waitUntil: "networkidle" });
  await page.fill('input[autocomplete="username"]', PHONE);
  await page.fill('input[autocomplete="current-password"]', "wrong-password");
  await page.click('button:has-text("ورود به حساب هلسا")');
  await page.waitForTimeout(800);
  const err = await page.textContent("body");
  err.includes("شماره موبایل/ایمیل یا رمز عبور صحیح نیست.") ? ok("wrong-password persian error") : bad("wrong pw error", err.slice(0, 100));

  // ── §4 cart preservation: add to cart, then login ───────
  await page.goto(`${BASE}/products`, { waitUntil: "networkidle" });
  await page.click('[aria-label*="افزودن"][aria-label*="به سبد"] >> nth=0');
  await page.waitForTimeout(600);
  const cartCount = await page.evaluate(() => JSON.parse(localStorage.getItem("helsa-store-v2") || "{}").state?.items?.length ?? 0);
  cartCount >= 1 ? ok(`cart has ${cartCount} item before login`) : bad("cart empty before login");

  // ── §5 login success + return URL → /account/orders ─────
  await page.goto(`${BASE}/login?next=/account/orders`, { waitUntil: "networkidle" });
  await page.fill('input[autocomplete="username"]', PHONE);
  await page.fill('input[autocomplete="current-password"]', PW);
  await page.click('button:has-text("ورود به حساب هلسا")');
  await page.waitForURL((u) => u.pathname === "/account/orders", { timeout: 10000 }).then(() => ok("return URL → /account/orders")).catch(() => bad("return URL", page.url()));
  await page.waitForTimeout(1500);
  const afterLoginCart = await page.evaluate(() => JSON.parse(localStorage.getItem("helsa-store-v2") || "{}").state?.items?.length ?? 0);
  afterLoginCart >= 1 ? ok(`cart preserved after login (${afterLoginCart} item)`) : bad("cart lost on login");

  const dash = await page.textContent("body");
  dash.includes("حساب کاربری من") ? ok("account dashboard") : bad("dashboard");
  ["سفارش‌های من", "آدرس‌ها", "علاقه‌مندی‌ها", "خروج"].every((s) => dash.includes(s)) ? ok("dashboard sections") : bad("sections");
  const ev2 = await page.evaluate(() => (window.dataLayer || []).filter((e) => e.event === "login_success").length);
  ev2 >= 1 ? ok("analytics login_success") : bad("login_success");

  // ── §6 real server orders in dashboard ──────────────────
  // the QA user has no orders; customer 2 (سارا تستی, has delivered order HLA-B0EC6B31) — check via API instead:
  const apiOrders = await page.evaluate(async () => {
    const r = await fetch("/api/orders"); return r.json();
  });
  apiOrders.ok && Array.isArray(apiOrders.orders) ? ok(`GET /api/orders in-browser ok (${apiOrders.orders.length} orders for QA user)`) : bad("api orders");

  // ── §7 already-logged-in: /login auto-redirects ─────────
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForURL((u) => u.pathname === "/account", { timeout: 8000 }).then(() => ok("already-authed /login → /account")).catch(() => bad("auth redirect", page.url()));

  // ── §8 logout ───────────────────────────────────────────
  await page.goto(`${BASE}/account`, { waitUntil: "networkidle" });
  await page.click('button:has-text("خروج")');
  await page.waitForTimeout(1200);
  const sess = await page.evaluate(async () => { const r = await fetch("/api/auth/session"); return r.json(); });
  sess.ok === false ? ok("logout → session cleared") : bad("logout");
  const ev3 = await page.evaluate(() => (window.dataLayer || []).filter((e) => e.event === "logout").length);
  ev3 >= 1 ? ok("analytics logout") : bad("logout event");

  // ── §9 OTP UI: request → countdown, resend gate, demo notice ──
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[autocomplete="username"]', "09123334455");
  await page.click('button:has-text("ورود با کد یک‌بارمصرف")');
  await page.waitForTimeout(900);
  const otp = await page.textContent("body");
  otp.includes("کد ۶ رقمی") ? ok("OTP step copy") : bad("otp copy");
  otp.includes("اعتبار کد") ? ok("countdown timer visible") : bad("countdown");
  otp.includes("ارسال مجدد") && otp.includes("ثانیه") ? ok("resend countdown gate") : bad("resend gate");
  otp.includes("SMS_PROVIDER") ? ok("honest demo notice (SMS unconfigured)") : bad("demo notice");
  otp.includes("کد تست") ? bad("DEV CODE LEAKED IN PROD UI") : ok("no dev code in production UI");
  // paste 6 digits → auto-submit path (wrong code → error message)
  await page.locator('input[aria-label="رقم 1"]').first().click();
  await page.keyboard.type("111111", { delay: 60 });
  await page.waitForTimeout(900);
  const otpErr = await page.textContent("body");
  otpErr.includes("صحیح نیست") ? ok("wrong OTP → error state") : bad("wrong otp state");

  // ── §10 mobile 375: no overflow ─────────────────────────
  const mob = await browser.newContext({ viewport: { width: 375, height: 760 } });
  const mp = await mob.newPage();
  await mp.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  overflow <= 0 ? ok("mobile 375 no horizontal overflow") : bad("mobile overflow", `${overflow}px`);
  const mh1 = await mp.textContent("h1");
  mh1.includes("ورود به حساب هلسا") ? ok("mobile h1") : bad("mobile h1");
  await mp.screenshot({ path: "qa-shots/ux/j31-login-mobile.png", fullPage: true });
  await mob.close();

  // ── §11 screenshots + final console/image check ─────────
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.screenshot({ path: "qa-shots/ux/j31-login-desktop.png", fullPage: true });
  await page.goto(`${BASE}/register`, { waitUntil: "networkidle" });
  await page.screenshot({ path: "qa-shots/ux/j31-register-desktop.png", fullPage: true });

  // 401 resource logs are expected by design: the wrong-password and wrong-OTP negative tests.
  const realErrors = consoleErrors.filter((e) => !e.includes("401 (Unauthorized)"));
  realErrors.length === 0 ? ok(`0 unexpected console errors (2 expected 401s from negative tests)`) : bad("console errors", JSON.stringify(realErrors.slice(0, 3)));
  failedImages.length === 0 ? ok("0 broken images") : bad("broken images", JSON.stringify(failedImages.slice(0, 3)));

  await browser.close();
  console.log(`\n═══ UI RESULT: PASS=${pass} FAIL=${fail} ═══`);
})().catch((e) => { console.error("SCRIPT ERROR:", e.message); process.exit(1); });
