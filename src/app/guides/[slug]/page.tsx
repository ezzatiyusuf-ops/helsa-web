import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Lightbulb, Snowflake, ChefHat, MessageCircleQuestion, ArrowLeft, ShoppingBasket } from "lucide-react";
import { PRODUCT_GUIDES } from "@/data/product-guides";
import { Reveal } from "@/components/ui/primitives";
import { SmartImage } from "@/components/ui/SmartImage";
import { ShareButtons } from "@/components/blog/ShareButtons";
import { JsonLd } from "@/components/seo/JsonLd";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const g = PRODUCT_GUIDES.find((x) => x.slug === slug);
  if (!g) notFound();
  return {
    title: `${g.title} | هلسا`,
    description: g.subtitle,
    alternates: { canonical: `/guides/${g.slug}` },
    openGraph: {
    type: "website", title: g.title, description: g.subtitle, images: [{ url: g.image, width: 1200, height: 630, alt: g.title }] },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = PRODUCT_GUIDES.find((x) => x.slug === slug);
  if (!g) notFound();
  const others = PRODUCT_GUIDES.filter((x) => x.slug !== slug).slice(0, 3);

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: g.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: g.title,
    description: g.subtitle,
    image: g.image,
    author: { "@type": "Organization", name: "هلسا ایرانیان" },
    inLanguage: "fa",
    mainEntityOfPage: `${siteUrl}/guides/${g.slug}`,
  };

  const sections = [
    { icon: CheckCircle2, title: "مزایا و نکات کلیدی", items: g.benefits },
    { icon: Lightbulb, title: "روش مصرف", items: g.usage },
    { icon: Snowflake, title: "نگهداری", items: g.storage },
  ];

  return (
    <>
      <JsonLd data={faqLd} />
      <JsonLd data={articleLd} />
      <article>
        <header className="relative overflow-hidden bg-brand-950">
          <SmartImage src={g.image} alt={g.title} sizes="100vw" priority className="absolute inset-0 size-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-950 to-brand-950/40" aria-hidden />
          <div className="relative container-x py-14 md:py-18 max-w-3xl">
            <nav aria-label="مسیر صفحه" className="text-[11px] text-inverse/70 flex gap-1.5">
              <Link href="/" className="hover:text-gold-400">خانه</Link><span aria-hidden>/</span>
              <Link href="/guides" className="hover:text-gold-400">راهنمای محصولات</Link><span aria-hidden>/</span>
              <span className="text-inverse">{g.categoryLabel}</span>
            </nav>
            <h1 className="mt-4 text-2xl md:text-4xl font-black text-inverse leading-snug">{g.title}</h1>
            <p className="mt-3 text-[13px] leading-7 text-inverse/75">{g.subtitle}</p>
          </div>
        </header>

        <div className="container-x max-w-3xl py-12">
          <Reveal>
            <p className="text-sm md:text-[15px] leading-9 text-body">{g.intro}</p>
          </Reveal>

          {sections.map((sec, si) => (
            <Reveal key={sec.title} className="mt-10">
              <section aria-label={sec.title}>
                <h2 className="flex items-center gap-2.5 text-lg font-black text-heading">
                  <span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-700"><sec.icon className="size-4.5" aria-hidden /></span>
                  {sec.title}
                </h2>
                <ul className="mt-5 space-y-3.5">
                  {sec.items.map((it) => (
                    <li key={it} className="flex gap-3 rounded-2xl border border-line/60 bg-surface p-4 text-[13px] leading-7 text-body shadow-soft">
                      <CheckCircle2 className="mt-1 size-4 shrink-0 text-brand-600" aria-hidden />
                      {it}
                    </li>
                  ))}
                </ul>
              </section>
            </Reveal>
          ))}

          <Reveal className="mt-10">
            <section aria-label="دستورهای پیشنهادی">
              <h2 className="flex items-center gap-2.5 text-lg font-black text-heading">
                <span className="grid size-9 place-items-center rounded-xl bg-gold-500/15 text-gold-700"><ChefHat className="size-4.5" aria-hidden /></span>
                دستورهای پیشنهادی هلسا
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {g.recipes.map((r) => (
                  <div key={r.name} className="rounded-2xl border border-gold-300/50 bg-gradient-to-b from-gold-50 to-surface p-5">
                    <p className="text-[13px] font-black text-heading">{r.name}</p>
                    <p className="mt-2 text-[12px] leading-7 text-muted">{r.text}</p>
                  </div>
                ))}
              </div>
            </section>
          </Reveal>

          <Reveal className="mt-10">
            <section aria-label="پرسش‌های پرتکرار">
              <h2 className="flex items-center gap-2.5 text-lg font-black text-heading">
                <span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-700"><MessageCircleQuestion className="size-4.5" aria-hidden /></span>
                پرسش‌های پرتکرار
              </h2>
              <div className="mt-5 space-y-3">
                {g.faqs.map((f) => (
                  <details key={f.q} className="group rounded-2xl border border-line/70 bg-surface p-5 shadow-soft open:shadow-lift">
                    <summary className="flex cursor-pointer items-center justify-between gap-3 text-[13px] font-black text-heading">
                      {f.q}
                      <ArrowLeft className="size-4 shrink-0 text-brand-600 transition-transform group-open:-rotate-90" aria-hidden />
                    </summary>
                    <p className="mt-3 border-t border-line/60 pt-3 text-[12.5px] leading-7 text-muted">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          </Reveal>

          <Reveal className="mt-10">
            <div className="flex flex-col items-center gap-4 rounded-[1.5rem] border border-brand-200 bg-brand-50 p-6 text-center sm:flex-row sm:text-start">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-700 text-inverse">
                <ShoppingBasket className="size-5" aria-hidden />
              </span>
              <p className="flex-1 text-[12.5px] leading-7 text-body">
                محصولات این راهنما در ویترین هلسا موجودند — با تضمین تازگی و اصالت.
              </p>
              <Link href={g.relatedHref} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-brand-700 px-6 text-[12.5px] font-bold text-inverse transition-colors hover:bg-brand-800">
                مشاهده محصولات <ArrowLeft className="size-4" aria-hidden />
              </Link>
            </div>
          </Reveal>

          <div className="mt-8 border-t border-line/70 pt-6">
            <ShareButtons title={g.title} path={`/guides/${g.slug}`} />
          </div>
        </div>

        <section className="container-x pb-16" aria-label="راهنماهای دیگر">
          <h2 className="text-lg font-black text-heading mb-5">راهنماهای دیگر هلسا</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {others.map((o) => (
              <Link key={o.slug} href={`/guides/${o.slug}`} className="group rounded-2xl border border-line/70 bg-surface p-5 shadow-soft transition-shadow hover:shadow-lift">
                <p className="text-[10.5px] font-bold text-gold-700">{o.categoryLabel}</p>
                <p className="mt-2 text-[13px] font-extrabold leading-6 group-hover:text-brand-700 transition-colors">{o.title}</p>
              </Link>
            ))}
          </div>
        </section>
      </article>
    </>
  );
}
