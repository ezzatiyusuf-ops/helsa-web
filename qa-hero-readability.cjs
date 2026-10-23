#!/usr/bin/env node
/**
 * qa-hero-readability.cjs — راستی‌آزمایی §۶۹ (خوانایی هیرو)
 * برای هر اسلاید × هر ویوپورت (موبایل/تبلت/دسکتاپ):
 *   ۱) هندسه: عدم هم‌پوشانی متن پشتیبان «کیفیت ممتاز مواد اولیه» با شمارهٔ اسلاید/فلش‌ها/نقطه‌ها/CTA
 *   ۲) کنتراست واقعی رندزشدهٔ شمارهٔ اسلاید و متن پشتیبان (تحلیل پیکسل اسکرین‌شات با sharp)
 *   ۳) عدم بریدگی/چسبیدن به لبه‌ها
 * بدون قضاوت بصری انسانی — همهٔ سنجه‌ها عددی‌اند.
 */
const { chromium } = require("playwright");
const sharp = require("sharp");

const BASE = process.env.HELSA_BASE || "http://localhost:3000";
const VIEWPORTS = [
  { name: "mobile-390", width: 390, height: 844 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1366", width: 1366, height: 900 },
];
const TRUST_TEXT = "کیفیت ممتاز مواد اولیه";

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log(`  ✅ ${m}`); };
const bad = (m) => { fail++; console.log(`  ❌ ${m}`); };

const lum = (r, g, b) => {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (l1, l2) => (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

/** کنتراست چیپ با پس‌زمینهٔ توپر: دقیق از computed-style (WCAG) */
async function solidContrast(page, el) {
  return await el.evaluate((node) => {
    const cs = getComputedStyle(node);
    const parse = (str) => { const m = str.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/); return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null; };
    const fg = parse(cs.color); const bg = parse(cs.backgroundColor);
    if (!fg || !bg || bg.a === 0) return null;
    const L = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
    return (Math.max(L(fg), L(bg)) + 0.05) / (Math.min(L(fg), L(bg)) + 0.05);
  });
}

/** کنتراست رندرشدهٔ چیپ شیشه‌ای روی عکس: p95 (متن روشن) در برابر p25 (پس‌زمینهٔ غالب) */
async function renderedContrast(el) {
  const buf = await el.screenshot();
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const lums = [];
  for (let i = 0; i < data.length; i += info.channels) lums.push(lum(data[i], data[i + 1], data[i + 2]));
  lums.sort((a, b) => a - b);
  const bg = lums[Math.floor(lums.length * 0.25)];
  const txt = lums[Math.floor(lums.length * 0.95)];
  return { ratio: ratio(txt, bg), bgLum: bg, txtLum: txt };
}

const inter = (a, b) => !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);
const box = async (el) => { const b = await el.boundingBox(); return b; };

