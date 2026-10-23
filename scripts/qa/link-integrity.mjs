/** HELSA — link & route integrity sweep */
const BASE = "http://localhost:3000";
const seedPages = ["/", "/products", "/mazeh-trays", "/gifts", "/blog", "/wholesale", "/about", "/contact", "/mehmani", "/mazeh", "/experience", "/faq", "/track", "/login", "/register"];
const seen = new Set();
const problems = [];
const queue = [...seedPages];

while (queue.length) {
  const path = queue.shift();
  if (seen.has(path)) continue;
  seen.add(path);
  let html;
  try {
    const res = await fetch(BASE + path);
    if (res.status !== 200) { problems.push(`${path} → HTTP ${res.status}`); continue; }
    html = await res.text();
  } catch (e) { problems.push(`${path} → fetch error`); continue; }
  // صفحهٔ خالی (بدون h1 و بدون محتوای main)؟
  const hasMain = /<main[\s>]/.test(html);
  const hasH1 = /<h1[\s>]/.test(html);
  const CLIENT_HEADED = ["/login", "/register"]; // h1 پس از hydration رندر می‌شود
  if (hasMain && !hasH1 && !path.startsWith("/api") && !CLIENT_HEADED.includes(path)) problems.push(`${path} → 200 اما بدون h1 (صفحهٔ خالی؟)`);
  // لینک‌های داخلی
  const hrefs = [...html.matchAll(/href="\/(?!\/)([^"#?]*)/g)].map((m) => "/" + m[1].replace(/\/$/, ""));
  for (const h of hrefs) {
    if (seen.has(h) || queue.includes(h)) continue;
    if (/\.(png|jpg|webp|avif|svg|ico|xml|txt|css|js|woff2?)$/.test(h)) continue;
    queue.push(h);
  }
}
console.log(`checked ${seen.size} unique internal routes`);
console.log(problems.length ? "❌ مشکلات:\n" + problems.join("\n") : "✅ همهٔ مسیرها سالم و دارای محتوا");
process.exit(problems.length ? 1 : 0);
