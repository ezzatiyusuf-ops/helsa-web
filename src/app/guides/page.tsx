import type { Metadata } from "next";
import { defaultOpenGraph } from "@/lib/metadata";
import Link from "next/link";
import { BookOpen, ArrowLeft } from "lucide-react";
import { PRODUCT_GUIDES } from "@/data/product-guides";
import { Reveal, SectionHead } from "@/components/ui/primitives";
import { SmartImage } from "@/components/ui/SmartImage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "راهنمای محصولات هلسا | آموزش مصرف، نگهداری و خواص",
  description:
    "راهنماهای جامع هلسا برای دمنوش‌ها، گلاب، خرما، عسل، ارده، سرکه و میان‌وعدهٔ سالم؛ مزایا، روش مصرف، نگهداری، دستورها و پرسش‌های پرتکرار.",
  alternates: { canonical: "/guides" }, openGraph: { ...defaultOpenGraph, url: "/guides" },
};

export default function GuidesPage() {
  return (
    <>
      <header className="border-b border-line/60 bg-surface2/60">
        <div className="container-x py-14 md:py-18 max-w-3xl">
          <nav aria-label="مسیر صفحه" className="text-[11px] text-muted flex gap-1.5">
            <Link href="/" className="hover:text-brand-700">خانه</Link><span aria-hidden>/</span>
            <span className="text-heading">راهنمای محصولات</span>
          </nav>
          <h1 className="mt-4 text-2xl md:text-4xl font-black text-heading leading-snug">راهنمای محصولات هلسا</h1>
          <p className="mt-4 text-sm leading-8 text-muted">
            پیش از خرید، بدانید با چه چیزی سروکار دارید؛ هر راهنما، دانش کامل یک خانوادهٔ محصول را یک‌جا جمع می‌کند —
            مزایا، مصرف، نگهداری، دستورهای خانگی و پاسخ پرسش‌های رایج.
          </p>
        </div>
      </header>

      <section className="container-x py-14 md:py-18" aria-label="فهرست راهنماها">
        <Reveal>
          <SectionHead eyebrow="کتابخانهٔ دانش" title="راهنماهای تخصصی" desc="۷ خانوادهٔ محصول، ۷ راهنمای کامل — همیشه در حال به‌روزرسانی." />
        </Reveal>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {PRODUCT_GUIDES.map((g, i) => (
            <Reveal key={g.slug} delay={i * 0.05}>
              <Link
                href={`/guides/${g.slug}`}
                className="group grid h-full overflow-hidden rounded-[1.5rem] border border-line/70 bg-surface shadow-soft transition-shadow hover:shadow-lift sm:grid-cols-[200px_1fr]"
              >
                <div className="relative aspect-[4/3] sm:aspect-auto sm:min-h-[210px] overflow-hidden img-zoom">
                  <SmartImage src={g.image} alt={g.title} sizes="(min-width:640px) 200px, 100vw" className="absolute inset-0 size-full object-cover" />
                  <span className="absolute top-3 start-3 inline-flex items-center gap-1.5 rounded-full bg-ink-950/45 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                    <BookOpen className="size-3" aria-hidden /> {g.categoryLabel}
                  </span>
                </div>
                <div className="flex flex-col p-5 md:p-6">
                  <h2 className="text-[15px] font-black leading-7 text-heading group-hover:text-brand-700 transition-colors">{g.title}</h2>
                  <p className="mt-2 text-[12px] leading-6 text-muted line-clamp-2-fa">{g.subtitle}</p>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[11.5px] font-bold text-brand-700">
                    خواندن راهنما <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" aria-hidden />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
