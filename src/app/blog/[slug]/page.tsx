import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock3, ArrowLeft } from "lucide-react";
import { BLOG_POSTS } from "@/data/content";
import { Reveal } from "@/components/ui/primitives";
import { ShareButtons } from "@/components/blog/ShareButtons";
import { ReadingProgress, Toc, AuthorCard } from "@/components/blog/ReadingEnhancements";
import { faDigits, faDate } from "@/lib/format";

/** Health-related categories get the educational disclaimer (brief 3.2). */
const HEALTH_CATEGORIES = ["سبک زندگی سالم", "تغذیه", "خواص دمنوش‌ها", "سلامت روان", "خواص خرما", "طب سنتی", "سلامت و تغذیه"];
function isHealthPost(category: string): boolean {
  return HEALTH_CATEGORIES.some((c) => category?.includes(c));
}
import { siteUrl } from "@/lib/seo";
import { SmartImage } from "@/components/ui/SmartImage";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = BLOG_POSTS.find((b) => b.slug === slug);
  if (!post) notFound();
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { title: post.title, description: post.excerpt, images: [{ url: post.image, width: 1200, height: 630, alt: post.title }], type: "article" },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((b) => b.slug === slug);
  if (!post) notFound();
  // مرتبط‌ها: اول هم‌دسته/هم‌برچسب، سپس بقیه (فاز ۱۲ — قبلاً سه مورد اول بود)
  const score = (b: (typeof BLOG_POSTS)[number]) =>
    (b.category === post.category ? 2 : 0) + (b.tags?.some((t) => post.tags?.includes(t)) ? 1 : 0) + (b.hub && b.hub === post.hub ? 1 : 0);
  const related = BLOG_POSTS.filter((b) => b.slug !== slug)
    .map((b) => ({ b, s: score(b) }))
    .sort((x, y) => y.s - x.s)
    .slice(0, 3)
    .map((x) => x.b);
  // تیترهای بخش (سطرهای ##) برای فهرست مطالب
  const tocItems = post.body
    .filter((p) => p.startsWith("## "))
    .map((p, i) => ({ id: `sec-${i}`, text: p.slice(3).trim() }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: post.image,
    datePublished: post.date,
    author: { "@type": post.author ? "Person" : "Organization", name: post.author?.name ?? "هلسا ایرانیان" },
    publisher: { "@type": "Organization", name: "هلسا ایرانیان" },
    inLanguage: "fa",
    mainEntityOfPage: `${siteUrl}/blog/${post.slug}`,
    ...(post.tags ? { keywords: post.tags.join(", ") } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article>
        <header className="relative bg-brand-950 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.image} alt="" aria-hidden className="absolute inset-0 size-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-950 to-brand-950/40" aria-hidden />
          <div className="relative container-x py-16 max-w-3xl">
            <nav aria-label="مسیر صفحه" className="text-[11px] text-inverse/70 flex gap-1.5">
              <Link href="/" className="hover:text-gold-400">خانه</Link><span aria-hidden>/</span>
              <Link href="/blog" className="hover:text-gold-400">وبلاگ</Link><span aria-hidden>/</span>
              <span className="text-inverse">{post.category}</span>
            </nav>
            <h1 className="mt-4 text-2xl md:text-4xl font-black text-inverse leading-snug">{post.title}</h1>
            <p className="mt-4 text-[11px] text-inverse/70 flex items-center gap-4">
              <span>به‌روزرسانی: {faDate(post.date)}</span>
              <span className="flex items-center gap-1"><Clock3 className="size-3.5" aria-hidden /> {faDigits(post.readMinutes)} دقیقه مطالعه</span>
            </p>
          </div>
        </header>
        <div className="container-x max-w-3xl py-12">
          <ReadingProgress />
          <div className="lg:grid lg:grid-cols-[1fr_220px] lg:gap-10 xl:gap-14">
            <div className="min-w-0">
              <div className="space-y-5 text-[15px] md:text-base leading-9 text-body">
                {post.body.map((p, i) =>
                  p.startsWith("## ") ? (
                    <h2 key={i} id={tocItems.find((t) => t.text === p.slice(3).trim())?.id ?? `h-${i}`} className="pt-4 text-lg md:text-xl font-black text-heading">
                      {p.slice(3).trim()}
                    </h2>
                  ) : (
                    <Reveal key={i} delay={Math.min(i, 6) * 0.05}><p>{p}</p></Reveal>
                  )
                )}
              </div>
          {post.tags && post.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2" aria-label="برچسب‌ها">
              {post.tags.map((t) => (
                <span key={t} className="rounded-full border border-line bg-surface px-3 py-1.5 text-[11px] font-bold text-body">#{t}</span>
              ))}
            </div>
          )}
          <div className="mt-6 border-t border-line/70 pt-6">
            <ShareButtons title={post.title} path={`/blog/${post.slug}`} />
          </div>
          <div className="mt-10 rounded-2xl bg-brand-50 border border-brand-100 p-6 text-center">
            <p className="text-sm font-black text-heading">طعم این مقاله را بچشید!</p>
            <p className="mt-2 text-xs text-muted">محصولات مرتبط با این نوشتار در ویترین هلسا موجود است.</p>
            <Link href="/products" className="mt-4 inline-flex h-11 px-6 items-center gap-2 rounded-2xl bg-brand-600 text-inverse text-sm font-bold hover:bg-brand-700">
              مشاهده محصولات <ArrowLeft className="size-4" aria-hidden />
            </Link>
          </div>
          <AuthorCard name={post.author?.name ?? "تیم تحریریهٔ هلسا"} role={post.author?.role ?? "مجلهٔ هلسا"} href={post.author?.href} />
          {isHealthPost(post.category) && (
            <p role="note" className="mt-6 rounded-2xl border border-line/70 bg-surface2/70 px-5 py-4 text-[11.5px] leading-6 text-muted">
              این نوشتار صرفاً جنبهٔ آموزشی دارد و جایگزین توصیهٔ پزشک یا متخصص تغذیه نیست. برای تشخیص، درمان یا تغییر رژیم غذایی با پزشک خود مشورت کنید.
            </p>
          )}
            </div>
            <aside className="hidden lg:block">
              <div className="sticky top-28">
                <Toc items={tocItems} />
              </div>
            </aside>
          </div>
        </div>
        <section className="container-x pb-16" aria-label="مقالات مرتبط">
          <h2 className="text-lg font-black text-heading mb-5">ادامه مطلب در مجله هلسا</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {related.map((b) => (
              <Link key={b.slug} href={`/blog/${b.slug}`} className="group rounded-2xl bg-surface border border-line overflow-hidden card-hover">
                <div className="aspect-[16/9] overflow-hidden img-zoom">
                  <SmartImage src={b.image} alt={b.title} sizes="(min-width: 768px) 30vw, 100vw" className="size-full object-cover" />
                </div>
                <div className="p-4">
                  <h3 className="text-xs font-extrabold leading-6 line-clamp-2-fa group-hover:text-brand-700">{b.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </article>
    </>
  );
}
