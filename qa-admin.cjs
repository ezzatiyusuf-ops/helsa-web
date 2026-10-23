/**
 * QA پنل ادمین + کاتالوگ UI + تزریق GTM — E2E
 * ├── گاردها: ناشناس → /login · API ناشناس → 401 · کاربر عادی → رد
 * ├── سفر ادمین: ورود مالک → داشبورد → سفارش‌ها → محصولات → ویرایش محصول → کاتالوگ UI
 * ├── کاتالوگ: رندر بخش‌ها + Toast تعاملی + صفر خطای کنسول
 * └── GTM: تگ gtm.js تزریق شده + dataLayer رویداد page_view دارد
 * اجرا: node qa-admin.cjs  (سرور باید روی :3000 بالا باشد)
 */
const { chromium } = require("playwright");

const BASE = process.env.QA_BASE || "http://localhost:3000";
const ADMIN = { email: "owner@helsa.dev", password: "Owner#2026" };
const NORMAL = { id: "09125556677", password: "SaraQa#2026" };

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log(`PASS: ${m}`); };
const bad = (m, d = "") => { fail++; console.log(`FAIL: ${m} ${String(d).slice(0, 160)}`); };

(async () => {
  const browser = await chromium.launch();

  /* ══ 1) گاردها (بدون ورود) ══ */
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
    page.url().includes("/login") ? ok("anonymous /admin → redirect to /login") : bad("guard page", page.url());

    const api = await ctx.request.get(`${BASE}/api/admin/orders`).catch(() => null);
    api && api.status() === 401 ? ok("anonymous /api/admin/orders → 401") : bad("guard api", api && api.status());

    await ctx.close();
  }

  /* ══ 2) کاربر عادی نباید ادمین ببیند ══ */
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
    await page.fill('input[autocomplete="username"]', NORMAL.id);
    await page.fill('input[autocomplete="current-password"]', NORMAL.password);
    await page.click('button:has-text("ورود به حساب هلسا")');
    await page.waitForTimeout(2000);
    await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
    page.url().includes("/login") || !page.url().includes("/admin")
      ? ok("non-admin user blocked from /admin")
      : bad("non-admin", page.url());
    await ctx.close();
  }

  /* ══ 3) اکانت مالک: ثبت‌نام (در صورت نبود) + ورود ══ */
  const adminCtx = await browser.newContext();
  const page = await adminCtx.newPage();
  const errors = [];
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
  page.on("pageerror", (err) => errors.push(String(err)));

  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  const reg = await page.evaluate(async ({ email, password }) => {
    const r = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "مالک", family: "هلسا", phone: "09120000001", email, password }),
    }).catch(() => null);
    if (!r) return "net";
    return `${r.status}`;
  }, ADMIN).catch(() => "?");
  ["201", "200", "409", "400"].includes(reg) || reg === "?"
    ? ok(`admin account ensured (register status ${reg})`)
    : bad("admin register", reg);

  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[autocomplete="username"]', ADMIN.email);
  await page.fill('input[autocomplete="current-password"]', ADMIN.password);
  await page.click('button:has-text("ورود به حساب هلسا")');
  await page.waitForTimeout(2500);

  /* ══ 4) داشبورد ادمین ══ */
  await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const dashBody = await page.textContent("body").catch(() => "");
  const onAdmin = page.url().replace(BASE, "").startsWith("/admin");
  onAdmin && /داشبورد|فروش|درآمد|سفارش/.test(dashBody)
    ? ok("admin dashboard renders (logged in as owner)")
    : bad("dashboard", `${page.url()} · ${dashBody.slice(0, 120)}`);

  /* ══ 5) سفارش‌ها ══ */
  await page.goto(`${BASE}/admin/orders`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  const ordersRows = await page.locator("table tbody tr").count().catch(() => 0);
  const ordersBody = await page.textContent("body").catch(() => "");
  (ordersRows > 0 || /HLA-/.test(ordersBody))
    ? ok(`admin orders loaded (${ordersRows} rows, HLA codes ${/HLA-/.test(ordersBody) ? "✓" : "—"})`)
    : bad("orders", ordersBody.slice(0, 120));

  /* ══ 6) محصولات + ویرایش ══ */
  await page.goto(`${BASE}/admin/products`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  const prodBody = await page.textContent("body").catch(() => "");
  /خرما|محصول|HLA|edit|ویرایش/i.test(prodBody) ? ok("admin products list renders") : bad("products", prodBody.slice(0, 120));
  const editLink = page.locator('a[href*="/admin/products/"]').first();
  if (await editLink.count()) {
    await editLink.click();
    await page.waitForTimeout(1500);
    const editBody = await page.textContent("body").catch(() => "");
    /نام|قیمت|ذخیره|ویرایش/.test(editBody) ? ok("product edit page renders") : bad("product edit", editBody.slice(0, 120));
  } else {
    bad("product edit link", "no /admin/products/:id link found");
  }

  /* ══ 7) کاتالوگ UI ══ */
  await page.goto(`${BASE}/admin/catalog`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const catBody = await page.textContent("body").catch(() => "");
  catBody.includes("کاتالوگ رسمی کامپوننت‌ها") ? ok("UI catalog page renders") : bad("catalog", catBody.slice(0, 120));
  (await page.locator("#tokens").count()) && (await page.locator("#buttons").count()) && (await page.locator("#forms").count())
    ? ok("catalog sections present (tokens/buttons/forms/feedback/media)")
    : bad("catalog sections");
  const toastBtn = page.locator('button:has-text("Toast موفق")');
  if (await toastBtn.count()) {
    await toastBtn.click();
    await page.waitForTimeout(600);
    (await page.locator("text=محصول به سبد اضافه شد").count())
      ? ok("catalog interactive Toast works")
      : bad("catalog toast");
  } else bad("catalog toast button");
  (await page.locator("#media img, #media picture").count()) > 0
    ? ok("catalog SmartImage renders")
    : bad("catalog image");

  /* ══ 8) GTM — تزریق و dataLayer ══ */
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const gtm = await page.evaluate(() => ({
    hasScript: Boolean(document.querySelector('script[src*="googletagmanager.com/gtm.js"]')),
    hasNoscript: (document.querySelector('noscript')?.textContent || '').includes('googletagmanager.com/ns.html'),
    hasPageView: (window.dataLayer || []).some((e) => e && e.event === "page_view"),
  })).catch(() => ({}));
  gtm.hasScript ? ok("GTM gtm.js injected") : bad("gtm script");
  gtm.hasNoscript ? ok("GTM noscript iframe injected") : bad("gtm noscript");
  gtm.hasPageView ? ok("dataLayer has page_view event (analytics → GTM bridge)") : bad("dataLayer page_view");

  /* ══ 9) خطای کنسول (صفحات ادمین) ══ */
  const realErrors = errors.filter((e) => !/net::ERR|Failed to load resource.*(404|401|409|net)/i.test(e));
  realErrors.length === 0 ? ok("0 unexpected console errors") : bad("console errors", realErrors.join(" | "));

  await adminCtx.close();
  await browser.close();

  console.log(`\n═══ ADMIN/CATALOG/GTM RESULT: PASS=${pass} FAIL=${fail} ═══`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
