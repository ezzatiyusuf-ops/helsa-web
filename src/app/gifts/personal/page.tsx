import type { Metadata } from "next";
import { defaultOpenGraph } from "@/lib/metadata";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Reveal, LinkButton, Price, Badge } from "@/components/ui/primitives";
import { getGiftPackages } from "@/services/gifts";
import { faDigits } from "@/lib/format";
import { SmartImage } from "@/components/ui/SmartImage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/gifts/personal" }, openGraph: { ...defaultOpenGraph, url: "/gifts/personal" },
  title: "هدایای شخصی هلسا",
  description: "جعبه‌های هدیه شخصی هلسا با امکان پیام اختصاصی، انتخاب گیرنده و بسته‌بندی پریمیوم.",
};

export default async function PersonalGiftsPage({ searchParams }: { searchParams: Promise<{ occasion?: string }> }) {
  const { occasion } = await searchParams;
  const packages = await getGiftPackages("personal");
  const filtered = occasion ? packages.filter((p) => p.occasions.some((o) => o.includes(occasion))) : packages;

  return (
    <>
      <PageHeader
        compact
        title="هدایای شخصی هلسا"
        desc="انتخاب کنید، پیام بنویسید، گیرنده را مشخص کنید و با قیمت تأییدشده سرور به سبد بیفزایید."
        crumbs={[{ label: "خانه", href: "/" }, { label: "هدایا", href: "/gifts" }, { label: "هدایای شخصی", href: "/gifts/personal" }]}
      />
      <div className="container-x py-12 md:py-16">
        {occasion && (
          <p className="mb-6 text-xs font-bold text-brand-700">فیلتر مناسبت: {occasion}</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((g, i) => (
            <Reveal key={g.id} delay={(i % 3) * 0.05}>
              <article className="group flex h-full flex-col rounded-2xl border border-line/70 bg-surface overflow-hidden card-hover">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <SmartImage src={g.image} alt={g.imageAlt || g.name} sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 92vw" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                  {g.isFeatured && <span className="absolute top-3 start-3"><Badge tone="brand">ویژه</Badge></span>}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="text-[15px] font-black text-heading leading-7">{g.name}</h2>
                  <p className="mt-2 text-xs leading-6 text-muted line-clamp-2-fa">{g.shortDescription}</p>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {g.contents.slice(0, 3).map((c) => (
                      <li key={c} className="rounded-full border border-line bg-surface2 px-2.5 py-1 text-[10.5px] font-bold text-body">{c}</li>
                    ))}
                  </ul>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <Price price={g.basePrice} oldPrice={g.oldPrice} size="sm" />
                    <span className="text-[10.5px] font-bold text-muted">موجود · {faDigits(g.stock)}</span>
                  </div>
                  <div className="mt-5">
                    <LinkButton href={`/gifts/personal/${g.slug}`} className="w-full justify-center" size="sm">مشاهده و سفارشی‌سازی</LinkButton>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
        {!filtered.length && (
          <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
            <p className="text-sm font-black text-heading">هدیه‌ای برای این مناسبت یافت نشد</p>
            <Link href="/gifts/personal" className="mt-4 inline-flex text-xs font-bold text-brand-700">مشاهده همه هدایای شخصی</Link>
          </div>
        )}
      </div>
    </>
  );
}
