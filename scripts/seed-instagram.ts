/**
 * HELSA — seed Instagram posts & stories (top-up, idempotent).
 * پست‌ها/استوری‌های منتخب با تصویر واقعی محصولات و کپشن فارسی؛
 * از پنل ادمین قابل مدیریت است. اجرای دوباره فقط موارد جاافتاده را اضافه می‌کند
 * (dedupe بر اساس مسیر تصویر) پس حذف‌های دستی ادمین را بازنمی‌گرداند.
 * Run: npx tsx --env-file=.env scripts/seed-instagram.ts
 */
import { sql } from "drizzle-orm";
import { db } from "../src/db";
import { instagramPosts } from "../src/db/schema";

const DAY = 86_400_000;

const POSTS = [
  { imageUrl: "/images/opt/dates-mazafati.jpg", caption: "خرمای مضافتی بم، تازه و لطیف 🌴 مستقیم از نخلستان‌های بم", productSlug: "mazafati-dates" },
  { imageUrl: "/images/opt/dates-piaram.jpg", caption: "خرمای پیارم؛ خشک، شیرین و پرخاصیت — سوغات جنوب", productSlug: "piaram-dates" },
  { imageUrl: "/images/opt/medjool-dates.jpg", caption: "خرما مجول؛ پادشاه خرما روی سفرهٔ شما 👑", productSlug: "medjool-dates" },
  { imageUrl: "/images/opt/dates-kabkab.jpg", caption: "خرمای کبکاب؛ عطر بهشتی نخلستان‌های جنوب", productSlug: "kabkab-dates" },
  { imageUrl: "/images/opt/handmade-date-chocolate.jpg", caption: "شکلات دست‌ساز خرما؛ امضای کارگاه هلسا 🍫", productSlug: "helsa-handmade-chocolate" },
  { imageUrl: "/images/opt/date-chocolate.jpg", caption: "شکلات خرمایی؛ تلاقی طعم و سلامت", productSlug: "date-chocolate" },
  { imageUrl: "/images/opt/date-chocolate-walnut.jpg", caption: "شکلات خرمایی مغزدار؛ با مغز گردوی تازه", productSlug: "filled-date-chocolate" },
  { imageUrl: "/images/opt/date-bar.jpg", caption: "بار خرما؛ انرژی طبیعی برای روزهای شلوغ", productSlug: "date-bar" },
  { imageUrl: "/images/opt/date-sugar.jpg", caption: "قند خرما؛ شیرینی طبیعی، بدون شکر سفید", productSlug: "helsa-date-sugar" },
  { imageUrl: "/images/opt/date-syrup.jpg", caption: "شیرهٔ خرما؛ روی نان صبحانه یا داخل شیر گرم", productSlug: "date-syrup" },
  { imageUrl: "/images/opt/halva-arde.jpg", caption: "حلوا ارده؛ صبحانهٔ اصیل ایرانی", productSlug: "helsa-halva-tahini" },
  { imageUrl: "/images/opt/tahini.jpg", caption: "اردهٔ کنجد هلسا + عسل طبیعی = صبحانهٔ کامل 🍯", productSlug: "sesame-tahini" },
  { imageUrl: "/images/opt/natural-gon-honey.jpg", caption: "عسل گون؛ طعم واقعی کوهستان، با آنالیز آزمایشگاهی", productSlug: "natural-honey" },
  { imageUrl: "/images/opt/honey-jar.jpg", caption: "عسل کنار؛ غلیظ، معطر و پرخاصیت", productSlug: "sidr-honey" },
  { imageUrl: "/images/opt/premium-mixed-nuts.jpg", caption: "آجیل مخلوط هلسا؛ تازه‌پوست‌کنیده، بدون نمک اضافه", productSlug: "helsa-mixed-nuts" },
  { imageUrl: "/images/opt/party-nuts.jpg", caption: "آجیل مهمانی؛ سینی پذیرایی شما کامل می‌شود", productSlug: "party-nuts-collection" },
  { imageUrl: "/images/opt/four-nut-mix.jpg", caption: "آجیل چهارمغز؛ پسته، بادام، فندق و گردو", productSlug: "four-kernel-nuts" },
  { imageUrl: "/images/opt/walnut-kernels.jpg", caption: "مغز گردوی تازه؛ روشن و روغنی", productSlug: "walnut-kernels" },
  { imageUrl: "/images/opt/dried-figs.jpg", caption: "انجیر خشک استهبان؛ شیرینی طبیعت در یک لقمه", productSlug: "helsa-dried-fruit-selection" },
  { imageUrl: "/images/opt/dried-fruit-mix.jpg", caption: "خشکبار ویژهٔ هلسا؛ چیدمان رنگی سفرهٔ شما", productSlug: "helsa-dried-fruit-selection" },
  { imageUrl: "/images/opt/saffron-rock-candy.jpg", caption: "نبات زعفرانی هلسا با چای عصرانه ☕ عصرِ خوب، ساده شروع می‌شود", productSlug: "saffron-rock-candy" },
  { imageUrl: "/images/opt/gift-pack.jpg", caption: "پک‌های هدیهٔ هلسا برای مناسبت‌های ویژه 🎁 انتخابی که فراموش نمی‌شود", productSlug: "helsa-gift-pack" },
  { imageUrl: "/images/opt/cheese.jpg", caption: "پنیر سنتی و زیتونِ پذیرایی؛ ساده، تازه و خوشمزه 🫒", productSlug: "traditional-cheese" },
];

