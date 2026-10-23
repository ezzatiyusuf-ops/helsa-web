/**
 * HELSA IRANIAN — global brand & store configuration.
 * All contact details, phones and nav live here (never hard-coded in UI).
 */
import { SHIPPING } from "./shipping";

const fa = (v: string) => v.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

const LANDLINE = "02156130858";
const MOBILE = "09379105133";
/** شمارهٔ بین‌المللی واتس‌اپ — wa.me صفر ابتدای شمارهٔ ایرانی را نمی‌پذیرد */
const WHATSAPP_INTL = `98${MOBILE.replace(/^0/, "")}`;

export const SITE = {
  brandName: "هلسا ایرانیان",
  brandNameEn: "HELSA IRANIAN",
  storeName: "هلسا مارکت",
  storeNameEn: "HELSA MARKET",
  businessName: "تولید بازرگانی هلسا ایرانیان",
  slogan: "چون شما لایق بهترین‌ها هستید ...",
  sloganEn: "Because You Deserve the Best",
  mazehSlogan: "یک سینی، دنیایی از مزه‌ها",
  partySlogan: "مهمانی را به یک تجربه تبدیل کنید",
  coreMessage: "هلسا؛ طعم طبیعت، هنر پذیرایی ایرانی",
  url: "https://helsairanian.ir",
  email: "Helsairanianfood@gmail.com",
  instagram: "@Helsa.Nuts",
  instagramUrl: "https://instagram.com/Helsa.Nuts",
  telegramUrl: `https://t.me/${"HelsaNuts"}`,
  phones: [fa("021-56130858"), fa("0937-9105133")],
  landline: LANDLINE,
  mobile: MOBILE,
  /** لینک مستقیم گفتگو در واتس‌اپ — همیشه از این فیلد استفاده کنید (نه wa.me/${MOBILE} خام) */
  whatsappUrl: `https://wa.me/${WHATSAPP_INTL}`,
  whatsappIntl: WHATSAPP_INTL,
  address: "تهران، نیاوران، خیابان شهید باهنر، قبل از چهارراه مژده",
  addressLines: ["تهران، نیاوران،", "خیابان شهید باهنر،", "قبل از چهارراه مژده"],
  workHours: [
    { day: "شنبه تا چهارشنبه", hours: `${fa("9:00")} تا ${fa("18:00")}` },
    { day: "پنجشنبه", hours: `${fa("9:00")} تا ${fa("13:00")}` },
    { day: "جمعه و تعطیلات رسمی", hours: "تعطیل" },
  ],
  supportHours: `${fa("9")} تا ${fa("18")}`,
  // Current Jalali year, computed at build/deploy time (brief 2.1 — no hardcoded year)
  copyrightYear: fa(
    new Intl.DateTimeFormat("en-US-u-ca-persian", { year: "numeric" })
      .formatToParts(new Date())
      .find((p) => p.type === "year")?.value ?? "1405",
  ),
  messengers: {
    whatsapp: "09379105133",
    telegram: "HelsaNuts",
    instagram: "Helsa.Nuts",
  },
  description:
    "هلسا مارکت؛ فروشگاه آنلاین خرما، شکلات دست‌ساز خرما، قند خرما، آجیل، خشکبار، عسل، زعفران و سینی‌های مزه هلسا. چون شما لایق بهترین‌ها هستید ...",

  // single source of truth: config/shipping.ts (brief 2.2)
  freeShippingThreshold: SHIPPING.freeThreshold,
  shippingFee: SHIPPING.flatFee,
};

export type NavItem = {
  label: string;
  href: string;
  children?: { label: string; href: string; desc?: string }[];
};

