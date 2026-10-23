#!/usr/bin/env node
/**
 * HELSA — ساخت ست کامل برند از لوگوی رسمی:
 * ۱) وکتور SVG (ماسک آلفا → PBM → potrace) با رنگ برند
 * ۲) favicon set: 16/32/48 + favicon.ico چندسایز + apple-touch 180 + icon-192/512 + maskable
 * ۳) manifest.webmanifest (فایل گم‌شده)
 */
const sharp = require("sharp");
const fs = require("fs");
const { execFileSync } = require("child_process");

const LOGO = "public/brand/helsa-logo.png";
const GREEN = "#3e8701"; // LOGO_GREEN رسمی
const CREAM = "#fffdf9";

async function main() {
  const meta = await sharp(LOGO).metadata();
  const stats = await sharp(LOGO).stats();

  // ── ۱) ماسک آلفا → PBM
  const { data, info } = await sharp(LOGO).ensureAlpha().extractChannel("alpha").raw().toBuffer({ resolveWithObject: true });
  const rows = [];
  for (let y = 0; y < info.height; y++) {
    let row = "";
    for (let x = 0; x < info.width; x++) row += data[y * info.width + x] > 100 ? "1" : "0";
    rows.push(row);
  }
  fs.writeFileSync("/tmp/logo.pbm", `P1\n${info.width} ${info.height}\n${rows.join("\n")}\n`);

  // ── ۲) potrace → SVG + رنگ برند
  execFileSync("potrace", ["/tmp/logo.pbm", "-s", "--flat", "-o", "/tmp/logo-raw.svg", "-u", "1"]);
  let svg = fs.readFileSync("/tmp/logo-raw.svg", "utf8");
  svg = svg.replace(/fill="#000000"/g, `fill="${GREEN}"`).replace(/<\?xml[^>]*\?>\n?/, "");
  svg = `<!-- HELSA — official logo vector (traced from the uploaded brand mark; single brand green ${GREEN}) -->\n` + svg;
  fs.writeFileSync("public/brand/helsa-logo.svg", svg);
  const paths = (svg.match(/<path/g) || []).length;
  const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  console.log(`SVG ✓ ${Math.round(vb[1])}x${Math.round(vb[2])} | ${paths} path | نسبت: ${(vb[1] / vb[2]).toFixed(3)} (منبع: ${(meta.width / meta.height).toFixed(3)})`);
  console.log(`واریانس رنگ لوگو (stdev RGB): ${stats.channels.slice(0, 3).map((c) => c.stdev.toFixed(1)).join("/")} — تک‌رنگ بودن برای trace`);

  // ── ۳) favicon set از PNG اصلی (شفاف)
  const plate = (size, bg) =>
    sharp({ create: { width: size, height: size, channels: 4, background: bg } }).png();
  async function iconFrom(size, file, bg, pad = 0) {
    const inner = Math.round(size * (1 - pad));
    const resized = await sharp(LOGO).resize(inner, inner, { fit: "inside" }).png().toBuffer();
    if (bg) {
      await sharp(await plate(size, bg).toBuffer()).composite([{ input: resized, gravity: "center" }]).png().toFile(file);
    } else {
      await sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
        .composite([{ input: resized, gravity: "center" }]).png().toFile(file);
    }
  }
  await iconFrom(16, "public/icons/favicon-16.png", null);
  await iconFrom(32, "public/icons/favicon-32.png", null);
  await iconFrom(48, "public/icons/favicon-48.png", null);
  await iconFrom(180, "public/icons/apple-touch-icon.png", { r: 255, g: 253, b: 249, alpha: 1 }); // اپل: مات
  await iconFrom(192, "public/icons/icon-192.png", null);
  await iconFrom(512, "public/icons/icon-512.png", null);
  await iconFrom(512, "public/icons/icon-512-maskable.png", GREEN, 0.24); // ناحیهٔ امن ماسک‌پذیر روی سبز

  // ── ۴) favicon.ico (۱۶+۳۲+۴۸ به‌صورت PNG-embedded — معتبر از Vista به بعد)
  const sizes = [16, 32, 48];
  const pngs = [];
  for (const s of sizes) pngs.push(fs.readFileSync(`public/icons/favicon-${s}.png`));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
  const entries = [];
  let offset = 6 + 16 * sizes.length;
  sizes.forEach((s, i) => {
    const e = Buffer.alloc(16);
    e[0] = s === 256 ? 0 : s; e[1] = s === 256 ? 0 : s;
    e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
    e.writeUInt32LE(pngs[i].length, 8); e.writeUInt32LE(offset, 12);
    entries.push(e);
    offset += pngs[i].length;
  });
  fs.writeFileSync("public/icons/favicon.ico", Buffer.concat([header, ...entries, ...pngs]));

  // ── ۵) favicon.svg (واترفال مدرن مرورگرها)
  const png512 = fs.readFileSync("public/icons/icon-512.png").toString("base64");
  fs.writeFileSync(
    "public/icons/favicon.svg",
    `<!-- HELSA favicon — vector form of the official mark -->\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb[0]}">\n${svg.replace(/<!--.*-->\n/, "").replace(/<svg[^>]*>/, "").replace(/<\/svg>/, "")}</svg>`,
  );

  // ── ۶) manifest.webmanifest (گم‌شده — layout ارجاع می‌دهد)
  fs.writeFileSync(
    "public/manifest.webmanifest",
    JSON.stringify(
      {
        name: "هلسا ایرانیان — فروشگاه محصولات طبیعی",
        short_name: "هلسا",
        description: "خرید آنلاین خرما، خشکبار، عسل و محصولات طبیعی پرمیوم هلسا",
        lang: "fa",
        dir: "rtl",
        start_url: "/",
        display: "standalone",
        background_color: "#fffdf9",
        theme_color: "#0b5f3b",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      null,
      2,
    ),
  );
  console.log("favicon set ✓ (16/32/48/ico/180/192/512/512-maskable/svg) + manifest.webmanifest ✓");
}
main().catch((e) => { console.error(e); process.exit(1); });
