import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, Apple, Coffee, Leaf, HeartPulse, Activity, ChefHat, Scroll, Sprout, Factory, ArrowLeft, Brain } from "lucide-react";
import { HEALTH_HUB_CATEGORIES } from "@/data/health-content";
import { BLOG_POSTS } from "@/data/content";
import { Reveal, SectionHead } from "@/components/ui/primitives";
import { SmartImage } from "@/components/ui/SmartImage";
import { JsonLd } from "@/components/seo/JsonLd";
import { faDigits, faDate } from "@/lib/format";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "مرکز سلامت هلسا | دانش سلامت، تغذیه و زندگی سالم",
  description:
    "مرکز سلامت هلسا؛ مرجع آموزشی سبک زندگی سالم، تغذیه، دمنوش‌ها، سلامت روان، طب ایرانی و دانش کشاورزی — به قلم تیم هلسا و بنیان‌گذار آن.",
  alternates: { canonical: "/health-center" },
  openGraph: {
    type: "website",
    title: "مرکز سلامت هلسا",
    description: "دانش سلامت و زندگی سالم؛ از سفرهٔ ایرانی تا کشاورزی پایدار.",
    images: [{ url: "/images/opt/health-center-hero.jpg", width: 1200, height: 630, alt: "مرکز سلامت هلسا" }],
  },
};

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles, Apple, Coffee, Leaf, HeartPulse, Activity, ChefHat, Scroll, Sprout, Factory,
};

