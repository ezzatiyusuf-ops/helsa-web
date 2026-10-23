/**
 * تست‌های واحد — منطق خالص (بدون DOM)
 * اجرا: npm run test:unit   (node --import tsx --test)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { countdownParts } from "../src/lib/countdown";
import { formatToman, formatPriceShort, faDigits, discountPercent } from "../src/lib/format";
import { toOwnerOrderDto } from "../src/lib/order-dto";

/* ── شمارش معکوس (#۱۶) ── */
test("countdown: تاریخ آینده → مقادیر درست و ناصفر", () => {
  const now = new Date("2026-09-16T12:00:00");
  // کمپین واقعی فلش‌آفر: 2026-12-30T23:59:59 → ~105 روز
  const r = countdownParts("2026-12-30T23:59:59", now);
  assert.ok(r, "باید مقدار برگرداند");
  assert.equal(r.d, 105);
  assert.equal(r.h, 11);
  assert.ok(r.m >= 0 && r.s >= 0);
  assert.ok(r.d > 0 || r.h > 0 || r.m > 0 || r.s > 0, "هرگز همه صفر نباید باشند");
});

test("countdown: تاریخ دقیقاً ۱ روز و ۲ ساعت بعد", () => {
  const now = new Date("2026-09-16T10:00:00");
  const r = countdownParts("2026-09-17T12:00:00", now);
  assert.ok(r);
  assert.equal(r.d, 1);
  assert.equal(r.h, 2);
});

test("countdown: تاریخ گذشته → null (مخفی‌سازی، نه صفر)", () => {
  assert.equal(countdownParts("2020-01-01T00:00:00"), null);
});

test("countdown: تاریخ نامعتبر (رشتهٔ شمسی خام) → null", () => {
  assert.equal(countdownParts("۹ دی ۱۴۰۵"), null);
  assert.equal(countdownParts(""), null);
  assert.equal(countdownParts("undefinedT23:59:59"), null);
});

/* ── فرمت ارز (#۱۱) — منبع واحد «تومان» ── */
test("formatToman: دقیقاً یک «تومان» با فاصله", () => {
  const out = formatToman(890000);
  assert.equal((out.match(/تومان/g) || []).length, 1);
  assert.ok(out.includes("۸۹۰٬۰۰۰"));
  assert.ok(out.startsWith("۸۹۰٬۰۰۰ "));
});

test("formatPriceShort: فقط عدد، بدون ارز", () => {
  assert.equal((formatPriceShort(1020000).match(/تومان/g) || []).length, 0);
});

test("discountPercent/سالم بودن اعداد", () => {
  assert.equal(discountPercent(890000, 1020000), 13);
  assert.equal(discountPercent(500000, null), 0);
  assert.equal(faDigits("123"), "۱۲۳");
});

/* ── واریانت‌ها: منبع واحد قیمت/وزن نمایش (F-02/F-03) ── */
import { firstActiveVariant, cheapestAvailableVariant, activeVariants } from "../src/lib/variants";
import { cartSubtotal, couponDiscount, shippingFee } from "../src/lib/money";
import { SITE } from "../src/config/site";

const V = (id: number, price: number, stock: number, sortOrder = 0, isActive = true) => ({
  id, name: `واریانت ${id}`, sku: `SKU-${id}`, price, compareAtPrice: null, stock,
  weight: 100 * id, unit: "گرم", flavor: null, isActive, sortOrder,
});

test("activeVariants: غیرفعال‌ها حذف و ترتیب با sortOrder حفظ می‌شود", () => {
  const p = { variants: [V(3, 300, 5, 2), V(1, 100, 5, 0), V(2, 200, 5, 1, false)] };
  const list = activeVariants(p);
  assert.equal(list.length, 2);
  assert.equal(list[0]!.id, 1);
  assert.equal(list[1]!.id, 3);
});

