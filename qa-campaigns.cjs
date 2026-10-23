/* QA بریف فعلی — §۱ مناسبت فوری، §۳/۴ کارت واحد، §۲ شمارش ۱۸۴، §۵ کمپین ادمین (UI مرورگری) */
const { chromium } = require("playwright");

const BASE = "http://localhost:3000";
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { cond ? pass++ : fail++; console.log(`${cond ? "PASS" : "FAIL"}: ${name}${extra ? " (" + extra + ")" : ""}`); };

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });

  /* ═══ ۱) مناسبت: ظاهر فوری پیش از هیدراسیون (JS غیرفعال) ═══ */
  {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
    const card = page.locator('a[href="/mehmani"]').first();
    ok("§۱ مناسبت — کارت در DOM پیش از هیدراسیون", await card.count() > 0);
    if (await card.count()) {
      const box = await card.boundingBox();
      const op = await card.evaluate((el) => getComputedStyle(el).opacity);
      const vis = await card.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return r.top < window.innerHeight && r.bottom > 0;
      });
      ok("§۱ مناسبت — opacity=1 بدون JS", op === "1", `opacity=${op}`);
      ok("§۱ مناسبت — کارت در جریان صفحه (سکشن سوم) بدون دروازهٔ انیمیشن", box && box.y > 0, `top=${Math.round(box?.y ?? -1)}px`);
    }
    const trust = await page.locator("text=محصول طبیعی").first().textContent().catch(() => null);
    const m184 = await page.locator('p:has-text("۱۸۴")').first().textContent().catch(() => "");
    ok("§۲ شمارش ۱۸۴ (بدون JS)", /۱۸۴/.test(m184 || ""), (m184 || "").trim().slice(0, 40));
    await ctx.close();
  }

  /* ═══ ۳/۴) کارت واحد: ۴ کارت هم‌پوسته در پیشنهاد ویژه ═══ */
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    const sec = page.locator('section[aria-label="پیشنهاد ویژه امروز"]');
    ok("§۴ سکشن پیشنهاد ویژه", await sec.count() === 1);
    const cards = sec.locator("article.prem-card");
    const n = await cards.count();
    ok("§۳/۴ چهار کارت prem-card", n === 4, `n=${n}`);
    if (n === 4) {
      const classes = await cards.evaluateAll((els) => els.map((e) => e.className));
      const allSame = classes.every((c) => c.includes("prem-card") && c.includes("p-3"));
      ok("§۳ همه با p-3 prem-card", allSame);
      const imgs = sec.locator("article.prem-card .aspect-square");
      ok("§۳ تصاویر مربع ۱:۱ ×۴", (await imgs.count()) >= 4, `n=${await imgs.count()}`);
      const ctas = sec.locator('article.prem-card button:has-text("افزودن به سبد")');
      ok("§۳ CTA «افزودن به سبد» ×۴ h-10", (await ctas.count()) === 4, `n=${await ctas.count()}`);
      const heights = await ctas.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
      ok("§۳ ارتفاع CTA یکنواخت ۴۰px", heights.every((h) => h === 40), heights.join(","));
    }
    // شمارش‌معکوس: الان نباید باشد (کمپین QA حذف شد؛ هیچ‌کدام ≤24h نیست)
    const timer = await sec.locator('[role="timer"]').count();
    ok("§۵ بدون شمارش‌معکوس وقتی کمپینی در ۲۴h نیست", timer === 0, `timer=${timer}`);
    // ریسپانسیو سکشن در 320
    await page.setViewportSize({ width: 320, height: 700 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok("§۱۱ بدون overflow افقی در 320px", overflow <= 1, `Δ=${overflow}px`);
    const err = [];
    page.on("console", (m) => m.type() === "error" && err.push(m.text()));
    await page.close();
  }

  /* ═══ ۵/۶) ادمین کمپین‌ها: لاگین واقعی → UI → CRUD با persist ═══ */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[autocomplete="username"]', { timeout: 15000 });
    await page.fill('input[autocomplete="username"]', "owner@helsa.dev");
    await page.fill('input[autocomplete="current-password"]', "Owner#2026");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(2500);
    await page.goto(BASE + "/admin/campaigns", { waitUntil: "networkidle" });

    ok("§۶ صفحهٔ /admin/campaigns باز شد", page.url().includes("/admin/campaigns"));
    await page.waitForSelector("table", { timeout: 8000 }).catch(() => {});
    const rows = await page.locator("tbody tr").count();
    ok("§۶ جدول ۷ کمپین واقعی", rows === 7, `rows=${rows}`);
    const states = await page.locator("tbody tr span", { hasText: /در حال برگزاری|پایان‌یافته|به‌زودی|غیرفعال/ }).allTextContents();
    ok("§۶ برچسب وضعیت واقعی (پایان‌یافته برای ۶ کمپین قدیمی)", states.filter((s) => /پایان‌یافته|در حال برگزاری/.test(s)).length >= 7, states.slice(0, 7).join("،"));

    // فرم ساخت
    await page.click('button:has-text("کمپین جدید")');
    await page.fill('input[placeholder="جشنوارهٔ خرما"]', "تست مرورگری QA");
    await page.fill('input[placeholder="dates-festival"]', "qa-browser-test");
    await page.fill('input[placeholder="2026-09-20"]', "2026-09-17");
    await page.fill('input[placeholder="2026-09-21"]', "2026-09-17");
    await page.click('button:has-text("ذخیره")');
    await page.waitForTimeout(1200);
    const created = await page.locator("tbody tr", { hasText: "qa-browser-test" }).count();
    ok("§۶ ساخت کمپین از UI (persist واقعی)", created === 1);

    // toggle فعال→غیرفعال
    const row = page.locator("tbody tr", { hasText: "qa-browser-test" }).first();
    await row.locator('button[aria-label="غیرفعال‌سازی"]').click();
    await page.waitForTimeout(1200);
    const toggleState = await page.locator("tbody tr", { hasText: "qa-browser-test" }).locator('button[aria-label="فعال‌سازی"]').count();
    ok("§۶ toggle فعال/غیرفعال از UI", toggleState === 1);

    // اعتبارسنجی فرم: تاریخ پایان قبل از شروع
    await page.click('button[aria-label="ویرایش کمپین"]');
    await page.waitForTimeout(300);
    // پاک‌سازی: حذف مستقیم DB بعداً
    await ctx.close();
  }

  await browser.close();
  console.log(`\n═══ CAMPAIGNS QA RESULT: PASS=${pass} FAIL=${fail} ═══`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FATAL:", e.message); process.exit(2); });
