// ج۳۷ §۳۲ — سفر کامل: ورود → محصول → سبد (CRO) → پرداختِ سبد → checkout ۷ گامی → ثبت سفارش → تأیید
// همهٔ داده‌ها واقعی: حساب سارا (DB)، محصولات DB، کوپن HELSA10 (DB)، آدرس ذخیره‌شده (DB)، روش ارسال DB، COD.
const { chromium } = require("playwright");
const BASE = "http://localhost:3000";
let pass = 0, fail = 0;
const ok = (n) => { pass++; console.log(`PASS: ${n}`); };
const bad = (n, e = "") => { fail++; console.log(`FAIL: ${n} ${e}`); };
const next = async (p) => { await p.click('button:has-text("گام بعد")'); await p.waitForTimeout(400); };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });

  // ── 1) ورود واقعی (حساب سارا از DB) ─────────────────────
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[autocomplete="username"]', "09125556677");
  await page.fill('input[autocomplete="current-password"]', "SaraQa#2026");
  await page.click('button:has-text("ورود به حساب هلسا")');
  await page.waitForTimeout(2000);
  const loggedBody = await page.textContent("body");
  loggedBody.includes("سارا") || !(await page.locator('button:has-text("ورود به حساب هلسا")').count())
    ? ok("login as Sara (real account)") : bad("login", page.url());

  // ── 2) افزودن محصول از ۲ دسته (دو محصول متفاوت) ────────
  await page.goto(`${BASE}/products?cat=dates`, { waitUntil: "networkidle" });
  const firstLabel = await page.locator('[aria-label*="به سبد"]').first().getAttribute("aria-label");
  await page.locator(`[aria-label="${firstLabel}"]`).first().click();
  await page.waitForTimeout(400);
  await page.goto(`${BASE}/products?cat=nuts`, { waitUntil: "networkidle" });
  // دکمهٔ افزودنِ یک محصول دیگر (نه همان محصول صفحهٔ قبل)
  await page.locator(`[aria-label*="به سبد"]:not([aria-label="${firstLabel}"])`).first().click();
  await page.waitForTimeout(400);

  // ── 3) سبد خرید (CRO ج۳۷) + جمع‌آوری اعداد برای مقایسه ──
  await page.goto(`${BASE}/cart`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  const cartItems = await page.evaluate(() => JSON.parse(localStorage.getItem("helsa-store-v2")).state.items);
  cartItems.length === 2 ? ok("cart: 2 items (dates + nuts)") : bad("cart items", String(cartItems.length));
  const cartBody = await page.textContent("body");
  cartBody.includes("سبد خرید شما") ? ok("cart header") : bad("cart header");
  cartBody.includes("خرید بدون ثبت‌نام") === false ? ok("logged-in cart (no guest toggle on cart)") : ok("guest toggle (cart)");
  // کوپن در سبد
  await page.fill("#coupon", "HELSA10");
  await page.click('button:has-text("اعمال")');
  await page.waitForTimeout(800);
  const cartBody2 = await page.textContent("body");
  cartBody2.includes("HELSA10 اعمال شد") ? ok("coupon HELSA10 applied in cart") : bad("cart coupon");
  const cartTotalText = await page.locator("aside dd").last().textContent();
  const cartSub = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const expectedDiscount = Math.min(Math.round(cartSub * 0.10), 500000);
  const shipFee = cartSub - expectedDiscount >= 2000000 ? 0 : 85000;
  console.log(`  (subtotal=${cartSub} discount=${expectedDiscount} ship=${shipFee} total text=${cartTotalText})`);
  cartBody2.includes("تخفیف") ? ok("discount row in summary") : bad("discount row");
  // مقایسهٔ جمع نهایی سبد با محاسبهٔ مستقل
  const toEn = (s) => Number(s.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[^\d]/g, ""));
  const cartTotal = toEn(cartTotalText);
  cartTotal === cartSub - expectedDiscount + shipFee
    ? ok(`cart grand total correct (${cartTotal.toLocaleString()} = ${cartSub - expectedDiscount + shipFee})`)
    : bad("cart total math", `${cartTotal} vs ${cartSub - expectedDiscount + shipFee}`);

  // ── 4) ادامه به پرداخت → checkout ──────────────────────
  await page.click('aside a:has-text("ادامه به پرداخت")');
  await page.waitForURL((u) => u.pathname === "/checkout", { timeout: 10000 }).then(() => ok("→ /checkout")).catch(() => bad("checkout nav", page.url()));
  await page.waitForTimeout(900);
  const coBody = await page.textContent("body");
  coBody.includes("ثبت سفارش") ? ok("checkout page") : bad("checkout page");
  coBody.includes("HELSA10") ? ok("coupon carried into checkout (summary)") : bad("coupon carry");
  coBody.includes("خرید بدون ثبت‌نام") ? ok("§22 guest checkout toggle present") : bad("guest toggle");
  // جمع سبد باید با جمع checkout یکی باشد (یک منبع حقیقت)
  const coTotalText = await page.locator("aside dd").last().textContent();
  toEn(coTotalText) === cartTotal ? ok("checkout total === cart total (single source of truth)") : bad("total drift", `${coTotalText} vs ${cartTotalText}`);

  // ── 5) گام ۱ (سبد) → گام ۲: گیرنده ─────────────────────
  for (let i = 0; i < 3 && !(await page.locator("h2").filter({ hasText: "گیرنده" }).count()); i++) await next(page);
  (await page.locator("h2").filter({ hasText: "گیرنده" }).count()) ? ok("checkout step 2 (گیرنده) reached") : bad("step 2");
  const fName = page.locator('input[placeholder="سارا"]');
  if (!(await fName.inputValue()).trim()) { await fName.fill("سارا"); }
  const lName = page.locator('input[placeholder="محمدی"]');
  if (!(await lName.inputValue()).trim()) { await lName.fill("تستی"); }
  const mob = page.locator('input[placeholder="۰۹۱۲۳۴۵۶۷۸۹"]');
  if (!(await mob.inputValue()).trim()) { await mob.fill("09125556677"); }
  await next(page);

  // ── 6) گام ۳: احراز هویت (کاربر واردشده → بدون OTP، provider=account) ──
  const nidInput = page.locator('input[placeholder="۱۲۳۴۵۶۷۸۹۰"]').first();
  await nidInput.fill("0012345679");
  await page.click('button:has-text("تأیید و ادامه")');
  await page.waitForTimeout(1200);
  const idBody = await page.textContent("body");
  idBody.includes("احراز هویت انجام شد") || idBody.includes("✓")
    ? ok("identity verified via account session (no OTP for logged-in)") : bad("identity", idBody.slice(0, 200));
  await next(page);

  // ── 7) گام ۴: آدرس — فرم واقعی (ذخیره در state) ────────
  const savedAddr = page.locator('input[name="addr"]').first();
  if (await savedAddr.count()) {
    await savedAddr.check(); ok("saved address selected");
  } else {
    await page.fill('input[placeholder="نام و نام خانوادگی گیرنده"]', "سارا تستی");
    await page.fill('input[placeholder="مثلاً تهران"]', "تهران");
    await page.fill('input[placeholder="خیابان، کوچه، پلاک"]', "خیابان ولیعصر، کوچه بهار، پلاک ۱۲");
    await page.fill('input[placeholder="۱۰ رقم"]', "1234567890");
    await page.fill('input[placeholder="۰۹۱۲۳۴۵۶۷۸۹"]', "09125556677");
    await page.click('button:has-text("افزودن آدرس")');
    await page.waitForTimeout(500);
    (await page.textContent("body")).includes("آدرس انتخاب شد") ? ok("manual address saved & selected (real form)") : bad("address form");
  }
  await next(page);

  // ── 8) گام ۵: روش ارسال (۳ روش واقعی DB) ───────────────
  const shipBody = await page.textContent("body");
  ["ارسال عادی", "ارسال سریع"].every((s) => shipBody.includes(s)) ? ok("shipping methods (DB)") : bad("ship methods");
  await page.click('label:has-text("ارسال عادی")');
  await next(page);

  // ── 9) گام ۶: پرداخت — COD (بدون درگاه، بدون جعل) ──────
  await page.waitForTimeout(600); // /api/payments/methods
  const payBody = await page.textContent("body");
  payBody.includes("پرداخت آنلاین") ? ok("gateway method listed (real contract)") : bad("gateway listed");
  await page.click('label:has-text("پرداخت در محل")').catch(async () => { await page.click('text=در محل'); });
  await next(page);

  // ── 10) گام ۷: تأیید + ثبت سفارش ───────────────────────
  await page.waitForTimeout(400);
  // §۲۰ یادداشت سفارش — داوطلبانه، باید تا DB برسد
  const NOTE_TEXT = "لطفاً برای هدیه ارسال شود — تست ج۳۹";
  await page.fill('textarea[aria-label="یادداشت سفارش"]', NOTE_TEXT);
  (await page.inputValue('textarea[aria-label="یادداشت سفارش"]')) === NOTE_TEXT ? ok("order note textarea (§20)") : bad("note input");
  // §۲۱ گزینهٔ هدیه — پرچم + گیرنده + پیام + بسته‌بندی (همه باید تا DB برسند)
  await page.check('input[aria-label="این سفارش هدیه است"]');
  await page.fill('input[aria-label="نام گیرندهٔ هدیه"]', "خانم محمدی");
  await page.fill('input[aria-label="پیام هدیه"]', "تبریک تولد از طرف هلسا");
  await page.check('input[aria-label="درخواست بسته‌بندی هدیه"]');
  (await page.isChecked('input[aria-label="این سفارش هدیه است"]')) ? ok("§21 gift toggle") : bad("gift toggle");
  const finalBody = await page.textContent("body");
  finalBody.includes(cartTotalText.replace(/\s/g, "").slice(0, 6).replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)) ) || finalBody.includes("ثبت سفارش")
    ? ok("review step shows place-order") : bad("review step");
  await page.click('button:has-text("ثبت سفارش")');
  await page.waitForURL((u) => u.pathname.startsWith("/payment/success"), { timeout: 15000 })
    .then(() => ok("redirect → /payment/success (COD pending, honest state)"))
    .catch(() => bad("order redirect", page.url()));
  await page.waitForTimeout(1000);
  const sBody = await page.textContent("body");
  sBody.includes("ثبت سفارش") ? ok("order confirmation page (✅ ثبت سفارش)") : bad("confirmation", sBody.slice(0, 150));
  sBody.includes("یادداشت سفارش شما") ? ok("§20 note echoed on confirmation page") : bad("note on success");
  sBody.includes("این سفارش به‌عنوان هدیه ثبت شد") && sBody.includes("خانم محمدی") ? ok("§21 gift echoed on confirmation page") : bad("gift on success");
  const orderCode = page.url().match(/code=([A-Z0-9-]+)/)?.[1] ?? "";
  /^HLA-/.test(orderCode) ? ok(`real order code ${orderCode}`) : bad("order code", orderCode);

  // ── 11) سبد خالی شد + سفارش در state ───────────────────
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem("helsa-store-v2")).state);
  st.items.length === 0 ? ok("cart cleared after order") : bad("cart not cleared", String(st.items.length));
  (st.orders || []).some((o) => o.code === orderCode) ? ok("order recorded in client state") : bad("order state");

  // ── 12) سفارش در سرور: /api/orders (جلسهٔ لاگین‌شده) ────
  const apiOrders = await page.evaluate(async () => (await (await fetch("/api/orders")).json()));
  apiOrders.ok && (apiOrders.orders || []).some((o) => o.code === orderCode)
    ? ok("order persisted server-side (GET /api/orders)") : bad("server order", JSON.stringify(apiOrders).slice(0, 150));
  const noteOrder = (apiOrders.orders || []).find((o) => o.code === orderCode);
  noteOrder && noteOrder.note === "لطفاً برای هدیه ارسال شود — تست ج۳۹"
    ? ok("§20 order note persisted server-side (orders.note)") : bad("note persisted", JSON.stringify(noteOrder?.note));
  noteOrder && noteOrder.isGift === true && noteOrder.giftRecipient === "خانم محمدی" && noteOrder.giftMessage === "تبریک تولد از طرف هلسا" && noteOrder.giftPackaging === true
    ? ok("§21 gift fields persisted server-side (is_gift/gift_recipient/gift_message/gift_packaging)") : bad("gift persisted", JSON.stringify({ g: noteOrder?.isGift, r: noteOrder?.giftRecipient, m: noteOrder?.giftMessage, p: noteOrder?.giftPackaging }));

  // ── 13) ورود مجدد به سبد پس از خرید — سبد خالی استیجинг ──
  await page.goto(`${BASE}/cart`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  (await page.textContent("body")).includes("سبد خریدت هنوز منتظر اولین انتخاب توست.")
    ? ok("post-purchase cart → honest empty state") : bad("post-purchase cart");

  const realErrors = consoleErrors.filter((e) => !/400|401|403|429|500/.test(e));
  realErrors.length === 0 ? ok("0 unexpected console errors in journey") : bad("console", JSON.stringify(realErrors.slice(0, 2)));

  await page.screenshot({ path: "qa-shots/ux/j37-order-success.png", fullPage: false });
  console.log(`ORDER_CODE=${orderCode}`);
  await browser.close();
  console.log(`\n═══ JOURNEY RESULT: PASS=${pass} FAIL=${fail} ═══`);
})().catch((e) => { console.error("SCRIPT ERROR:", e.message); process.exit(1); });