test("firstActiveVariant: اولین فعال = پیش‌فرض نمایش PDP؛ بدون واریانت → null", () => {
  assert.equal(firstActiveVariant({ variants: [V(9, 900, 5, 5), V(2, 200, 5, 1)] })!.id, 2);
  assert.equal(firstActiveVariant({ variants: [] }), null);
  assert.equal(firstActiveVariant({}), null);
});

test("cheapestAvailableVariant: ارزان‌ترینِ «موجود» — ناموجودها هرگز قیمت کارت را نمی‌سازند", () => {
  const p = { variants: [V(1, 100_000, 0), V(2, 200_000, 3), V(3, 150_000, 7)] };
  const c = cheapestAvailableVariant(p)!;
  assert.equal(c.id, 3); // ۱۰۰هزار ناموجود است → ۱۵۰هزار
  assert.equal(cheapestAvailableVariant({ variants: [V(1, 1, 0)] }), null);
});

test("cartSubtotal: جمع صحیح (قیمت × تعداد)", () => {
  const items = [
    { key: "a", kind: "product", id: 1, name: "الف", slug: "a", image: "", price: 267_000, weight: "۲۵۰ گرم", qty: 2 },
    { key: "b", kind: "product", id: 2, name: "ب", slug: "b", image: "", price: 485_000, weight: "۵۰۰ گرم", qty: 1 },
  ] as never[];
  assert.equal(cartSubtotal(items as never), 267_000 * 2 + 485_000);
});

test("couponDiscount: درصد/ثابت/سقف/حداقل خرید", () => {
  // درصد با سقف
  assert.equal(couponDiscount(500_000, { type: "percent", value: 10, minimumPurchase: 0, maximumDiscount: 40_000 } as never), 40_000);
  // درصد بدون سقف
  assert.equal(couponDiscount(500_000, { type: "percent", value: 10, minimumPurchase: 0, maximumDiscount: null } as never), 50_000);
  // ثابت
  assert.equal(couponDiscount(500_000, { type: "fixed", value: 200_000, minimumPurchase: 1_000_000, maximumDiscount: null } as never), 0); // زیر حداقل → صفر
  assert.equal(couponDiscount(1_200_000, { type: "fixed", value: 200_000, minimumPurchase: 1_000_000, maximumDiscount: null } as never), 200_000);
  // بدون کوپن
  assert.equal(couponDiscount(999_999, null), 0);
});

test("shippingFee (F-01): سبد خالی = صفر · زیر آستانه = کرایهٔ پایه · بالای آستانه = رایگان", () => {
  assert.equal(shippingFee(0, 0), 0, "سبد خالی هرگز هزینهٔ ارسال ندارد");
  assert.equal(shippingFee(100_000, 3), SITE.shippingFee);
  assert.equal(shippingFee(SITE.freeShippingThreshold, 3), 0);
  assert.equal(shippingFee(SITE.freeShippingThreshold - 1, 1), SITE.shippingFee);
});

test("پایداری واحد پول: توابع پولی همیشه خروجی صحیح (integer) می‌دهند", () => {
  const d = couponDiscount(333_333, { type: "percent", value: 10, minimumPurchase: 0, maximumDiscount: null } as never);
  assert.ok(Number.isInteger(d));
});

/* ── مالکیت سفارش (S-01) — رگرسیون امنیتی ──
 * باگ اصلی: نشستِ بدون `customer:N` بررسی مالکیت را «رد» می‌کرد.
 * این تست‌ها همان مسیر را قفل می‌کنند تا دوباره باز نشود.
 */
import { orderOwnedBySession } from "../src/lib/order-access";

const customerSession = { sub: "customer:42", email: "ali@example.com", phone: "09121234567" };

test("S-01: نشستِ بدون شناسهٔ مشتری هرگز مالک سفارشِ متصل به حساب نیست", () => {
  const emailOnlySession = { sub: "email:someone@else.com", email: "someone@else.com", phone: "09120000000" };
  assert.equal(
    orderOwnedBySession({ session: emailOnlySession, orderCustomerId: 42 }),
    false,
    "عدم تطبیق → دسترسی ممنوع (fail-closed)",
  );
});

