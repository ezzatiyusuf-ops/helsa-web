/**
 * فاز ۲ — ممیزی ایستا: هر مسیر تصویر ارجاع‌شده در سورس (src/) و DB باید
 * یک فایل واقعی در public/ داشته باشد. خروجی: فهرست گم/خراب.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { execSync } from "node:child_process";
import path from "node:path";

const refs = new Map(); // path → sources[]
const add = (p, src) => { if (!refs.has(p)) refs.set(p, new Set()); refs.get(p).add(src); };

// ۱) اسکن سورس
async function scan(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await scan(p);
    else if (/\.(tsx?|mjs|json)$/.test(e.name) && !p.includes("image-variants")) {
      const txt = (await readFile(p, "utf8")).slice(0, 400_000);
      for (const m of txt.matchAll(/[\"']((?:\/images|\/icons|\/fonts)\/[^\"'?]+\.(?:jpg|jpeg|png|webp|avif|svg|ico|woff2?))[\"']/g)) add(m[1], p);
    }
  }
}
await scan("src");
await scan("public").catch(() => {});
// sw.js هم
for (const m of (await readFile("public/sw.js", "utf8")).matchAll(/[`"']((?:\/images|\/icons|\/fonts)\/[^`"'?]+\.(?:jpg|jpeg|png|webp|avif|svg|ico|woff2))[`"']/g)) add(m[1], "public/sw.js");

// ۲) DB: products / mazeh_trays / gift_packages / product_images / posts
const q = (sql) => execSync(`PGPASSWORD=helsa_dev_pw psql -h 127.0.0.1 -U helsa -d helsa_db -t -A -F$'\\t' -c ${JSON.stringify(sql)}`, { encoding: "utf8" }).trim().split("\n").filter(Boolean);
for (const [tbl, col] of [["products","image"],["mazeh_trays","image"],["gift_packages","image"],["posts","cover_image"]]) {
  try { for (const r of q(`select ${col} from ${tbl} where ${col} is not null`)) add(r, `db:${tbl}`); } catch {}
}
for (const r of q(`select url from product_images`)) add(r, "db:product_images");

// ۳) بررسی وجود فایل
let ok = 0; const missing = [];
for (const [p, srcs] of refs) {
  try { await stat(path.join("public", p)); ok++; }
  catch { missing.push({ p, srcs: [...srcs].join(", ") }); }
}
console.log(`ارجاع‌ها: ${refs.size} | موجود: ${ok} | گم: ${missing.length}`);
for (const m of missing) console.log(`  ✗ ${m.p}\n     ↳ ${m.srcs}`);
process.exit(missing.length ? 1 : 0);
