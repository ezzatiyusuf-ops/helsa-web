import type { Metadata } from "next";
import { defaultOpenGraph } from "@/lib/metadata";
import { Leaf, Award, Gem, HeartHandshake, Mountain, Wheat } from "lucide-react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Reveal, SectionHead } from "@/components/ui/primitives";
import { SmartImage } from "@/components/ui/SmartImage";

export const metadata: Metadata = {
  alternates: { canonical: "/about" },
  openGraph: { ...defaultOpenGraph, url: "/about" },
  title: "داستان هلسا | هلسا؛ پیوند طبیعت ایران با هنر زندگی امروز",
  description: "هلسا ایرانیان با هدف ارائه محصولات باکیفیت، طبیعی و اصیل ایرانی شکل گرفته است؛ روایتی از اصالت، طبیعت، کیفیت و مهمان‌نوازی ایرانی.",
};

const CHAPTERS = [
  {
    icon: Mountain,
    title: "اصالت",
    text: "هر محصول هلسا از یک جغرافیای مشخص می‌آید؛ خرما از نخلستان‌های جنوب، زعفران از قائنات، انجیر از استهبان. اصالت یعنی نام بردن از مبدأ، نه پنهان کردن آن.",
    image: "/images/story-grove.jpg",
  },
  {
    icon: Leaf,
    title: "طبیعت",
    text: "ما به فصل‌ها احترام می‌گذاریم؛ برداشت در زمان خود، خشک‌کردن در سایه، و بدون افزودنی غیرضروری. طبیعت، اولین آشپز هلسا است.",
    image: "/images/opt/piaram-dates.jpg",
  },
  {
    icon: Wheat,
    title: "انتخاب مواد اولیه",
    text: "انتخاب محموله‌ها از تأمین‌کننده‌های شناخته‌شدهٔ هلسا؛ با اولویت تازگی و کیفیت در هر فصل برداشت.",
    image: "/images/opt/sourcing-groves.jpg",
  },
  {
    icon: Award,
    title: "کیفیت",
    text: "کنترل کیفی چندمرحله‌ای هلسا: بازرسی ظاهری محموله، ارزیابی چشایی و کنترل شرایط بسته‌بندی پیش از عرضه.",
    image: "/images/opt/mazafati-dates.jpg",
  },
  {
    icon: Gem,
    title: "هنر بسته‌بندی",
    text: "بسته‌بندی هلسا پیوندی است از نقش ایرانی، متریال طبیعی و جزئیات طلایی؛ چون هدیه‌ای که به دست مهمان می‌رسد، باید در شأن او باشد.",
    image: "/images/chocolate-craft.jpg",
  },
  {
    icon: HeartHandshake,
    title: "مهمان‌نوازی ایرانی",
    text: "پشت هر سفارش، آبروی یک میزبانی است. سینی‌های مزه هلسا با همین احساس چیده می‌شوند؛ دقیق، تازه و سر وقت.",
    image: "/images/mazeh-board.jpg",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        title="هلسا؛ پیوند طبیعت ایران با هنر زندگی امروز"
        desc="روایتی از اصالت، طبیعت و مهمان‌نوازی؛ و وسواسی که هر بسته را شایسته سفره شما می‌کند."
        crumbs={[{ label: "خانه", href: "/" }, { label: "درباره ما", href: "/about" }]}
      />

      {/* opening statement */}
      <section id="story" className="container-x py-20 md:py-28 max-w-3xl" aria-label="داستان هلسا">
        <Reveal>
          <span className="text-[11px] font-bold tracking-[0.2em] text-gold-700">داستان هلسا</span>
          <p className="mt-6 text-lg md:text-2xl font-black leading-[1.8] text-heading">
            هلسا ایرانیان با هدف ارائه محصولات باکیفیت، طبیعی و اصیل ایرانی شکل گرفته است؛ محصولاتی که ریشه در طبیعت و فرهنگ ایران دارند و با نگاهی مدرن انتخاب، آماده‌سازی و عرضه می‌شوند.
          </p>
          <p className="mt-6 text-sm md:text-[15px] leading-9 text-muted">
            نام «هلسا» برای ما یک عهد است: عهد به اینکه طعم واقعی خرما، عطر واقعی زعفران و تردی واقعی آجیل را بدون میان‌بر به سفره شما برسانیم. هر بسته هلسا حاصل دست‌های یک زنجیره انسانی است — از باغدار تا چیدمان‌کار سینی مزه.
          </p>
          <span className="mt-8 block w-16 rule-gold" aria-hidden />
        </Reveal>
      </section>

      {/* editorial chapters */}
      <section className="bg-surface2/70 border-y border-line/60 py-20 md:py-28" aria-label="فصل‌های هلسا">
        <div className="container-x">
          <Reveal>
            <SectionHead eyebrow="شش فصل، یک روایت" title="آنچه هلسا را هلسا می‌کند" />
          </Reveal>
          <div className="space-y-16 md:space-y-24">
            {CHAPTERS.map((c, i) => (
              <Reveal key={c.title} delay={0.05}>
                <div className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center ${i % 2 ? "lg:[&>div:first-child]:order-2" : ""}`}>
                  <div className="rounded-2xl overflow-hidden border border-line/70 img-zoom">
                    { }
                    <SmartImage src={c.image} alt={c.title} sizes="(min-width:1024px) 33vw, 100vw" className="w-full aspect-[4/3] object-cover" />
                  </div>
                  <div>
                    <span className="inline-flex size-11 rounded-full border border-brand-200 text-brand-700 items-center justify-center">
                      <c.icon className="size-4.5" aria-hidden />
                    </span>
                    <h2 className="mt-5 text-2xl md:text-3xl font-black text-heading leading-snug">{c.title}</h2>
                    <p className="mt-5 text-sm md:text-[15px] leading-8 text-muted max-w-md">{c.text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* mission */}
      <section className="container-x py-20 md:py-28 text-center max-w-2xl mx-auto" aria-label="ماموریت و چشم‌انداز">
        <Reveal>
          <span className="text-[11px] font-bold tracking-[0.2em] text-gold-700">ماموریت ما</span>
          <h2 className="mt-5 text-3xl md:text-[38px] font-black leading-[1.45] text-heading">
            رساندن اصیل‌ترین طعم ایران
            <br />
            به هر سفره‌ای
          </h2>
          <p className="mt-6 text-sm md:text-[15px] leading-9 text-muted">
            چشم‌انداز هلسا روشن است: وقتی نام ما می‌آید، یاد خرما پیارم حاجی‌آباد، انجیر استهبان و زعفران قائنات بیفتد — و یاد بسته‌بندی‌ای که در شأن این گنجینه‌هاست. «چون شما لایق بهترین‌ها هستید ...»
          </p>
        </Reveal>
      </section>

      {/* پل به صفحهٔ بنیان‌گذار (فاز ۹) */}
      <section className="container-x pb-16" aria-label="بنیان‌گذار هلسا">
        <Reveal>
          <Link href="/founder" className="group flex items-center justify-between gap-4 rounded-[1.5rem] border border-line/70 bg-surface p-6 shadow-soft transition-shadow hover:shadow-lift">
            <div>
              <p className="text-[11px] font-bold tracking-[0.18em] text-gold-700">چهرهٔ برند</p>
              <p className="mt-1.5 text-[15px] font-black text-heading group-hover:text-brand-700 transition-colors">داستان یوسف عزتی آذر، بنیان‌گذار هلسا</p>
              <p className="mt-1 text-[12px] text-muted">مأموریت، دیدگاه و نوشته‌های او دربارهٔ کشاورزی و غذای سالم</p>
            </div>
            <ArrowLeft className="size-5 shrink-0 text-brand-600 transition-transform group-hover:-translate-x-1" aria-hidden />
          </Link>
        </Reveal>
      </section>
    </>
  );
}