test("S-01: تطبیق با شناسهٔ نشست", () => {
  assert.equal(orderOwnedBySession({ session: customerSession, orderCustomerId: 42 }), true);
  assert.equal(orderOwnedBySession({ session: customerSession, orderCustomerId: 43 }), false);
});

test("S-01: تطبیق ایمیل/موبایل روی رکورد مشتری (حساب بدون sub)", () => {
  const emailSession = { sub: "google:abc", email: "ALI@example.com", phone: "" };
  assert.equal(
    orderOwnedBySession({ session: emailSession, orderCustomerId: 42, customerEmail: "ali@example.com" }),
    true,
    "ایمیل باید case-insensitive باشد",
  );
  const phoneSession = { sub: "otp:xyz", email: "", phone: "۰۹۱۲۱۲۳۴۵۶۷" };
  assert.equal(
    orderOwnedBySession({ session: phoneSession, orderCustomerId: 42, customerPhone: "09121234567" }),
    true,
    "ارقام فارسی و ‎+98 باید نرمال شوند",
  );
});

test("S-01: سفارش مهمان فقط با snapshot تطبیق می‌شود", () => {
  assert.equal(
    orderOwnedBySession({ session: customerSession, orderCustomerId: null, snapshot: { mobile: "09121234567" } }),
    true,
  );
  assert.equal(
    orderOwnedBySession({ session: customerSession, orderCustomerId: null, snapshot: { mobile: "09129999999" } }),
    false,
  );
  assert.equal(orderOwnedBySession({ session: null, orderCustomerId: 42 }), false, "بدون نشست → ممنوع");
});

test("S-01: دادهٔ خالی هرگز «مالک» نمی‌سازد", () => {
  const blank = { sub: "customer:7", email: "", phone: "" };
  assert.equal(orderOwnedBySession({ session: blank, orderCustomerId: 7, customerEmail: "", customerPhone: "" }), true, "sub تطبیق دارد");
  assert.equal(orderOwnedBySession({ session: blank, orderCustomerId: 8, customerEmail: "", customerPhone: "" }), false);
  assert.equal(orderOwnedBySession({ session: blank, orderCustomerId: null, snapshot: { mobile: "" } }), false);
});

/* ── ماشین حالت کارت‌به‌کارت (فاز ۷) — قفل قاعدهٔ «رسید ≠ پرداخت» ── */
import {
  canTransition, checkAdminTransition, mayMarkOrderPaid, canSubmitReceipt,
  displayStateForReceipts, isTerminal, CARD_RECEIPT_STATES, canStartNewReceipt,
} from "../src/lib/card-payment";
import { formatCardNumber, isCardNumber, last4, normalizeCardNumber, cardNumberFa } from "../src/lib/card";

test("C2C: آپلود رسید فقط از awaiting_payment/requires_more_information", () => {
  assert.equal(canSubmitReceipt("awaiting_payment"), true);
  assert.equal(canSubmitReceipt("requires_more_information"), true);
  assert.equal(canSubmitReceipt("receipt_submitted"), false);
  assert.equal(canSubmitReceipt("pending_verification"), false);
  assert.equal(canSubmitReceipt("verified"), false);
  assert.equal(canSubmitReceipt("refunded"), false);
});

test("C2C: هیچ گذاری مستقیم به verified از receipt_submitted وجود ندارد", () => {
  assert.equal(canTransition("receipt_submitted", "verified"), false);
  assert.equal(canTransition("awaiting_payment", "verified"), false);
  assert.equal(canTransition("pending_verification", "verified"), true);
});

test("C2C: تأیید دوباره/گذار معکوس مسدود است", () => {
  assert.equal(canTransition("verified", "pending_verification"), false);
  assert.equal(canTransition("verified", "verified"), false);
  assert.equal(canTransition("rejected", "verified"), false);
  assert.equal(isTerminal("rejected"), true);
  assert.equal(isTerminal("refunded"), true);
  assert.equal(isTerminal("verified"), false, "verified هنوز راه refund دارد");
});

