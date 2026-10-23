/**
 * کرالر متادیتا — qa-meta-crawl.cjs (خواستهٔ #۱۷–۱۹ ممیزی)
 * برای هر مسیر عمومی، <head> را واقعاً می‌خواند و بررسی می‌کند:
 *   canonical = آدرس خود صفحه (خودارجاع)
 *   title یکتا و غیرخالی (≠ عنوان خانه)
 *   og:title · og:description · og:url = مسیر خود صفحه
 *   /faq متادیتای اختصاصی دارد (#۱۹)
 * و /shipping اعداد ارسال را با منبع واحد تطبیق می‌دهد (#۱۷).
 */
const BASE = process.env.QA_BASE || "http://localhost:3000";
const SITE = "https://helsairanian.ir"; // NEXT_PUBLIC_SITE_URL این بیلد

const ROUTES = [
  "/", "/about", "/faq", "/shipping", "/offers", "/contact", "/terms", "/refund", "/privacy",
  "/products", "/mazeh-trays", "/gifts", "/gifts/personal", "/gifts/corporate", "/campaigns",
  "/experience", "/wholesale", "/blog", "/guides", "/health-center", "/founder", "/mehmani", "/compare",
];

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log(`PASS: ${m}`); };
const bad = (m) => { fail++; console.log(`FAIL: ${m}`); };

(async () => {
  const homeTitle = "هلسا مارکت | هلسا ایرانیان — چون شما لایق بهترین‌ها هستید ...";
  const rows = [];
  for (const path of ROUTES) {
    const r = await fetch(`${BASE}${path}`, { redirect: "follow" }).catch(() => null);
    if (!r || r.status !== 200) { bad(`${path} → HTTP ${r && r.status}`); continue; }
    const html = await r.text();
    const pick = (re) => (html.match(re) || [])[1] ?? "";
    const canonical = pick(/<link rel="canonical" href="([^"]+)"/);
    const title = pick(/<title[^>]*>([^<]+)<\/title>/);
    const ogTitle = pick(/<meta property="og:title" content="([^"]*)"/);
    const ogDesc = pick(/<meta property="og:description" content="([^"]*)"/);
    const ogUrl = pick(/<meta property="og:url" content="([^"]*)"/);
    const expected = `${SITE}${path === "/" ? "" : path}`;
    const issues = [];
    if (canonical !== expected) issues.push(`canonical="${canonical}"`);
    if (!title || title === homeTitle && path !== "/") issues.push(`title="${title.slice(0, 40)}"`);
    if (path !== "/" && (!ogTitle || ogTitle === homeTitle)) issues.push("ogTitle");
    if (!ogDesc) issues.push("ogDesc");
    if (ogUrl && ogUrl !== expected) issues.push(`ogUrl="${ogUrl}"`);
    issues.length === 0 ? ok(`${path} ✓ head کامل و خودارجاع`) : bad(`${path} → ${issues.join(" · ")}`);
    rows.push([path, canonical, title.slice(0, 60)]);
  }

  /* #۱۹ — /faq متادیتای اختصاصی */
  {
    const r = await fetch(`${BASE}/faq`).then((x) => x.text());
    const title = (r.match(/<title[^>]*>([^<]+)</) || [])[1] ?? "";
    /سوالات متداول/.test(title) && title !== homeTitle
      ? ok(`/faq عنوان اختصاصی: «${title}»`)
      : bad(`/faq title="${title}"`);
    r.includes('FAQPage') ? ok("/faq دارای FAQPage JSON-LD") : bad("/faq FAQPage schema");
  }
  /* #۱۵ — mazeh-trays */
  {
    const r = await fetch(`${BASE}/mazeh-trays`).then((x) => x.text());
    r.includes('FAQPage') ? ok("/mazeh-trays دارای FAQPage JSON-LD") : bad("/mazeh-trays FAQPage schema");
  }
  /* #۱۷ — اعداد ارسال از منبع واحد */
  {
    const r = await fetch(`${BASE}/shipping`).then((x) => x.text());
    const body = r.replace(/<script[\s\S]*?<\/script>/g, "");
    body.includes("۲٬۰۰۰٬۰۰۰") ? ok("/shipping آستانه = ۲٬۰۰۰٬۰۰۰ (منبع واحد)") : bad("/shipping threshold");
    body.includes("۸۵٬۰۰۰") ? ok("/shipping هزینه ثابت = ۸۵٬۰۰۰ (SITE.shippingFee)") : bad("/shipping fee");
    /۲٬۰۰۰٬۰۰[^۰]/.test(body) ? bad("/shipping هنوز عدد ناقص دارد") : null;
  }

  console.log(`\n═══ META-CRAWL RESULT: PASS=${pass} FAIL=${fail} ═══`);
  console.log("\nمسیر | canonical | title");
  for (const [p, c, t] of rows) console.log(`${p} | ${c.replace(SITE, "")} | ${t}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
