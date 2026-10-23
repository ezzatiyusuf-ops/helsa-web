import type { Category } from "@/types";

export const CATEGORIES: Category[] = [
  {
    id: 1,
    name: "خرما",
    slug: "dates",
    description: "خرمای اصیل جنوب ایران؛ پیارم، مضافتی، کبکاب، زاهدی، خاصویی و مجول",
    image: "/images/opt/medjool-dates.jpg",
    icon: "palm",
    subs: ["خرما پیارم", "خرما مضافتی", "خرما کبکاب", "خرما زاهدی", "خرما خاصویی", "خرما مجول"],
    sortOrder: 1,
  },
  {
    id: 2,
    name: "فرآورده‌های خرما",
    slug: "date-products",
    description: "شکلات دست‌ساز خرما، قند خرما، شیره و پودر خرما با دستور انحصاری هلسا",
    image: "/images/opt/handmade-date-chocolate.jpg",
    icon: "chocolate",
    subs: ["شکلات خرمایی", "شکلات دست‌ساز خرما", "قند خرما", "شیره خرما", "پودر خرما"],
    sortOrder: 2,
  },
  {
    id: 3,
    name: "آجیل",
    slug: "nuts",
    description: "آجیل ممتاز، چهارمغز، پذیرایی و تک‌مغزهای تازه از باغ‌های ایران",
    image: "/images/opt/premium-mixed-nuts.jpg",
    icon: "nut",
    subs: ["آجیل ممتاز", "آجیل چهارمغز", "آجیل پذیرایی", "آجیل اقتصادی", "آجیل ویژه"],
    sortOrder: 3,
  },
  {
    id: 4,
    name: "خشکبار",
    slug: "dried-fruits",
    description: "کشمش، انجیر خشک، توت خشک، برگه زردآلو و میوه خشک با خشک‌کردن طبیعی",
    image: "/images/opt/dried-figs.jpg",
    icon: "fig",
    subs: ["کشمش", "انجیر خشک", "توت خشک", "برگه زردآلو", "آلو خشک", "میوه خشک"],
    sortOrder: 4,
  },
  {
    id: 5,
    name: "محصولات طبیعی",
    slug: "natural",
    description: "عسل، زعفران، ارده، شیره‌ها، چای، دمنوش، عرقیات و ادویه‌های اصیل",
    image: "/images/opt/natural-gon-honey.jpg",
    icon: "honey",
    subs: ["عسل", "زعفران", "ارده", "شیره‌ها", "چای", "دمنوش", "عرقیات", "ادویه"],
    sortOrder: 5,
  },
];

export function categoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}
