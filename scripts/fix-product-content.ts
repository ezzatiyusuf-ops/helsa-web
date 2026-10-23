/*
 * HELSA — merchandising content completion for the 23 products with gaps.
 * Fills: shortDescription, ingredients, origin, packaging, seoTitle, seoDescription, imageAlt
 * Premium brand voice, consistent with existing catalog entries.
 * Run: npx tsx --env-file=.env scripts/fix-product-content.ts
 */
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { products } from "../src/db/schema";

type Fix = {
  slug: string;
  short: string;
  ingredients: string;
  origin: string;
  packaging: string;
  alt: string;
};

const PACK = {
  box: "جعبه مقوایی هلسا با پنجره نمایش و روبان کتان",
  pouch: "پاچ بهداشتی با زیپ قفل‌شونده و درب ایستاده هلسا",
  jar: "شیشه موم‌دار هلسا با درب چوبی و قاشق یکبار‌مصرف",
  gift: "جعبه هدیه هلسا با کاغذ شیتی و کارت ارجاع",
  tin: "قوطی فلزی درب‌دار هلسا با پلمب تازگی",
};

const FIXES: Fix[] = [
  { slug: "handmade-date-chocolate", short: "شکلات دست‌ساز خرما پیارم با شکلات تلخ ۷۰٪ و پاشش پسته؛ بدون شکر افزوده.", ingredients: "خرما پیارم بدون هسته، شکلات تلخ ۷۰٪ (کاکائو، کره کاکائو)، خرده پسته، گلبرگ خشک", origin: "داراب، فارس", packaging: PACK.gift, alt: "تصویر شکلات دست‌ساز خرمای هلسا" },
  { slug: "date-chocolate-walnut", short: "لایه‌های خرما، گردوی تازه و شکلات شیری؛ همراه ایده‌آل چای عصرانه.", ingredients: "خرما مضافتی، مغز گردوی تازه، شکلات شیری پرکاکائو", origin: "بم، کرمان", packaging: PACK.gift, alt: "تصویر شکلات خرما با مغز گردوی هلسا" },
  { slug: "date-powder", short: "پودر خرما برای اسموتی، اوورنایت و پخت؛ شیرینی طبیعی با فیبر بالا.", ingredients: "پودر خرما ۱۰۰٪ طبیعی بدون افزودنی", origin: "بم، کرمان", packaging: PACK.pouch, alt: "تصویر پودر خرمای طبیعی هلسا" },
  { slug: "chocolate-coated-dates", short: "خرمای مضافتی بدون هسته با روکش شکلات بلژیکی و خرده پسته اکبری.", ingredients: "خرما مضافتی بدون هسته، شکلات بلژیکی، خرده پسته اکبری", origin: "بم، کرمان", packaging: PACK.gift, alt: "تصویر خرمای شکلات‌پوش پسته‌ای هلسا" },
  { slug: "premium-mixed-nuts", short: "ترکیب ممتاز پسته اکبری، بادام هندی، فندق، گردو و بادام درختی؛ بو داده ملایم.", ingredients: "پسته اکبری، بادام هندی، فندق، مغز گردو، بادام درختی", origin: "رفسنجان، کرمان و تویسرکان، همدان", packaging: PACK.box, alt: "تصویر آجیل ممتاز شب‌چره هلسا" },
  { slug: "four-nut-mix", short: "چهارمغز خالص پسته، بادام، فندق و گردو؛ بدون هیچ افزودنی.", ingredients: "پسته، بادام درختی، فندق، مغز گردو", origin: "رفسنجان، کرمان", packaging: PACK.pouch, alt: "تصویر آجیل چهارمغز هلسا" },
  { slug: "party-nuts", short: "آجیل پذیرایی مجلسی با پسته اکبری خندان و بادام هندی درشت.", ingredients: "پسته اکبری، بادام هندی، مغز گردوی سفید، فندق", origin: "رفسنجان، کرمان", packaging: PACK.box, alt: "تصویر آجیل پذیرایی مجلسی هلسا" },
  { slug: "economic-nuts", short: "ترکیب متعادل و مقرون‌به‌صرفه نخودچی، کشمش، بادام و فندق برای مصرف روزانه.", ingredients: "نخودچی بوداده، کشمش، بادام درختی، فندق", origin: "ایران", packaging: PACK.pouch, alt: "تصویر آجیل اقتصادی روزانه هلسا" },
  { slug: "special-yalda-nuts", short: "نسخه محدود یلدایی: پسته اکبری، فندق کامل و بادام هندی با جعبه چوبی هلسا.", ingredients: "پسته اکبری، فندق کامل، بادام هندی طلایی، مغز پسته", origin: "رفسنجان، کرمان", packaging: "جعبه چوبی هلسا با قفل مغناطیسی", alt: "تصویر آجیل ویژه یلدایی هلسا" },
  { slug: "akbari-pistachios", short: "پسته اکبری سوپر درشت رفسنجان، خندان با شور ملایم؛ لوکس‌ترین مغز ایران.", ingredients: "پسته اکبری (درصد مغز بالا)", origin: "رفسنجان، کرمان", packaging: PACK.box, alt: "تصویر پسته اکبری درشت هلسا" },
  { slug: "tree-almonds", short: "بادام درختی سنگی سبزستان با مغز پر و طعم شیرین طبیعی؛ خام.", ingredients: "بادام درختی سنگی خام", origin: "سبزستان، خراسان شمالی", packaging: PACK.pouch, alt: "تصویر بادام درختی سنگی هلسا" },
  { slug: "walnut-kernels", short: "مغز گردوی سفید چهارپره تویسرکان؛ تازه، بدون تلخی و سرشار از امگا۳.", ingredients: "مغز گردوی چهارپره", origin: "تویسرکان، همدان", packaging: PACK.pouch, alt: "تصویر مغز گردوی چهارپره هلسا" },
  { slug: "golden-raisins", short: "کشمش سبز بیدانه ملایر با رنگ طلایی طبیعی؛ خشک‌شده در سایه.", ingredients: "کشمش سبز بیدانه", origin: "ملایر، همدان", packaging: PACK.pouch, alt: "تصویر کشمش سبز طلایی هلسا" },
  { slug: "dried-figs", short: "انجیر خشک درجه یک استهبان؛ دهان‌باز، سفید و یکدست با سایز ۱۰۱.", ingredients: "انجیر خشک طبیعی", origin: "استهبان، فارس", packaging: PACK.box, alt: "تصویر انجیر خشک استهبان هلسا" },
  { slug: "dried-mulberries", short: "توت خشک سفید مراغه؛ شیرینی طبیعی بدون سولفیت.", ingredients: "توت خشک سفید طبیعی", origin: "مراغه، آذربایجان شرقی", packaging: PACK.pouch, alt: "تصویر توت خشک هلسا" },
  { slug: "dried-apricots", short: "برگه زردآلو خشک‌شده آفتابی بدون مواد نگهدارنده؛ بافت گوشتی.", ingredients: "برگه زردآلو", origin: "ایران", packaging: PACK.pouch, alt: "تصویر برگه زردآلو هلسا" },
  { slug: "dried-plums", short: "آلو خشک دودی با طعم ملس و عطر ملایم دود؛ میان‌وعده‌ای متفاوت.", ingredients: "آلو خشک دودی", origin: "ایران", packaging: PACK.pouch, alt: "تصویر آلو خشک دودی هلسا" },
  { slug: "dried-fruit-mix", short: "ترکیب رنگارنگ انجیر، برگه، توت، کشمش و سیب خشک؛ کاسه سلامتی روزانه.", ingredients: "انجیر خشک، برگه زردآلو، توت خشک، کشمش، سیب خشک", origin: "استهبان و ملایر، ایران", packaging: PACK.box, alt: "تصویر میکس میوه خشک هلسا" },
  { slug: "natural-gon-honey", short: "عسل طبیعی گون زاگرس با آنالیز آزمایشگاهی؛ عطر کوهستان و بافت کریستالی نرم.", ingredients: "عسل طبیعی گون ۱۰۰٪ خالص", origin: "زاگرس، چهارمحال و بختیاری", packaging: PACK.jar, alt: "تصویر عسل طبیعی گون هلسا" },
  { slug: "saffron-negin", short: "زعفران سرگل نگین قائنات با قدرت رنگ‌دهی ۲۹۰ و هولوگرام اصالت.", ingredients: "زعفران سرگل نگین (تمام‌رشته)", origin: "قائنات، خراسان جنوبی", packaging: PACK.tin, alt: "تصویر زعفران سرگل نگین هلسا" },
  { slug: "lahijan-black-tea", short: "چای سیاه قلم بهاره لاهیجان با عطر هل طبیعی؛ دم‌کشیده و خوش‌رنگ.", ingredients: "چای سیاه قلم بهاره", origin: "لاهیجان، گیلان", packaging: PACK.tin, alt: "تصویر چای سیاه لاهیجان هلسا" },
  { slug: "herbal-tea-borge", short: "دمنوش آرام‌بخش گل‌گاوزبان، سنبل‌الطیب و لیمو عمانی برای شب‌های آرام.", ingredients: "گل‌گاوزبان، سنبل‌الطیب، لیمو عمانی", origin: "ایران", packaging: PACK.pouch, alt: "تصویر دمنوش گل‌گاوزبان هلسا" },
  { slug: "sumac-flakes", short: "سماق پرک کوهی بدون هسته و نمک افزوده؛ رنگ سرخ طبیعی و طعم ملس.", ingredients: "سماق پرک کوهی", origin: "زاگرس، ایران", packaging: PACK.pouch, alt: "تصویر سماق پرک کوهی هلسا" },
];

