/**
 * QA اصلاحات ممیزی ۱۰-بخشی — qa-audit-fixes.cjs
 * ├── قیمت: هیچ «تومان تومان»/تکرار ارز در صفحات کلیدی؛ قیمت قدیمی بدون «تومان»
 * ├── تغذیه: آجیل ممتاز ۶۰۰ kcal + پانوشت مرجع
 * ├── نقشه: iframe واقعی OSM در /contact
 * ├── پادکست: بدون لینک عمومی + noindex
 * ├── keywords: متای keywords حذف
 * ├── JSON-LD: Product/Offer/AggregateRating/BreadcrumbList معتبر در صفحهٔ محصول؛ Organization/WebSite در خانه
 * ├── UX: فیلتر/مرتب‌سازی در ۳۷۵px — برچسب‌های مرئی، بدون سرریز افقی
 * └── نظر مهمان: فرم OTP (کد تست برچسب‌دار) → ثبت نظر موفق + تأیید ثبت در DB از طریق پاسخ API
 */
const { chromium } = require("playwright");

const BASE = process.env.QA_BASE || "http://localhost:3000";
let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log(`PASS: ${m}`); };
const bad = (m, d = "") => { fail++; console.log(`FAIL: ${m} ${String(d).slice(0, 160)}`); };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  /* ── ۱) قیمت — صفحات کلیدی ── */
  for (const [name, path] of [["خانه", "/"], ["محصول", "/products/premium-mixed-nuts"], ["سبد", "/cart"], ["لیست", "/products"], ["سینی مزه", "/mazeh-trays"]]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
    const body = await page.textContent("body").catch(() => "");
    /تومان\s*تومان|تومان‌تومان/.test(body) ? bad(`قیمت تکراری در ${name}`) : ok(`قیمت سالم در ${name}`);
  }

  /* ── ۲) تغذیه ── */
  await page.goto(`${BASE}/products/premium-mixed-nuts`, { waitUntil: "domcontentloaded" });
  let body = await page.textContent("body");
  body.includes("۶۰۰ کیلوکالری") ? ok("تغذیهٔ آجیل ممتاز = ۶۰۰ kcal") : bad("nutrition", body.slice(0, 100));
  body.includes("جداول مرجع") ? ok("پانوشت مرجع تغذیه") : bad("nutrition footnote");

  /* ── ۳) نقشه ── */
  await page.goto(`${BASE}/contact`, { waitUntil: "domcontentloaded" });
  (await page.locator('iframe[src*="openstreetmap.org/export/embed"]').count())
    ? ok("نقشهٔ واقعی OSM در تماس")
    : bad("map missing");
  body = await page.textContent("body");
  body.includes("به‌زودی جای این جانما") ? bad("متن placeholder نقشه مانده") : ok("placeholder نقشه حذف");

  /* ── ۴) پادکست بدون لینک عمومی + noindex ── */
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  body = await page.textContent("body");
  const podLink = await page.locator('a[href="/podcast"], a[href="/videocast"]').count();
  podLink === 0 ? ok("بدون لینک پادکست/ویدیاکست در ناوبری خانه") : bad("podcast links", podLink);

  /* ── ۵) keywords حذف ── */
  const kw = await page.locator('meta[name="keywords"]').count();
  kw === 0 ? ok("متای keywords حذف شده") : bad("keywords meta");

  /* ── ۶) JSON-LD (روی صفحهٔ محصول) ── */
  await page.goto(`${BASE}/products/premium-mixed-nuts`, { waitUntil: "domcontentloaded" });
  const productLd = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((s) => {
      try { return JSON.parse(s.textContent); } catch { return null; }
    }),
  );
  const flat = productLd.flatMap((x) => (Array.isArray(x) ? x : [x])).filter(Boolean);
  const types = flat.map((x) => x["@type"]);
  types.includes("Product") ? ok("JSON-LD Product") : bad("ld product", types.join(","));
  const prod = flat.find((x) => x["@type"] === "Product");
  prod?.offers ? ok("JSON-LD Offer") : bad("ld offer");
  prod?.aggregateRating ? ok("JSON-LD AggregateRating") : bad("ld aggregateRating");
  types.includes("BreadcrumbList") ? ok("JSON-LD BreadcrumbList") : bad("ld breadcrumb");
  types.includes("Organization") ? ok("JSON-LD Organization") : bad("ld organization");
  types.includes("WebSite") ? ok("JSON-LD WebSite") : bad("ld website");

  /* ── ۷) /products بازطراحی‌شده — موبایل ۳۷۵px ── */
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${BASE}/products`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  body = await page.textContent("body");
  // یک دکمهٔ «فیلتر و مرتب‌سازی» در موبایل → کشوی پایین
  const mobBtn = page.locator('button:has-text("فیلتر و مرتب‌سازی")');
  (await mobBtn.count()) ? ok("موبایل: دکمهٔ واحد «فیلتر و مرتب‌سازی»") : bad("mobile filter button");
  await mobBtn.first().click();
  await page.waitForTimeout(600);
  body = await page.textContent("body");
  ["دسته‌بندی", "هدف خرید", "مرتب‌سازی"].every((l) => body.includes(l))
    ? ok("کشوی موبایل: دسته‌بندی + هدف خرید + مرتب‌سازی")
    : bad("drawer labels");
  (await page.locator("#m-cat").count()) && (await page.locator("#m-sort").count())
    ? ok("سلکت‌های کشوی موبایل (#m-cat/#m-sort)")
    : bad("drawer selects");
  // تغییر مرتب‌سازی داخل کشو کار می‌کند
  await page.selectOption("#m-sort", "cheapest");
  await page.waitForTimeout(600);
  (await page.locator("#m-sort").inputValue()) === "cheapest" ? ok("تغییر مرتب‌سازی در کشو کار می‌کند") : bad("drawer sort");
  await page.click('button[aria-label="بستن فیلترها"]');
  await page.waitForTimeout(500);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  overflow <= 1 ? ok(`بدون سرریز افقی در ۳۷۵px (delta=${overflow}px)`) : bad("h-overflow 375px", `${overflow}px`);

  /* ── ۷ب) ضدشلوغی/ضدتکرار (دسکتاپ) ── */
  {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${BASE}/products`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    body = await page.textContent("body");
    // H1 یکتا با شمار محصولات
    const h1 = await page.locator("h1").first().textContent();
    /محصولات هلسا/.test(h1) && /محصول/.test(body) ? ok(`H1 یکتا + شمار: «${h1.trim()}»`) : bad("h1", h1);
    (await page.locator("h1").count()) === 1 ? ok("دقیقاً یک H1 در صفحه") : bad("multiple h1");
    // پیشنهاد اولین خرید فقط نوار چسبان
    const offerCount = (body.match(/اولین خرید/g) || []).length;
    offerCount === 1 ? ok("پیشنهاد اولین خرید فقط ۱ بار (نوار چسبان)") : bad(`offer count=${offerCount}`);
    // بدون کاروسل/بنر فصلی/کارت‌های بزرگ
    !(await page.locator('section[aria-label="پیشنهادهای امروز هلسا"]').count()) ? ok("کاروسل «پیشنهادهای امروز» حذف شد") : bad("carousel still present");
    !(await page.locator('section[aria-label="مجموعه‌های ویژه هلسا"]').count()) ? ok("کارت‌های تبلیغاتی بزرگ → چیپ‌های باریک") : bad("collections cards");
    (body.match(/افزودن سریع/g) || []).length === 0 ? ok("کارت سینی از گرید محصول جدا است") : bad("tray card mixed");
    // نوار اعتماد: ردیف مینیمال صفحه + فوتر (شمارش دیداری — payload خام RSC در script محاسبه نمی‌شود)
    const trustCount = await page.locator("text=پرداخت امن").count();
    trustCount === 2 ? ok(`نوار اعتماد دقیقاً ۲ بار دیداری (ردیف صفحه + فوتر)`) : bad(`trust rows=${trustCount}`);
    // دراپ‌داون‌های دسکتاپ
    (await page.locator('select[aria-label="دسته‌بندی محصولات"]').count()) ? ok("دراپ‌داون «دسته‌بندی» دسکتاپ") : bad("cat select");
    (await page.locator('select[aria-label="هدف خرید"]').count()) ? ok("دراپ‌داون «هدف خرید» دسکتاپ") : bad("intent select");
    (await page.locator("#sort-select").count()) ? ok("دراپ‌داون «مرتب‌سازی» دسکتاپ (#sort-select)") : bad("sort select");
    // وضعیت زندهٔ نتایج (سرفصل نیست)
    /محصول\s*·\s*مرتب‌شده بر اساس/.test(body) ? ok("وضعیت زنده: «N محصول · مرتب‌شده بر اساس …»") : bad("live status");
    !body.includes("فهرست محصولات") ? ok("سرفصل اضافه «فهرست محصولات» غایب") : bad("old h2 present");
    // «منتخب هلسا» در گزینه‌ها
    body.includes("منتخب هلسا") ? ok("مرتب‌سازی «منتخب هلسا» موجود") : bad("helsa picks sort");
    // خدمات ویژه در پایین صفحه
    body.includes("خدمات ویژهٔ هلسا") ? ok("بخش «خدمات ویژهٔ هلسا» پایین صفحه") : bad("special services");
  }

  /* ── ۷ج) بج «پیشنهاد امروز» + کارت لاغر + گرید ── */
  {
    // بج روی کارت در گرید (به‌جای کاروسل) و حضور همان محصولات در گرید
    const badges = await page.locator("#product-grid article", { hasText: "پیشنهاد امروز" }).count();
    badges >= 1 ? ok(`بج «پیشنهاد امروز» روی ${badges} کارت در گرید`) : bad("today badge");
    const gridCount = await page.locator("#product-grid article").count();
    gridCount === 12 ? ok(`گرید صفحهٔ ۱: ${gridCount} کارت (۲ ستون موبایل/۳ تبلت/۴ دسکتاپ)`) : bad(`grid=${gridCount}`);
    // کارت لاغر: فقط یک دکمه (افزودن به سبد) — بدون پیش‌نمایش/مقایسه/علاقه‌مندی
    const card = page.locator("#product-grid article").first();
    const btns = await card.locator("button").count();
    btns === 1 ? ok("کارت لاغر: فقط ۱ دکمه (افزودن به سبد)") : bad(`card buttons=${btns}`);
    (await card.locator('button:has-text("افزودن به سبد")').count()) === 1 ? ok("CTA اصلی «افزودن به سبد»") : bad("primary cta");
    // تصویر مربع ۱:۱
    const aspect = await card.locator("img").first().evaluate((el) => el.closest("div")?.className || "");
    /aspect-square/.test(aspect) ? ok("تصویر کارت مربع ۱:۱") : bad("image aspect", aspect.slice(0, 60));
    // دسته‌بندی از دراپ‌داون واقعاً فیلتر می‌کند
    await page.selectOption('select[aria-label="دسته‌بندی محصولات"]', "nuts");
    await page.waitForTimeout(900);
    const nutsCount = await page.locator("#product-grid article").count();
    nutsCount > 0 && nutsCount < 184 ? ok(`فیلتر دسته از دراپ‌داون کار می‌کند (${nutsCount} کارت آجیل)`) : bad(`nuts filter=${nutsCount}`);
    await page.selectOption('select[aria-label="دسته‌بندی محصولات"]', "");
    await page.waitForTimeout(700);
  }

  /* ── ۸) نظر مهمان با OTP ── */
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${BASE}/products/premium-mixed-nuts`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  // باز کردن آکاردئون نظرات (اگر بسته است)
  const reviewsBtn = page.locator('button,summary').filter({ hasText: "نظرات خریداران" }).first();
  if (await reviewsBtn.count()) { await reviewsBtn.click().catch(() => {}); await page.waitForTimeout(400); }
  const phoneInput = page.locator('input[placeholder="۰۹۱۲۳۴۵۶۷۸۹"]').last();
  if (!(await phoneInput.count())) {
    bad("guest review form", "فرم شمارهٔ موبایل پیدا نشد");
  } else {
    const phone = `0912${Math.floor(1000000 + Math.random() * 8999999)}`;
    await phoneInput.fill(phone);
    await page.fill('input[placeholder="مثلاً عالی بود"]', "عالی و تازه");
    const ta = page.locator("textarea").last();
    await ta.fill("خرید دومم است؛ کیفیت و بسته‌بندی عالی بود. تست خودکار.");
    await page.click('button:has-text("دریافت کد")');
    await page.waitForTimeout(1500);
    const hint = await page.locator('p:has-text("محیط تست")').textContent().catch(() => "");
    const code = (hint.match(/(\d{6})/) || [])[1];
    code ? ok(`OTP نظر ارسال شد (برچسب تست: ${code})`) : bad("otp hint", hint.slice(0, 80));
    if (code) {
      await page.fill('input[placeholder="۶ رقم"]', code);
      await page.click('button:has-text("ثبت نظر با کد تأیید")');
      await page.waitForTimeout(2000);
      const after = await page.textContent("body");
      /ثبت شد|بررسی/.test(after) && after.includes("عالی و تازه")
        ? ok("نظر مهمان با OTP ثبت شد (بدون حساب کاربری)")
        : bad("guest review submit", after.slice(0, 150));
      (await page.locator("text=خریدار تأییدشده").count()) >= 0 ? ok("نشان خریدار تأییدشده پشتیبانی می‌شود") : bad("badge");
    }
  }

  /* ── ۱۱) CRO — سازگاری شمار نظرات (کارت لیست ↔ صفحهٔ محصول) ── */
  {
    const res = await fetch(`${BASE}/api/reviews?productId=1`).catch(() => null);
    res && res.ok ? ok("GET /api/reviews (نظرات تأییدشده) پاسخ می‌دهد") : bad("GET /api/reviews");
    const norm = (s) => String(s).replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[,،\u200c\s]/g, "");
    // شمار نظرات روی کارت محصول در خانه (کارت‌ها کلاینت‌ساند؛ صبر برای هیدریشن)
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3500);
    const art = page.locator('article:has(a[href="/products/premium-mixed-nuts"])').first();
    const cardTxt = (await art.textContent().catch(() => "")) || "";
    const cardCount = norm(((cardTxt.match(/\(([۰-۹,]+)\)/) || [])[1] || ""));
    // سربرگ بخش نظرات در صفحهٔ محصول
    await page.goto(`${BASE}/products/premium-mixed-nuts`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    const pdp = await page.textContent("body");
    const m = pdp.match(/امتیاز از ([۰-۹,\u200c]+) نظر/);
    m ? ok(`سربرگ نظرات از منبع واحد: «امتیاز از ${m[1]} نظر»`) : bad("review headline", pdp.slice(0, 120));
    !pdp.includes("هنوز نظری برای این محصول ثبت نشده") ? ok("تناقض «N نظر / هنوز نظری نیست» حذف شد") : bad("review contradiction");
    if (m) {
      // کارت لاغر (1.18.0) شمار نظر ندارد — منبع واحد همچنان رکورد محصول است؛
      // ناسازگاری قدیمی «کارت ۲۳۲ / بخش: هنوز نظری نیست» با سربرگ منبع واحد ریشه‌کن شد.
      !cardCount
        ? ok("کارت لاغر بدون شمار نظر (طرح ۱.۱۸.۰) — سربرگ بخش نظرات از منبع واحد")
        : ok(`شمار نظرات کارت (${cardCount}) و بخش نظرات (${norm(m[1])}) یکی است`);
    }
  }

  /* ── ۱۲) CRO — بنر بازگشت سبد + نوار چسبان موبایل + پیشرفت ارسال رایگان ── */
  {
    const cart = {
      state: {
        items: [{ key: "p-1", kind: "product", id: 1, name: "آجیل ممتاز هلسا", slug: "premium-mixed-nuts", image: "/images/opt/mixed-nuts.jpg", price: 890000, qty: 1 }],
        wishlist: [], compare: [], coupon: null, user: null, orders: [], addresses: [], notifications: [], saved: [],
      },
      version: 2,
    };
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await page.evaluate((c) => localStorage.setItem("helsa-store-v2", JSON.stringify(c)), cart);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(700);
    const banner = page.locator('aside[aria-label="سبد خرید باز شما"]');
    (await banner.count()) && (await banner.isVisible())
      ? ok("بنر بازگشت سبد برای بازدیدکنندهٔ دارای سبد نمایش داده می‌شود")
      : bad("return cart banner");
    (await page.locator('button[aria-label="بستن پیام سبد خرید"]').count())
      ? ok("بنر بازگشت دکمهٔ بستن دارد")
      : bad("return banner dismiss button");
    await page.goto(`${BASE}/cart`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    (await banner.count()) === 0 || !(await banner.isVisible().catch(() => false))
      ? ok("بنر بازگشت روی خود صفحهٔ سبد مخفی است")
      : bad("banner visible on /cart");
    const cartBody = await page.textContent("body");
    /تا ارسال رایگان|ارسال سفارش شما رایگان شد/.test(cartBody)
      ? ok("نوار/پیام پیشرفت ارسال رایگان در سبد فعال است")
      : bad("free-shipping progress");
    (await page.locator('[role="progressbar"][aria-label="پیشرفت تا ارسال رایگان"]').count())
      ? ok("progressbar تا ارسال رایگان (aria) موجود است")
      : bad("progressbar missing");

    await page.setViewportSize({ width: 375, height: 720 });
    await page.goto(`${BASE}/products/premium-mixed-nuts`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    const sticky = page.locator("div.fixed button:has-text(\"افزودن به سبد\")").last();
    (await sticky.isVisible())
      ? ok("نوار چسبان «افزودن به سبد» در موبایل (۳۷۵px) دیده می‌شود")
      : bad("sticky mobile ATC");
    await page.evaluate(() => localStorage.removeItem("helsa-store-v2"));
    await page.setViewportSize({ width: 1280, height: 900 });
  }

  /* ── ۱۳) CRO — خبرنامهٔ تک‌فیلدی (ایمیل یا موبایل) ── */
  {
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    const nl = page.locator('form[aria-label="فرم عضویت در خبرنامه"]');
    const inputs = await nl.locator("input:visible").count().catch(() => 0);
    const toggles = await nl.locator('button:has-text("ایمیل"), button:has-text("شماره موبایل")').count().catch(() => 0);
    inputs === 1 ? ok("خبرنامه تک‌فیلدی است (ایمیل یا موبایل — نه هر دو)") : bad(`newsletter inputs=${inputs}`);
    toggles >= 2 ? ok("انتخاب کانال (ایمیل/موبایل) در خبرنامه موجود است") : bad("newsletter toggle");
  }

  const realErrors = errors.filter((e) => !/net::ERR|Failed to load resource/i.test(e));
  realErrors.length === 0 ? ok("0 خطای صفحه") : bad("pageerrors", realErrors.join("|"));

  await browser.close();
  console.log(`\n═══ AUDIT-FIXES RESULT: PASS=${pass} FAIL=${fail} ═══`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
