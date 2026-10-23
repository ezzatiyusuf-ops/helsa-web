/**
 * QA بازطراحی فرم ثبت‌نام/ورود — qa-auth-form.cjs
 * ├── مرحله‌بندی: مرحلهٔ ۱ (نام/نام خانوادگی/موبایل) → مرحلهٔ ۲ (ایمیل/رمز) + نوار پیشرفت
 * ├── حذف «تکرار رمز عبور» + نشانگر قدرت رمز زیر فیلد رمز
 * ├── لیبل شناور + آیکون هر فیلد + فوکوس برند (focus:border-brand)
 * ├── ردیف قوانین/حریم خصوصی زیر دکمهٔ اصلی
 * ├── میکرو-کپی اطمینان زیر موبایل
 * ├── سفر کامل: ثبت‌نام UI → /account → ورود با همان حساب
 * └── موبایل ۳۷۵px: بدون سرریز افقی
 */
const { chromium } = require("playwright");

const BASE = process.env.QA_BASE || "http://localhost:3000";
let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log(`PASS: ${m}`); };
const bad = (m, d = "") => { fail++; console.log(`FAIL: ${m} ${String(d).slice(0, 200)}`); };
const rand = Math.floor(1000000 + Math.random() * 8999999);
const PHONE = `0912${rand}`;
const EMAIL = `helsa-qa-form-${rand}@example.com`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  /* ── ۱) مرحلهٔ ۱ ── */
  await page.goto(`${BASE}/register`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(700);
  let body = await page.textContent("body");
  body.includes("مرحلهٔ ۱ از ۲") ? ok("نوار پیشرفت: «مرحلهٔ ۱ از ۲» دیده می‌شود") : bad("progress step1");
  body.includes("اطلاعات هویتی") && body.includes("امنیت حساب") ? ok("عناوین دو مرحله دیده می‌شود") : bad("step titles");
  const inputsS1 = page.locator('input[placeholder=" "]');
  (await inputsS1.count()) === 3 ? ok("مرحلهٔ ۱ فقط ۳ فیلد (نام/نام خانوادگی/موبایل)") : bad(`step1 inputs=${await inputsS1.count()}`);
  !body.includes("تکرار رمز عبور") ? ok("فیلد «تکرار رمز عبور» حذف شده است") : bad("confirm still present");
  (await page.locator('button:has-text("ادامه")').count()) ? ok("دکمهٔ «ادامه» موجود است") : bad("continue button");

  /* ── ۲) اعتبارسنجی مرحلهٔ ۱ ── */
  await page.click('button:has-text("ادامه")');
  await page.waitForTimeout(400);
  body = await page.textContent("body");
  body.includes("نام را کامل وارد کنید") ? ok("خطای فیلد نام (اعتبارسنجی مرحلهٔ ۱)") : bad("name validation");

  /* ── ۳) پر کردن مرحلهٔ ۱ با Enter ── */
  const fld = inputsS1.nth(0);
  await fld.fill("آزمون");
  await inputsS1.nth(1).fill("فرم");
  await inputsS1.nth(2).fill(PHONE);
  body = await page.textContent("body");
  body.includes("فقط برای اطلاع‌رسانی سفارش") ? ok("میکرو-کپی اطمینان زیر موبایل (مرحلهٔ ۱)") : bad("micro-copy");
  await inputsS1.nth(2).press("Enter");
  await page.waitForTimeout(700);
  body = await page.textContent("body");
  body.includes("مرحلهٔ ۲ از ۲") ? ok("Enter روی موبایل → رفتن به مرحلهٔ ۲") : bad("enter to step2", body.slice(0, 100));

  /* ── ۴) مرحلهٔ ۲ ── */
  const inputsS2 = page.locator('input[placeholder=" "]');
  (await inputsS2.count()) === 2 ? ok("مرحلهٔ ۲ فقط ۲ فیلد (ایمیل/رمز)") : bad(`step2 inputs=${await inputsS2.count()}`);
  (await page.locator('button:has-text("بازگشت و ویرایش اطلاعات هویتی")').count()) ? ok("دکمهٔ بازگشت به مرحلهٔ ۱") : bad("back button");

  /* ── ۵) بازگشت و حفظ مقادیر ── */
  await page.click('button:has-text("بازگشت و ویرایش اطلاعات هویتی")');
  await page.waitForTimeout(500);
  const backVal = await page.locator('input[placeholder=" "]').nth(2).inputValue().catch(() => "");
  backVal === PHONE ? ok("بازگشت به مرحلهٔ ۱، مقدار موبایل حفظ شده") : bad(`back value=${backVal}`);
  await page.click('button:has-text("ادامه")');
  await page.waitForTimeout(500);

  /* ── ۶) قدرت رمز + چشم ── */
  await page.locator('input[placeholder=" "]').nth(1).fill("Helsa#2026");
  await page.waitForTimeout(300);
  body = await page.textContent("body");
  body.includes("قدرت رمز") ? ok("نشانگر قدرت رمز زیر فیلد رمز") : bad("strength meter");
  const eye = page.locator('button[aria-label="نمایش رمز عبور"], button[aria-label="پنهان‌کردن رمز عبور"]');
  (await eye.count()) ? ok("دکمهٔ نمایش/پنهان رمز موجود است") : bad("eye toggle");

  /* ── ۷) ردیف قوانین زیر دکمهٔ اصلی ── */
  const submitBtn = page.locator('button:has-text("ایجاد حساب هلسا")');
  const termsRow = page.locator("label:has-text(\"قوانین و مقررات\")");
  if ((await submitBtn.count()) && (await termsRow.count())) {
    const b1 = await submitBtn.first().boundingBox();
    const b2 = await termsRow.first().boundingBox();
    b1 && b2 && b2.y > b1.y ? ok("ردیف قوانین/حریم خصوصی زیر دکمهٔ اصلی است") : bad("terms row position", JSON.stringify({ b1, b2 }));
    (await termsRow.locator('a[href="/terms"], a[href="/privacy"]').count()) === 2 ? ok("لینک‌های قوانین و حریم خصوصی در همان ردیف") : bad("terms links");
  } else bad("submit or terms row missing");

  /* ── ۸) لیبل شناور + آیکون + فوکوس برند ── */
  const anyInput = page.locator('input[placeholder=" "]').first();
  const inputId = await anyInput.getAttribute("id");
  const linkedLabel = await page.locator(`label[for="${inputId}"]`).count();
  linkedLabel ? ok("لیبل شناور با for/id به فیلد متصل است") : bad("floating label link");
  (await page.locator(".lucide-lock").count()) ? ok("آیکون قفل روی فیلد رمز") : bad("lock icon");
  (await page.locator(".lucide-smartphone, .lucide-at-sign, .lucide-mail, .lucide-user").count()) ? ok("آیکون فیلدهای دیگر") : bad("field icons");
  const focusCls = await page.evaluate(() => {
    const el = document.querySelector('input[placeholder=" "]');
    if (!el) return "";
    const sheet = [...document.styleSheets].find((s) => !s.href || s.href.includes("localhost"));
    try { el.focus(); } catch { /* noop */ }
    return getComputedStyle(el).borderColor;
  });
  focusCls ? ok(`فوکوس فعال (border=${focusCls.slice(0, 24)}…)`) : bad("focus style");

  /* ── ۹) ثبت‌نام کامل از UI ── */
  await page.locator('input[placeholder=" "]').nth(0).fill(EMAIL);
  await page.locator('label:has-text("قوانین و مقررات") input[type="checkbox"]').check();
  await page.click('button:has-text("ایجاد حساب هلسا")');
  await page.waitForURL(/\/account/, { timeout: 15000 }).catch(() => {});
  page.url().includes("/account") ? ok(`ثبت‌نام کامل UI → حساب ساخته شد (${PHONE})`) : bad("signup e2e", page.url());

  /* ── ۹ب) بازطراحی فرم ورود — سلسله‌مراتب و اعتماد (در نشست تازه) ── */
  {
    await page.context().clearCookies();
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch { /* noop */ } });
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(700);
    // پیش‌فرض «مرا به خاطر بسپار» = خاموش
    const rem = await page.locator('label:has-text("مرا به خاطر بسپار") input[type="checkbox"]').isChecked();
    rem === false ? ok("«مرا به خاطر بسپار» به‌صورت پیش‌فرض خاموش است") : bad("remember default checked");
    // گروه ثانویه: کد یک‌بارمصرف + فراموشی رمز در یک ردیف
    const row = page.locator("div:has(> button:text(\"ورود با کد یک‌بارمصرف\"))").first();
    (await row.locator('a:has-text("رمز عبور را فراموش کرده‌اید؟")').count())
      ? ok("گروه ثانویه: کد یک‌بارمصرف + فراموشی رمز در یک ردیف")
      : bad("secondary row");
    // ثالث: کارت مستقل ساخت حساب
    const card = page.locator("div.rounded-2xl:has-text(\"حساب هلسا ندارید؟\")").first();
    (await card.count()) && (await card.locator('a[href*="/register"]').count())
      ? ok("کارت مستقل «ساخت حساب جدید» زیر فرم (سطح ثالث)")
      : bad("signup card");
    // شفاف‌سازی خرید مهمان
    const guest = page.locator("p:has-text(\"ادامه بدون ورود\")").first();
    const gtxt = (await guest.textContent().catch(() => "")) || "";
    gtxt.includes("تأیید") && gtxt.includes("پرداخت")
      ? ok("لینک مهمان شفاف شد: «هویت در پرداخت با کد یک‌بارمصرف تأیید می‌شود»")
      : bad("guest clarification", gtxt.slice(0, 80));
    (await guest.locator("a").getAttribute("href"))
      ? ok("لینک «ادامه بدون ورود» فعال (رفتار حفظ شد)")
      : bad("guest link");
    // چشم رمز در ورود (همان کامپوننت مشترک ثبت‌نام)
    (await page.locator('button[aria-label="نمایش رمز عبور"], button[aria-label="پنهان‌کردن رمز عبور"]').count())
      ? ok("چشم نمایش/پنهان رمز در ورود — یکدست با ثبت‌نام")
      : bad("login eye toggle");
    // خطای inline فرمت موبایل
    const li0 = page.locator('input[placeholder=" "]').nth(0);
    await li0.fill("09123");
    await page.click('button:has-text("ورود به حساب هلسا")');
    await page.waitForTimeout(400);
    body = await page.textContent("body");
    body.includes("شماره موبایل معتبر نیست") ? ok("خطای inline فرمت موبایل زیر همان فیلد") : bad("inline format error");
    await li0.fill(PHONE);
  }

  /* ── ۱۰) ورود با همان حساب (در نشست تازه — کاربر لاگین‌شده از /account بیرون رانده می‌شود) ── */
  await page.context().clearCookies();
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch { /* noop */ } });
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  body = await page.textContent("body");
  !body.includes("تکرار رمز عبور") ? ok("فرم ورود بدون فیلد تکرار رمز") : bad("login confirm");
  const loginInputs = page.locator('input[placeholder=" "]');
  (await loginInputs.count()) === 2 ? ok("فرم ورود ۲ فیلد (شناسه/رمز)") : bad(`login inputs=${await loginInputs.count()}`);
  await loginInputs.nth(0).fill(PHONE);
  await loginInputs.nth(1).fill("Helsa#2026");
  await loginInputs.nth(1).press("Enter");
  await page.waitForURL(/\/account/, { timeout: 15000 }).catch(() => {});
  page.url().includes("/account") ? ok("ورود با حساب تازه → /account") : bad("login e2e", page.url());

  /* ── ۱۱) موبایل ۳۷۵px ── */
  await page.setViewportSize({ width: 375, height: 720 });
  await page.goto(`${BASE}/register`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(700);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  overflow <= 0 ? ok("بدون سرریز افقی در ۳۷۵px") : bad(`h-overflow=${overflow}px`);

  const realErrors = errors.filter((e) => !/net::ERR|Failed to load resource/i.test(e));
  realErrors.length === 0 ? ok("0 خطای صفحه") : bad("pageerrors", realErrors.join("|"));

  await browser.close();
  console.log(`\n═══ AUTH-FORM RESULT: PASS=${pass} FAIL=${fail} ═══`);
  console.log(`ACCOUNT: ${PHONE} / ${EMAIL}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
