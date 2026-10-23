/**
 * HELSA advanced tray builder — server-side pricing & option configuration.
 *
 * Prices are ONLY trusted from the server (see /api/tray-builder/quote).
 * The client renders an optimistic estimate with the same formula but the
 * cart/order pipeline only ever accepts a server-issued quote id
 * (`custom-quote-{id}`), resolved again inside POST /api/orders.
 */

export interface BuilderSize {
  id: string;
  label: string;
  guests: string;
  base: number;
  factor: number;
}

export const BUILDER_SIZES: BuilderSize[] = [
  { id: "small", label: "کوچک", guests: "۲ تا ۴ نفر", base: 950_000, factor: 1 },
  { id: "medium", label: "متوسط", guests: "۴ تا ۸ نفر", base: 1_650_000, factor: 1.35 },
  { id: "large", label: "بزرگ", guests: "۸ تا ۱۲ نفر", base: 2_450_000, factor: 1.8 },
  { id: "xl", label: "XL", guests: "۱۲ تا ۱۸ نفر", base: 3_400_000, factor: 2.4 },
  { id: "vip", label: "VIP", guests: "۱۲ تا ۲۰ نفر", base: 3_900_000, factor: 2.6 },
  { id: "corporate", label: "سازمانی", guests: "۱۶ تا ۲۴ نفر", base: 4_800_000, factor: 3.1 },
  { id: "event", label: "رویدادی", guests: "۲۴ تا ۳۰ نفر", base: 6_200_000, factor: 3.8 },
  { id: "custom", label: "دلخواه", guests: "چیدمان آزاد (۲ تا ۳۰ نفر)", base: 800_000, factor: 1.15 },
];

export interface BuilderBase {
  id: string;
  label: string;
  price: number;
  note: string;
}

export const BUILDER_BASES: BuilderBase[] = [
  { id: "wood", label: "چوب طبیعی", price: 0, note: "امضای کلاسیک هلسا" },
  { id: "stone", label: "سنگی", price: 180_000, note: "سنگ مرمر مشکی" },
  { id: "ceramic", label: "سرامیکی", price: 140_000, note: "لعاب کرم دست‌ساز" },
  { id: "acrylic", label: "اکریلیک لوکس", price: 320_000, note: "شفاف با لبه طلاکوب" },
];

export interface BuilderCategory {
  id: string;
  label: string;
  icon: string; // lucide icon name resolved in the client
  items: BuilderItem[];
}

export interface BuilderItem {
  id: string;
  label: string;
  price: number;
  note?: string;
}