// slug در دیتابیس: herbal-tea-borge یا herbal-tea-borage — هر دو را پوشش بده
const SEO_TAIL = "قیمت و موجودی به‌روز را در هلسا مارکت مشاهده کنید.";

async function main() {
  let updated = 0;
  for (const f of FIXES) {
    const rows = await db.select({ id: products.id, name: products.name, short: products.shortDescription, slug: products.slug })
      .from(products).where(eq(products.slug, f.slug));
    let row = rows[0];
    if (!row && f.slug === "herbal-tea-borge") {
      row = (await db.select({ id: products.id, name: products.name, short: products.shortDescription, slug: products.slug })
        .from(products).where(eq(products.slug, "herbal-tea-borage")))[0];
    }
    if (!row) { console.log(`⚠️ not found: ${f.slug}`); continue; }
    const name = row.name;
    await db.update(products).set({
      shortDescription: f.short,
      ingredients: f.ingredients,
      origin: f.origin,
      packaging: f.packaging,
      seoTitle: `خرید ${name} هلسا`,
      seoDescription: `${f.short} ${SEO_TAIL}`.slice(0, 170),
      imageAlt: f.alt,
      updatedAt: new Date(),
    }).where(eq(products.id, row.id));
    updated++;
  }
  console.log(`content fix: ${updated}/${FIXES.length} products updated`);
  process.exit(0);
}
main();
