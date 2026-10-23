/*
 * Additive seed: سینی «دسر و شیرینی» + سینی «صبحانه» (کیک/مرباهای جدید)
 * Command: npx tsx --env-file=.env scripts/seed-dessert-breakfast-trays.ts
 * Idempotent — ON CONFLICT (slug) DO UPDATE؛ داده‌های موجود را تغییر نمی‌دهد.
 */
import { sql } from "drizzle-orm";
import { db } from "../src/db";
import { mazehTrays, mazehTrayItems } from "../src/db/schema";

type Content = { qty: string; title: string; section: string };

const DESSERT_TRAY: Content[] = [
  { qty: "۸ عدد", title: "تیرامیسو فنجانی هلسا", section: "SWEET" },
  { qty: "۸ عدد", title: "مینی چیزکیک نیویورکی", section: "SWEET" },
  { qty: "۶ عدد", title: "موس شکلات بلژیکی", section: "SWEET" },
  { qty: "۱۰ عدد", title: "براونی فاج گردویی", section: "SWEET" },
  { qty: "۸ برش", title: "رولت شکلاتی هلسا", section: "SWEET" },
  { qty: "۶ عدد", title: "پاناکوتا وانیلی با سس کارامل", section: "SWEET" },
  { qty: "۲ عدد", title: "مربای آلبالو و مربای به هلسا", section: "SWEET" },
  { qty: "۱۴ عدد", title: "کراکر شیرینی و نان‌چوب", section: "BREAD" },
  { qty: "۱۵۰ گرم", title: "پسته و بادام بوداده", section: "NUTS" },
  { qty: "تزئین", title: "گل محمدی و پودر کاکائو", section: "FRUIT" },
];

const BREAKFAST_TRAY: Content[] = [
  { qty: "۲۵۰ گرم", title: "پنیر فتا و پنیر خامه‌ای", section: "SAVORY" },
  { qty: "خامه محلی ۱۵۰ گرم", title: "خامه سنتی", section: "SAVORY" },
  { qty: "۲۵۰ گرم", title: "عسل طبیعی و ارده کنجد", section: "SWEET" },
  { qty: "۳ عدد", title: "مربای به، مربای آلبالو و مربای گل محمدی هلسا", section: "SWEET" },
  { qty: "۲۰۰ گرم", title: "کره بادام زمینی و حلوا ارده", section: "SWEET" },
  { qty: "۸ عدد", title: "نان تازه مینیاتوری و کراکر", section: "BREAD" },
  { qty: "۱۵۰ گرم", title: "گردو و بادام تازه", section: "NUTS" },
  { qty: "۲ نفره", title: "چای لاهیجان و دمنوش بهارنارنج", section: "FRUIT" },
];

async function main() {
  console.log("seeding dessert & breakfast trays (additive)…");
  await db.execute(sql.raw(`SELECT setval(pg_get_serial_sequence('mazeh_trays','id'), coalesce((SELECT max(id) FROM mazeh_trays),0)+1, false)`));

  const trays = [
    {
      name: "سینی مزه هلسا دسر و شیرینی",
      slug: "dessert-sweets",
      sku: "TRAY-009",
      shortDescription: "جشنوارهٔ دسر؛ تیرامیسو، چیزکیک، موس و براونی در یک چیدمان لوکس",
      description:
        "سینی دسر و شیرینی هلسا برای تولد، سالگرد و مهمانی‌های چای‌بر اساس سلیقه. شامل تیرامیسو فنجانی، مینی‌چیزکیک نیویورکی، موس شکلات بلژیکی، براونی فاج گردویی، رولت شکلاتی و پاناکوتا وانیلی، همراه با مرباهای خانگی هلسا، کراکر شیرینی، پسته و بادام بوداده و تزئین گل محمدی. تمام اقلام روزِ تحویل به‌صورت تازه آماده می‌شوند.",
      image: "/images/opt/dessert-tray.jpg",
      imageAlt: "سینی دسر و شیرینی هلسا شامل تیرامیسو، چیزکیک و موس شکلاتی",
      basePrice: 2_850_000,
      size: "بزرگ",
      servesMin: 6,
      servesMax: 10,
      stock: 8,
      featured: true,
      contents: DESSERT_TRAY,
      storage: "کمتر از ۴ ساعت در دمای اتاق؛ سپس یخچال",
    },
    {
      name: "سینی صبحانه هلسا",
      slug: "breakfast-tray",
      sku: "TRAY-010",
      shortDescription: "صبحانهٔ کامل ایرانی؛ پنیر، خامه، عسل، ارده و مرباهای هلسا",
      description:
        "سینی صبحانه هلسا برای مهمانی‌های صبحگاهی و دورهمی‌های آخر هفته: پنیر فتا و خامهٔ سنتی، عسل طبیعی، ارده و حلوا ارده، کره بادام زمینی، مرباهای به، آلبالو و گل محمدی هلسا، نان تازهٔ مینیاتوری، گردو و بادام تازه و چای لاهیجان با دمنوش بهارنارنج.",
      image: "/images/opt/breakfast-tray.jpg",
      imageAlt: "سینی صبحانه هلسا با پنیر، عسل، مربا و نان تازه",
      basePrice: 2_150_000,
      size: "متوسط",
      servesMin: 4,
      servesMax: 6,
      stock: 8,
      featured: false,
      contents: BREAKFAST_TRAY,
      storage: "تحویل سرد؛ اقلام یخچالی تا ۲۴ ساعت",
    },
  ];

  for (const t of trays) {
    await db
      .insert(mazehTrays)
      .values({
        name: t.name,
        slug: t.slug,
        sku: t.sku,
        shortDescription: t.shortDescription,
        description: t.description,
        image: t.image,
        imageAlt: t.imageAlt,
        basePrice: t.basePrice,
        size: t.size,
        servesMin: t.servesMin,
        servesMax: t.servesMax,
        stock: t.stock,
        lowStockThreshold: 2,
        featured: t.featured,
        active: true,
        allergens: ["gluten", "nuts", "dairy", "egg"],
        contents: t.contents,
        storage: t.storage,
        freshness: "روز تحویل تازه آماده می‌شود",
        seoTitle: `${t.name} | سفارش آنلاین هلسا`,
        seoDescription: t.shortDescription,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: mazehTrays.slug,
        set: {
          shortDescription: t.shortDescription,
          description: t.description,
          basePrice: t.basePrice,
          contents: t.contents,
          updatedAt: new Date(),
        },
      });

    // اقلام سینی (mazeh_tray_items) — idempotent با حذف و درج مجدد فقط برای همین سینی
    const row = (await db.select({ id: mazehTrays.id }).from(mazehTrays).where(sql`${mazehTrays.slug} = ${t.slug}`).limit(1))[0];
    if (row) {
      await db.delete(mazehTrayItems).where(sql`${mazehTrayItems.trayId} = ${row.id}`);
      await db.insert(mazehTrayItems).values(t.contents.map((c, i) => ({ trayId: row.id, title: c.title, quantity: c.qty, section: c.section, sortOrder: i })));
    }
    console.log("✓", t.slug);
  }
  console.log("done");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