export const BUILDER_CATEGORIES: BuilderCategory[] = [
  {
    id: "dates",
    label: "خرما",
    icon: "Sparkles",
    items: [
      { id: "dates-kabkab", label: "خرمای کبک پرمیوم", price: 210_000, note: "کبک ممتاز بم" },
      { id: "dates-mazafati", label: "خرمای مضافتی", price: 240_000, note: "مضافتی سیاه بم" },
      { id: "dates-premium", label: "خرمای پیاروم / مجول", price: 340_000, note: "تاج سفره ایرانی" },
      { id: "dates-chocolate", label: "خرمای شکلاتی روبه‌رو", price: 260_000, note: "شکلات تلخ دست‌ساز" },
      { id: "dates-filled", label: "خرمای مغزدار", price: 290_000, note: "پسته، گردو، بادام" },
      { id: "dates-sugar", label: "شکر خرما", price: 130_000, note: "شیرین‌کننده طبیعی" },
      { id: "dates-chocbar", label: "شکلات خرمایی هلسا", price: 250_000, note: "خمیر خرما و کاکائو" },
    ],
  },
  {
    id: "dips",
    label: "دیپ‌ها",
    icon: "Soup",
    items: [
      { id: "dip-hummus", label: "حمص (حمص بادام‌زمینی نخود)", price: 130_000 },
      { id: "dip-muhammara", label: "محمرة (فلفل دودی و گردو)", price: 150_000 },
      { id: "dip-labneh", label: "لبنی کشیده با روغن زیتون", price: 140_000 },
      { id: "dip-tapenade", label: "زیتون پرورده", price: 160_000 },
      { id: "dip-yogurt", label: "دیپ ماست و سبزی", price: 110_000 },
    ],
  },
  {
    id: "sauces",
    label: "سس‌ها",
    icon: "Droplet",
    items: [
      { id: "sauce-tahini", label: "ارده / تاحینی", price: 120_000 },
      { id: "sauce-garlic", label: "سس سیر", price: 90_000 },
      { id: "sauce-herb", label: "سس سبزیجات", price: 110_000 },
      { id: "sauce-chili", label: "سس تند هلسا", price: 100_000 },
    ],
  },
  {
    id: "cheese",
    label: "پنیر",
    icon: "CircleDot",
    items: [
      { id: "cheese-feta", label: "پنیر فتا", price: 220_000 },
      { id: "cheese-halloumi", label: "پنیر حلوم گریل‌شده", price: 280_000 },
      { id: "cheese-cream", label: "پنیر خامه‌ای", price: 180_000 },
      { id: "cheese-goat", label: "پنیر بزی", price: 320_000 },
      { id: "cheese-aged", label: "پنیر کهنه", price: 350_000, note: "رسیده ۶ ماهه" },
    ],
  },
  {
    id: "bread",
    label: "نان",
    icon: "Wheat",
    items: [
      { id: "bread-sourdough", label: "نان خمیرترش", price: 110_000 },
      { id: "bread-lavash", label: "نان لواش تازه", price: 70_000 },
      { id: "bread-flat", label: "فلت‌برید / تیری", price: 85_000 },
      { id: "bread-crackers", label: "کراکر", price: 95_000 },
      { id: "bread-mini", label: "نان مینیاتوری", price: 85_000 },
    ],
  },
  {
    id: "protein",
    label: "پروتئین",
    icon: "Drumstick",
    items: [
      { id: "protein-chicken", label: "مرغ (سینه پرسی)", price: 260_000 },
      { id: "protein-beef", label: "گوشت گاو", price: 340_000 },
      { id: "protein-turkey", label: "بوقلمون", price: 310_000 },
      { id: "protein-smoked", label: "گوشت دودی", price: 360_000 },
    ],
  },
  {
    id: "nuts",
    label: "مغزها",
    icon: "Nut",
    items: [
      { id: "nuts-pistachio", label: "پسته", price: 340_000, note: "اکبری یا احمدآقایی" },
      { id: "nuts-almond", label: "بادام", price: 190_000 },
      { id: "nuts-walnut", label: "گردو", price: 240_000, note: "گردو تازه کاغذی" },
      { id: "nuts-mixed", label: "آجیل مخلوط هلسا", price: 290_000, note: "چیدمان چهارمغز" },
    ],
  },
  {
    id: "fruits",
    label: "میوه‌ها",
    icon: "Apple",
    items: [
      { id: "fruit-fresh", label: "میوه تازه فصل", price: 150_000 },
      { id: "fruit-dried", label: "میوه خشک", price: 170_000 },
    ],
  },
  {
    id: "drinks",
    label: "نوشیدنی",
    icon: "Coffee",
    items: [
      { id: "drink-juice", label: "آبمیوه طبیعی", price: 120_000 },
      { id: "drink-sparkling", label: "نوشیدنی گازدار", price: 100_000 },
      { id: "drink-tea", label: "چای", price: 90_000, note: "چای زعفرانی هلسا" },
      { id: "drink-coffee", label: "قهوه", price: 140_000 },
    ],
  },
  {
    id: "pastries",
    label: "کیک و شیرینی",
    icon: "Cake",
    items: [
      { id: "pastry-tiramisu", label: "تیرامیسو هلسا", price: 320_000, note: "لایه‌های ماسکارپونه و قهوه" },
      { id: "pastry-cheesecake", label: "چیزکیک نیویورکی", price: 300_000, note: "با سس زغال‌اخته" },
      { id: "pastry-mousse", label: "موس شکلات بلژیکی", price: 280_000, note: "شکلات تلخ ۷۰٪" },
      { id: "pastry-roulade", label: "رولت شکلاتی", price: 260_000 },
      { id: "pastry-brownie", label: "براونی فاج", price: 220_000, note: "با گردوی تازه" },
      { id: "pastry-minis", label: "مینی‌پاستری و شیرینی خشک", price: 190_000 },
    ],
  },
  {
    id: "jams",
    label: "مربا",
    icon: "Cherry",
    items: [
      { id: "jam-quince", label: "مربای به", price: 170_000, note: "شیشهٔ شیشه‌ای هلسا" },
      { id: "jam-carrot", label: "مربای هویج", price: 140_000, note: "با گل محمدی" },
      { id: "jam-balang", label: "مربای بالنگ", price: 180_000 },
      { id: "jam-cherry", label: "مربای آلبالو", price: 160_000 },
      { id: "jam-watermelon", label: "مربای هندونه", price: 150_000 },
      { id: "jam-rose", label: "مربای گل محمدی", price: 190_000 },
    ],
  },
  {
    id: "extras",
    label: "افزوده‌ها",
    icon: "Honey",
    items: [
      { id: "extra-honey", label: "عسل", price: 160_000, note: "کنار یا بهارنارنج" },
      { id: "extra-oliveoil", label: "روغن زیتون", price: 140_000 },
      { id: "extra-herbs", label: "سبزیجات معطر", price: 90_000 },
      { id: "extra-garnish", label: "تزئین خوراکی قابل‌خوردن", price: 120_000, note: "گل و ورقه قابل‌خوردن" },
    ],
  },
];

export const ALL_BUILDER_ITEMS: BuilderItem[] = BUILDER_CATEGORIES.flatMap((c) => c.items);

export function findBuilderItem(id: string): BuilderItem | undefined {
  return ALL_BUILDER_ITEMS.find((i) => i.id === id);
}

