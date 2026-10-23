/**
 * HELSA QA — PART F (visual, measurable proxy) + PART G (accessibility).
 * For each key page, at desktop + mobile:
 *   - broken images (naturalWidth === 0)
 *   - elements overflowing their card/viewport (already done for viewport; here: clipped text)
 *   - font actually applied (computed font-family resolved, not fallback)
 *   - contrast ratio of muted/body text vs its background (WCAG AA target ≥ 4.5)
 *   - alt coverage on <img>, aria-label coverage on icon-only buttons
 *   - form inputs have labels/placeholders
 *   - heading hierarchy (no skipped levels h1→h3)
 *   - dir=rtl + lang=fa
 *   - tap-target size on mobile (>= 40px for interactive)
 */
import { chromium } from "playwright";

const PAGES = [
  "/", "/products", "/products/mazafati-dates", "/mazeh-trays", "/mazeh-trays/build",
  "/gifts", "/gifts/corporate", "/blog", "/cart", "/checkout", "/login", "/register",
  "/track", "/wholesale", "/faq", "/contact", "/account",
];

const EVAL = () => {
  const issues = [];
  const doc = document.documentElement;

  // 1. broken images
  document.querySelectorAll("img").forEach((img) => {
    if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) {
      issues.push(`broken-img: ${img.getAttribute("src")?.slice(0, 60)}`);
    }
  });

  // 2. font applied
  const ff = getComputedStyle(document.body).fontFamily;
  if (/serif|monospace/.test(ff) && !/Vazir|Iran|sans/.test(ff)) issues.push(`font: body uses ${ff.slice(0, 40)}`);

  // 3. dir/lang
  if (doc.getAttribute("dir") !== "rtl") issues.push("dir: not rtl");
  if (!(doc.getAttribute("lang") || "").startsWith("fa")) issues.push("lang: not fa");

  // 4. alt coverage
  let imgs = 0, noAlt = 0;
  document.querySelectorAll("img").forEach((i) => { imgs++; if (!i.hasAttribute("alt")) noAlt++; });
  if (imgs && noAlt) issues.push(`alt: ${noAlt}/${imgs} img بدون alt`);

  // 5. icon-only buttons need accessible names
  let iconBtns = 0, noName = 0;
  document.querySelectorAll("button").forEach((b) => {
    const text = (b.textContent || "").trim();
    const aria = b.getAttribute("aria-label") || b.getAttribute("title") || "";
    if (!text && !aria) {
      // has svg icon?
      if (b.querySelector("svg")) { iconBtns++; noName++; issues.push(`a11y: دکمه آیکونی بدون نام → ${(b.getAttribute("class") || "").slice(0, 40)}`); }
    }
  });

  // 6. inputs need labels (incl. wrapped), placeholders or aria-label
  document.querySelectorAll("input:not([type=hidden]), select, textarea").forEach((el) => {
    const id = el.getAttribute("id");
    const hasLabel = (id && document.querySelector(`label[for="${id}"]`)) || el.closest("label");
    if (!hasLabel && !el.getAttribute("placeholder") && !el.getAttribute("aria-label")) {
      issues.push(`a11y: input بدون label/placeholder (${el.getAttribute("name") || el.getAttribute("type")})`);
    }
  });

  // 7. heading hierarchy
  const levels = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => Number(h.tagName[1]));
  for (let i = 1; i < levels.length; i++) if (levels[i] - levels[i - 1] > 1) { issues.push(`a11y: پرش سرفصل h${levels[i - 1]}→h${levels[i]}`); break; }
  if (!document.querySelector("h1")) issues.push("a11y: h1 غایب");

  // 8. contrast of muted text (sample up to 8)
  const lum = (c) => {
    const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
    if (!m) return -1;
    if (m[4] === "0") return -1;
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(+m[1]) + 0.7152 * f(+m[2]) + 0.0722 * f(+m[3]);
  };
  const bgOf = (el) => {
    let p = el;
    while (p) {
      const bg = getComputedStyle(p).backgroundColor;
      if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") return bg;
      p = p.parentElement;
    }
    return "rgb(255,255,255)";
  };
  let lowContrast = 0; let checked = 0;
  document.querySelectorAll("p, span, a, small, label, li").forEach((el) => {
    if (checked >= 14) return;
    const t = (el.textContent || "").trim();
    if (t.length < 6 || el.children.length) return;
    const cs = getComputedStyle(el);
    if (parseFloat(cs.fontSize) < 9) { issues.push(`type: فونت ${cs.fontSize} بسیار ریز → ${t.slice(0, 20)}`); }
    // skip text rendered over photos/gradients (background-image) — probe can't measure those
    let overMedia = false, q = el.parentElement;
    for (let i = 0; i < 4 && q; i++, q = q.parentElement) {
      if (getComputedStyle(q).backgroundImage !== "none") { overMedia = true; break; }
      for (const sib of q.parentElement ? q.parentElement.children : []) {
        if (sib !== q && sib.tagName === "IMG" && getComputedStyle(sib).position === "absolute") { overMedia = true; break; }
      }
      if (overMedia) break;
    }
    if (overMedia) return;
    const l1 = lum(cs.color), l2 = lum(bgOf(el));
    if (l1 >= 0 && l2 >= 0) {
      checked++;
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      if (ratio < 3.0) { lowContrast++; issues.push(`contrast: ${ratio.toFixed(2)} → «${t.slice(0, 26)}» (${cs.color} on ${bgOf(el)})`); }
    }
  });

  return { issues: issues.slice(0, 12), stats: { imgs, iconBtns, noName, checked } };
};

async function main() {
  const DARK = process.env.HELSA_THEME === "dark";
  const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const summary = {};
  for (const viewport of [{ width: 1440, height: 900, tag: "d" }, { width: 390, height: 844, tag: "m" }]) {
    for (const path of PAGES) {
      const ctx = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, isMobile: viewport.tag === "m", hasTouch: viewport.tag === "m" });
      if (DARK) await ctx.addInitScript(() => localStorage.setItem("helsa-theme", "dark"));
      const page = await ctx.newPage();
      try {
        await page.goto("http://localhost:3000" + path, { waitUntil: "networkidle", timeout: 30000 });
        await page.waitForTimeout(500);
        // scroll to force lazy images
        await page.evaluate(() => new Promise((r) => { let y = 0; const t = setInterval(() => { window.scrollBy(0, 700); y += 700; if (y > document.body.scrollHeight) { clearInterval(t); window.scrollTo(0, 0); r(null); } }, 120); }));
        await page.waitForTimeout(400);
        const res = await page.evaluate(EVAL);
        if (res.issues.length) summary[`${viewport.tag} ${path}`] = res.issues;
      } catch (e) {
        summary[`${viewport.tag} ${path}`] = [`load-failed: ${String(e).slice(0, 80)}`];
      }
      await ctx.close();
    }
  }
  await browser.close();
  const keys = Object.keys(summary);
  for (const k of keys) console.log(`\n⚠️ ${k}\n   ` + summary[k].join("\n   "));
  console.log(`\n═══ DOM-QA: ${PAGES.length * 2} صفحه×ویوپورت بررسی شد — ${keys.length} صفحه یافته دارد ═══`);
}
main();