test("C2C: mayMarkOrderPaid فقط و فقط برای verified", () => {
  for (const s of CARD_RECEIPT_STATES) {
    assert.equal(mayMarkOrderPaid(s), s === "verified", `state=${s}`);
  }
});

test("C2C: تصمیم‌های ادمین — دلیل اجباری و گذار معتبر", () => {
  const r1 = checkAdminTransition("pending_verification", "reject", "مبلغ واریز مطابق سفارش نبود");
  assert.deepEqual(r1, { ok: true, to: "rejected" });
  const r2 = checkAdminTransition("pending_verification", "reject", "   ");
  assert.equal(r2.ok, false, "دلیل خالی برای رد ممنوع");
  const r3 = checkAdminTransition("receipt_submitted", "verify");
  assert.equal(r3.ok, false, "بدون شروع بازبینی نمی‌توان تأیید کرد");
  const r4 = checkAdminTransition("pending_verification", "verify");
  assert.deepEqual(r4, { ok: true, to: "verified" });
  const r5 = checkAdminTransition("pending_verification", "refund");
  assert.equal(r5.ok, false, "refund فقط پس از verified");
});

test("C2C: وضعیت نمایشی از جدیدترین رسید", () => {
  assert.equal(displayStateForReceipts([]), "awaiting_payment");
  // ورودی جدیدترین‌اول است (ORDER BY id DESC)
  assert.equal(displayStateForReceipts(["receipt_submitted", "rejected"]), "receipt_submitted");
  assert.equal(displayStateForReceipts(["requires_more_information", "rejected"]), "requires_more_information");
});

test("کارت: نرمال‌سازی/گروه‌بندی/چهار رقم آخر", () => {
  assert.equal(normalizeCardNumber("۶۲۱۹ ۸۶۱۹ ۲۰۲۹ ۸۰۱۴"), "6219861920298014");
  assert.equal(formatCardNumber("6219861920298014"), "6219 8619 2029 8014");
  assert.equal(last4("6219861920298014"), "8014");
  assert.equal(cardNumberFa("6219861920298014").includes("۸"), true);
  assert.equal(isCardNumber("6219861920298014"), true);
  assert.equal(isCardNumber("6219861920298015"), false, "رقم کنترل نامعتبر");
});

test("C2C: ثبت رسید جدید — فقط اولین بار، تکمیل اطلاعات یا پس از رد", () => {
  assert.equal(canStartNewReceipt("awaiting_payment"), true);
  assert.equal(canStartNewReceipt("requires_more_information"), true);
  assert.equal(canStartNewReceipt("rejected"), true, "رد ≠ بن‌بست؛ رسید جدید مجاز است");
  assert.equal(canStartNewReceipt("receipt_submitted"), false);
  assert.equal(canStartNewReceipt("pending_verification"), false);
  assert.equal(canStartNewReceipt("verified"), false);
  assert.equal(canStartNewReceipt("refunded"), false);
});

/* ── فایل رسید: تشخیص نوع واقعی و نام ایمن ── */
import { sniffReceiptFile, safeFileName } from "../src/lib/receipt-file";

