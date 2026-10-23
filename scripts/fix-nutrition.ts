/*
 * HELSA — nutrition completion for staple food categories (PART B).
 * مقادیر استاندارد مرجع «به ازای ۱۰۰ گرم» — برای دسته‌هایی که اطلاعات تغذیه‌ای برایشان معنادار است.
 * ادویه/عرقیات/دمنوش/گل‌ها: مقدار مصرف اندک → nutrition اضافه نمی‌شود (by design).
 * Run: npx tsx --env-file=.env scripts/fix-nutrition.ts
 */
import { eq, isNull, or } from "drizzle-orm";
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

/** مقادیر استاندارد per-100g بر پایهٔ جداول ترکیب مواد غذایی */
const BY_CATEGORY: Record<string, Row[]> = {
  // آجیل و خشکبار
  "nuts-dried-fruits": n("۶۰۰", "۱۷", "۱۸", "۵۲", "۸"),
  legumes: n("۳۴۰", "۲۲", "۶۱", "۱.۵", "۱۵"),
  seeds: n("۵۶۰", "۲۶", "۱۶", "۴۸", "۶"),
  peanuts: n("۵۸۰", "۲۵", "۱۶", "۵۰", "۸"),
  // شیرینی سنتی (شکر پایه)
  "rock-candy": n("۴۰۰", "۰", "۹۹", "۰"),
  candy: n("۴۰۰", "۰", "۹۸", "۰"),
  noghl: n("۳۹۵", "۲", "۹۵", "۱"),
  barberry: n("۱۵۰", "۱.۵", "۳۵", "۰.۵", "۹"),
  // عسل/شیره/ارده
  honey: n("۳۰۴", "۰.۳", "۸۲", "۰"),
  syrups: n("۳۰۰", "۰.۵", "۷۵", "۰"),
  tahini: n("۵۹۵", "۱۷", "۲۱", "۵۴"),
  "halva-tahini": n("۵۵۰", "۱۳", "۴۳", "۳۸"),
  "peanut-butter": n("۵۸۸", "۲۵", "۲۰", "۵۰", "۶"),
  "sesame-bars": n("۵۰۰", "۱۲", "۵۵", "۲۸"),
  // شکلات و شیرینی
  chocolate: n("۵۴۵", "۶", "۵۸", "۳۲"),
  "date-chocolate": n("۴۲۰", "۴", "۶۵", "۱۶", "۵"),
  "biscuits-cakes": n("۴۶۰", "۶", "۶۵", "۲۰"),
  "date-bars": n("۳۸۰", "۴", "۷۵", "۸", "۷"),
  "date-sugar": n("۳۰۰", "۱", "۷۵", "۰", "۵"),
  // لبنیات/ترشی‌جات/روغن
  cheese: n("۲۵۰", "۱۴", "۲", "۲۰"),
  olives: n("۱۱۵", "۱", "۶", "۱۱", "۳"),
  pickles: n("۳۵", "۱", "۷", "۰.۲", "۲"),
  oils: [
    { label: "انرژی", value: "۸۸۴ کیلوکالری" },
    { label: "چربی کل", value: "۱۰۰ گرم" },
    { label: "چربی اشباع", value: "۱۴ گرم" },
  ],
  // پک‌ها: ترکیبی — مقدار متوسط
  "special-packs": n("۴۵۰", "۸", "۶۰", "۲۰", "۷"),
};

