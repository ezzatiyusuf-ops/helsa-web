import type { Metadata } from "next";
import Link from "next/link";
import { Mic2, Clock3, ListChecks, BellRing, ArrowLeft, Send } from "lucide-react";
import { SHOW, EPISODES, FUTURE_TOPICS } from "@/data/podcast";
import { SITE } from "@/config/site";
import { InstagramIcon } from "@/components/ui/icons";
import { Reveal, SectionHead } from "@/components/ui/primitives";
import { SmartImage } from "@/components/ui/SmartImage";
import { faDigits } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false }, // محتوای صوتی/ویدیویی هنوز منتشر نشده — تا آماده شدن از ایندکس خارج است
  title: "پادکست هلسا | سلامت، کشاورزی و کارآفرینی",
  description:
    "پادکست هلسا؛ گفت‌وگوهای هفتگی دربارهٔ سلامت، سلامت روان، کشاورزی ایران، صنعت غذا و کارآفرینی — با میهمانان میدانی.",
  alternates: { canonical: "/podcast" },
  openGraph: {
    type: "website",
    title: "پادکست هلسا",
    description: "گفت‌وگوهای سلامت، کشاورزی و کارآفرینی ایرانی",
    images: [{ url: SHOW.podcast.cover, width: 1200, height: 630, alt: "پادکست هلسا" }],
  },
};

