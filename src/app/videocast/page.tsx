import type { Metadata } from "next";
import Link from "next/link";
import { Video, BellRing, PlayCircle, ArrowLeft } from "lucide-react";
import { SHOW, EPISODES, FUTURE_TOPICS } from "@/data/podcast";
import { Reveal, SectionHead } from "@/components/ui/primitives";
import { SmartImage } from "@/components/ui/SmartImage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false }, // محتوای صوتی/ویدیویی هنوز منتشر نشده — تا آماده شدن از ایندکس خارج است
  title: "ویدیاکست هلسا | روایت تصویری پشت‌صحنه",
  description: "ویدیاکست هلسا؛ روایت تصویری از باغ خرما تا خط بسته‌بندی — آنچه در عکس‌ها نمی‌گنجد.",
  alternates: { canonical: "/videocast" },
  openGraph: {
    type: "website",
    title: "ویدیاکست هلسا",
    description: "روایت تصویری پشت‌صحنهٔ هلسا",
    images: [{ url: SHOW.videocast.cover, width: 1200, height: 630, alt: "ویدیاکست هلسا" }],
  },
};

export default function VideocastPage() {
  const episodes = EPISODES.filter((e) => e.kind === "videocast");

  return (
    <>
      <header className="relative overflow-hidden bg-brand-950">
        <SmartImage src={SHOW.videocast.cover} alt="دستان کشاورز ایرانی و خرمای تازه" sizes="100vw" priority className="absolute inset-0 size-full object-cover opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/70 to-brand-950/40" aria-hidden />
        <div className="relative container-x py-16 md:py-24 max-w-3xl">
          <nav aria-label="مسیر صفحه" className="text-[11px] text-inverse/70 flex gap-1.5">
            <Link href="/" className="hover:text-gold-400">خانه</Link><span aria-hidden>/</span>
            <span className="text-inverse">ویدیاکست</span>
          </nav>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-500/10 px-3.5 py-1.5 text-[11px] font-bold text-gold-300">
            <Video className="size-3.5" aria-hidden /> {SHOW.videocast.subtitle}
          </p>
          <h1 className="mt-5 text-3xl md:text-[42px] font-black leading-[1.4] text-inverse">{SHOW.videocast.title}</h1>
          <p className="mt-4 max-w-xl text-sm md:text-[15px] leading-8 text-inverse/75">{SHOW.videocast.desc}</p>
          <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[11px] font-bold text-inverse backdrop-blur">
            <BellRing className="size-3.5 text-gold-300" aria-hidden /> ضبط اولین قسمت‌ها آغاز شده است
          </p>
        </div>
      </header>

      <section className="container-x py-14 md:py-18" aria-label="قسمت‌ها">
        <Reveal>
          <SectionHead eyebrow="قسمت‌ها" title="آخرین ویدیوها" />
        </Reveal>
        {episodes.length === 0 ? (
          <Reveal className="mt-8">
            <div className="flex flex-col items-center gap-4 rounded-[1.75rem] border border-dashed border-line bg-surface p-10 text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700"><PlayCircle className="size-6" aria-hidden /></span>
              <p className="text-sm font-black text-heading">اولین قسمت ویدیاکست به‌زودی منتشر می‌شود</p>
              <p className="max-w-md text-[12px] leading-7 text-muted">
                ضبط از باغ‌های خرما و کارگاه بسته‌بندی آغاز شده؛ برای باخبرشدن، اینستاگرام و تلگرام هلسا را دنبال کنید.
              </p>
              <Link href="/#instagram" className="inline-flex h-11 items-center gap-2 rounded-full bg-brand-700 px-6 text-[12.5px] font-bold text-inverse transition-colors hover:bg-brand-800">
                دنبال کردن هلسا <ArrowLeft className="size-4" aria-hidden />
              </Link>
            </div>
          </Reveal>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {episodes.map((e, i) => (
              <Reveal key={e.slug} delay={i * 0.05}>
                <Link href={`/videocast/${e.slug}`} className="group block overflow-hidden rounded-[1.5rem] border border-line/70 bg-surface shadow-soft transition-shadow hover:shadow-lift">
                  <div className="relative aspect-video overflow-hidden img-zoom">
                    <SmartImage src={e.cover} alt={e.title} sizes="(min-width:768px) 50vw, 100vw" className="absolute inset-0 size-full object-cover" />
                  </div>
                  <div className="p-5">
                    <h2 className="text-[14px] font-black leading-7 text-heading group-hover:text-brand-700 transition-colors">{e.title}</h2>
                    <p className="mt-1.5 text-[11.5px] leading-6 text-muted line-clamp-2-fa">{e.desc}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      <section className="bg-surface2/70 border-y border-line/60 py-14 md:py-18" aria-label="موضوعات">
        <div className="container-x">
          <Reveal>
            <SectionHead eyebrow="نقشهٔ راه" title="چه چیزی می‌بینید؟" desc="موضوعات فصل اول ویدیاکست." />
          </Reveal>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {FUTURE_TOPICS.slice(0, 8).map((t, i) => (
              <Reveal key={t.title} delay={i * 0.04}>
                <div className="flex h-full flex-col rounded-2xl border border-line/70 bg-surface p-5 shadow-soft">
                  <Video className="size-5 text-brand-700" aria-hidden />
                  <span className="mt-3.5 text-[12.5px] font-black text-heading">{t.title}</span>
                  <span className="mt-1 text-[11px] leading-5 text-muted">{t.desc}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
