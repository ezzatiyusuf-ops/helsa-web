/**
 * HELSA — ممیزی تصویر همهٔ صفحات (playwright).
 * صفحات = sitemap + صفحات اضافی + یکی از جزئیات محصول هر دسته + ۳ پست وبلاگ.
 * برای فعال‌شدن تصاویر lazy، صفحه به‌تدریج اسکرول می‌شود؛ سپس همهٔ <img>ها
 * از نظر naturalWidth > 0 (بارگذاری موفق) بررسی می‌شوند.
 * Run: node scripts/qa/image-audit.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

const EXTRA = [
  "/", "/products", "/products?cat=dates", "/products?cat=nuts", "/products?cat=dried-fruits",
  "/products?cat=date-products", "/products?cat=natural", "/mazeh", "/mazeh-trays",
  "/mazeh-trays/build", "/mehmani", "/experience", "/gifts", "/gifts/personal", "/gifts/corporate",
  "/wholesale", "/offers", "/campaigns", "/blog", "/about", "/contact", "/faq", "/instagram",
];

const BLOGS = ["/blog/date-benefits", "/blog/nuts-buying-guide", "/blog/dried-fruit-storage"];

async function json(path) {
  try {
    const r = await fetch(BASE + path);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

async function pageList() {
  const pages = new Set(EXTRA);
  // sitemap
  try {
    const xml = await (await fetch(BASE + "/sitemap.xml")).text();
    for (const m of xml.matchAll(/<loc>[^<]+<\/loc>/g)) {
      const u = new URL(m[0].replace(/<\/?loc>/g, ""));
      if (u.origin === new URL(BASE).origin) pages.add(u.pathname + u.search);
    }
  } catch { /* بدون sitemap ادامه می‌دهیم */ }
  // یکی از جزئیات محصول هر دسته
  const prods = await json("/api/products?limit=200");
  const byCat = new Map();
  for (const p of prods?.products ?? []) {
    const c = typeof p.category === "string" ? p.category : (p.category?.slug ?? p.categorySlug ?? "_");
    if (!byCat.has(c)) byCat.set(c, p.slug);
  }
  for (const slug of byCat.values()) pages.add(`/products/${slug}`);
  // بلاگ‌ها
  for (const b of BLOGS) pages.add(b);
  const blog = await json("/api/blog");
  for (const p of blog?.posts ?? []) if (p.slug) pages.add(`/blog/${p.slug}`);
  // صفحات احراز-خواه را حذف کن
  return [...pages].filter((p) => !p.startsWith("/admin") && !p.startsWith("/account"));
}

async function main() {
  const pages = await pageList();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();

  let totalImgs = 0;
  const broken = [];
  const failed = [];

  for (const path of pages) {
    try {
      const resp = await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 30000 });
      if (!resp?.ok()) {
        failed.push(`${path} → HTTP ${resp?.status()}`);
        continue;
      }
      // اسکرول تدریجی برای فعال‌سازی lazy images
      await page.evaluate(async () => {
        const step = window.innerHeight;
        for (let y = 0; y < document.body.scrollHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 120));
        }
        window.scrollTo(0, document.body.scrollHeight);
      });
      await page.waitForTimeout(300);
      const imgs = await page.evaluate(async () => {
        const out = [];
        for (const i of document.querySelectorAll("img")) {
          const src = i.currentSrc || i.src;
          if (!src) continue;
          if (i.naturalWidth > 0) { out.push({ src, w: 1 }); continue; }
          // تصویر lazy هنوز لود نشده (مثلاً اسلاید افقی کاروسل) → راستی‌آزمایی HTTP مستقیم
          try {
            const r = await fetch(src);
            const ct = r.headers.get("content-type") ?? "";
            out.push({ src, w: r.ok && ct.startsWith("image/") ? 1 : 0, http: r.status });
          } catch {
            out.push({ src, w: 0, http: 0 });
          }
        }
        return out;
      });
      totalImgs += imgs.length;
      for (const i of imgs) if (!i.w) broken.push(`${path} → ${i.src.split("/").pop()} (HTTP ${i.http})`);
    } catch (e) {
      failed.push(`${path} → ${String(e).split("\n")[0]}`);
    }
  }

  await browser.close();
  console.log(`\n═══ IMAGE AUDIT: ${pages.length} صفحه / ${totalImgs} تصویر ═══`);
  if (broken.length) {
    console.log(`❌ خراب (${broken.length}):`);
    broken.slice(0, 30).forEach((b) => console.log("  " + b));
  } else console.log("✅ صفر تصویر خراب");
  if (failed.length) {
    console.log(`⚠️ صفحات ناموفق (${failed.length}):`);
    failed.forEach((f) => console.log("  " + f));
  }
  process.exit(broken.length || failed.length ? 1 : 0);
}

main();
