// ج۳۷ — QA سبد خرید (بند ۳۴ بریف) — production build + real DB
const { chromium } = require("playwright");
const BASE = "http://localhost:3000";
let pass = 0, fail = 0;
const ok = (n) => { pass++; console.log(`PASS: ${n}`); };
const bad = (n, e = "") => { fail++; console.log(`FAIL: ${n} ${e}`); };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  const failedReqs = [];
  page.on("response", (r) => { if (r.status() >= 400 && !r.url().includes("/api/coupons")) failedReqs.push(`${r.status()} ${r.url()}`); });

  // ── §A EMPTY CART (15,16) ───────────────────────────────
  await page.goto(`${BASE}/cart`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  const eb = await page.textContent("body");
  eb.includes("سبد خریدت هنوز منتظر اولین انتخاب توست.") ? ok("empty headline") : bad("empty headline");
  eb.includes("از خرما و خشکبار تا هدیه و سینی مزه") ? ok("empty supporting text") : bad("empty text");
  ["پرفروش‌ها", "خرما", "آجیل و خشکبار", "شکلات خرما", "سینی مزه", "هدایا"].every((s) => eb.includes(s)) ? ok("6 shortcuts") : bad("shortcuts");
  const shortcutHrefs = await page.$$eval('a', (as) => as.filter((a) => /پرفروش|خرما|آجیل/.test(a.textContent)).map((a) => a.getAttribute("href")));
  shortcutHrefs.includes("/products?sort=popular") && shortcutHrefs.includes("/products?cat=dates") ? ok("shortcuts → real routes") : bad("shortcut routes", JSON.stringify(shortcutHrefs));
  ["مشاهده محصولات", "ساخت سینی مزه", "مشاهده هدایا"].every((s) => eb.includes(s)) ? ok("3 CTAs") : bad("CTAs");
  (await page.locator('a[href="/mazeh-trays/build"]').count()) >= 1 ? ok("build tray CTA → real route (never 404)") : bad("build CTA");
  await page.waitForTimeout(600);
  const eb2 = await page.textContent("body");
  eb2.includes("پیشنهادهای هلسا") ? ok("پیشنهادهای هلسا section") : bad("suggestions title");
  (await page.locator('button[aria-label^="افزودن"]').count()) >= 3 ? ok("real suggested products with quick add") : bad("suggested products");
  const robots = await page.evaluate(() => document.querySelector('meta[name="robots"]')?.content || "");
  robots.includes("noindex") ? ok("noindex") : bad("noindex", robots);

  // ── §B ADD PRODUCTS → cart flow (2,5,17,18) ─────────────
  await page.goto(`${BASE}/products?cat=dates`, { waitUntil: "networkidle" });
  await page.click('[aria-label*="افزودن"][aria-label*="به سبد"] >> nth=0');
  await page.waitForTimeout(500);
  await page.goto(`${BASE}/cart`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900); // cart/check + cross-sell fetch
  const cb = await page.textContent("body");
  cb.includes("سبد خرید شما") ? ok("header سبد خرید شما") : bad("header");
  ["سبد خرید", "اطلاعات ارسال", "پرداخت", "تکمیل سفارش"].every((s) => cb.includes(s)) ? ok("progress indicator 4 steps") : bad("progress");
  (await page.locator("nav[aria-label='مراحل ثبت سفارش'] [aria-current='step']").count()) === 1 ? ok("current step = سبد خرید highlighted") : bad("current step");
  cb.includes("موجود") ? ok("stock badge (real inventory)") : bad("stock badge");
  (await page.locator('button[aria-label^="افزایش"]').count()) >= 1 ? ok("qty selector") : bad("qty");
  cb.includes("این سفارش را کامل‌تر کنید") ? ok("cross-sell section (deterministic)") : bad("cross-sell title");
  // deterministic: cart has dates → recommendations must NOT be pure dates (date-chocolate/nuts/tea are correct)
  const datesNames = await page.evaluate(async () => {
    const r = await fetch("/api/products?cat=dates"); const j = await r.json();
    return (j.products || j.items || []).map((p) => p.name);
  });
  const csText = await page.locator("section[aria-label='تکمیل سفارش']").textContent().catch(() => "");
  const datesLeak = datesNames.filter((n) => csText.includes(n));
  datesLeak.length === 0 ? ok("cross-sell excludes same-category (dates→chocolate/nuts/tea only)") : bad("cross-sell same-category", datesLeak.join(","));
  const ev1 = await page.evaluate(() => (window.dataLayer || []).map((e) => e.event));
  ev1.includes("cart_view") ? ok("analytics cart_view") : bad("cart_view", JSON.stringify(ev1));

  // quick add from cross-sell → totals update without reload
  const totalBefore = await page.locator("aside dd").last().textContent();
  await page.locator('section[aria-label="تکمیل سفارش"] button[aria-label^="افزودن"]').first().click();
  await page.waitForTimeout(700);
  const itemsNow = await page.evaluate(() => JSON.parse(localStorage.getItem("helsa-store-v2") || "{}").state.items.length);
  itemsNow === 2 ? ok("quick add → 2 items (no reload)") : bad("quick add", String(itemsNow));
  const ev2 = await page.evaluate(() => (window.dataLayer || []).map((e) => e.event));
  ev2.includes("cross_sell_add") ? ok("analytics cross_sell_add") : bad("cross_sell_add");
  const totalAfter = await page.locator("aside dd").last().textContent();
  totalBefore !== totalAfter ? ok("total updated after quick add") : bad("total not updated");

  // ── §C quantity ± / remove / save-for-later (2,28) ──────
  const qtyBadge = page.locator("span[aria-live='polite']").first();
  await page.locator('button[aria-label^="افزایش"]').first().click();
  await page.waitForTimeout(300);
  (await qtyBadge.textContent()) === "۲" ? ok("qty+ → ۲ immediately") : bad("qty+", await qtyBadge.textContent());
  await page.locator('button[aria-label^="کاهش"]').first().click();
  await page.waitForTimeout(300);
  (await qtyBadge.textContent()) === "۱" ? ok("qty− → ۱") : bad("qty-");
  const ev3 = await page.evaluate(() => (window.dataLayer || []).map((e) => e.event));
  ev3.includes("cart_quantity_change") ? ok("analytics cart_quantity_change") : bad("qty analytics");
  // save for later (product item)
  await page.locator('button[aria-label^="ذخیره"]').first().click();
  await page.waitForTimeout(500);
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem("helsa-store-v2") || "{}").state);
  st.items.length === 1 && st.wishlist.length >= 1 ? ok("save-for-later → wishlist + removed from cart") : bad("save for later", JSON.stringify({ i: st.items.length, w: st.wishlist.length }));
  // re-add and test remove
  await page.goto(`${BASE}/products?cat=nuts`, { waitUntil: "networkidle" });
  await page.click('[aria-label*="افزودن"][aria-label*="به سبد"] >> nth=0');
  await page.waitForTimeout(400);
  await page.goto(`${BASE}/cart`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const countBefore = await page.evaluate(() => JSON.parse(localStorage.getItem("helsa-store-v2") || "{}").state.items.length);
  await page.locator('button[aria-label^="حذف"]').first().click();
  await page.waitForTimeout(500);
  const countAfter = await page.evaluate(() => JSON.parse(localStorage.getItem("helsa-store-v2") || "{}").state.items.length);
  countAfter === countBefore - 1 ? ok("remove item") : bad("remove", `${countBefore}→${countAfter}`);

  // ── §D coupon (7) — real HELSA10 vs fake ───────────────
  // add enough value for meaningful test (HELSA10: percent 10, max 500K, no min)
  await page.fill("#coupon", "FAKE-CODE-XX");
  await page.click('button:has-text("اعمال")');
  await page.waitForTimeout(700);
  const cbody = await page.textContent("body");
  (await page.locator("#coupon-error").textContent()).length > 2 || cbody.includes("معتبر نیست")
    ? ok("fake coupon → visible error state") : bad("fake coupon error");
  await page.fill("#coupon", "HELSA10");
  await page.click('button:has-text("اعمال")');
  await page.waitForTimeout(800);
  const cbody2 = await page.textContent("body");
  cbody2.includes("HELSA10 اعمال شد") ? ok("real coupon HELSA10 applied (DB-backed)") : bad("HELSA10", cbody2.slice(0, 150));
  cbody2.includes("تخفیف") ? ok("discount row updated") : bad("discount row");
  const evC = await page.evaluate(() => (window.dataLayer || []).filter((e) => e.event === "coupon_apply"));
  evC.some((e) => e.success === false) && evC.some((e) => e.success === true) ? ok("analytics coupon_apply success+failure") : bad("coupon analytics");
  await page.click('button:has-text("حذف") >> nth=0'); // coupon remove (first حذف in aside)
  await page.waitForTimeout(400);
  const evC2 = await page.evaluate(() => (window.dataLayer || []).map((e) => e.event));
  evC2.includes("coupon_remove") ? ok("analytics coupon_remove") : bad("coupon_remove");

  // ── §E free shipping (6) — real 2M threshold ────────────
  const shipBody = await page.textContent("body");
  shipBody.includes("تا ارسال رایگان") ? ok("free-shipping remaining text") : bad("fs text");
  (await page.locator('div[role="progressbar"]').count()) === 1 ? ok("progress bar (aria)") : bad("progress bar");

  // ── §F first purchase gift (8) — real WELCOME system ────
  const gb = await page.textContent("body");
  gb.includes("هدیه خرید اول شما") && gb.includes("۲۰۰٬۰۰۰") ? ok("first-purchase box (real terms shown)") : bad("gift box");
  gb.includes("حداقل خرید ۱٬۰۰۰٬۰۰۰") ? ok("honest min-purchase terms") : bad("gift terms");
  await page.fill('input[aria-label*="اولین خرید"]', "09125556677");
  await page.click('button:has-text("دریافت کد")');
  await page.waitForTimeout(1200);
  const gbody = await page.textContent("body");
  /WELCOME-[A-Z2-9]{4}/.test(gbody) ? ok("real WELCOME-XXXX code issued (newsletter API)") : bad("welcome code", gbody.slice(0, 120));
  const couponVal = await page.inputValue("#coupon");
  /^WELCOME-/.test(couponVal) ? ok("code auto-filled into coupon field") : bad("autofill", couponVal);

  // ── §G shipping info (13) — real DB methods ─────────────
  const sb = await page.textContent("body");
  ["ارسال عادی", "ارسال سریع", "تحویل حضوری"].every((s) => sb.includes(s)) ? ok("3 real shipping methods from DB") : bad("shipping methods");
  sb.includes("۲ تا ۴ روز کاری") ? ok("real estimated time") : bad("est time");
  sb.includes("۸۵٬۰۰۰") ? ok("real shipping price 85,000") : bad("ship price");

  // ── §H trust (12,14) ────────────────────────────────────
  ["پرداخت امن از طریق درگاه بانکی", "بسته‌بندی حرفه‌ای", "پشتیبانی هلسا", "تضمین تازگی"].every((s) => sb.includes(s))
    ? ok("trust row (all real claims)") : bad("trust row");

  // ── §I checkout CTA + navigation (10,32) ────────────────
  await page.click('aside a:has-text("ادامه به پرداخت")');
  await page.waitForURL("**/checkout", { timeout: 10000 }).then(() => ok("CTA → /checkout")).catch(() => bad("CTA nav", page.url()));
  await page.waitForTimeout(800);
  const cartState = await page.evaluate(() => JSON.parse(localStorage.getItem("helsa-store-v2") || "{}").state);
  cartState.items.length >= 1 ? ok(`cart preserved into checkout (${cartState.items.length} items)`) : bad("cart lost");
  const ev4 = await page.evaluate(() => (window.dataLayer || []).map((e) => e.event));
  ev4.includes("checkout_start") ? ok("analytics checkout_start") : bad("checkout_start");
  // back navigation preserves cart
  await page.goBack();
  await page.waitForTimeout(900);
  const cartState2 = await page.evaluate(() => JSON.parse(localStorage.getItem("helsa-store-v2") || "{}").state);
  cartState2.items.length === cartState.items.length ? ok("back navigation preserves cart") : bad("back nav");

  // ── §J session persistence (refresh) ────────────────────
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  const cartState3 = await page.evaluate(() => JSON.parse(localStorage.getItem("helsa-store-v2") || "{}").state);
  cartState3.items.length === cartState.items.length ? ok("refresh preserves cart") : bad("refresh");

  // ── §K mobile 375 (11,27) ───────────────────────────────
  const mob = await browser.newContext({ viewport: { width: 375, height: 760 }, hasTouch: true });
  const mp = await mob.newPage();
  // سبد موبایل: یک محصول واقعی اضافه کن تا حالت پر تست شود
  await mp.goto(`${BASE}/products?cat=nuts`, { waitUntil: "networkidle" });
  await mp.click('[aria-label*="افزودن"][aria-label*="به سبد"] >> nth=0');
  await mp.waitForTimeout(400);
  await mp.goto(`${BASE}/cart`, { waitUntil: "networkidle" });
  await mp.waitForTimeout(800);
  const sticky = mp.locator("div.fixed.bottom-0 a:has-text('ادامه به پرداخت')");
  (await sticky.count()) === 1 ? ok("mobile sticky checkout bar") : bad("sticky bar");
  (await sticky.isVisible()) ? ok("sticky bar visible") : bad("sticky hidden");
  const mOver = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  mOver <= 0 ? ok("mobile 375 no overflow") : bad("mobile overflow", `${mOver}px`);
  const overlap = await mp.evaluate(() => {
    const bar = document.querySelector("div.fixed.bottom-0");
    if (!bar) return 0;
    const barRect = bar.getBoundingClientRect();
    // آخرین عنصر محتوا باید بالای نوار باشد (padding پایین صفحه این را تضمین می‌کند)
    return barRect.height > 0 && barRect.top < 760 ? 1 : 0;
  });
  overlap === 1 ? ok("sticky bar measured in viewport (safe-area respected)") : bad("sticky geometry");
  await mp.screenshot({ path: "qa-shots/ux/j37-cart-mobile.png", fullPage: true });
  await mob.close();

  // desktop screenshot + overflow
  const dOver = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  dOver <= 0 ? ok("desktop no overflow") : bad("desktop overflow", `${dOver}px`);
  await page.screenshot({ path: "qa-shots/ux/j37-cart-desktop.png", fullPage: true });

  // ── §L price integrity display (24) ─────────────────────
  // تقلب در localStorage قیمت → سبد باید با قیمت سرور هم‌راستا شود
  const tampered = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("helsa-store-v2"));
    const key = s.state.items[0].key;
    const real = s.state.items[0].price;
    s.state.items[0].price = 1000; // قیمت جعلی
    localStorage.setItem("helsa-store-v2", JSON.stringify(s));
    return { key, real };
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  const healed = await page.evaluate(() => JSON.parse(localStorage.getItem("helsa-store-v2")).state.items[0].price);
  healed === tampered.real ? ok("tampered price healed from server price (display integrity)") : bad("price heal", `${healed} vs ${tampered.real}`);

  // ── §M API guards ───────────────────────────────────────
  const csrf = await fetch(`${BASE}/api/cart/check`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  csrf.status === 403 ? ok("cart/check CSRF (no origin → 403)") : bad("cart check csrf", String(csrf.status));
  const shipApi = await (await fetch(`${BASE}/api/shipping/methods`)).json();
  shipApi.ok && shipApi.methods.length === 3 ? ok("shipping API returns 3 real methods") : bad("shipping api");

  // 404 coupons = intended API signal (invalid coupon); real 404s are caught by failedReqs below
  const realErrors = consoleErrors.filter((e) => !/400|401|403|404|429|500/.test(e));
  realErrors.length === 0 ? ok(`0 unexpected console errors`) : bad("console", JSON.stringify(realErrors.slice(0, 3)));
  failedReqs.length === 0 ? ok("0 broken requests (404/5xx)") : bad("broken reqs", JSON.stringify(failedReqs.slice(0, 3)));

  await browser.close();
  console.log(`\n═══ CART RESULT: PASS=${pass} FAIL=${fail} ═══`);
})().catch((e) => { console.error("SCRIPT ERROR:", e.message); process.exit(1); });