export default function PodcastPage() {
  const episodes = EPISODES.filter((e) => e.kind === "podcast");

  return (
    <>
      {/* هیرو */}
      <header className="relative overflow-hidden bg-brand-950">
        <SmartImage src={SHOW.podcast.cover} alt="کاور پادکست هلسا با میکروفن حرفه‌ای" sizes="100vw" priority className="absolute inset-0 size-full object-cover opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/70 to-brand-950/40" aria-hidden />
        <div className="relative container-x py-16 md:py-24 max-w-3xl">
          <nav aria-label="مسیر صفحه" className="text-[11px] text-inverse/70 flex gap-1.5">
            <Link href="/" className="hover:text-gold-400">خانه</Link><span aria-hidden>/</span>
            <span className="text-inverse">پادکست</span>
          </nav>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-500/10 px-3.5 py-1.5 text-[11px] font-bold text-gold-300">
            <Mic2 className="size-3.5" aria-hidden /> {SHOW.podcast.subtitle}
          </p>
          <h1 className="mt-5 text-3xl md:text-[42px] font-black leading-[1.4] text-inverse">{SHOW.podcast.title}</h1>
          <p className="mt-4 max-w-xl text-sm md:text-[15px] leading-8 text-inverse/75">{SHOW.podcast.desc}</p>
          <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[11px] font-bold text-inverse backdrop-blur">
            <BellRing className="size-3.5 text-gold-300" aria-hidden /> اولین قسمت‌ها به‌زودی — راه‌اندازی رسمی: پاییز ۱۴۰۵
          </p>
        </div>
      </header>

      {/* قسمت‌ها */}
      <section className="container-x py-14 md:py-18" aria-label="قسمت‌ها">
        <Reveal>
          <SectionHead eyebrow="قسمت‌ها" title="آخرین قسمت‌ها" />
        </Reveal>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {episodes.map((e, i) => (
            <Reveal key={e.slug} delay={i * 0.05}>
              <Link href={`/podcast/${e.slug}`} className="group flex h-full gap-5 rounded-[1.5rem] border border-line/70 bg-surface p-5 shadow-soft transition-shadow hover:shadow-lift">
                <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl img-zoom">
                  <SmartImage src={e.cover} alt={e.title} sizes="96px" className="absolute inset-0 size-full object-cover" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-center gap-2 text-[10.5px] font-bold">
                    {e.status === "coming-soon" ? (
                      <span className="rounded-full bg-gold-500/15 px-2.5 py-1 text-gold-700">به‌زودی</span>
                    ) : (
                      <span className="rounded-full bg-brand-50 px-2.5 py-1 text-brand-700">منتشر شد</span>
                    )}
                    <span className="flex items-center gap-1 text-muted"><Clock3 className="size-3" aria-hidden /> {faDigits(e.durationMin)} دقیقه</span>
                  </div>
                  <h2 className="mt-2.5 text-[14px] font-black leading-7 text-heading group-hover:text-brand-700 transition-colors">{e.title}</h2>
                  <p className="mt-1.5 text-[11.5px] leading-6 text-muted line-clamp-2-fa">{e.desc}</p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* موضوعات برنامه‌ریزی‌شده */}
      <section className="bg-surface2/70 border-y border-line/60 py-14 md:py-18" aria-label="موضوعات">
        <div className="container-x">
          <Reveal>
            <SectionHead eyebrow="نقشهٔ راه" title="هشت قلمروی گفت‌وگو" desc="موضوعات برنامه‌ریزی‌شدهٔ فصل اول." />
          </Reveal>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {FUTURE_TOPICS.map((t, i) => (
              <Reveal key={t.title} delay={i * 0.04}>
                <div className="flex h-full flex-col rounded-2xl border border-line/70 bg-surface p-5 shadow-soft">
                  <ListChecks className="size-5 text-brand-700" aria-hidden />
                  <span className="mt-3.5 text-[12.5px] font-black text-heading">{t.title}</span>
                  <span className="mt-1 text-[11px] leading-5 text-muted">{t.desc}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* سکشن اشتراک (CRO/رشد) — دنبال‌کردن پادکست از کانال‌های واقعی هلسا */}
      <section className="container-x py-14" aria-label="اشتراک در پادکست">
        <Reveal>
          <div className="relative overflow-hidden rounded-[1.75rem] bg-brand-950 p-7 shadow-lift md:p-10">
            <div className="mx-auto max-w-2xl text-center">
              <p className="inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-500/10 px-3.5 py-1.5 text-[11px] font-bold text-gold-300">
                <BellRing className="size-3.5" aria-hidden /> اشتراک در پادکست هلسا
              </p>
              <h2 className="mt-4 text-xl font-black leading-9 text-inverse md:text-2xl">قسمت‌های جدید را از دست ندهید</h2>
              <p className="mt-3 text-[13px] leading-7 text-inverse/75">
                گفت‌وگوهای هفتگی سلامت، کشاورزی و کارآفرینی — هر قسمت هم‌زمان با انتشار، در کانال‌های هلسا اعلام می‌شود.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <a href={SITE.instagramUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-inverse px-5 py-2.5 text-[12px] font-bold text-brand-900 transition-opacity hover:opacity-90">
                  <InstagramIcon className="size-4" aria-hidden /> اینستاگرام هلسا
                </a>
                <a href={`https://t.me/${SITE.messengers.telegram}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-cream-50/25 px-5 py-2.5 text-[12px] font-bold text-inverse transition-colors hover:border-gold-400 hover:text-gold-300">
                  <Send className="size-4" aria-hidden /> کانال تلگرام
                </a>
                <Link href="/health-center" className="inline-flex items-center gap-2 rounded-full border border-cream-50/25 px-5 py-2.5 text-[12px] font-bold text-inverse transition-colors hover:border-gold-400 hover:text-gold-300">
                  مرکز سلامت هلسا <ArrowLeft className="size-3.5" aria-hidden />
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* پل به ویدیاکست */}
      <section className="container-x py-12" aria-label="ویدیاکست">
        <Reveal>
          <Link href="/videocast" className="group flex items-center justify-between gap-4 rounded-[1.5rem] border border-line/70 bg-surface p-6 shadow-soft transition-shadow hover:shadow-lift">
            <div>
              <p className="text-[11px] font-bold tracking-[0.18em] text-gold-700">نسخهٔ تصویری</p>
              <p className="mt-1.5 text-[15px] font-black text-heading group-hover:text-brand-700 transition-colors">{SHOW.videocast.title} — {SHOW.videocast.subtitle}</p>
            </div>
            <ArrowLeft className="size-5 shrink-0 text-brand-600 transition-transform group-hover:-translate-x-1" aria-hidden />
          </Link>
        </Reveal>
      </section>
    </>
  );
}
