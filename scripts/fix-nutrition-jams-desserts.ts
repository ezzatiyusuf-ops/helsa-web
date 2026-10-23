/*
 * HELSA — nutrition completion PART C: مرباها + دسرها (v1.13.1).
 * این ۱۲ محصول در نقشهٔ fix-nutrition.ts نبودند (دستهٔ jams/desserts در گسترش کاتالوگ
 * بعد از PART B اضافه شده بودند) و جدول تغذیهٔ خالی رندر می‌شدند.
 * مقادیر استاندارد مرجع «به ازای ۱۰۰ گرم» — با همان پانوشت صادقانهٔ سایت
 * («مقادیر تقریبی بر پایهٔ جداول مرجع؛ با آنالیز آزمایشگاهی تأمین‌کننده به‌روزرسانی می‌شود»).
 * ادویه/عرقیات/دمنوش/گل‌ها همچنان بدون جدول تغذیه می‌مانند (by design — مصرف اندک؛
 * رندر بخش هم حالا شرطی است و بدون داده نمایش داده نمی‌شود).
 * Run: npx tsx --env-file=.env scripts/fix-nutrition-jams-desserts.ts
 */
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { products } from "../src/db/schema";

type Row = { label: string; value: string };
const n = (energy: string, protein: string, carbs: string, fat: string, fiber?: string): Row[] => {
  const rows = [
    { label: "انرژی", value: `${energy} کیلوکالری` },
    { label: "پروتئین", value: `${protein} گرم` },
    { label: "کربوهیدرات", value: `${carbs} گرم` },
    { label: "چربی", value: `${fat} گرم` },
  ];
  if (fiber) rows.push({ label: "فیبر رژیمی", value: `${fiber} گرم` });
  return rows;
};

/** مرباها (پایهٔ شکر + میوه) و دسرها — جداول مرجع per-100g، تفکیک‌شده به ازای هر محصول */
const BY_SLUG: Record<string, Row[]> = {
  // مرباها
  "sour-cherry-jam": n("۲۳۰", "۰٫۴", "۵۶", "۰٫۱", "۱٫۲"),
  "balang-jam": n("۲۴۵", "۰٫۴", "۶۰", "۰٫۱", "۱٫۵"),
  "quince-jam": n("۲۵۰", "۰٫۴", "۶۱", "۰٫۱", "۱٫۴"),
  "watermelon-rind-jam": n("۲۵۵", "۰٫۳", "۶۳", "۰٫۱", "۰٫۹"),
  "carrot-jam": n("۲۶۰", "۰٫۴", "۶۴", "۰٫۱", "۱"),
  "rose-petal-jam": n("۲۵۰", "۰٫۳", "۶۲", "۰٫۱", "۱٫۳"),
  // دسرها
  "fudge-brownie": n("۴۳۰", "۵", "۵۵", "۲۲", "۲٫۵"),
  "chocolate-roulade": n("۳۵۰", "۵٫۵", "۴۵", "۱۷", "۲"),
  "belgian-chocolate-mousse": n("۲۹۰", "۴٫۵", "۳۰", "۱۸", "۱٫۵"),
  "vanilla-panna-cotta": n("۲۵۰", "۳٫۵", "۲۲", "۱۶"),
  "new-york-cheesecake": n("۳۳۰", "۶", "۳۰", "۲۱", "۰٫۵"),
  "tiramisu-cake": n("۲۸۰", "۵", "۳۰", "۱۴", "۰٫۸"),
};

async function main() {
  let updated = 0;
  for (const [slug, rows] of Object.entries(BY_SLUG)) {
    const res = await db
      .update(products)
      .set({ nutrition: rows as unknown as never, updatedAt: new Date() })
      .where(eq(products.slug, slug))
      .returning({ id: products.id });
    updated += res.length;
    console.log(`${slug}: ${res.length ? "✓" : "✗ محصول پیدا نشد"}`);
  }
  console.log(`jams+desserts nutrition: updated=${updated}/${Object.keys(BY_SLUG).length}`);
  process.exit(0);
}
main();