/** override محصولی (ارقام خرما/آجیل خاص) */
const BY_SLUG: Record<string, Row[]> = {
  "akbari-pistachios": n("۵۶۰", "۲۰", "۲۸", "۴۵", "۱۰"),
  "tree-almonds": n("۵۷۹", "۲۱", "۲۲", "۵۰", "۱۲"),
  "walnut-kernels": n("۶۵۴", "۱۵", "۱۴", "۶۵", "۷"),
  "golden-raisins": n("۲۹۹", "۳", "۷۹", "۰.۵", "۴"),
  "dried-figs": n("۲۴۹", "۳.۳", "۶۴", "۰.۹", "۱۰"),
  "dried-mulberries": n("۳۲۰", "۸", "۷۰", "۲", "۶"),
  "dried-apricots": n("۲۴۱", "۳.۴", "۶۳", "۰.۵", "۷"),
  "dried-plums": n("۲۴۰", "۲.۲", "۶۴", "۰.۴", "۷"),
  "dried-fruit-mix": n("۲۷۰", "۳", "۷۰", "۱", "۸"),
  "pumpkin-seeds": n("۵۵۹", "۳۰", "۱۱", "۴۹", "۶"),
  "meaty-pumpkin-seeds": n("۵۵۹", "۳۰", "۱۱", "۴۹", "۶"),
  "sunflower-seeds": n("۵۸۴", "۲۱", "۲۰", "۵۱", "۹"),
  "japanese-seeds": n("۵۸۰", "۲۰", "۲۰", "۵۰", "۸"),
  "watermelon-seeds": n("۵۵۷", "۲۸", "۱۵", "۴۷", "۵"),
  "mung-beans": n("۳۴۷", "۲۴", "۶۳", "۱.۲", "۱۶"),
  lentils: n("۳۵۲", "۲۵", "۶۳", "۱.۱", "۱۱"),
  chickpeas: n("۳۶۴", "۱۹", "۶۱", "۶", "۱۷"),
  "split-peas": n("۳۴۰", "۲۵", "۶۰", "۱.۵", "۱۰"),
  "red-beans": n("۳۳۷", "۲۳", "۶۱", "۱", "۱۵"),
  "pinto-beans": n("۳۴۷", "۲۱", "۶۳", "۱", "۱۶"),
  "roasted-chickpeas": n("۳۸۰", "۲۰", "۶۰", "۵", "۱۲"),
  "saffron-negin": n("۳۱۰", "۱۱", "۶۵", "۶"),
  "lahijan-black-tea": n("۱", "۰", "۰.۲", "۰"),
  "natural-gon-honey": n("۳۰۴", "۰.۳", "۸۲", "۰"),
  "saffron-rock-candy": n("۴۰۰", "۰", "۹۹", "۰"),
  "saffron-candy": n("۴۰۰", "۰", "۹۸", "۰"),
  "saffron-noghl": n("۳۹۵", "۲", "۹۵", "۱"),
  "olive-oil": [
    { label: "انرژی", value: "۸۸۴ کیلوکالری" },
    { label: "چربی کل", value: "۱۰۰ گرم" },
    { label: "چربی اشباع", value: "۱۴ گرم" },
  ],
  "extra-virgin-olive-oil": [
    { label: "انرژی", value: "۸۸۴ کیلوکالری" },
    { label: "چربی کل", value: "۱۰۰ گرم" },
    { label: "چربی اشباع", value: "۱۴ گرم" },
  ],
  "sesame-oil": [
    { label: "انرژی", value: "۸۸۴ کیلوکالری" },
    { label: "چربی کل", value: "۱۰۰ گرم" },
    { label: "چربی اشباع", value: "۱۵ گرم" },
  ],
};

/** دسته‌هایی که nutrition برایشان معنادار نیست (مصرف اندک/نوشیدنی) */
const SKIP = new Set(["spices", "distillates", "herbal-tea", "rosebuds"]);

async function main() {
  const all = await db.select({ id: products.id, slug: products.slug, category: products.category, nutrition: products.nutrition }).from(products);
  let updated = 0, skipped = 0, kept = 0;
  for (const p of all) {
    if (p.nutrition && (p.nutrition as unknown[]).length) { kept++; continue; }
    const rows = BY_SLUG[p.slug] ?? BY_CATEGORY[p.category];
    if (!rows) { skipped++; continue; }
    if (SKIP.has(p.category) && !BY_SLUG[p.slug]) { skipped++; continue; }
    await db.update(products).set({ nutrition: rows as unknown as never, updatedAt: new Date() }).where(eq(products.id, p.id));
    updated++;
  }
  console.log(`nutrition: updated=${updated} | already-had=${kept} | not-applicable=${skipped} | total=${all.length}`);
  process.exit(0);
}
main();
