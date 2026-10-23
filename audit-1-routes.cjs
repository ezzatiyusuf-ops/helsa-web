// HELSA AUDIT §3/§16/§17/§18/§22/§23 — routes, SEO, performance, mobile, links, images
const { chromium } = require("playwright");
const BASE = "http://localhost:3000";
const results = [];
const rec = (cat, name, val, extra = "") => results.push({ cat, name, val, extra });

(async () => {
  const browser = await chromium.launch();

  // ═══ §3 ROUTE AUDIT ═══════════════════════════════════
  const routes = ["/", "/about", "/account", "/blog", "/campaigns", "/cart", "/checkout", "/compare", "/contact",
    "/experience", "/faq", "/forgot-password", "/founder", "/gifts", "/gifts/corporate", "/gifts/personal",
    "/guides", "/health-center", "/health-center/mental-health", "/instagram", "/login", "/mazeh", "/mazeh-trays",
    "/mehmani", "/offers", "/payment", "/podcast", "/privacy", "/products", "/refund", "/register", "/shipping",
    "/terms", "/track", "/verify", "/videocast", "/wholesale", "/wishlist", "/nonexistent-page-404-test"];
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  for (const r of routes) {
    try {
      const res = await page.goto(BASE + r, { waitUntil: "domcontentloaded", timeout: 15000 });
      const status = res.status();
      const is404page = status === 404;
      rec("route", r, status === 200 ? "200" : String(status), is404page ? "(404 page)" : "");
    } catch (e) { rec("route", r, "ERROR", e.message.slice(0, 60)); }
  }
  // dynamic routes with real slugs
  const slug = await (await fetch(`${BASE}/api/products`)).json();
  const p1 = slug.products[0]?.slug, p2 = slug.products[1]?.slug;
  for (const r of [`/products/${p1}`, `/blog/any-slug`, `/track`]) {
    const res = await page.goto(BASE + r, { waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => null);
    rec("route", r, res ? String(res.status()) : "ERROR");
  }

  // ═══ §16 SEO AUDIT ════════════════════════════════════
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const seo = await page.evaluate(() => ({
    title: document.title,
    metaDesc: document.querySelector('meta[name="description"]')?.content?.slice(0, 80),
    canonical: document.querySelector('link[rel="canonical"]')?.href,
    ogTitle: document.querySelector('meta[property="og:title"]')?.content,
    ogImage: document.querySelector('meta[property="og:image"]')?.content,
    robots: document.querySelector('meta[name="robots"]')?.content,
    ldJson: Array.from(document.querySelectorAll('script[type="application/ld+json"]')).length,
  }));
  rec("seo", "homepage title", seo.title);
  rec("seo", "meta description", seo.metaDesc ? "present" : "MISSING");
  rec("seo", "canonical", seo.canonical);
  rec("seo", "og:title", seo.ogTitle ? "present" : "MISSING");
  rec("seo", "og:image", seo.ogImage);
  rec("seo", "structured data blocks (home)", String(seo.ldJson));
  // product page
  await page.goto(`${BASE}/products/${p1}`, { waitUntil: "networkidle" });
  const pseo = await page.evaluate(() => ({
    title: document.title,
    canonical: document.querySelector('link[rel="canonical"]')?.href,
    ldJson: Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((s) => { try { return JSON.parse(s.textContent)["@type"]; } catch { return "invalid"; } }),
  }));
  rec("seo", `product title (${p1})`, pseo.title);
  rec("seo", "product canonical", pseo.canonical);
  rec("seo", "product structured data", JSON.stringify(pseo.ldJson));
  // robots.txt + sitemap
  const robots = await (await fetch(`${BASE}/robots.txt`)).text();
  rec("seo", "robots.txt", robots.includes("Disallow") ? `present (${robots.split("\n").filter(Boolean).length} lines)` : "MISSING");
  const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
  rec("seo", "sitemap.xml", sitemap.includes("<urlset") || sitemap.includes("<sitemapindex") ? `present (${(sitemap.match(/<loc>/g) || []).length} urls)` : "MISSING");
  rec("seo", "sitemap base url", (sitemap.match(/<loc>([^<]+)<\/loc>/) || [])[1] || "?");
  // cart noindex
  await page.goto(`${BASE}/cart`, { waitUntil: "networkidle" });
  const cartRobots = await page.evaluate(() => document.querySelector('meta[name="robots"]')?.content);
  rec("seo", "cart noindex", cartRobots || "MISSING");

  // ═══ §17 PERFORMANCE (actual measurements) ════════════
  const perfCtx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const perfPage = await perfCtx.newPage();
  const t0 = Date.now();
  await perfPage.goto(BASE + "/", { waitUntil: "load", timeout: 30000 });
  const loadMs = Date.now() - t0;
  const nav = await perfPage.evaluate(() => {
    const n = performance.getEntriesByType("navigation")[0] || {};
    const res = performance.getEntriesByType("resource");
    const js = res.filter((r) => r.name.endsWith(".js") || r.name.includes("/_next/static/chunks"));
    const img = res.filter((r) => /\.(jpg|jpeg|png|webp|avif)/.test(r.name));
    return {
      ttfb: Math.round(n.responseStart || 0),
      domContentLoaded: Math.round(n.domContentLoadedEventEnd || 0),
      transferKB: Math.round(res.reduce((a, r) => a + (r.transferSize || 0), 0) / 1024),
      jsFiles: js.length, jsKB: Math.round(js.reduce((a, r) => a + (r.transferSize || 0), 0) / 1024),
      imgFiles: img.length, imgKB: Math.round(img.reduce((a, r) => a + (r.transferSize || 0), 0) / 1024),
      reqs: res.length,
    };
  });
  rec("perf", "homepage load (browser, load event)", `${loadMs} ms`);
  rec("perf", "TTFB (localhost)", `${nav.ttfb} ms`);
  rec("perf", "resources", `${nav.reqs} reqs · ${nav.transferKB} KB transferred`);
  rec("perf", "JS bundle", `${nav.jsFiles} files · ${nav.jsKB} KB`);
  rec("perf", "images on home", `${nav.imgFiles} files · ${nav.imgKB} KB`);
  // product page perf
  const t1 = Date.now();
  await perfPage.goto(`${BASE}/products/${p1}`, { waitUntil: "load" });
  rec("perf", "product page load", `${Date.now() - t1} ms`);
  // lazy loading check
  const lazy = await perfPage.evaluate(() => document.querySelectorAll('img[loading="lazy"]').length);
  rec("perf", "img[loading=lazy] on product page", String(lazy));
  await perfCtx.close();

  // ═══ §18 MOBILE AUDIT (375×812) ═══════════════════════
  const mob = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
  const mp = await mob.newPage();
  for (const r of ["/", "/products", "/cart", "/login", "/register", "/checkout"]) {
    await mp.goto(BASE + r, { waitUntil: "networkidle", timeout: 20000 });
    const over = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    rec("mobile", `${r} overflow`, over <= 0 ? "none" : `${over}px HORIZONTAL OVERFLOW`);
  }
  // touch targets on products page
  await mp.goto(`${BASE}/products`, { waitUntil: "networkidle" });
  const targets = await mp.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("a, button")).filter((b) => b.offsetParent !== null);
    const small = btns.filter((b) => { const r = b.getBoundingClientRect(); return r.height > 0 && r.height < 32; });
    return { total: btns.length, under32px: small.length };
  });
  rec("mobile", "touch targets < 32px height", `${targets.under32px}/${targets.total}`);
  await mp.screenshot({ path: "qa-shots/audit-mobile-products.png" });
  await mob.close();

  // ═══ §22 BROKEN LINKS (crawl from key pages) ══════════
  const seen = new Set(); const broken = [];
  const crawl = async (path, depth) => {
    if (seen.has(path) || broken.length > 20) return;
    seen.add(path);
    try {
      await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 15000 });
    } catch { return; }
    const hrefs = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")).filter(Boolean));
    for (const h of hrefs) {
      if (!h.startsWith("/")) continue;
      const clean = h.split("#")[0].split("?")[0] || "/";
      if (seen.has(clean) || seen.has(clean + "/")) continue;
      seen.add(clean);
      const st = await page.evaluate(async (u) => (await fetch(u, { method: "HEAD" }).catch(() => ({ status: 0 }))).status, clean);
      if (st >= 400) broken.push(`${clean} → ${st}`);
      if (depth > 0 && st === 200 && ["/", "/products", "/gifts", "/mazeh-trays", "/campaigns", "/blog"].includes(clean)) await crawl(clean, depth - 1);
    }
  };
  await crawl("/", 1);
  rec("links", "internal links crawled", `${seen.size} unique`, broken.length ? `BROKEN: ${broken.slice(0, 10).join(", ")}` : "0 broken");

  // ═══ §23 IMAGE AUDIT ══════════════════════════════════
  let brokenImgs = 0, noAlt = 0, totalImgs = 0;
  for (const r of ["/", "/products", `/products/${p1}`, "/gifts", "/mazeh-trays"]) {
    await page.goto(BASE + r, { waitUntil: "networkidle" });
    const imgs = await page.evaluate(() => Array.from(document.images).map((i) => ({ ok: i.complete && i.naturalWidth > 0, alt: i.alt })));
    totalImgs += imgs.length;
    brokenImgs += imgs.filter((i) => !i.ok).length;
    noAlt += imgs.filter((i) => !i.alt).length;
  }
  rec("images", "images checked", `${totalImgs}`, `broken=${brokenImgs} noAlt=${noAlt}`);

  await browser.close();
  console.log("════════ AUDIT PART 1 RESULTS ════════");
  for (const r of results) console.log(`[${r.cat}] ${r.name}: ${r.val} ${r.extra}`);
})().catch((e) => { console.error("SCRIPT ERROR:", e.message); process.exit(1); });
