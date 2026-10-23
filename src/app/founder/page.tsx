import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Compass, Eye, Quote, Mic2, Newspaper, Radio, Video, Send } from "lucide-react";
import { InstagramIcon, LinkedinIcon, YoutubeIcon } from "@/components/ui/icons";
import { Reveal, SectionHead } from "@/components/ui/primitives";
import { SmartImage } from "@/components/ui/SmartImage";
import { JsonLd } from "@/components/seo/JsonLd";
import { BLOG_POSTS } from "@/data/content";
import { SITE } from "@/config/site";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "یوسف عزتی آذر | بنیان‌گذار هلسا",
  description:
    "داستان یوسف عزتی آذر، بنیان‌گذار هلسا؛ مأموریت، دیدگاه و نوشته‌های او دربارهٔ کشاورزی ایران، صنعت غذا و زندگی سالم.",
  alternates: { canonical: "/founder" },
  openGraph: {
    title: "یوسف عزتی آذر | بنیان‌گذار هلسا",
    description: "داستان، مأموریت و نوشته‌های بنیان‌گذار هلسا",
    images: [{ url: "/images/opt/founder-portrait.jpg", width: 1200, height: 630, alt: "یوسف عزتی آذر" }],
  },
};

// only channels with a real handle (brief 3.4) — unverified channels stay hidden
const SOCIALS = [
  { icon: InstagramIcon, label: "اینستاگرام", href: SITE.instagramUrl },
  { icon: Send, label: "تلگرام", href: SITE.telegramUrl },
];

