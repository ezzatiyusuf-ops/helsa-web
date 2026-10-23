/**
 * پلتفرم پادکست و ویدیاکست هلسا (فاز ۱۰) — معماری آینده‌پذیر.
 * SHOW: پیکربندی دو برنامه | EPISODES: قسمت‌ها (اکنون «قسمت صفر» معرفی؛ اپیزودهای واقعی بعداً)
 * هر قسمت: transcript زمان‌دار، مقالات مرتبط، اشتراک‌گذاری و پشتیبانی کامل SEO.
 */

export interface TranscriptSegment {
  t: string; // "۰۳:۲۴" یا "03:24"
  text: string;
}

export interface Episode {
  slug: string;
  kind: "podcast" | "videocast";
  title: string;
  desc: string;
  date: string;
  durationMin: number;
  cover: string;
  mediaUrl?: string; // هنگام انتشار
  topics: string[];
  transcript?: TranscriptSegment[];
  relatedArticles?: string[]; // slug مقالات بلاگ
  status: "published" | "coming-soon";
}

export const SHOW = {
  podcast: {
    title: "پادکست هلسا",
    subtitle: "گفت‌وگوهای سلامت، کشاورزی و کارآفرینی ایرانی",
    desc: "هر هفته، یک قلمرو: از مزرعه و بحران آب تا تغذیه، سلامت روان و ساختن برند. با میهمانان میدانی و بدون تعارف.",
    cover: "/images/opt/podcast-cover.jpg",
  },
  videocast: {
    title: "ویدیاکست هلسا",
    subtitle: "روایت تصویری پشت‌صحنهٔ هلسا",
    desc: "از خط بسته‌بندی تا باغ خرما؛ آنچه در عکس‌ها نمی‌گنجد، در ویدیو می‌گنجد.",
    cover: "/images/opt/agriculture-knowledge.jpg",
  },
} as const;

/** موضوعات برنامه‌ریزی‌شده (فاز ۱۰) */
export const FUTURE_TOPICS = [
  { title: "سلامت و زندگی سالم", desc: "تغذیه، عادت‌ها و علم طول عمر" },
  { title: "سلامت روان", desc: "استرس، خواب و تعادل در جهان امروز" },
  { title: "کشاورزی", desc: "خاک، آب و آیندهٔ مزرعهٔ ایرانی" },
  { title: "چالش‌های کشاورزی ایران", desc: "از دشت فرونشسته تا باغ پربار" },
  { title: "صنعت غذا", desc: "استانداردها، زنجیرهٔ سرد و شفافیت" },
  { title: "کارآفرینی", desc: "ساختن برند از صفر، در ایران" },
  { title: "مسائل اجتماعی ایران", desc: "گفت‌وگوهای صادقانه دربارهٔ فردا" },
  { title: "زندگی سالم", desc: "عملی‌ترین راهنمای روزمره" },
];

export const EPISODES: Episode[] = [
  {
    slug: "ep0-why-helsa-podcast",
    kind: "podcast",
    title: "قسمت صفر — چرا پادکست هلسا؟",
    desc: "معرفی کوتاه برنامه: چه می‌شنوید، با چه کسانی و هر چند وقت یک‌بار. یک وعدهٔ ساده — گفت‌وگوی صادقانه دربارهٔ سلامت، خاک و کار.",
    date: "2026-09-20",
    durationMin: 12,
    cover: "/images/opt/podcast-cover.jpg",
    topics: ["معرفی برنامه", "کارآفرینی"],
    status: "coming-soon",
    transcript: [
      { t: "۰۰:۰۰", text: "خوش‌آمدگویی و چرایی راه‌اندازی برنامه" },
      { t: "۰۳:۰۰", text: "قرار برنامه: هشت قلمرو موضوعی و میهمانان میدانی" },
      { t: "۰۷:۳۰", text: "آنچه از شنونده می‌خواهیم: پرسش، نقد و پیشنهاد" },
    ],
    relatedArticles: ["iranian-agriculture-challenges", "cold-chain-and-freshness"],
  },
];