export default function HealthCenterPage() {
  const posts = BLOG_POSTS.filter((b) => b.hub);
  const [featured, ...rest] = posts;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "مرکز سلامت هلسا",
    description: metadata.description,
    url: `${siteUrl}/health-center`,
    inLanguage: "fa",
    hasPart: posts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: `${siteUrl}/blog/${p.slug}`,
      datePublished: p.date,
    })),
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      {/* hero — آرام و مطبوع */}
      <header className="relative overflow-hidden bg-brand-950">
        <SmartImage
          src="/images/opt/health-center-hero.jpg"
          alt="استکان چای گیاهی و مواد طبیعی در نور آرام صبح"
          sizes="100vw"
          priority
          className="absolute inset-0 size-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/70 to-brand-950/40" aria-hidden />
        <div className="relative container-x py-16 md:py-24 max-w-3xl">
          <nav aria-label="مسیر صفحه" className="text-[11px] text-inverse/70 flex gap-1.5">
            <Link href="/" className="hover:text-gold-400">خانه</Link><span aria-hidden>/</span>
            <span className="text-inverse">مرکز سلامت</span>
          </nav>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-500/10 px-3.5 py-1.5 text-[11px] font-bold text-gold-300">
            <HeartPulse className="size-3.5" aria-hidden /> هاب محتوای سلامت هلسا
          </p>
          <h1 className="mt-5 text-3xl md:text-[42px] font-black leading-[1.4] text-inverse">
            مرکز سلامت هلسا
          </h1>
          <p className="mt-4 max-w-xl text-sm md:text-[15px] leading-8 text-inverse/75">
            هلسا فقط یک فروشگاه نیست؛ یک رسانهٔ آموزشی برای زندگی سالم است. اینجا از علم تغذیه و
            سلامت روان تا حکمت سفرهٔ ایرانی و داستان کشاورزی این سرزمین را — صادقانه و بدون اغراق — می‌خوانید.
          </p>
          <p role="note" className="mt-4 rounded-2xl border border-inverse/20 bg-inverse/10 px-4 py-3 text-[11px] leading-6 text-inverse/80">
            محتوای مرکز سلامت هلسا آموزشی است و جایگزین توصیهٔ پزشک یا متخصص تغذیه نیست. برای تشخیص، درمان یا تغییر رژیم غذایی با پزشک خود مشورت کنید.
          </p>
        </div>
      </header>

      {/* دسته‌های محتوایی */}
      <section className="container-x py-14 md:py-20" aria-label="دسته‌های مرکز سلامت">
        <Reveal>
          <SectionHead eyebrow="دسته‌بندی دانش" title="از کجا می‌خواهید شروع کنید؟" />
        </Reveal>
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {HEALTH_HUB_CATEGORIES.map((c, i) => {
            const Icon = ICONS[c.icon] ?? Leaf;
            const isMental = c.id === "mental-health";
            const count = BLOG_POSTS.filter((b) => b.hub === c.id).length;
            const inner = (
              <>
                <span className={`grid size-11 place-items-center rounded-2xl transition-colors ${isMental ? "bg-brand-700 text-inverse" : "bg-brand-50 text-brand-700 group-hover:bg-brand-700 group-hover:text-inverse"}`}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="mt-4 block text-[13px] font-black text-heading">{c.title}</span>
                <span className="mt-1.5 block text-[11px] leading-5 text-muted line-clamp-2-fa">{c.desc}</span>
                {count > 0 && (
                  <span className="mt-3 inline-flex rounded-full bg-surface2 px-2.5 py-1 text-[10px] font-bold text-muted">
                    {faDigits(count)} مقاله
                  </span>
                )}
              </>
            );
            return (
              <Reveal key={c.id} delay={i * 0.04}>
                {isMental ? (
                  <Link href="/health-center/mental-health" className="group prem-card flex h-full flex-col rounded-[1.4rem] border-2 border-brand-600/50 bg-surface p-5 shadow-soft transition-all hover:shadow-lift">
                    {inner}
                  </Link>
                ) : (
                  <Link href={`/blog?cat=${encodeURIComponent(c.title)}`} className="group prem-card flex h-full flex-col rounded-[1.4rem] border border-line/70 bg-surface p-5 shadow-soft transition-all hover:shadow-lift">
                    {inner}
                  </Link>
                )}
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* مقالهٔ شاخص + تازه‌ها */}
      <section className="bg-surface2/70 border-y border-line/60 py-14 md:py-20" aria-label="تازه‌ترین مقالات سلامت">
        <div className="container-x">
          <Reveal>
            <SectionHead eyebrow="تازه‌ها" title="آخرین نوشته‌های مرکز سلامت" desc="محتوای آموزشی، بدون ادعای درمانی و با ذکر منبع." />
          </Reveal>
          {featured && (
            <Reveal className="mt-8">
              <Link href={`/blog/${featured.slug}`} className="group grid overflow-hidden rounded-[1.75rem] border border-line/70 bg-surface shadow-soft transition-shadow hover:shadow-lift lg:grid-cols-2">
                <div className="aspect-[16/10] lg:aspect-auto overflow-hidden img-zoom">
                  <SmartImage src={featured.image} alt={featured.title} sizes="(min-width:1024px) 50vw, 100vw" className="size-full object-cover" />
                </div>
                <div className="flex flex-col justify-center p-7 md:p-10">
                  <p className="text-[11px] font-bold tracking-[0.18em] text-gold-700">{featured.category}</p>
                  <h3 className="mt-3 text-lg md:text-2xl font-black leading-[1.6] text-heading group-hover:text-brand-700 transition-colors">{featured.title}</h3>
                  <p className="mt-3 text-[13px] leading-7 text-muted">{featured.excerpt}</p>
                  <p className="mt-5 text-[11px] text-muted">{faDate(featured.date)} · {faDigits(featured.readMinutes)} دقیقه مطالعه</p>
                </div>
              </Link>
            </Reveal>
          )}
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((b, i) => (
              <Reveal key={b.slug} delay={i * 0.05}>
                <Link href={`/blog/${b.slug}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line/70 bg-surface shadow-soft transition-shadow hover:shadow-lift">
                  <div className="aspect-[16/9] overflow-hidden img-zoom">
                    <SmartImage src={b.image} alt={b.title} sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="size-full object-cover" />
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <p className="text-[10.5px] font-bold text-gold-700">{b.category}</p>
                    <h3 className="mt-2 text-[13.5px] font-extrabold leading-7 line-clamp-2-fa group-hover:text-brand-700 transition-colors">{b.title}</h3>
                    <p className="mt-auto pt-3 text-[10.5px] text-muted">{faDigits(b.readMinutes)} دقیقه مطالعه</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* پل به فروشگاه */}
      <section className="container-x py-14 md:py-16" aria-label="از دانش تا سفره">
        <Reveal>
          <div className="flex flex-col items-center gap-5 rounded-[1.75rem] border border-gold-300/60 bg-gradient-to-l from-gold-50 via-surface to-surface p-8 text-center shadow-soft md:flex-row md:text-start">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gold-500/15 text-gold-700">
              <Sparkles className="size-6" aria-hidden />
            </span>
            <div className="flex-1">
              <h2 className="text-lg font-black text-heading">از دانش تا سفره</h2>
              <p className="mt-2 text-[12.5px] leading-7 text-muted">
                هرچه در مرکز سلامت می‌خوانید، نسخهٔ فروشگاهی‌اش در ویترین هلسا هست؛ آجیل تازه، خرما و دمنوش‌های این سال.
              </p>
            </div>
            <Link href="/products" className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-brand-700 px-7 text-[13px] font-bold text-inverse transition-colors hover:bg-brand-800">
              مشاهده محصولات <ArrowLeft className="size-4" aria-hidden />
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