(async () => {
  const browser = await chromium.launch();
  for (const vp of VIEWPORTS) {
    console.log(`\n────── ${vp.name} (${vp.width}×${vp.height}) ──────`);
    const page = await (await browser.newContext({ viewport: { width: vp.width, height: vp.height } })).newPage();
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    const hero = page.locator('section[aria-roledescription="اسلایدر"]');
    const dots = hero.locator('[role="tablist"] [role="tab"]');
    const total = await dots.count();
    total >= 3 ? ok(`اسلایدر با ${total} اسلاید`) : bad(`تعداد اسلاید: ${total}`);

    for (let i = 0; i < total; i++) {
      await dots.nth(i).evaluate((el) => el.click()); // کلیک JS — دور از interception نوارهای sticky/fixed موبایل
      await page.waitForTimeout(1100); // پایان انیمیشن crossfade
      const label = `اسلاید ${i + 1}/${total}`;

      const trust = hero.locator(`text=${TRUST_TEXT}`).first();
      const counter = hero.locator('[aria-live="polite"]').first();
      const prev = hero.locator('[aria-label="اسلاید قبلی"]');
      const next = hero.locator('[aria-label="اسلاید بعدی"]');
      const h1 = hero.locator("h1").first();
      const ctaPrimary = hero.locator("a[href], button").filter({ hasText: /مشاهده|خرید|ساخت|سفارش|افزودن/ }).first();

      const [t, c, p, n, h, cta] = await Promise.all([box(trust), box(counter), box(prev), box(next), box(h1), box(ctaPrimary)]);
      if (!t || !c || !p || !n || !h || !cta) { bad(`${label}: المان یافت نشد (${["trust","counter","prev","next","h1","cta"].filter((_,k)=>![t,c,p,n,h,cta][k]).join(",")})`); continue; }

      // ۱) عدم هم‌پوشانی — هستهٔ §۶۹
      !inter(t, c) ? ok(`${label}: متن پشتیبان ∩ شمارهٔ اسلاید = ∅ (فاصلهٔ عمودی ${Math.round(Math.abs(t.y - c.y))}px)`) : bad(`${label}: متن پشتیبان روی شمارهٔ اسلاید می‌افتد!`);
      !inter(t, p) && !inter(t, n) ? ok(`${label}: متن پشتیبان ∩ فلش‌ها = ∅`) : bad(`${label}: متن پشتیبان روی فلش‌ها می‌افتد!`);
      !inter(t, h) ? ok(`${label}: متن پشتیبان ∩ عنوان = ∅`) : bad(`${label}: متن پشتیبان روی عنوان می‌افتد!`);
      !inter(t, cta) ? ok(`${label}: متن پشتیبان ∩ CTA = ∅`) : bad(`${label}: متن پشتیبان روی CTA می‌افتد!`);
      !inter(c, p) && !inter(c, n) ? ok(`${label}: شمارهٔ اسلاید ∩ فلش‌ها = ∅`) : bad(`${label}: شماره و فلش هم‌پوشانی دارند!`);

      // ۲) عدم بریدگی/لبه
      const vw = vp.width;
      const inside = (b) => b.x >= 8 && b.y >= 8 && b.x + b.width <= vw - 8;
      inside(t) ? ok(`${label}: متن پشتیبان داخل حاشیهٔ امن`) : bad(`${label}: متن پشتیبان چسبیده به لبه/بریده (x=${Math.round(t.x)}, w=${Math.round(t.width)})`);
      inside(c) ? ok(`${label}: شمارهٔ اسلاید داخل حاشیهٔ امن`) : bad(`${label}: شمارهٔ اسلاید بریده!`);

      // ۳) کنتراست واقعی رندزشده (هر اسلاید تصویر متفاوتی پشت چیپ‌ها دارد)
      const cTrust = await solidContrast(page, trust);
      cTrust !== null && cTrust >= 4.5 ? ok(`${label}: کنتراست متن پشتیبان ${cTrust.toFixed(2)}:1 ≥ 4.5 (پس‌زمینهٔ توپر)`) : bad(`${label}: کنتراست متن پشتیبان ${cTrust === null ? "نامشخص (پس‌زمینهٔ شفاف؟)" : cTrust.toFixed(2) + ":1"} < 4.5`);
      const cc = await renderedContrast(counter);
      cc.ratio >= 4.5 ? ok(`${label}: کنتراست شمارهٔ اسلاید ${cc.ratio.toFixed(2)}:1 ≥ 4.5 (روی تصویر این اسلاید؛ روشنایی پس‌زمینهٔ چیپ ${cc.bgLum.toFixed(2)})`) : bad(`${label}: کنتراست شمارهٔ اسلاید ${cc.ratio.toFixed(2)}:1 < 4.5 (bg=${cc.bgLum.toFixed(2)}, txt=${cc.txtLum.toFixed(2)})`);
    }
    await page.close();
  }
  await browser.close();
  console.log(`\n═══ HERO READABILITY RESULT: PASS=${pass} FAIL=${fail} ═══`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("SCRIPT ERROR:", e.message); process.exit(1); });