test("رسید: امضای فایل تعیین‌کننده است، نه پسوند", () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  const pdf = new Uint8Array(Buffer.from("%PDF-1.4\n%test"));
  const html = new Uint8Array(Buffer.from("<html><script>alert(1)</script></html>"));
  const webp = new Uint8Array([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP"), 0, 0]);
  assert.equal(sniffReceiptFile(jpeg).mime, "image/jpeg");
  assert.equal(sniffReceiptFile(png).mime, "image/png");
  assert.equal(sniffReceiptFile(webp).mime, "image/webp");
  assert.equal(sniffReceiptFile(pdf).mime, "application/pdf");
  assert.equal(sniffReceiptFile(html).ok, false, "HTML/SVG هرگز پذیرفته نمی‌شود");
  assert.equal(sniffReceiptFile(new Uint8Array([1, 2, 3])).ok, false, "فایل کوچک رد می‌شود");
});

test("رسید: نام فایل ایمن بدون پسوند تکراری", () => {
  assert.equal(safeFileName("رسید.jpg", "jpg"), "رسید.jpg");
  const traversal = safeFileName("../../etc/passwd", "png");
  assert.equal(traversal.includes("/"), false, "هیچ اسلشی در نام فایل نمی‌ماند");
  assert.equal(traversal.endsWith(".png"), true);
  assert.equal(safeFileName("", "pdf"), "receipt.pdf");
});

/* ── روزیته: state machine تولیدکننده (فاز ۶) ── */
import {
  canTransitionProducer, checkProducerAction, isPubliclyVisible, productVisibleForProducer,
  slugifyProducer, validateApplication,
} from "../src/lib/producer";

test("روزیته: مسیر مجاز submitted → approved → published", () => {
  assert.equal(canTransitionProducer("submitted", "approved"), true);
  assert.equal(canTransitionProducer("approved", "published"), true);
  assert.equal(canTransitionProducer("submitted", "published"), false, "انتشار بدون تأیید ممنوع");
});

test("روزیته: انتشار فقط از approved و تعلیق تنها از published", () => {
  const r1 = checkProducerAction("submitted", "publish");
  assert.equal(r1.ok, false);
  const r2 = checkProducerAction("approved", "publish");
  assert.deepEqual(r2, { ok: true, to: "published" });
  const r3 = checkProducerAction("published", "take_down", "مدارک ناقص");
  assert.deepEqual(r3, { ok: true, to: "unavailable" });
});

test("روزیته: رد و تعلیق بدون دلیل ممکن نیست", () => {
  assert.equal(checkProducerAction("submitted", "reject").ok, false);
  assert.equal(checkProducerAction("submitted", "reject", "  ").ok, false);
  assert.deepEqual(checkProducerAction("submitted", "reject", "اطلاعات تماس نامعتبر"), { ok: true, to: "rejected" });
  assert.equal(checkProducerAction("published", "take_down").ok, false);
});

test("روزیته: بازگشت از تعلیق و ارسال دوبارهٔ ردشده", () => {
  assert.deepEqual(checkProducerAction("unavailable", "restore"), { ok: true, to: "published" });
  assert.deepEqual(checkProducerAction("rejected", "resubmit"), { ok: true, to: "submitted" });
  assert.equal(canTransitionProducer("rejected", "published"), false);
});

test("روزیته: فقط published در معرض دید عموم است", () => {
  assert.equal(isPubliclyVisible("published"), true);
  for (const s of ["submitted", "approved", "unavailable", "rejected"] as const) {
    assert.equal(isPubliclyVisible(s), false, s);
  }
  assert.equal(productVisibleForProducer(null), true, "محصول معمولی هلسا محدود نمی‌شود");
  assert.equal(productVisibleForProducer("approved"), false, "محصول تولیدکنندهٔ تأییدنشده منتشر نمی‌شود");
  assert.equal(productVisibleForProducer("published"), true);
});

test("روزیته: slug فارسی سالم و بدون نویسهٔ خطرناک", () => {
  assert.equal(slugifyProducer("کارگاه خرمای پیارم"), "کارگاه-خرمای-پیارم");
  assert.equal(slugifyProducer("  A/B  C  "), "a-b-c");
  assert.equal(slugifyProducer("<script>"), "script");
  assert.equal(slugifyProducer(""), "");
});

test("روزیته: اعتبارسنجی درخواست — فیلدهای الزامی و بی‌ساختگی", () => {
  const ok = {
    displayName: "کارگاه نمونه", region: "کرمان", craft: "خرمای پیارم",
    bio: "ما یک کارگاه خانوادگی کوچک در منطقهٔ بم هستیم که خرمای پیارم تولید می‌کنیم.",
    contactName: "مسئول", contactPhone: "09121234567", contactEmail: "", story: "", socialImpact: "", certifications: [],
  };
  assert.deepEqual(validateApplication(ok), { ok: true });
  assert.equal(validateApplication({ ...ok, displayName: "اب" }).ok, false);
  assert.equal(validateApplication({ ...ok, region: "" }).ok, false, "منطقهٔ خالی پذیرفته نمی‌شود");
  assert.equal(validateApplication({ ...ok, bio: "کوتاه" }).ok, false, "معرفی کوتاه رد می‌شود");
  assert.equal(validateApplication({ ...ok, contactPhone: "12345" }).ok, false);
  assert.equal(validateApplication({ ...ok, contactEmail: "not-an-email" }).ok, false);
});

/* ── S-04: کاهش PII در پاسخ سفارش ── */
test("S-04: پاسخ سفارش کد ملی و فیلدهای داخلی را بیرون نمی‌دهد", () => {
  const row = {
    id: 42, customerId: 7, idempotencyKey: "c2c-test-0003", internalNote: "secret",
    code: "HLA-TEST0001", status: "pending", paymentStatus: "pending", paymentMethod: "card",
    subtotal: 350000, discount: 0, shipping: 85000, supportContribution: 0, total: 435000,
    customer: { firstName: "آزمون", lastName: "یکپارچگی", mobile: "09120000001", email: "t@x.local", nationalId: "1234567891", nid: "1234567891" },
    address: { recipient: "آزمون", phone: "09120000001", province: "تهران", city: "تهران", full: "خیابان آزمون", postal: "1234567890", nationalId: "1234567891" },
    items: [{ key: "p-38", name: "قند", unitPrice: 350000, quantity: 1, subtotal: 350000, costPrice: 100000 }],
  };
  const dto = toOwnerOrderDto(row);
  const flat = JSON.stringify(dto);
  assert.equal(flat.includes("1234567891"), false, "کد ملی نباید در پاسخ باشد");
  assert.equal(flat.includes("c2c-test-0003"), false, "idempotencyKey نباید در پاسخ باشد");
  assert.equal(flat.includes("costPrice"), false, "بهای تمام‌شده نباید در پاسخ باشد");
  assert.equal(flat.includes("customerId"), false, "شناسهٔ داخلی مشتری نباید در پاسخ باشد");
  assert.equal(dto.order.code, "HLA-TEST0001");
  assert.equal(dto.order.total, 435000, "اعداد سفارش دست‌نخورده می‌مانند");
  assert.equal((dto.order.items as unknown[]).length, 1);
  assert.equal((dto.order.customer as Record<string, string>).mobile, "09120000001");
});

/* ── S-06: پاک‌سازی پیام خطای سلامت (تابع واقعی، نه کپی) ── */
import { sanitizeHealthMessage } from "../src/lib/health-sanitize";

test("S-06: پیام خطای DB در /api/health میزبان، کاربر و گذرواژه را لو نمی‌دهد", () => {
  const raw = 'اتصال پایگاه داده برقرار نشد: password authentication failed for user "helsa" host=db.internal port=5432 password=s3cret';
  const out = sanitizeHealthMessage(raw);
  assert.equal(out.includes("s3cret"), false, "گذرواژه نباید بماند");
  assert.equal(out.includes("helsa"), false, "نام کاربری نباید بماند");
  assert.equal(out.includes("db.internal"), false, "میزبان نباید بماند");
  assert.equal(sanitizeHealthMessage("connect ECONNREFUSED 10.0.0.5:5432").includes("10.0.0.5"), false);
  assert.equal(sanitizeHealthMessage("postgresql://helsa:pw@host:5432/db").includes("pw@"), false);
  assert.equal(sanitizeHealthMessage("timeout").length > 0, true, "پیام غیرحساس دست‌نخورده می‌ماند");
});

/* ── یکپارچگی دارایی تصویر (پیشگیری از بازگشت B-02) ──
 * manifest واریانت و دادهٔ محصول هر دو به فایل‌های واقعی ارجاع می‌دهند؛
 * اگر فایلی گم شود، SmartImage یک srcset با عرض ناموجود می‌سازد و تصویر
 * در بعضی ویوپورت‌ها شکسته می‌شود. این تست همان لحظه در CI می‌شکند. */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUB = join(ROOT, "public");

test("image-variants: هر عرض ثبت‌شده در manifest روی دیسک موجود است", () => {
  const map = JSON.parse(readFileSync(join(ROOT, "src/data/image-variants.json"), "utf-8")) as Record<
    string,
    { avif: number[]; webp: number[]; jpg: boolean }
  >;
  const missing: string[] = [];
  for (const [name, v] of Object.entries(map)) {
    for (const fmt of ["avif", "webp"] as const) {
      for (const w of v[fmt]) {
        const f = w === 0 ? `${name}.${fmt}` : `${name}-${w}.${fmt}`;
        if (!existsSync(join(PUB, "images/opt", f))) missing.push(f);
      }
    }
    if (v.jpg && !existsSync(join(PUB, "images/opt", `${name}.jpg`))) missing.push(`${name}.jpg`);
  }
  assert.deepEqual(missing, [], `فایل‌های ناموجود در manifest: ${missing.slice(0, 5).join(", ")}`);
  assert.ok(Object.keys(map).length > 100, "manifest نباید خالی/ناقص باشد");
});

test("catalog: تصویر اصلی و گالری هر محصول فایل واقعی دارد", () => {
  const src = readFileSync(join(ROOT, "src/data/products.ts"), "utf-8");
  const refs = [...src.matchAll(/["'](\/images\/[^"']+\.(?:jpg|jpeg|png|webp|avif))["']/g)].map((m) => m[1]);
  assert.ok(refs.length > 50, "باید تصاویر محصول پیدا شوند");
  const missing = [...new Set(refs)].filter((p) => !existsSync(join(PUB, p.replace(/^\//, ""))));
  assert.deepEqual(missing, [], `تصاویر ناموجود محصول: ${missing.join(", ")}`);
});

test("قیمت/تخفیف: هیچ محصولی تخفیف جعلی ندارد (oldPrice > price و درصد هم‌خوان)", async () => {
  const { PRODUCTS } = await import("../src/data/products");
  const bad: string[] = [];
  for (const p of PRODUCTS as Array<{ slug: string; price: number; oldPrice?: number | null; discount?: number }>) {
    if (p.oldPrice == null) {
      if ((p.discount ?? 0) > 0) bad.push(`${p.slug}: تخفیف بدون قیمت قبل`);
      continue;
    }
    if (p.oldPrice <= p.price) { bad.push(`${p.slug}: قیمت قبل ≤ قیمت فعلی`); continue; }
    const implied = Math.round(((p.oldPrice - p.price) * 100) / p.oldPrice);
    if (Math.abs((p.discount ?? 0) - implied) > 0) bad.push(`${p.slug}: نشان ${p.discount}٪ ولی واقعی ${implied}٪`);
  }
  assert.deepEqual(bad, [], `تخفیف ناسازگار: ${bad.slice(0, 5).join(" · ")}`);
});

test("گالری: تصویر اصلی هر محصول در گالری هست و کلید یکتاست", async () => {
  const { PRODUCTS } = await import("../src/data/products");
  const bad: string[] = [];
  const seen = new Set<string>();
  for (const p of PRODUCTS as Array<{ slug: string; image: string; gallery?: string[] }>) {
    if (seen.has(p.slug)) bad.push(`${p.slug}: اسلاگ تکراری`);
    seen.add(p.slug);
    const g = p.gallery ?? [];
    if (g.length > 0 && !g.includes(p.image)) bad.push(`${p.slug}: تصویر اصلی در گالری نیست`);
    if (new Set(g).size !== g.length) bad.push(`${p.slug}: گالری تکراری`);
  }
  assert.deepEqual(bad, [], `گالری ناسازگار: ${bad.slice(0, 5).join(" · ")}`);
});
