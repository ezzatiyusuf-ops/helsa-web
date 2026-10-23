import type { Metadata } from "next";
import { defaultOpenGraph } from "@/lib/metadata";
import Link from "next/link";
import { Clock3 } from "lucide-react";
import { BLOG_POSTS } from "@/data/content";
import { PageHeader } from "@/components/layout/PageHeader";
import { Reveal } from "@/components/ui/primitives";
import { faDigits, faDate } from "@/lib/format";
import { SmartImage } from "@/components/ui/SmartImage";

export const metadata: Metadata = {
  title: "وبلاگ هلسا | مجله طعم و سلامت",
  description: "خواص خرما، راهنمای خرید آجیل، نگهداری خشکبار، تغذیه سالم و دستورهای پذیرایی ایرانی.",
  alternates: { canonical: "/blog" }, openGraph: { ...defaultOpenGraph, url: "/blog" },
};

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const { cat } = await searchParams;
  const categories = [...new Set(BLOG_POSTS.map((b) => b.category))];
  const active = cat && categories.includes(cat) ? cat : null;
  const posts = active ? BLOG_POSTS.filter((b) => b.category === active) : BLOG_POSTS;
  const [first, ...rest] = posts;

  return (
    <>
      <PageHeader title="مجله هلسا" desc="دانستنی‌هایی که طعم خرید شما را کامل می‌کند." crumbs={[{ label: "خانه", href: "/" }, { label: "وبلاگ", href: "/blog" }]} />

      {/* category chips */}
      <div className="container-x pt-6">
        <div className="flex flex-wrap gap-2" aria-label="دسته‌بندی مقالات">
          <Link
            href="/blog"
            className={`rounded-full border px-4 py-2 text-[11.5px] font-bold transition-colors ${!active ? "border-brand-600 bg-brand-700 text-inverse" : "border-line bg-surface text-heading hover:border-brand-300"}`}
          >
            همه مقالات
          </Link>
          {categories.map((c) => (
            <Link
              key={c}
              href={`/blog?cat=${encodeURIComponent(c)}`}
              className={`rounded-full border px-4 py-2 text-[11.5px] font-bold transition-colors ${active === c ? "border-brand-600 bg-brand-700 text-inverse" : "border-line bg-surface text-heading hover:border-brand-300"}`}
            >
              {c}
            </Link>
          ))}
        </div>
      </div>

      <div className="container-x py-10">
        {posts.length === 0 ? (
          <p className="rounded-2xl border border-line/70 bg-surface p-10 text-center text-sm text-muted">در این دسته فعلاً مقاله‌ای نیست.</p>
        ) : (
          <>
            <Reveal>
              <Link href={`/blog/${first.slug}`} className="group grid lg:grid-cols-2 rounded-2xl overflow-hidden bg-surface border border-line card-hover mb-8">
                <div className="aspect-[16/9] lg:aspect-auto overflow-hidden img-zoom">
                  <SmartImage src={first.image} alt={first.title} sizes="(min-width: 1024px) 50vw, 100vw" priority className="size-full object-cover" />
                </div>
                <div className="p-7 md:p-10 flex flex-col justify-center">
                  <span className="text-xs font-bold text-accent-600">{first.category}</span>
                  <h2 className="mt-3 text-xl md:text-3xl font-black text-heading leading-snug group-hover:text-brand-600 transition-colors">{first.title}</h2>
                  <p className="mt-4 text-sm leading-8 text-muted">{first.excerpt}</p>
                  <p className="mt-5 text-[11px] text-muted flex items-center gap-3">
                    <span>{faDate(first.date)}</span>
                    <span className="flex items-center gap-1"><Clock3 className="size-3.5" aria-hidden /> {faDigits(first.readMinutes)} دقیقه مطالعه</span>
                  </p>
                </div>
              </Link>
            </Reveal>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {rest.map((b, i) => (
                <Reveal key={b.slug} delay={(i % 3) * 0.07}>
                  <Link href={`/blog/${b.slug}`} className="group block rounded-2xl bg-surface border border-line overflow-hidden card-hover h-full">
                    <div className="aspect-[16/9] overflow-hidden img-zoom">
                      <SmartImage src={b.image} alt={b.title} sizes="(min-width: 1024px) 30vw, 50vw" className="size-full object-cover" />
                    </div>
                    <div className="p-5">
                      <span className="text-[11px] font-bold text-accent-600">{b.category}</span>
                      <h3 className="mt-2 text-sm font-extrabold leading-7 text-heading line-clamp-2-fa group-hover:text-brand-700 transition-colors">{b.title}</h3>
                      <p className="mt-2 text-xs leading-6 text-muted line-clamp-2-fa">{b.excerpt}</p>
                      <p className="mt-4 text-[10px] text-muted flex items-center gap-3">
                        <span>{faDate(b.date)}</span>
                        <span className="flex items-center gap-1"><Clock3 className="size-3" aria-hidden /> {faDigits(b.readMinutes)} دقیقه</span>
                      </p>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
