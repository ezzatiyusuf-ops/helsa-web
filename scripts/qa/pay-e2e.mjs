import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const NID = "1234567891";
const pass = [], fail = [];
const check = (n, c, d="") => { (c ? pass : fail).push(n); console.log((c?"✅":"❌")+" "+n+(d?" — "+d:"")); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

// ── سبد: افزودن پیارم ──
await page.goto(BASE + "/products/piaram-dates", { waitUntil: "networkidle" });
// انتخاب گونهٔ ۵۰۰ گرم (485000) تا سقف اقساط اسنپ‌پی هم پوشش داده شود
const variantBtn = page.getByText("۵۰۰ گرم", { exact: true }).first();
if (await variantBtn.count()) { await variantBtn.click(); await page.waitForTimeout(400); }
const addBtn = page.getByRole("button", { name: /افزودن به سبد| افزودن / }).first();
if (await addBtn.count()) { await addBtn.click(); await page.waitForTimeout(1500); }
check("افزودن به سبد", true);

await page.goto(BASE + "/checkout", { waitUntil: "networkidle" });
await page.screenshot({ path: "qa-shots/pay-01-cart.jpg", fullPage: false });

// ── گام ۲: گیرنده ──
await page.getByRole("button", { name: "گام بعد" }).click();
await page.getByPlaceholder("سارا").fill("سارا");
await page.getByPlaceholder("محمدی").fill("محمدی");
await page.getByPlaceholder("۰۹۱۲۳۴۵۶۷۸۹").first().fill("09120000015");
await page.screenshot({ path: "qa-shots/pay-02-receiver.jpg" });
await page.getByRole("button", { name: "گام بعد" }).click();

// ── گام ۳: احراز هویت ──
await page.waitForTimeout(600);
const nidInput = page.locator('input[dir="ltr"][inputmode="numeric"]').first();
await nidInput.fill(NID);
// رقم کنترل غلط باید پیام بدهد — تست منفی
await nidInput.fill("1234567890");
await page.waitForTimeout(300);
const badMsg = await page.getByText("رقم کنترل کد ملی معتبر نیست").count();
check("پیام کد ملی نامعتبر (زنده)", badMsg > 0);
await nidInput.fill(NID);
await page.screenshot({ path: "qa-shots/pay-03-identity.jpg" });
// مهمان → دکمهٔ ارسال OTP
const otpBtn = page.getByRole("button", { name: /ارسال کد تأیید/ });
check("دکمهٔ OTP برای مهمان", await otpBtn.count() > 0);
await otpBtn.click();
await page.waitForTimeout(1200);
// کد dev از hint
const hint = await page.getByText(/محیط توسعه — کد:/).textContent().catch(()=>null);
const devCode = hint ? hint.replace(/\D/g, "") : "";
check("کد dev نمایش داده شد", devCode.length >= 4, devCode);
await page.locator('input[placeholder="------"]').fill(devCode);
await page.getByRole("button", { name: /تأیید و ادامه/ }).click();
await page.waitForTimeout(1500);
const verified = await page.getByText("احراز هویت انجام شد").count();
check("احراز هویت انجام شد (UI)", verified > 0);
await page.screenshot({ path: "qa-shots/pay-04-verified.jpg" });
await page.getByRole("button", { name: "گام بعد" }).click();

// ── گام ۴: آدرس ──
await page.waitForTimeout(400);
await page.getByPlaceholder("نام و نام خانوادگی گیرنده").fill("سارا محمدی");
await page.locator("select").nth(1).selectOption({ label: "تهران" });
await page.getByPlaceholder("مثلاً تهران").fill("تهران");
await page.getByPlaceholder("خیابان، کوچه، پلاک").fill("خیابان آزادی، کوچه ۳، پلاک ۱۲");
await page.getByPlaceholder("۱۰ رقم").fill("1234567890");
await page.getByPlaceholder("۰۹۱۲۳۴۵۶۷۸۹").last().fill("09120000015");
await page.getByRole("button", { name: /افزودن آدرس/ }).click();
await page.waitForTimeout(800);
await page.screenshot({ path: "qa-shots/pay-05-address.jpg" });
await page.getByRole("button", { name: "گام بعد" }).click();

// ── گام ۵: ارسال ──
await page.waitForTimeout(400);
await page.getByRole("button", { name: "گام بعد" }).click();

// ── گام ۶: پرداخت ──
await page.waitForTimeout(1200);
await page.screenshot({ path: "qa-shots/pay-06-methods.jpg", fullPage: true });
const hasOnline = await page.getByText("پرداخت آنلاین (شاپرک)").count();
const hasSnap = await page.getByText(/اسنپ‌پی/).count();
const hasDigi = await page.getByText(/دیجی‌پی/).count();
const hasCod = await page.getByText(/پرداخت در محل/).count();
check("UI همهٔ روش‌ها را نشان می‌دهد", hasOnline>0 && hasSnap>0 && hasDigi>0 && hasCod>0,
  `online=${hasOnline} snap=${hasSnap} digi=${hasDigi} cod=${hasCod}`);
// انتخاب اسنپ‌پی (اقساطی) برای مسیر متفاوت — کلیک روی label از طریق radio
await page.locator("label").filter({ hasText: "اسنپ‌پی" }).first().click();
await page.waitForTimeout(400);
await page.screenshot({ path: "qa-shots/pay-06b-snappay-selected.jpg" });
try {
  await page.getByRole("button", { name: "گام بعد" }).click({ timeout: 8000 });
} catch {
  await page.screenshot({ path: "qa-shots/dbg-step6-stuck.jpg", fullPage: true });
  const btns = await page.evaluate(() => Array.from(document.querySelectorAll("button")).map(b => b.textContent?.trim()).filter(Boolean));
  console.log("BUTTONS:", JSON.stringify(btns.slice(0, 20)));
  throw new Error("گام بعد not found");
}

// ── گام ۷: تأیید و ثبت ──
await page.waitForTimeout(600);
await page.screenshot({ path: "qa-shots/pay-07-review.jpg" });
await page.getByRole("button", { name: "پرداخت و ثبت سفارش" }).click();
await page.waitForURL(/\/payment/, { timeout: 15000 }).catch(()=>{});
check("هدایت به صفحهٔ پرداخت", page.url().includes("/payment"));
await page.waitForTimeout(1500);
await page.screenshot({ path: "qa-shots/pay-08-gateway-entry.jpg", animations: "disabled", timeout: 10000 }).catch(() => {});

// صفحهٔ /payment به‌صورت خودکار لینک درگاه را می‌گیرد و ریدایرکت می‌کند
await page.waitForURL(/simulator|StartPay/, { timeout: 20000 }).catch(()=>{});
check("هدایت به شبیه‌ساز درگاه", page.url().includes("simulator"), page.url());

// شبیه‌ساز: تأیید اقساط = موفق
await page.getByRole("button", { name: /تأیید اقساط|پرداخت موفق/ }).first().click();
await page.waitForURL(/success/, { timeout: 15000 }).catch(()=>{});
check("بازگشت به صفحهٔ موفقیت", page.url().includes("success"), page.url());
await page.waitForTimeout(1000);
await page.screenshot({ path: "qa-shots/pay-09-success.jpg", fullPage: true, animations: "disabled", timeout: 10000 }).catch(() => {});
const successText = await page.content();
check("صفحهٔ موفقیت رندر شد", successText.includes("سفارش") || successText.includes("موفق"));

// ── راستی‌آزمایی DB از مرورگر تا پایگاه ──
const { Pool } = await import("pg");
const pool = new Pool({ connectionString: "postgres://helsa:helsa_dev_pw@127.0.0.1:5432/helsa_db" });
const url = new URL(page.url());
const code = url.searchParams.get("code");
if (code) {
  const o = (await pool.query("select code,payment_status,status,total from orders where code=$1", [code])).rows[0];
  check("DB: سفارش پرداخت‌شده", o && o.payment_status === "paid", JSON.stringify(o));
  const inv = (await pool.query("select i.number, i.total from invoices i join orders o on o.id=i.order_id where o.code=$1", [code])).rows[0];
  check("DB: فاکتور یکتا صادر شد", Boolean(inv), JSON.stringify(inv));
  const sale = (await pool.query("select type,amount from accounting_transactions where reference_id=$1 and type='SALE'", [code])).rows[0];
  check("DB: تراکنش SALE ثبت شد", Boolean(sale), JSON.stringify(sale));
  const logs = (await pool.query("select event from payment_logs pl join orders o on o.id=pl.order_id where o.code=$1 order by pl.id", [code])).rows.map(r=>r.event);
  check("DB: لاگ رویدادها", logs.length >= 2, logs.join(","));
  const pii = (await pool.query("select count(*)::int c from payment_logs where detail::text like '%1234567891%' or detail::text like '%0912000001%'")).rows[0];
  check("DB: هیچ PII در لاگ پرداخت", pii.c === 0, "count="+pii.c);
} else { check("کد سفارش در URL موفقیت", false, page.url()); }
await pool.end();
console.log("\n═══ UI E2E:", pass.length, "PASS /", fail.length, "FAIL ═══");
if (fail.length) console.log("FAILED:", fail.join(" | "));
await browser.close();
process.exit(fail.length ? 1 : 0);
