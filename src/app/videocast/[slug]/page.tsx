import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock3, Video, FileText, ListChecks } from "lucide-react";
import { EPISODES, SHOW } from "@/data/podcast";
import { BLOG_POSTS } from "@/data/content";
import { Reveal } from "@/components/ui/primitives";
import { SmartImage } from "@/components/ui/SmartImage";
import { ShareButtons } from "@/components/blog/ShareButtons";
import { JsonLd } from "@/components/seo/JsonLd";
import { faDate, faDigits } from "@/lib/format";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const e = EPISODES.find((x) => x.slug === slug && x.kind === "videocast");
  if (!e) notFound();
  return {
    title: `${e.title} | ویدیاکست هلسا`,
    description: e.desc,
    alternates: { canonical: `/videocast/${e.slug}` },
    openGraph: { title: e.title, description: e.desc, images: [{ url: e.cover, width: 1200, height: 630, alt: e.title }], type: "video.other" },
  };
}

export default async function VideocastEpisodePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const e = EPISODES.find((x) => x.slug === slug && x.kind === "videocast");
  if (!e) notFound();
  const related = (e.relatedArticles ?? []).map((s) => BLOG_POSTS.find((b) => b.slug === s)).filter(Boolean);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: e.title,
    description: e.desc,
    uploadDate: e.date,
    thumbnailUrl: [e.cover],
    url: `${siteUrl}/videocast/${e.slug}`,
    inLanguage: "fa",
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <article>
        <header className="relative overflow-hidden bg-brand-950">
          <SmartImage src={e.cover} alt={e.title} sizes="100vw" priority className="absolute inset-0 size-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-950 to-brand-950/40" aria-hidden />
          <div className="relative container-x py-14 md:py-18 max-w-3xl">
            <nav aria-label="مسیر صفحه" className="text-[11px] text-inverse/70 flex gap-1.5">
              <Link href="/" className="hover:text-gold-400">خانه</Link><span aria-hidden>/</span>
              <Link href="/videocast" className="hover:text-gold-400">ویدیاکست</Link><span aria-hidden>/</span>
              <span className="text-inverse">قسمت</span>
            </nav>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[10.5px] font-bold">
              <span className="rounded-full bg-gold-500/20 px-3 py-1 text-gold-300">به‌زودی</span>
              <span className="flex items-center gap-1 text-inverse/70"><Clock3 className="size-3" aria-hidden /> {faDigits(e.durationMin)} دقیقه</span>
              <span className="flex items-center gap-1 text-inverse/70"><Video className="size-3" aria-hidden /> ویدیاکست هلسا</span>
            </div>
            <h1 className="mt-4 text-2xl md:text-4xl font-black leading-snug text-inverse">{e.title}</h1>
            <p className="mt-4 text-[13px] leading-7 text-inverse/75">{e.desc}</p>
          </div>
        </header>

        <div className="container-x max-w-3xl py-12">
          <Reveal>
            <div className="relative aspect-video overflow-hidden rounded-[1.5rem] border border-line/70 shadow-lift">
              <SmartImage src={e.cover} alt={e.title} sizes="(min-width:768px) 768px, 100vw" className="absolute inset-0 size-full object-cover" />
              <div className="absolute inset-0 grid place-items-center bg-ink-950/35" aria-hidden>
                <span className="grid size-16 place-items-center rounded-full border border-white/30 bg-white/10 text-white backdrop-blur-md">
                  <Video className="size-6" aria-hidden />
                </span>
              </div>
              <p className="absolute bottom-4 start-4 rounded-full bg-ink-950/50 px-3.5 py-1.5 text-[10.5px] font-bold text-white backdrop-blur-md">
                ویدیو به‌زودی · {faDate(e.date)}
              </p>
            </div>
          </Reveal>

          {e.transcript && (
            <Reveal className="mt-10">
              <section aria-label="متن و زمان‌بندی">
                <h2 className="flex items-center gap-2.5 text-lg font-black text-heading">
                  <span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-700"><FileText className="size-4.5" aria-hidden /></span>
                  متن ویدیو و زمان‌بندی
                </h2>
                <ol className="mt-5 space-y-3">
                  {e.transcript.map((t) => (
                    <li key={t.t} className="flex gap-4 rounded-2xl border border-line/60 bg-surface p-4 shadow-soft">
                      <span className="shrink-0 rounded-full bg-surface2 px-2.5 py-1 text-[10.5px] font-black text-brand-700" dir="ltr">{t.t}</span>
                      <p className="text-[12.5px] leading-7 text-body">{t.text}</p>
                    </li>
                  ))}
                </ol>
              </section>
            </Reveal>
          )}

          {e.topics.length > 0 && (
            <Reveal className="mt-10">
              <div className="flex flex-wrap items-center gap-2" aria-label="موضوعات">
                <ListChecks className="size-4 text-brand-600" aria-hidden />
                {e.topics.map((t) => (
                  <span key={t} className="rounded-full border border-line bg-surface px-3 py-1.5 text-[11px] font-bold text-body">#{t}</span>
                ))}
              </div>
            </Reveal>
          )}

          <div className="mt-8 border-t border-line/70 pt-6">
            <ShareButtons title={e.title} path={`/videocast/${e.slug}`} />
          </div>
        </div>

        {related.length > 0 && (
          <section className="container-x pb-16" aria-label="مقالات مرتبط">
            <h2 className="text-lg font-black text-heading mb-5">مقالات مرتبط</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {related.map((b) => (
                <Link key={b!.slug} href={`/blog/${b!.slug}`} className="group rounded-2xl border border-line/70 bg-surface p-5 shadow-soft transition-shadow hover:shadow-lift">
                  <p className="text-[10.5px] font-bold text-gold-700">{b!.category}</p>
                  <p className="mt-2 text-[13px] font-extrabold leading-6 group-hover:text-brand-700 transition-colors">{b!.title}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
}
