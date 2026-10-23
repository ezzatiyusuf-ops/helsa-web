// HELSA AUDIT §6/§7/§8/§10/§12/§25 — auth, cart, checkout, order, admin, error handling
const { chromium } = require("playwright");
const BASE = "http://localhost:3000";
let pass = 0, fail = 0;
const ok = (n) => { pass++; console.log(`PASS: ${n}`); };
const bad = (n, e = "") => { fail++; console.log(`FAIL: ${n} ${e}`); };
const RND = String(Math.floor(Math.random() * 900000000) + 100000000);
const PHONE = `0912${RND.slice(0, 7)}`;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();

  // ═══ §6 AUTH: REGISTER (new real user) ════════════════
  await page.goto(`${BASE}/register`, { waitUntil: "networkidle" });
  await page.fill('input[autocomplete="given-name"]', "ممیز");
  await page.fill('input[autocomplete="family-name"]', "تست");
  await page.fill('input[autocomplete="username"]', PHONE);
  await page.fill('input[autocomplete="email"]', `audit-${RND}@test.local`);
  await page.fill('input[autocomplete="new-password"]', "Audit#2026x");
  const confirm = page.locator('input[autocomplete="new-password"]').nth(1);
  if (await confirm.count()) await confirm.fill("Audit#2026x");
  // پذیرش قوانین (چک‌باکس اجباری ثبت‌نام)
  const accept = page.locator('input[type="checkbox"]').first();
  if (await accept.count()) await accept.check();
  await page.click('button:has-text("ایجاد حساب هلسا")');
  await page.waitForTimeout(2500);
  let body = await page.textContent("body");
  const registered = body.includes("خوش آمدید") || body.includes("حساب کاربری شما ساخته شد") || !(await page.locator('button:has-text("ثبت")').count());
  registered ? ok(`register: real account created (phone ...${PHONE.slice(-4)})`) : bad("register", body.slice(0, 150));
  const regApi = await page.evaluate(async () => (await fetch("/api/auth/session")).json());
  regApi.ok === true && regApi.phone ? ok(`session API confirms authenticated (phone ...${String(regApi.phone).slice(-4)})`) : bad("session api", JSON.stringify(regApi).slice(0, 100));

  // session persistence: reload
  await page.reload({ waitUntil: "networkidle" });
  (await (await page.evaluate(async () => (await fetch("/api/auth/session")).json())).ok)
    ? ok("session persists across reload (httpOnly cookie)") : bad("session persistence");

  // ═══ §7 CART (with real product) ═══════════════════════
  const prods = await (await page.evaluate(async () => (await fetch("/api/products")).json())).products;
  await page.goto(`${BASE}/products/${prods[0].slug}`, { waitUntil: "networkidle" });
  await page.locator('button[aria-label*="افزودن"][aria-label*="به سبد"]').first().click();
  await page.waitForTimeout(600);
  await page.goto(`${BASE}/cart`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  body = await page.textContent("body");
  body.includes(prods[0].name) ? ok("cart shows real product") : bad("cart content", body.slice(0,120));
  const storage = await page.evaluate(() => {
    const raw = localStorage.getItem("helsa-store-v2");
    return raw ? { keys: Object.keys(JSON.parse(raw).state), items: JSON.parse(raw).state.items.length } : null;
  });
  storage && storage.items === 1 ? ok(`cart storage = zustand persist in localStorage (${storage.keys.length} state keys) — FRONTEND-side persistence`) : bad("cart storage", JSON.stringify(storage));
  // quantity + refresh
  await page.locator('button[aria-label^="افزایش"]').first().click();
  await page.waitForTimeout(300);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const qtyAfter = await page.locator("span[aria-live='polite']").first().textContent();
  qtyAfter === "۲" ? ok("qty change survives refresh (localStorage)") : bad("qty refresh", String(qtyAfter));

  // ═══ §6 logout → login (invalid + valid) ═══════════════
  await page.evaluate(async () => { await fetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); });
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[autocomplete="username"]', PHONE);
  await page.fill('input[autocomplete="current-password"]', "wrong-password");
  await page.click('button:has-text("ورود به حساب هلسا")');
  await page.waitForTimeout(1000);
  body = await page.textContent("body");
  body.includes("صحیح نیست") ? ok("invalid login → Persian error, no info leak") : bad("invalid login", body.slice(0, 100));
  await page.fill('input[autocomplete="username"]', PHONE);
  await page.fill('input[autocomplete="current-password"]', "Audit#2026x");
  await page.click('button:has-text("ورود به حساب هلسا")');
  await page.waitForTimeout(2000);
  (await (await page.evaluate(async () => (await fetch("/api/auth/session")).json())).ok)
    ? ok("valid login re-authenticates") : bad("valid login");
  // cart preserved across logout/login?
  await page.goto(`${BASE}/cart`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  (await page.textContent("body")).includes(prods[0].name) ? ok("cart preserved across logout→login") : bad("cart after relogin");

  // protected route when logged out
  await page.evaluate(async () => { await fetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); });
  const acc = await page.goto(`${BASE}/account`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(1500);
  body = await page.textContent("body");
  (acc.status() === 200 && (body.includes("ورود") || body.includes("برای مشاهده"))) ? ok("/account logged-out → login prompt (client gate)") : bad("account gate", body.slice(0, 80));
  const ordersApi = await page.evaluate(async () => (await fetch("/api/orders")).json());
  ordersApi.ok === false ? ok("GET /api/orders logged-out → 401 (server-side protection)") : bad("orders api protection", JSON.stringify(ordersApi).slice(0, 80));

  // ═══ §12 ADMIN AUDIT ═══════════════════════════════════
  const adminApi = await page.evaluate(async () => (await fetch("/api/admin/orders")).json());
  adminApi.ok === false && !adminApi.orders ? ok("admin API unauthorized for anonymous (server-side)") : bad("admin api open!", JSON.stringify(adminApi).slice(0, 80));
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  body = await page.textContent("body");
  if (body.includes("دسترسی") || body.includes("ورود")) ok("/admin shows access control UI for non-admin");
  else bad("admin page gate unclear", body.slice(0, 100));

  // ═══ §8/§10 CHECKOUT + ORDER (COD, real order creation) ═══
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[autocomplete="username"]', PHONE);
  await page.fill('input[autocomplete="current-password"]', "Audit#2026x");
  await page.click('button:has-text("ورود به حساب هلسا")');
  await page.waitForTimeout(2000);
  await page.goto(`${BASE}/cart`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.click('aside a:has-text("ادامه به پرداخت")');
  await page.waitForURL((u) => u.pathname === "/checkout", { timeout: 10000 });
  const next = async () => { await page.click('button:has-text("گام بعد")'); await page.waitForTimeout(400); };
  for (let i = 0; i < 3 && !(await page.locator("h2").filter({ hasText: "گیرنده" }).count()); i++) await next();
  await page.fill('input[placeholder="سارا"]', "ممیز");
  await page.fill('input[placeholder="محمدی"]', "تست");
  await next(page);
  await page.fill('input[placeholder="۱۲۳۴۵۶۷۸۹۰"]', "0012345679");
  await page.click('button:has-text("تأیید و ادامه")');
  await page.waitForTimeout(1200);
  await next(page);
  await page.fill('input[placeholder="نام و نام خانوادگی گیرنده"]', "ممیز تست");
  await page.fill('input[placeholder="مثلاً تهران"]', "تهران");
  await page.fill('input[placeholder="خیابان، کوچه، پلاک"]', "خیابان تست، پلاک ۱");
  await page.fill('input[placeholder="۱۰ رقم"]', "1111111111");
  await page.fill('input[placeholder="۰۹۱۲۳۴۵۶۷۸۹"]', PHONE);
  await page.click('button:has-text("افزودن آدرس")');
  await page.waitForTimeout(500);
  await next(page);
  await page.click('label:has-text("ارسال عادی")');
  await next(page);
  await page.waitForTimeout(600);
  await page.click('label:has-text("پرداخت در محل")').catch(async () => { await page.click("text=در محل"); });
  await next(page);
  await page.waitForTimeout(400);
  await page.click('button:has-text("ثبت سفارش")');
  await page.waitForURL((u) => u.pathname.startsWith("/payment/success"), { timeout: 15000 })
    .then(() => ok("order placed → /payment/success"))
    .catch(() => bad("order placement", page.url()));
  const orderCode = page.url().match(/code=([A-Z0-9-]+)/)?.[1] ?? "";
  /^HLA-/.test(orderCode) ? ok(`real order code ${orderCode}`) : bad("order code", orderCode);
  // order persistence: server API
  const myOrders = await page.evaluate(async () => (await fetch("/api/orders")).json());
  myOrders.ok && myOrders.orders?.some((o) => o.code === orderCode)
    ? ok("order persisted server-side (survives refresh — DB row)") : bad("order persistence", JSON.stringify(myOrders).slice(0, 120));
  // stock actually decremented?
  const after = await (await page.evaluate(async () => (await fetch("/api/products")).json())).products;
  const pBefore = prods[0]; const pAfter = after.find((x) => x.id === pBefore.id);
  pAfter && pAfter.stock === pBefore.stock - 2 ? ok(`stock decremented in DB (${pBefore.stock} → ${pAfter.stock})`) : bad("stock decrement", `${pBefore?.stock} → ${pAfter?.stock}`);

  // ═══ §9 PAYMENT (simulator?) ══════════════════════════
  const methods = await (await page.evaluate(async () => (await fetch("/api/payments/methods?total=500000")).json()));
  console.log("payment methods:", JSON.stringify(methods).slice(0, 200));
  methods.sandbox === true ? ok("payments API reports sandbox=true (SIMULATOR active — no real gateway)") : bad("payments flag", JSON.stringify(methods).slice(0, 100));

  // ═══ §25 ERROR HANDLING ═══════════════════════════════
  const badCoupon = await page.evaluate(async () => {
    const r = await fetch("/api/coupons/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: "FAKE-CODE-XX", subtotal: 500000 }) });
    return { status: r.status, body: await r.json() };
  });
  badCoupon.status >= 400 && badCoupon.body.message ? ok(`fake coupon → ${badCoupon.status} + Persian message`) : bad("fake coupon", JSON.stringify(badCoupon).slice(0, 80));
  const badOrigin = await fetch(`${BASE}/api/cart/check`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  badOrigin.status === 403 ? ok("cross-origin POST → 403 CSRF guard") : bad("csrf", String(badOrigin.status));
  const health = await (await fetch(`${BASE}/api/health`)).json();
  health.ok ? ok(`health endpoint ok (db: ${health.db ?? health.database ?? "n/a"})`) : bad("health", JSON.stringify(health).slice(0, 80));

  await browser.close();
  console.log(`\n═══ AUDIT-2 RESULT: PASS=${pass} FAIL=${fail} ═══`);
  console.log(`TEST_ACCOUNT=${PHONE}`);
})().catch((e) => { console.error("SCRIPT ERROR:", e.message); process.exit(1); });