export const MAIN_NAV: NavItem[] = [
  { label: "خانه", href: "/" },
  {
    label: "محصولات",
    href: "/products",
    children: [
      { label: "خرما", href: "/products?cat=dates", desc: "پیارم، مضافتی، کبکاب، مجول" },
      { label: "آجیل و مغزها", href: "/products?cat=nuts", desc: "آجیل ممتاز و تک‌مغزها" },
      { label: "خشکبار", href: "/products?cat=dried-fruits", desc: "انجیر، توت، برگه و کشمش" },
      { label: "شکلات خرمایی", href: "/products?cat=date-products", desc: "شکلات دست‌ساز کارگاه هلسا" },
      { label: "قند و فرآورده‌های خرما", href: "/products?cat=date-products", desc: "قند، شیره و پودر خرما" },
      { label: "عسل", href: "/products?q=عسل", desc: "عسل طبیعی با آنالیز" },
      { label: "زعفران", href: "/products?q=زعفران", desc: "سرگل نگین قائنات" },
      { label: "محصولات طبیعی", href: "/products?cat=natural", desc: "ارده، چای، دمنوش و ادویه" },
    ],
  },
  {
    label: "مهمانی و مزه هلسا",
    href: "/experience",
    children: [
      { label: "مزه هلسا", href: "/mazeh", desc: "ترکیب‌های شور و شیرین" },
      { label: "سینی‌های مزه", href: "/mazeh-trays", desc: "۸ سینی امضای هلسا" },
      { label: "مهمانی هلسا", href: "/mehmani", desc: "دورهمی تا پذیرایی سازمانی" },
      { label: "سینی خودت را بساز", href: "/mazeh-trays/build", desc: "شخصی‌سازی با قیمت زنده" },
    ],
  },
  {
    label: "هدایا",
    href: "/gifts",
    children: [
      { label: "هدایای شخصی", href: "/gifts/personal", desc: "جعبه‌های هدیه برای عزیزان" },
      { label: "هدایای سازمانی", href: "/gifts/corporate", desc: "پکیج‌های شرکتی و عمده" },
      { label: "خرید عمده", href: "/wholesale", desc: "رستوران، کافه و فروشگاه" },
      { label: "هدایای یلدا", href: "/gifts/personal?occasion=یلدا", desc: "شب چله با امضای هلسا" },
      { label: "هدایای نوروز", href: "/gifts/personal?occasion=نوروز", desc: "عیدی و تقدیر نوروزی" },
    ],
  },
  {
    label: "مرکز سلامت",
    href: "/health-center",
    children: [
      { label: "دسته‌های سلامت", href: "/health-center", desc: "۱۰ قلمرو دانش سلامت" },
      { label: "سلامت روان", href: "/health-center/mental-health", desc: "استرس، خواب و ذهن‌آگاهی" },
      { label: "راهنمای محصولات", href: "/guides", desc: "مزایا، مصرف و نگهداری" },
      { label: "مجلهٔ هلسا", href: "/blog", desc: "مقالات و روایت‌ها" },
      { label: "پادکست هلسا", href: "/podcast", desc: "به‌زودی — گفت‌وگوهای هفتگی" },
      { label: "ویدیاکست", href: "/videocast", desc: "پشت‌صحنهٔ هلسا" },
    ],
  },
  {
    label: "روزیته",
    href: "/rooziteh",
    children: [
      { label: "روزیته چیست؟", href: "/rooziteh", desc: "تولیدکنندگان کوچک، با نام خودشان" },
      { label: "ثبت درخواست تولیدکننده", href: "/rooziteh/apply", desc: "بررسی و تأیید پیش از انتشار" },
    ],
  },
  { label: "جشنواره‌ها", href: "/campaigns" },
  { label: "پیشنهاد ویژه", href: "/offers" },
];

export const SECONDARY_NAV = [
  { label: "درباره ما", href: "/about" },
  { label: "تماس با ما", href: "/contact" },
];

export const FOOTER_LINKS = {
  brand: [
    { label: "درباره هلسا", href: "/about" },
    { label: "داستان ما", href: "/about#story" },
    { label: "مرکز سلامت", href: "/health-center" },
    { label: "راهنمای محصولات", href: "/guides" },
    { label: "تماس با ما", href: "/contact" },
    { label: "وبلاگ هلسا", href: "/blog" },
    { label: "پادکست هلسا", href: "/podcast" },
    { label: "ویدیاکست هلسا", href: "/videocast" },
  ],
  shop: [
    { label: "همه محصولات", href: "/products" },
    { label: "خرما", href: "/products?cat=dates" },
    { label: "آجیل و مغزها", href: "/products?cat=nuts" },
    { label: "خشکبار", href: "/products?cat=dried-fruits" },
    { label: "شکلات خرمایی", href: "/products?cat=date-products" },
    { label: "محصولات طبیعی", href: "/products?cat=natural" },
    { label: "سینی مزه هلسا", href: "/mazeh-trays" },
    { label: "هدایای هلسا", href: "/gifts" },
    { label: "هدایای سازمانی", href: "/gifts/corporate" },
  ],
  service: [
    { label: "پیگیری سفارش", href: "/account" },
    { label: "سوالات متداول", href: "/faq" },
    { label: "قوانین و مقررات", href: "/terms" },
    { label: "شرایط ارسال", href: "/shipping" },
    { label: "مرجوعی کالا", href: "/refund" },
    { label: "حریم خصوصی", href: "/privacy" },
  ],
} as const;

/**
 * Social channels (brief 3.4) — render ONLY channels with a real, filled-in handle.
 * linkedin/youtube stay hidden until the owner provides a verified handle.
 */
import { InstagramIcon, TelegramIcon, LinkedinIcon, YoutubeIcon } from "@/components/ui/icons";
import { MessageCircle } from "lucide-react";

export const SOCIAL_CHANNELS: { id: string; label: string; href: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "instagram", label: "اینستاگرام", href: SITE.instagramUrl, Icon: InstagramIcon },
  { id: "telegram", label: "تلگرام", href: SITE.telegramUrl, Icon: TelegramIcon },
  { id: "whatsapp", label: "واتس‌اپ", href: SITE.whatsappUrl, Icon: MessageCircle },
  // awaiting verified handles from the owner — leave empty to keep them hidden
  { id: "linkedin", label: "لینکدین", href: "", Icon: LinkedinIcon },
  { id: "youtube", label: "یوتیوب", href: "", Icon: YoutubeIcon },
];