/** Decor add-ons (charged once, not per portion). */
export const BUILDER_DECOR: { id: string; label: string; price: number }[] = [
  { id: "medallion", label: "مدالیون طلای هلسا", price: 50_000 },
  { id: "flower", label: "گل طبیعی", price: 100_000 },
  { id: "candles", label: "شمع معطر", price: 80_000 },
];

/** Gift wrapping options (charged once). */
export const BUILDER_GIFT_WRAP: { id: string; label: string; price: number; note: string }[] = [
  { id: "none", label: "بدون بسته‌بندی هدیه", price: 0, note: "سینی در فویل بهداشتی حرفه‌ای" },
  { id: "box", label: "جعبه کادوی هلسا", price: 180_000, note: "جعبه سبز برند با روبان" },
  { id: "lux", label: "کادوی لوکس با مهر طلایی", price: 320_000, note: "جعبه مخملی + مهر موم طلایی" },
];

/**
 * VAT on custom trays — configurable via NEXT_PUBLIC_BUILDER_TAX_RATE ("0.09" = ۹٪).
 * 0 (default in dev) hides the tax line entirely. The SERVER quote route uses
 * the same constant, so client estimate and authoritative price never diverge.
 */
export const BUILDER_TAX_RATE = Math.max(0, Number.parseFloat(process.env.NEXT_PUBLIC_BUILDER_TAX_RATE ?? "0") || 0);

/** Estimated delivery time shown beside the price (policy, not a promise). */
export const BUILDER_DELIVERY_ESTIMATE = "تحویل فقط در تهران، ۲۴ تا ۴۸ ساعت پیش از زمان مورد نظر، با خودرو یخچال‌دار و هماهنگی تلفنی.";

export const BUILDER_ARRANGEMENT_FEE = 150_000; // چیدمان پایه هلسا
export const BUILDER_MESSAGE_FEE = 30_000; // کارت پیام اختصاصی
export const BUILDER_DELIVERY_FEE = 120_000; // ارسال یخچال‌دار تهران

export const BUILDER_GUEST_MIN = 2;
export const BUILDER_GUEST_MAX = 30;
export const BUILDER_MIN_ITEMS = 4; // حداقل اقلام متمایز
export const BUILDER_MAX_PORTIONS = 24; // حداکثر مجموع پورشن‌ها
export const BUILDER_MAX_ITEM_QTY = 5;

/**
 * Shared pricing model — mirrored by the server route (authority) and the
 * client (optimistic preview only). Food portions scale with guest count.
 */
export function guestFactor(guests: number): number {
  return 0.6 + guests * 0.09;
}

export function estimateBuilderPrice(input: {
  sizeId: string;
  baseId: string;
  guests: number;
  items: { id: string; qty: number }[];
  decor: string[];
  giftWrap: string;
  message: boolean;
}): { total: number; lines: { label: string; amount: number }[] } | null {
  const size = BUILDER_SIZES.find((s) => s.id === input.sizeId);
  const base = BUILDER_BASES.find((b) => b.id === input.baseId);
  if (!size || !base) return null;

  const chosen = input.items
    .map((i) => ({ item: findBuilderItem(i.id), qty: i.qty }))
    .filter((x): x is { item: BuilderItem; qty: number } => !!x.item);
  const portions = chosen.reduce((sum, c) => sum + c.qty, 0);
  const foodRaw = chosen.reduce((sum, c) => sum + c.item.price * c.qty, 0) * guestFactor(input.guests);
  const food = Math.round(foodRaw / 10_000) * 10_000;

  const decor = BUILDER_DECOR.filter((d) => input.decor.includes(d.id));
  const wrap = BUILDER_GIFT_WRAP.find((w) => w.id === input.giftWrap) ?? BUILDER_GIFT_WRAP[0];
  const message = input.message ? BUILDER_MESSAGE_FEE : 0;

  const lines = [
    { label: `پایه سینی (${size.label} · ${base.label})`, amount: size.base + base.price },
    { label: `مزه‌ها و اقلام (${portions} پورشن · ضریب ${input.guests} نفر)`, amount: food },
    { label: "چیدمان پایه هلسا", amount: BUILDER_ARRANGEMENT_FEE },
    ...decor.map((d) => ({ label: `تزئین: ${d.label}`, amount: d.price })),
    ...(wrap.price ? [{ label: `بسته‌بندی هدیه: ${wrap.label}`, amount: wrap.price }] : []),
    ...(message ? [{ label: "چاپ کارت پیام اختصاصی", amount: message }] : []),
    { label: "ارسال یخچال‌دار", amount: BUILDER_DELIVERY_FEE },
  ];

  const subtotal = lines.reduce((sum, l) => sum + l.amount, 0);
  if (BUILDER_TAX_RATE > 0) {
    lines.push({ label: `مالیات بر ارزش افزوده (${(BUILDER_TAX_RATE * 100).toLocaleString("fa-IR")}٪)`, amount: Math.round((subtotal * BUILDER_TAX_RATE) / 10_000) * 10_000 });
  }

  return { total: lines.reduce((sum, l) => sum + l.amount, 0), lines };
}
