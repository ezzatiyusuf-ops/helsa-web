/**
 * a11y-audit.mjs — ممیزی دسترس‌پذیری با axe-core (فاز ۹)
 * ─────────────────────────────────────────────────────────────────────────────
 * axe-core (Deque) روی صفحهٔ رندرشده با برچسب‌های WCAG 2.1 A/AA اجرا می‌شود،
 * به‌همراه چند آزمون رفتاری که axe نمی‌سنجد:
 *   · ترتیب عنوان‌ها (h1→h2→h3 بدون پرش)
 *   · برچسب فرم‌ها (label صریح/پوششی، aria-label، title)
 *   · دیدنی بودن حلقهٔ فوکوس · وجود skip link
 *
 * نکتهٔ دقت‌سنجی: framer-motion شفافیت/جایگاه را با JS و inline تنظیم می‌کند؛
 * پیش از سنجش، انیمیشن‌ها متوقف و «حالت پایدار» تثبیت می‌شود تا axe رنگِ
 * نیمه‌شفاف نخواند (وگرنه نتیجه بین اجراها نوسان می‌کرد: ۰ تا ۴ نقض جعلی).
 *
 * اجرا: node scripts/a11y-audit.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf-8");

const BASE = process.argv[2] || "http://127.0.0.1:3000";
const ROUTES = [
  ["خانه", "/"],
  ["محصولات", "/products"],
  ["PDP", "/products/mazafati-dates"],
  ["سبد", "/cart"],
  ["پرداخت", "/checkout"],
  ["ورود", "/login"],
  ["ثبت‌نام", "/register"],
  ["روزیته", "/rooziteh"],
  ["سینی مزه", "/mazeh-trays"],
  ["درباره", "/about"],
  ["تماس", "/contact"],
  ["سوالات متداول", "/faq"],
  ["وبلاگ", "/blog"],
];
const IMPACT_FA = { critical: "بحرانی", serious: "جدی", moderate: "متوسط", minor: "کم" };

const browser = await chromium.launch();
// reducedMotion: framer-motion در این حالت انیمیشن ورودی را حذف می‌کند
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "fa-IR", reducedMotion: "reduce" });
const page = await ctx.newPage();
const rows = [];
let totalViolations = 0;
const byRule = new Map();

for (const [label, path] of ROUTES) {
  await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(350);
  await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important}" });

  for (let i = 0; i < 20; i++) {
    const settled = await page.evaluate(() => {
      let busy = false;
      for (const el of document.querySelectorAll("[style]")) {
        const st = el.style;
        if (st.opacity && Number(st.opacity) < 1) { st.opacity = "1"; busy = true; }
        if (st.transform && st.transform !== "none") { st.transform = "none"; busy = true; }
      }
      return !busy;
    });
    if (settled) break;
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(400);

  await page.addScriptTag({ content: axeSource });
  const result = await page.evaluate(async () => {
    return await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
      resultTypes: ["violations"],
    });
  });
  totalViolations += result.violations.length;
  for (const v of result.violations) {
    if (!byRule.has(v.id)) {
      byRule.set(v.id, {
        impact: v.impact, help: v.help, pages: [], nodes: 0,
        sample: v.nodes[0]?.target?.join(" ") || "",
        html: (v.nodes[0]?.html || "").slice(0, 220),
      });
    }
    const e = byRule.get(v.id);
    e.pages.push(label);
    e.nodes += v.nodes.length;
  }

  const headingJump = await page.evaluate(() => {
    const hs = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => Number(h.tagName[1]));
    let prev = 0;
    const jumps = [];
    for (const lv of hs) {
      if (prev && lv > prev + 1) jumps.push(`h${prev}→h${lv}`);
      prev = lv;
    }
    return jumps.slice(0, 3);
  });

  // برچسب فرم‌ها — با احتساب label های پوششی (implicit) که در هلسا الگوی اصلی‌اند
  const unlabeled = await page.evaluate(() => {
    const fields = [...document.querySelectorAll("input:not([type=hidden]), select, textarea")];
    return fields.filter((el) => {
      const aria = el.getAttribute("aria-label") || el.getAttribute("aria-labelledby");
      const labels = el.labels ? el.labels.length : 0;
      const title = el.getAttribute("title");
      return !aria && !labels && !title;
    }).length;
  });

  const focusRing = await page.evaluate(async () => {
    const first = document.querySelector("a[href], button, input, select, textarea");
    if (!first) return { ok: true, note: "بدون عنصر فوکوس‌پذیر" };
    first.focus();
    const cs = getComputedStyle(first);
    const visible = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth || "0") > 0;
    return { ok: visible, note: `${cs.outlineStyle} ${cs.outlineWidth}` };
  });

  rows.push({ label, path, violations: result.violations.length, headingJump, unlabeled, focusRing });
}

await page.goto(BASE + "/", { waitUntil: "networkidle" });
const skip = await page.evaluate(() => {
  const el = document.querySelector('a[href^="#"]');
  if (!el) return null;
  return { text: el.textContent?.trim().slice(0, 30), href: el.getAttribute("href") };
});

await browser.close();

console.log("── نتیجه به تفکیک صفحه ──");
for (const r of rows) {
  const bits = [`${r.violations} نقض`];
  if (r.headingJump.length) bits.push(`پرش عنوان: ${r.headingJump.join(",")}`);
  if (r.unlabeled) bits.push(`${r.unlabeled} فیلد بدون برچسب`);
  if (!r.focusRing.ok) bits.push(`بدون outline فوکوس (${r.focusRing.note})`);
  const clean = r.violations === 0 && r.headingJump.length === 0 && !r.unlabeled && r.focusRing.ok;
  console.log(`  ${clean ? "✓" : "✗"} ${r.label.padEnd(12)} ${r.path.padEnd(26)} ${bits.join(" · ")}`);
}

if (byRule.size) {
  console.log("\n── قواعد نقض‌شده (axe-core) ──");
  for (const [id, v] of [...byRule.entries()].sort((a, b) => b[1].nodes - a[1].nodes)) {
    console.log(`  • ${id} [${IMPACT_FA[v.impact] || v.impact}] ${v.nodes} مورد در ${v.pages.length} صفحه — ${v.help}`);
    if (v.sample) console.log(`      نمونه: ${v.sample}`);
    if (v.html) console.log(`      html: ${v.html}`);
  }
}
console.log(`\nنتیجه: ${totalViolations} نقض axe در ${ROUTES.length} صفحه · skip link: ${skip ? `«${skip.text}» → ${skip.href}` : "ندارد"}`);
process.exit(totalViolations ? 1 : 0);
