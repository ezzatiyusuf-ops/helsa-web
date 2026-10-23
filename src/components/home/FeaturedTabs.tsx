"use client";
import { useMemo, useState } from "react";
import type { Product } from "@/types";
import { ProductCard } from "@/components/product/ProductCard";
import { CarouselRow } from "@/components/ui/CarouselRow";
import { Reveal } from "@/components/ui/primitives";
import { faDigits } from "@/lib/format";
import { trackEvent } from "@/lib/analytics";

/**
 * Featured tabs (§7) — horizontal carousels driven by catalog data only:
 * Helsa's pick (sorted by approved-review score; no sales claims while no
 * sales data exists) · featured (real merchandising flag) · deals (real discount).
 */
type TabId = "bestsellers" | "featured" | "deals";

const TABS: { id: TabId; label: string }[] = [
  { id: "bestsellers", label: "منتخب هلسا" },
  { id: "featured", label: "پیشنهاد هلسا" },
  { id: "deals", label: "تخفیف‌دار" },
];

function pickProducts(products: Product[], tab: TabId): Product[] {
  const available = products.filter((p) => p.stock > 0);
  if (tab === "bestsellers") return [...available].sort((a, b) => b.rating * b.reviews - a.rating * a.reviews).slice(0, 8);
  if (tab === "featured") return available.filter((p) => p.isFeatured || p.badge === "ویژه").slice(0, 8);
  return available
    .filter((p) => p.discount > 0 && p.oldPrice && p.oldPrice > p.price)
    .sort((a, b) => b.discount - a.discount)
    .slice(0, 8);
}

export function FeaturedTabs({ products }: { products: Product[] }) {
  const [tab, setTab] = useState<TabId>("bestsellers");
  const list = useMemo(() => pickProducts(products, tab), [products, tab]);

  return (
    <section className="container-x py-12 md:py-16" aria-label="محصولات ویژه هلسا">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold tracking-[0.2em] text-gold-700">فروشگاه هلسا</p>
            <h2 className="mt-2 text-xl font-black text-heading md:text-2xl">محصولات ویژه هلسا</h2>
            <p className="mt-2 text-xs leading-6 text-muted">
              انتخاب سلیقهٔ هلسا و پیشنهادهای امروز — قیمت و موجودی مستقیم از ویترین فروشگاه.
            </p>
          </div>
          {/* تب‌ها */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar" role="tablist" aria-label="نوع محصولات ویژه">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => {
                  setTab(t.id);
                  trackEvent("featured_tab_click", { tab: t.id });
                }}
                className={`h-10 shrink-0 rounded-full px-5 text-[12px] font-bold transition-colors ${
                  tab === t.id ? "bg-brand-700 text-inverse shadow-soft" : "border border-line bg-surface text-body hover:border-brand-300"
                }`}
              >
                {t.label}
                {t.id === "deals" && (
                  <span className="ms-1.5 text-[10px] font-black text-accent-600">
                    {tab === "deals" ? "" : ""}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </Reveal>

      {list.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-[12.5px] text-muted">
          در این دسته فعلاً محصولی ثبت نشده است — تب دیگری را انتخاب کنید.
        </p>
      ) : (
        <CarouselRow ariaLabel={`محصولات ویژه (${TABS.find((t) => t.id === tab)?.label}) — نوار کشویی`} className="mt-7">
          {list.map((p, i) => (
            <div key={p.slug} className="w-[62vw] min-[400px]:w-[54vw] sm:w-[252px] lg:w-[232px] shrink-0 snap-start">
              <ProductCard product={p} />
            </div>
          ))}
        </CarouselRow>
      )}
      <p className="mt-4 text-center text-[11px] font-bold text-muted">{faDigits(list.length)} محصول واقعی در این دسته</p>
    </section>
  );
}
