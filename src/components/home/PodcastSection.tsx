import { Mic2, Video, ArrowLeft, Clock3 } from "lucide-react";
import { SHOW, EPISODES } from "@/data/podcast";
import { SmartImage } from "@/components/ui/SmartImage";
import { SectionHead } from "@/components/ui/primitives";
import { faDigits } from "@/lib/format";
import Link from "next/link";

/**
 * «پادکست و ویدیاکست هلسا» — ویترین رسانهٔ صوتی/تصویری صفحهٔ اصلی.
 * داده‌ها از src/data/podcast.ts (قسمت واقعی «قسمت صفر» + وضعیت صادقانهٔ به‌زودی).
 * صفحات هدف: /podcast و /videocast
 */
export function PodcastSection() {
  const cards = [
    {
      href: "/podcast",
      Icon: Mic2,
      show: SHOW.podcast,
      kind: "podcast" as const,
      cta: "شنیدن پادکست هلسا",
    },
    {
      href: "/videocast",
      Icon: Video,
      show: SHOW.videocast,
      kind: "videocast" as const,
      cta: "تماشای ویدیاکست هلسا",
    },
  ];

  return (
    <section className="pt-16 md:pt-20 pb-4 md:pb-6" aria-label="پادکست و ویدیاکست هلسا">
      <div className="container-x">
        <SectionHead
          eyebrow="رسانهٔ هلسا"
          title="پادکست و ویدیاکست هلسا"
          desc="گفت‌وگوهای صوتی دربارهٔ سلامت، خاک و کار — و روایت تصویری پشت‌صحنهٔ هلسا"
        />

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {cards.map(({ href, Icon, show, kind, cta }) => {
            const episodes = EPISODES.filter((e) => e.kind === kind);
            const published = episodes.filter((e) => e.status === "published").length;
            return (
              <Link
                key={href}
                href={href}
                className="group relative flex flex-col overflow-hidden rounded-[1.75rem] border border-line/70 bg-surface shadow-soft transition-shadow hover:shadow-lift"
              >
                <span className="relative block aspect-[16/9] overflow-hidden">
                  <SmartImage
                    src={show.cover}
                    alt={`${show.title} — ${show.subtitle}`}
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    sizes="(min-width: 768px) 50vw, 100vw"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-brand-950/80 via-brand-950/20 to-transparent" aria-hidden />
                  <span className="absolute bottom-3 start-4 flex items-center gap-2">
                    <span className="flex size-10 items-center justify-center rounded-full bg-gold-500 text-heading shadow-lift" aria-hidden>
                      <Icon className="size-5" />
                    </span>
                    <span className="text-base font-black text-inverse md:text-lg">{show.title}</span>
                  </span>
                </span>
                <span className="flex flex-1 flex-col p-5">
                  <span className="text-[13px] font-bold leading-6 text-heading">{show.subtitle}</span>
                  <span className="mt-2 line-clamp-2 text-xs leading-6 text-muted">{show.desc}</span>
                  <span className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-faint">
                    {published > 0 ? (
                      <span className="flex items-center gap-1"><Clock3 className="size-3.5" aria-hidden /> {faDigits(published)} قسمت منتشرشده</span>
                    ) : (
                      <span className="flex items-center gap-1"><Clock3 className="size-3.5" aria-hidden /> قسمت صفر — به‌زودی</span>
                    )}
                  </span>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-black text-brand-700 transition-transform group-hover:-translate-x-0.5">
                    {cta}
                    <ArrowLeft className="size-4" aria-hidden />
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
