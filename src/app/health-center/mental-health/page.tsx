import type { Metadata } from "next";
import Link from "next/link";
import { Brain, MoonStar, Wind, HeartHandshake, ArrowLeft, Scale } from "lucide-react";
import { BLOG_POSTS } from "@/data/content";
import { Reveal, SectionHead } from "@/components/ui/primitives";
import { SmartImage } from "@/components/ui/SmartImage";
import { faDigits } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "سلامت روان | مرکز سلامت هلسا",
  description:
    "بخش سلامت روان هلسا؛ آموزش مدیریت استرس، بهداشت خواب، ذهن‌آگاهی و تعادل کار و زندگی — محتوای آموزشی با نگاه آرام و قابل‌اعتماد.",
  alternates: { canonical: "/health-center/mental-health" },
  openGraph: {
    title: "سلامت روان | مرکز سلامت هلسا",
    description: "آموزش مدیریت استرس، خواب و ذهن‌آگاهی برای زندگی روزمره.",
    images: [{ url: "/images/opt/mental-health-hero.jpg", width: 1200, height: 630, alt: "سلامت روان" }],
  },
};

const PILLARS = [
  { icon: Wind, title: "مدیریت استرس", desc: "تنفس، مرزهای ذهنی و مهار نگرانیِ روزمره", slug: "stress-management-guide" },
  { icon: MoonStar, title: "خواب بهتر", desc: "ریتم شبانه‌روزی، نور آبی و آیینِ آرام شب ایرانی", slug: "sleep-hygiene-persian-guide" },
  { icon: Brain, title: "ذهن‌آگاهی", desc: "پنج دقیقه حضور؛ از چای ذهن‌آگاه تا پیاده‌روی بی‌هدف", slug: "mindfulness-daily-practice" },
];

export default function MentalHealthPage() {
  const posts = BLOG_POSTS.filter((b) => b.hub === "mental-health");

  return (
    <>
      {/* هیرو آرام — پالت ملایم و فضای سفید زیاد (فاز ۷: طراحی باید آرام و مطمئن باشد) */}
      <header className="relative overflow-hidden">
        <SmartImage
          src="/images/opt/mental-health-hero.jpg"
          alt="استکان چای دمنوش روی طاقچهٔ پنجره در نور آرام سپیده‌دم"
          sizes="100vw"
          priority
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/70 to-canvas/30" aria-hidden />
        <div className="relative container-x py-20 md:py-28 max-w-3xl">
          <nav aria-label="مسیر صفحه" className="text-[11px] text-muted flex gap-1.5">
            <Link href="/" className="hover:text-brand-700">خانه</Link><span aria-hidden>/</span>
            <Link href="/health-center" className="hover:text-brand-700">مرکز سلامت</Link><span aria-hidden>/</span>
            <span className="text-heading">سلامت روان</span>
          </nav>
          <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3.5 py-1.5 text-[11px] font-bold text-brand-700 backdrop-blur">
            <Brain className="size-3.5" aria-hidden /> بخش سلامت روان
          </p>
          <h1 className="mt-5 text-3xl md:text-[42px] font-black leading-[1.4] text-heading">
            آرام‌تر، یک قدم هر بار
          </h1>
          <p className="mt-4 max-w-xl text-sm md:text-[15px] leading-8 text-body">
            اینجا سخن از آرامش است؛ نه با شعار، که با ابزارهای سادهٔ علمی و سنت ایرانی — برای استرس، خواب و
            لحظه‌های شلوغ. محتوای این بخش آموزشی است و جایگزین مشاوره یا درمان تخصصی نیست.
          </p>
        </div>
      </header>

      {/* ستون‌های سلامت روان */}
      <section className="container-x py-14 md:py-18" aria-label="محورهای سلامت روان">
        <div className="grid gap-5 md:grid-cols-3">
          {PILLARS.map((p, i) => (
            <Reveal key={p.slug} delay={i * 0.06}>
              <Link href={`/blog/${p.slug}`} className="group flex h-full flex-col rounded-[1.5rem] border border-line/70 bg-surface p-7 shadow-soft transition-all hover:shadow-lift">
                <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-700 group-hover:text-inverse">
                  <p.icon className="size-5" aria-hidden />
                </span>
                <h2 className="mt-5 text-[15px] font-black text-heading">{p.title}</h2>
                <p className="mt-2 text-[12px] leading-6 text-muted">{p.desc}</p>
                <span className="mt-auto pt-5 inline-flex items-center gap-1.5 text-[11.5px] font-bold text-brand-700">
                  خواندن مقاله <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" aria-hidden />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* همهٔ مقالات سلامت روان */}
      <section className="bg-surface2/70 border-y border-line/60 py-14 md:py-18" aria-label="مقالات سلامت روان">
        <div className="container-x">
          <Reveal>
            <SectionHead eyebrow="کتابخانهٔ آرامش" title="همهٔ نوشته‌های سلامت روان" />
          </Reveal>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((b, i) => (
              <Reveal key={b.slug} delay={i * 0.05}>
                <Link href={`/blog/${b.slug}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line/70 bg-surface shadow-soft transition-shadow hover:shadow-lift">
                  <div className="aspect-[16/9] overflow-hidden img-zoom">
                    <SmartImage src={b.image} alt={b.title} sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="size-full object-cover" />
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="text-[13.5px] font-extrabold leading-7 line-clamp-2-fa group-hover:text-brand-700 transition-colors">{b.title}</h3>
                    <p className="mt-2 text-[11.5px] leading-6 text-muted line-clamp-2-fa">{b.excerpt}</p>
                    <p className="mt-auto pt-3 text-[10.5px] text-muted">{faDigits(b.readMinutes)} دقیقه مطالعه</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* یادآوری اخلاقی — اعتمادسازی */}
      <section className="container-x py-12" aria-label="سلب مسئولیت">
        <Reveal>
          <p className="mx-auto flex max-w-2xl items-start gap-3 rounded-2xl border border-line/70 bg-surface p-5 text-[11.5px] leading-6 text-muted">
            <Scale className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden />
            محتوای بخش سلامت روان هلسا جنبهٔ آموزشی دارد و بر پایهٔ منابع عمومی سلامت تدوین شده است؛
            جایگزین مشاورهٔ روان‌شناختی یا درمان پزشکی نیست. اگر علائم شما ادامه‌دار است، به متخصص مراجعه کنید —
            کمک‌خواستن، خودش قوی‌ترین قدم سلامت روان است.
          </p>
        </Reveal>
        <Reveal className="mt-8 text-center">
          <Link href="/health-center" className="inline-flex items-center gap-2 text-[12px] font-bold text-brand-700 hover:text-brand-800">
            <HeartHandshake className="size-4" aria-hidden /> بازگشت به مرکز سلامت هلسا
          </Link>
        </Reveal>
      </section>
    </>
  );
}
