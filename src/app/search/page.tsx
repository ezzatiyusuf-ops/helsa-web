import Link from "next/link";
import type { Metadata } from "next";
import { Search, ArrowLeft } from "lucide-react";
import { getProducts } from "@/services/catalog";
import { ProductCard } from "@/components/product/ProductCard";
import { normalizeFa, faDigits } from "@/lib/format";

/**
 * صفحهٔ جستجوی مستقل (/search?q=…) — آدرس مستقیم و SEO.
 * جستجوی زندهٔ مودال در هدر سرجایش است؛ این صفحه همان کوئری را به‌صورت
 * سرور-رندر با گرید کامل محصولات نمایش می‌دهد (فرم GET — بدون نیاز به JS).
 * منطق تطبیق: توکن‌های AND روی نام/برچسب/اسلاگ/توضیح (همان نرمال‌سازی فارسی).
 */
export const metadata: Metadata = {
  title: "جستجو در محصولات هلسا",
  description: "جستجو در خرما، آجیل، خشکبار، زعفران و محصولات طبیعی هلسا.",
  robots: { index: false, follow: true }, // صفحهٔ کوئری ایندکس نشود؛ نتیجه‌ها canonical محصولات‌اند
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const products = await getProducts();

  const tokens = normalizeFa(query).split(/\s+/).filter((t) => t.length >= 2);
  const results = query
    ? products.filter((p) => {
        const hay = normalizeFa([p.name, p.slug, p.category, ...(p.tags ?? []), p.shortDescription, p.description].filter(Boolean).join(" "));
        return tokens.every((t) => hay.includes(t));
      })
    : [];

  // پیشنهاد حالت خالی: ۴ محصول برتر بر اساس امتیاز×نظرِ واقعی
  const suggestions = query
    ? []
    : [...products].sort((a, b) => b.rating * b.reviews - a.rating * a.reviews).slice(0, 4);

  return (
    <div className="container-x pb-16 pt-6">
      <nav aria-label="مسیر صفحه" className="flex items-center gap-1.5 text-[11px] font-bold text-muted">
        <Link href="/" className="transition-colors hover:text-brand-700">خانه</Link>
        <span aria-hidden>/</span>
        <span className="text-heading">جستجو</span>
      </nav>

      <h1 className="mt-3 text-xl font-black text-heading md:text-2xl">جستجو در محصولات هلسا</h1>

      <form action="/search" method="GET" className="mt-4 flex max-w-xl items-center gap-2" role="search">
        <label htmlFor="q" className="sr-only">عبارت جستجو</label>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            id="q"
            name="q"
            defaultValue={query}
            placeholder="مثلاً: خرما مضافتی، زعفران، دمنوش…"
            className="h-12 w-full rounded-full border border-line bg-surface ps-10 pe-4 text-sm font-bold text-heading outline-none transition-colors placeholder:font-normal placeholder:text-muted focus:border-brand-400"
          />
        </div>
        <button type="submit" className="inline-flex h-12 items-center rounded-full bg-brand-700 px-6 text-[13px] font-black text-inverse transition-colors hover:bg-brand-800">
          جستجو
        </button>
      </form>

      {query ? (
        <p className="mt-6 text-[13px] font-bold text-muted" role="status">
          {results.length > 0 ? (
            <>«{query}» — {faDigits(results.length)} نتیجه</>
          ) : (
            <>نتیجه‌ای برای «{query}» پیدا نشد.</>
          )}
        </p>
      ) : null}

      {query && results.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-line/70 bg-surface2/60 p-8 text-center">
          <p className="text-sm font-bold text-body">جستجو را کوتاه‌تر کنید یا از دسته‌ها شروع کنید:</p>
          <Link href="/products" className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-brand-700 px-6 text-[12.5px] font-black text-inverse transition-colors hover:bg-brand-800">
            مشاهدهٔ همهٔ محصولات <ArrowLeft className="size-4" aria-hidden />
          </Link>
        </div>
      ) : null}

      {results.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
          {results.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      ) : null}

      {!query && suggestions.length > 0 ? (
        <section className="mt-10" aria-label="پیشنهاد هلسا">
          <h2 className="text-sm font-black text-heading">محبوب‌ترین‌های هلسا</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
            {suggestions.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      ) : null}
    </div>
  );
}
