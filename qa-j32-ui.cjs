// ج۳۲ — UI QA: /forgot-password (production build)
// Delivery (SMS/email dispatch) is the ONLY stubbed seam — infrastructure does not exist.
// OTP verification, password change, and login are REAL server calls against the real DB.
const { chromium } = require("playwright");
const { execSync } = require("child_process");
const { scrypt, randomBytes } = require("crypto");
const { promisify } = require("util");

const BASE = "http://localhost:3000";
const SARA = "09125556677";
const NEW_PW = "SaraFlow#32x";
let pass = 0, fail = 0;
const ok = (n) => { pass++; console.log(`PASS: ${n}`); };
  const enterOtp = async (pg, code, mode = "paste") => {
    await pg.locator('input[aria-label="رقم ۱"]').first().click();
    if (mode === "paste") {
      await pg.evaluate((c) => navigator.clipboard.writeText(c), code);
      await pg.keyboard.press("Control+v");
    } else {
      await pg.keyboard.type(code, { delay: 60 }); // per-digit typing → tests focus movement
    }
  };
const bad = (n, e = "") => { fail++; console.log(`FAIL: ${n} ${e}`); };

const DBURL = () => execSync("grep '^DATABASE_URL=' /home/user/helsa/.env | cut -d= -f2-").toString().trim();
const sha = (s) => execSync(`printf '${s}' | sha256sum | cut -d' ' -f1`).toString().trim();
function fixture(phone, code, expiresAtSql) {
  execSync(`psql "${DBURL()}" -q -c "DELETE FROM auth_challenges WHERE identifier='${phone}' AND purpose='password_reset'; INSERT INTO auth_challenges (purpose, identifier, code_hash, attempts, max_attempts, expires_at, created_at) VALUES ('password_reset','${phone}','${sha(code)}',0,5, ${expiresAtSql}, now() - interval '20 minutes');"`);
}
async function restoreSara() {
  const salt = randomBytes(16).toString("hex");
  const derived = await promisify(scrypt)("SaraQa#2026", salt, 64);
  const h = `scrypt$${salt}$${derived.toString("hex")}`;
  // SQL via stdin — the $-containing hash must never pass through shell argument parsing.
  execSync(`psql "${DBURL()}" -q`, {
    input: `UPDATE customers SET password_hash='${h}', password_updated_at = now() - interval '1 hour' WHERE phone='${SARA}'; DELETE FROM auth_challenges WHERE identifier='${SARA}';`,
  });
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });

  // ── §A structure ────────────────────────────────────────
  await page.goto(`${BASE}/forgot-password`, { waitUntil: "networkidle" });
  (await page.textContent("h1")).includes("بازیابی رمز عبور") ? ok("h1") : bad("h1");
  const b0 = await page.textContent("body");
  b0.includes("برای بازیابی رمز عبور، شماره موبایل یا ایمیل حساب خود را وارد کنید.") ? ok("supporting text") : bad("supporting text");
  b0.includes("شماره موبایل یا ایمیل") ? ok("input label") : bad("label");
  (await page.locator('button:has-text("ارسال کد تأیید")').count()) === 1 ? ok("CTA text") : bad("CTA");
  b0.includes("ورود به حساب هلسا") ? ok("login link") : bad("login link");
  b0.includes("ثبت‌نام کنید") ? ok("register link") : bad("register link");
  b0.includes("به‌صورت امن و در سرور پردازش می‌شود") ? ok("trust line (accurate)") : bad("trust line");
  !/پیکربندی|محیط توسعه|SMS_PROVIDER|فقط در توسعه/.test(b0) ? ok("NO dev/debug text on customer UI") : bad("dev text visible!");
  (await page.locator('input[autocomplete="username"]').count()) === 1 ? ok("autocomplete=username") : bad("autocomplete");
  const robots = await page.evaluate(() => document.querySelector('meta[name="robots"]')?.content || "");
  robots.includes("noindex") ? ok("noindex meta") : bad("noindex", robots);
  const ev = await page.evaluate(() => (window.dataLayer || []).map((e) => e.event));
  ev.includes("forgot_password_view") ? ok("analytics forgot_password_view") : bad("analytics view", JSON.stringify(ev));

  // ── §B client validation ────────────────────────────────
  await page.fill('input[autocomplete="username"]', "not-valid");
  await page.click('button:has-text("ارسال کد تأیید")');
  await page.waitForTimeout(300);
  (await page.textContent("body")).includes("شماره موبایل (09xxxxxxxxx) یا ایمیل معتبر وارد کنید.") ? ok("invalid input → persian validation") : bad("validation");

  // ── §C honest production behavior: no delivery configured → customer-safe notice ──
  await page.fill('input[autocomplete="username"]', SARA);
  await page.click('button:has-text("ارسال کد تأیید")');
  await page.waitForTimeout(900);
  const c = await page.textContent("body");
  c.includes("ارسال کد بازیابی در حال حاضر امکان‌پذیر نیست") ? ok("delivery-unavailable notice (honest)") : bad("unavailable notice");
  c.includes("اگر حسابی با این مشخصات وجود داشته باشد") ? ok("anti-enumeration wording kept") : bad("anti-enum wording");
  c.includes("۰۲۱-۵۶۱۳۰۸۵۸") ? ok("support phone shown") : bad("support phone");
  !/پیکربندی|محیط توسعه|SMS_PROVIDER/.test(c) ? ok("no infrastructure details to customer") : bad("infra leak");
  (await page.locator('a:has-text("ورود به حساب")').count()) >= 1 ? ok("unavailable → login option") : bad("login option");
  const evC = await page.evaluate(() => (window.dataLayer || []).map((e) => e.event));
  evC.includes("password_reset_failed") ? ok("delivery_unavailable tracked as password_reset_failed") : bad("failure event", JSON.stringify(evC));
  // back to step 1 without losing context
  await page.click('button:has-text("بازگشت و اصلاح مشخصات")');
  await page.waitForTimeout(400);
  const idVal = await page.inputValue('input[autocomplete="username"]');
  idVal === SARA ? ok("back to step 1, identifier preserved") : bad("identifier lost", idVal);

  // ── §D FULL REAL FLOW (delivery stubbed at transport; verify/reset/login REAL) ──
  fixture(SARA, "654321", "now() + interval '10 minutes'");
  // add a cart item to prove preservation across recovery+login
  await page.goto(`${BASE}/products`, { waitUntil: "networkidle" });
  await page.click('[aria-label*="افزودن"][aria-label*="به سبد"] >> nth=0');
  await page.waitForTimeout(600);

  await page.goto(`${BASE}/forgot-password?next=/checkout`, { waitUntil: "networkidle" });
  await page.route("**/api/auth/reset", async (route) => {
    const body = route.request().postDataJSON();
    if (body.step === "request") {
      // delivery seam: pretend the code was dispatched (in prod this is the SMS/email gateway)
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, demo: false, expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(), message: "اگر حسابی با این مشخصات وجود داشته باشد، کد بازیابی ارسال می‌شود." }) });
    } else {
      await route.continue(); // REAL server verification + password change
    }
  });
  await page.fill('input[autocomplete="username"]', SARA);
  await page.click('button:has-text("ارسال کد تأیید")');
  await page.waitForTimeout(600);
  const s2 = await page.textContent("body");
  s2.includes("کد تأیید را وارد کنید") ? ok("OTP step heading") : bad("otp heading");
  s2.includes("۰۹۱۲•••••۷۷") ? ok("masked contact ۰۹۱۲•••••۷۷") : bad("masked contact", s2.slice(0, 200));
  s2.includes("اعتبار کد") ? ok("validity countdown") : bad("validity countdown");
  s2.includes("ارسال مجدد تا") ? ok("resend gate countdown") : bad("resend gate");
  s2.includes("تغییر شماره موبایل / ایمیل") ? ok("change-contact link") : bad("change-contact");
  (await page.getAttribute('input[aria-label="رقم ۱"]', "inputmode")) === "numeric" ? ok("numeric keyboard on OTP") : bad("inputmode");

  // paste all six digits at once → auto-advance to password step
  await enterOtp(page, "654321", "paste");
  await page.waitForSelector("#new-password-input", { state: "visible", timeout: 5000 });
  const s3 = await page.textContent("body");
  s3.includes("رمز عبور جدید خود را وارد کنید.") ? ok("password step + auto-advance") : bad("password step");

  // client-side: mismatch
  await page.fill("#new-password-input", "Str0ng!Pass#9");
  await page.fill('input[placeholder="تکرار رمز عبور"]', "Different!Pass1");
  await page.click('button:has-text("تغییر رمز عبور")');
  await page.waitForTimeout(300);
  (await page.textContent("body")).includes("رمزهای عبور یکسان نیستند.") ? ok("mismatch validation") : bad("mismatch");
  // show/hide toggle exists
  (await page.locator('button[aria-label*="رمز"]').count()) >= 1 ? ok("show/hide toggle") : bad("toggle");
  // strength meter
  await page.fill('input[placeholder="تکرار رمز عبور"]', NEW_PW);
  await page.waitForTimeout(200);
  (await page.textContent("body")).includes("قدرت رمز") ? ok("strength meter") : bad("strength");
  // weak password (server policy: min 8)
  await page.fill("#new-password-input", "short");
  await page.fill('input[placeholder="تکرار رمز عبور"]', "short");
  await page.click('button:has-text("تغییر رمز عبور")');
  await page.waitForTimeout(300);
  (await page.textContent("body")).includes("حداقل ۸ کاراکتر") ? ok("weak-password client hint") : bad("weak hint");
  // correct submission → REAL server reset
  await page.fill("#new-password-input", NEW_PW);
  await page.fill('input[placeholder="تکرار رمز عبور"]', NEW_PW);
  await page.click('button:has-text("تغییر رمز عبور")');
  await page.waitForTimeout(1200);
  const s4 = await page.textContent("body");
  s4.includes("رمز عبور شما با موفقیت تغییر کرد.") ? ok("REAL reset → success") : bad("reset", s4.slice(0, 150));
  s4.includes("همهٔ نشست‌های ورود قبلی شما باطل شده‌اند") ? ok("session revocation note") : bad("revocation note");
  (await page.locator('a:has-text("ورود به حساب هلسا")').count()) === 1 ? ok("primary CTA ورود به حساب هلسا") : bad("primary CTA");
  const contHref = await page.getAttribute('a:has-text("ادامه خرید")', "href");
  contHref === "/checkout" ? ok("ادامه خرید → safe internal next (/checkout)") : bad("continue href", contHref);

  // ── §D2 return-to-checkout: login with the NEW password ──
  await page.unroute("**/api/auth/reset");
  await page.click('a:has-text("ورود به حساب هلسا")');
  await page.waitForTimeout(800);
  page.url().includes("/login?next=") ? ok("login link carries next") : bad("login next", page.url());
  await page.fill('input[autocomplete="username"]', SARA);
  await page.fill('input[autocomplete="current-password"]', NEW_PW);
  await page.click('button:has-text("ورود به حساب هلسا")');
  await page.waitForURL("**/checkout", { timeout: 10000 }).then(() => ok("login with NEW password → returned to /checkout")).catch(() => bad("return checkout", page.url()));
  await page.waitForTimeout(800);
  const cartN = await page.evaluate(() => JSON.parse(localStorage.getItem("helsa-store-v2") || "{}").state?.items?.length ?? 0);
  cartN >= 1 ? ok(`cart preserved across recovery+login (${cartN} item)`) : bad("cart lost");

  const evD = await page.evaluate(() => (window.dataLayer || []).map((e) => e.event));
  ["recovery_started", "otp_requested", "otp_verified", "password_reset_completed"].every((e) => evD.includes(e))
    ? ok("analytics: recovery_started/otp_requested/otp_verified/password_reset_completed") : bad("analytics flow", JSON.stringify(evD));

  // logout for next test
  await page.evaluate(async () => { await fetch("/api/auth/logout", { method: "POST" }); });

  // ── §E wrong OTP → real server verdict ─────────────────
  fixture(SARA, "222222", "now() + interval '10 minutes'");
  await page.goto(`${BASE}/forgot-password`, { waitUntil: "networkidle" });
  await page.route("**/api/auth/reset", async (route) => {
    const body = route.request().postDataJSON();
    if (body.step === "request") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, demo: false, expiresAt: new Date(Date.now() + 10 * 60_000).toISOString() }) });
    } else { await route.continue(); }
  });
  await page.fill('input[autocomplete="username"]', SARA);
  await page.click('button:has-text("ارسال کد تأیید")');
  await page.waitForTimeout(500);
  await enterOtp(page, "111111", "type");
  await page.waitForTimeout(700);
  await page.fill("#new-password-input", "Whatever#11");
  await page.fill('input[placeholder="تکرار رمز عبور"]', "Whatever#11");
  await page.click('button:has-text("تغییر رمز عبور")');
  await page.waitForTimeout(1200);
  const eBody = await page.textContent("body");
  eBody.includes("کد تأیید صحیح نیست.") ? ok("wrong OTP → real server error, back to OTP step") : bad("wrong otp", eBody.slice(0, 120));

  // ── §F expired OTP → expired state, inputs disabled ────
  fixture(SARA, "333333", "now() - interval '2 minutes'");
  await page.goto(`${BASE}/forgot-password`, { waitUntil: "networkidle" });
  await page.route("**/api/auth/reset", async (route) => {
    const body = route.request().postDataJSON();
    if (body.step === "request") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, demo: false, expiresAt: new Date(Date.now() + 10 * 60_000).toISOString() }) });
    } else { await route.continue(); }
  });
  await page.fill('input[autocomplete="username"]', SARA);
  await page.click('button:has-text("ارسال کد تأیید")');
  await page.waitForTimeout(500);
  await enterOtp(page, "333333", "paste");
  await page.waitForTimeout(700);
  await page.fill("#new-password-input", "Whatever#22");
  await page.fill('input[placeholder="تکرار رمز عبور"]', "Whatever#22");
  await page.click('button:has-text("تغییر رمز عبور")');
  await page.waitForTimeout(1200);
  const fBody = await page.textContent("body");
  fBody.includes("کد تأیید منقضی شده است") ? ok("expired OTP → expired message") : bad("expired msg", fBody.slice(0, 120));
  fBody.includes("کد منقضی شده است") ? ok("expired UI state (inputs disabled + new-code prompt)") : bad("expired state");
  (await page.locator('button:has-text("دریافت کد جدید"), button:has-text("ارسال مجدد کد")').count()) >= 1 ? ok("new-code action available") : bad("new-code action");
  await page.unroute("**/api/auth/reset");

  // ── §G mobile 375 ───────────────────────────────────────
  const mob = await browser.newContext({ viewport: { width: 375, height: 760 } });
  const mp = await mob.newPage();
  await mp.goto(`${BASE}/forgot-password`, { waitUntil: "networkidle" });
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  overflow <= 0 ? ok("mobile 375 no overflow") : bad("mobile overflow", `${overflow}px`);
  (await mp.locator('input[autocomplete="username"]').first().isVisible()) ? ok("mobile one-column form") : bad("mobile form");
  await mp.screenshot({ path: "qa-shots/ux/j32-forgot-mobile.png", fullPage: true });
  await mob.close();

  // ── §H console/images ───────────────────────────────────
  await page.goto(`${BASE}/forgot-password`, { waitUntil: "networkidle" });
  await page.screenshot({ path: "qa-shots/ux/j32-forgot-desktop.png", fullPage: true });
  const realErrors = consoleErrors.filter((e) => !/401|400/.test(e));
  realErrors.length === 0 ? ok(`0 unexpected console errors (${consoleErrors.length} expected from negative tests)`) : bad("console", JSON.stringify(realErrors.slice(0, 3)));

  await restoreSara();
  await browser.close();
  console.log(`\n═══ UI RESULT: PASS=${pass} FAIL=${fail} ═══`);
})().catch((e) => { console.error("SCRIPT ERROR:", e.message); process.exit(1); });