export default function FounderPage() {
  const articles = BLOG_POSTS.filter((b) => b.author?.href === "/founder");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "یوسف عزتی آذر",
    jobTitle: "بنیان‌گذار و مدیرعامل هلسا",
    url: `${siteUrl}/founder`,
    worksFor: { "@type": "Organization", name: "هلسا ایرانیان" },
    sameAs: SOCIALS.map((s) => s.href),
    inLanguage: "fa",
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      {/* معرفی — دو برند در یک قاب: هلسا و یوسف */}
      <header className="border-b border-line/60 bg-surface2/60">
        <div className="container-x grid gap-10 py-14 md:py-20 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-4">
            <Reveal>
              <div className="relative mx-auto max-w-[340px]">
                <div className="overflow-hidden rounded-[1.75rem] border border-line/70 shadow-lift">
                  <SmartImage
                    src="/images/opt/founder-portrait.jpg"
                    alt="پرترهٔ یوسف عزتی آذر، بنیان‌گذار هلسا"
                    sizes="(min-width:1024px) 340px, 80vw"
                    priority
                    className="aspect-[4/5] w-full object-cover"
                  />
                </div>
                <span className="absolute -bottom-4 inset-x-8 rounded-2xl border border-line/70 bg-surface px-4 py-3 text-center shadow-soft">
                  <span className="block text-[13px] font-black text-heading">یوسف عزتی آذر</span>
                  <span className="mt-0.5 block text-[10.5px] text-muted">بنیان‌گذار هلسا ایرانیان</span>
                </span>
              </div>
            </Reveal>
          </div>
          <div className="lg:col-span-8">
            <nav aria-label="مسیر صفحه" className="text-[11px] text-muted flex gap-1.5">
              <Link href="/" className="hover:text-brand-700">خانه</Link><span aria-hidden>/</span>
              <span className="text-heading">بنیان‌گذار</span>
            </nav>
            <Reveal delay={0.06}>
              <p className="mt-5 text-[11px] font-bold tracking-[0.22em] text-gold-700">از یک باور، یک برند</p>
              <h1 className="mt-4 text-2xl md:text-4xl font-black leading-[1.5] text-heading">
                «هر عدد خرما، امضای یک انسان است.»
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-9 text-body">
                من یوسف عزتی آذر هستم؛ بنیان‌گذار هلسا. هلسا از یک سؤال ساده شروع شد: چرا سرزمینی با بهترین
                خرمای جهان، آجیل بی‌همتا و حکمت هزارسالهٔ سفره، فروشگاهی در سطح استانداردهای جهانی ندارد؟
                پاسخِ این سال‌ها، همان فروشگاهی است که الان در آن هستید — و این تازه آغاز راه است.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="#story" className="inline-flex h-11 items-center gap-2 rounded-full bg-brand-700 px-6 text-[12.5px] font-bold text-inverse transition-colors hover:bg-brand-800">
                  داستان هلسا <ArrowLeft className="size-4" aria-hidden />
                </Link>
                <Link href="/about" className="inline-flex h-11 items-center rounded-full border border-line px-6 text-[12.5px] font-bold text-heading transition-colors hover:bg-surface">
                  دربارهٔ هلسا
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </header>

      {/* داستان */}
      <section id="story" className="container-x py-14 md:py-18 max-w-3xl" aria-label="داستان">
        <Reveal>
          <SectionHead eyebrow="داستان" title="از باغ تا مرز جهانی" />
          <div className="mt-6 space-y-5 text-sm leading-9 text-body">
            <p>
              داستان هلسا در میانهٔ مزارع و بازارهای ایران شکل گرفت؛ جایی که دیدم بهترین محصولات این سرزمین،
              یا با قیمت ناچیز به دلال می‌رسد یا با بسته‌بندی‌ای بی‌هویت به ویترین می‌رود. در هر دو حالت،
              بازنده یکی بود: کشاورز و مصرف‌کنندهٔ ایرانی.
            </p>
            <p>
              هلسا را با یک قاعدهٔ ساده ساختم: از باغبان منصفانه بخر، با استاندارد جهانی بسته‌بندی کن، و
              به مشتری، شفاف بفروش. نه وعدهٔ معجزه، نه برچسب‌های توخالی — فقط محصول خوب، مبدأ روشن و قیمتی
              که همهٔ زنجیرهٔ آن را می‌شود دید.
            </p>
            <p>
              امروز هلسا بیش از یک فروشگاه است؛ مرکز سلامتی برای دانش زندگی سالم و روایتی برای کشاورزی
              ایران. فردا؟ پایگاهی برای گفت‌وگو دربارهٔ آیندهٔ غذای این سرزمین — در پادکست و ویدیاکست هلسا.
            </p>
          </div>
        </Reveal>
      </section>

      {/* مأموریت و دیدگاه */}
      <section className="bg-surface2/70 border-y border-line/60 py-14 md:py-18" aria-label="مأموریت و دیدگاه">
        <div className="container-x grid gap-6 md:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-[1.5rem] border border-line/70 bg-surface p-7 shadow-soft">
              <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-700"><Compass className="size-5" aria-hidden /></span>
              <h2 className="mt-5 text-lg font-black text-heading">مأموریت</h2>
              <p className="mt-3 text-[13px] leading-8 text-muted">
                رساندن بهترین محصولات طبیعی ایران از باغ به سفرهٔ خانواده‌های ایرانی و جهان — با زنجیره‌ای
                شفاف، منصفانه و پایدار که در آن کشاورز، کارمند و مشتری، هر سه برنده باشند.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="h-full rounded-[1.5rem] border border-gold-300/60 bg-gradient-to-b from-gold-50 to-surface p-7 shadow-soft">
              <span className="grid size-12 place-items-center rounded-2xl bg-gold-500/15 text-gold-700"><Eye className="size-5" aria-hidden /></span>
              <h2 className="mt-5 text-lg font-black text-heading">دیدگاه</h2>
              <p className="mt-3 text-[13px] leading-8 text-muted">
                هلسا در افق ده‌ساله‌اش، مرجع سلامت و غذای سالمِ خاورمیانه است؛ جایی که محتوای آموزشی،
                محصول پرمیوم و صدای کشاورز ایران در یک اکوسیستم واحد جمع می‌شوند.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* نوشته‌های بنیان‌گذار */}
      <section className="container-x py-14 md:py-18" aria-label="نوشته‌ها">
        <Reveal>
          <SectionHead eyebrow="قلم بنیان‌گذار" title="نوشته‌های یوسف در مجلهٔ هلسا" desc="روایت‌های میدانی از کشاورزی، صنعت غذا و ساختن یک برند ایرانی." />
        </Reveal>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {articles.map((a, i) => (
            <Reveal key={a.slug} delay={i * 0.05}>
              <Link href={`/blog/${a.slug}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line/70 bg-surface shadow-soft transition-shadow hover:shadow-lift">
                <div className="aspect-[16/9] overflow-hidden img-zoom">
                  <SmartImage src={a.image} alt={a.title} sizes="(min-width:768px) 33vw, 100vw" className="size-full object-cover" />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-[10.5px] font-bold text-gold-700">{a.category}</p>
                  <h3 className="mt-2 text-[13.5px] font-extrabold leading-7 line-clamp-2-fa group-hover:text-brand-700 transition-colors">{a.title}</h3>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* رسانه و صحنه — حال و آینده */}
      <section className="bg-brand-950 py-14 md:py-18 relative overflow-hidden" aria-label="رسانه و رویدادها">
        <div className="pattern-persian-light absolute inset-0 opacity-40" aria-hidden />
        <div className="relative container-x">
          <Reveal>
            <p className="text-[11px] font-bold tracking-[0.22em] text-gold-400">در رسانه و رویدادها</p>
            <h2 className="mt-3 text-xl md:text-2xl font-black text-inverse">جایی که گفت‌وگو شکل می‌گیرد</h2>
          </Reveal>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Newspaper, t: "مقاله‌ها و مصاحبه‌ها", d: "روایت ساختن هلسا در رسانه‌های کسب‌وکار — به‌زودی" },
              { icon: Mic2, t: "سخنرانی", d: "تجربهٔ زنجیرهٔ تأمین و برندسازی ایرانی — به‌زودی" },
            ].map((c, i) => (
              <Reveal key={c.t} delay={i * 0.05}>
                <div className="group flex h-full flex-col gap-3 rounded-2xl border border-white/12 bg-white/[0.05] p-5 backdrop-blur-sm">
                  <c.icon className="size-5 text-gold-300" aria-hidden />
                  <span className="text-[13px] font-black text-white">{c.t}</span>
                  <span className="text-[11px] leading-5 text-white/55">{c.d}</span>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-8">
            <blockquote className="mx-auto max-w-2xl rounded-[1.5rem] border border-gold-400/25 bg-gold-500/[0.07] p-6 text-center">
              <Quote className="mx-auto size-5 text-gold-400" aria-hidden />
              <p className="mt-3 text-[13.5px] leading-8 text-inverse/85">
                اگر می‌خواهیم برند ایرانی جهانی شود، باید از اولین خریدِ اولین مشتری، مثل آخرین خریدِ آخرین
                مشتری رفتار کنیم.
              </p>
            </blockquote>
          </Reveal>
        </div>
      </section>

      {/* شبکه‌های اجتماعی + پل به هلسا */}
      <section className="container-x py-14" aria-label="شبکه‌های اجتماعی بنیان‌گذار">
        <Reveal>
          <div className="flex flex-col items-center gap-6 rounded-[1.75rem] border border-line/70 bg-surface p-8 shadow-soft md:flex-row">
            <div className="flex-1 text-center md:text-start">
              <h2 className="text-lg font-black text-heading">گفت‌وگو را ادامه بدهیم</h2>
              <p className="mt-2 text-[12.5px] leading-7 text-muted">
                روزانه در اینستاگرام و لینکدین دربارهٔ کشاورزی، غذای سالم و ساختن هلسا می‌نویسم.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2.5">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${s.label} یوسف عزتی آذر`}
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-5 text-[11.5px] font-bold text-heading transition-colors hover:border-brand-300 hover:bg-brand-50"
                >
                  <s.icon className="size-4" aria-hidden /> {s.label}
                </a>
              ))}
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