const STORIES = [
  { imageUrl: "/images/opt/dates-mazafati.jpg", title: "تازه‌رسیده‌ها", productSlug: "mazafati-dates" },
  { imageUrl: "/images/opt/handmade-date-chocolate.jpg", title: "پشت‌صحنهٔ کارگاه", productSlug: "helsa-handmade-chocolate" },
  { imageUrl: "/images/opt/halva-arde.jpg", title: "صبحانهٔ هلسایی", productSlug: "helsa-halva-tahini" },
  { imageUrl: "/images/opt/natural-gon-honey.jpg", title: "عسل خالص", productSlug: "natural-honey" },
  { imageUrl: "/images/opt/premium-mixed-nuts.jpg", title: "آجیل تازه", productSlug: "helsa-mixed-nuts" },
  { imageUrl: "/images/opt/date-sugar.jpg", title: "شیرینی طبیعی", productSlug: "helsa-date-sugar" },
  { imageUrl: "/images/tray-classic.jpg", title: "سینی مزه", productSlug: null },
  { imageUrl: "/images/opt/gift-pack.jpg", title: "پک هدیه", productSlug: "helsa-gift-pack" },
  { imageUrl: "/images/opt/fruit-tea.jpg", title: "دمنوش عصرانه", productSlug: "helsa-fruit-tea" },
  { imageUrl: "/images/opt/special-yalda-nuts.jpg", title: "یلدا با هلسا", productSlug: "helsa-yalda-pack" },
  { imageUrl: "/images/opt/sumac.jpg", title: "سماق پرک", productSlug: "sumac" },
  { imageUrl: "/images/opt/sesame-bar.jpg", title: "بار کنجد", productSlug: "sesame-bar" },
];

async function main() {
  const existing = await db.select({ imageUrl: instagramPosts.imageUrl }).from(instagramPosts);
  const seen = new Set(existing.map((r) => r.imageUrl));
  const now = Date.now();

  const newPosts = POSTS.filter((p) => !seen.has(p.imageUrl));
  const newStories = STORIES.filter((s) => !seen.has(s.imageUrl));

  if (newPosts.length) {
    await db.insert(instagramPosts).values(
      newPosts.map((p, i) => ({
        ...p,
        kind: "post" as const,
        permalink: null,
        sortOrder: i + 1,
        postedAt: new Date(now - (i + 1) * 2 * DAY),
        isActive: true,
      })),
    );
  }
  if (newStories.length) {
    await db.insert(instagramPosts).values(
      newStories.map((s, i) => ({
        ...s,
        kind: "story" as const,
        caption: s.title,
        permalink: null,
        sortOrder: i + 1,
        postedAt: new Date(now - (i + 1) * 6 * 60 * 60_000),
        isActive: true,
      })),
    );
  }
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(instagramPosts);
  console.log(`instagram seed: +${newPosts.length} پست، +${newStories.length} استوری — مجموع ${count} آیتم`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
