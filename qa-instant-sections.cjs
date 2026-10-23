/* QA: فوری‌بودن «چرا هلسا؟» و «اینستاگرام» — بدون JS، بدون دروازهٔ انیمیشن */
const { chromium } = require("playwright");
let pass = 0, fail = 0;
const ok = (n, c, e = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}: ${n}${e ? " (" + e + ")" : ""}`); };

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });

  // ═══ بدون JavaScript — محتوا باید فوری و visible باشد ═══
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });

  // چرا هلسا
  const why = page.locator('section[aria-label="چرا هلسا"]');
  ok("چرا هلسا — سکشن در DOM بدون JS", await why.count() === 1);
  const whyCards = why.locator("li > div");
  ok("چرا هلسا — ۶ کارت", (await whyCards.count()) === 6, `n=${await whyCards.count()}`);
  if (await whyCards.count()) {
    const first = whyCards.first();
    ok("چرا هلسا — opacity=1", (await first.evaluate((el) => getComputedStyle(el).opacity)) === "1");
    ok("چرا هلسا — visibility=visible", (await first.evaluate((el) => getComputedStyle(el).visibility)) === "visible");
  }
  ok("چرا هلسا — transform غیر from-anim (بدون جابجایی اولیه)", await why.locator("div").first().evaluate((el) => !el.className.includes("rvl")));

  // اینستاگرام
  const ig = page.locator('section[aria-label="هلسا در شبکه‌های اجتماعی"]');
  ok("اینستاگرام — سکشن در DOM بدون JS", await ig.count() === 1);
  const posts = ig.locator('[aria-label="پست‌های اینستاگرام هلسا — نوار کشویی"] > div > a');
  const n = await posts.count();
  ok("اینستاگرام — ≥۸ پست بدون JS", n >= 8, `n=${n}`);
  if (n) {
    const p = posts.first();
    ok("اینستاگرام — opacity=1", (await p.evaluate((el) => getComputedStyle(el).opacity)) === "1");
    const img = ig.locator("img").first();
    ok("اینستاگرام — تصویر در DOM", await img.count() >= 1);
  }
  const stories = await ig.locator('img[alt*="استوری"], [aria-label*="استوری"]').count();
  ok("اینستاگرام — استوری‌ها حاضر (بدون JS)", stories >= 1, `n=${stories}`);
  const socials = await ig.locator('a[aria-label*="هلسا —"]').count();
  ok("اینستاگرام — نوار ۵ سوشال", socials === 5, `n=${socials}`);

  // متن h2 هر دو سکشن در HTML خام
  const html = await page.content();
  ok("چرا هلسا — متن در HTML خام", html.includes("کیفیت انتخاب‌شده"));
  ok("اینستاگرام — متن در HTML خام", html.includes("اینستاگرام هلسا را دنبال کنید"));

  await ctx.close();

  // ═══ با JS — بعد از هیدراسیون محتوا همچنان visible و بدون پرش ═══
  const page2 = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page2.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page2.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  ok("با JS — چرا هلسا ۶ کارت", (await page2.locator('section[aria-label="چرا هلسا"] li > div').count()) === 6);
  ok("با JS — اینستاگرام ≥۸ پست", (await page2.locator('section[aria-label="هلسا در شبکه‌های اجتماعی"] [aria-label="پست‌های اینستاگرام هلسا — نوار کشویی"] > div > a').count()) >= 8);
  ok("هیدراسیون — صفر خطای کنسول", errors.length === 0, errors.slice(0, 2).join(" | ").slice(0, 120));

  // ریسپانسیو ۸ عرض — بدون overflow
  for (const w of [320, 360, 390, 430, 768, 1024, 1280, 1440]) {
    await page2.setViewportSize({ width: w, height: 900 });
    const ov = await page2.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(`ریسپانسیو ${w}px بدون overflow`, ov <= 1, `Δ=${ov}px`);
  }
  await page2.close();
  await browser.close();
  console.log(`\n═══ INSTANT SECTIONS RESULT: PASS=${pass} FAIL=${fail} ═══`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FATAL:", e.message); process.exit(2); });
