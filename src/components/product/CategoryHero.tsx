"use client";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { Category, Product } from "@/types";
import { faDigits } from "@/lib/format";
import { SmartImage } from "@/components/ui/SmartImage";

/**
 * Premium category hero — shown above the grid whenever a category is active.
 * Client-rendered so it stays in sync with the explorer's category chips.
 */
export function CategoryHero({
  category,
  products,
}: {
  category: Category;
  products: Product[];
}) {
  const count = products.filter((p) => p.category === category.slug).length;
  const inStock = products.filter((p) => p.category === category.slug && p.stock > 0).length;

  return (
    <section
      aria-label={`دسته‌بندی ${category.name}`}
      className="relative mt-6 overflow-hidden rounded-[2rem] border border-line/60 shadow-soft"
    >
      <div className="grid md:grid-cols-[1.1fr_1fr]">
        {/* text side */}
        <div className="relative z-10 bg-gradient-to-br from-brand-800 via-brand-900 to-ink-900 p-7 md:p-10">
          <div className="pattern-persian absolute inset-0 opacity-20" aria-hidden />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[10.5px] font-bold text-white/90 backdrop-blur-sm">
              دسته‌بندی هلسا
            </span>
            <h2 className="mt-4 text-2xl font-black leading-[1.4] text-white md:text-[34px]">{category.name}</h2>
            <span className="mt-4 block w-14 rule-gold" aria-hidden />
            <p className="mt-4 max-w-md text-[12.5px] leading-7 text-white/75">
              {category.shortDescription || category.description}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] font-bold text-white/80">
              <span>{faDigits(count)} محصول در این دسته</span>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-gold-400" aria-hidden />
                {faDigits(inStock)} موجود برای ارسال
              </span>
            </div>
            {category.subs.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {category.subs.slice(0, 6).map((s) => (
                  <span key={s} className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-bold text-white/70">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* image side */}
        <div className="relative min-h-52 overflow-hidden md:min-h-64">
          <SmartImage
            src={category.image}
            alt={category.imageAlt || `تصویر دسته‌بندی ${category.name}`}
            sizes="(min-width: 768px) 45vw, 100vw"
            priority
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-brand-900/40 md:bg-gradient-to-r" aria-hidden />
        </div>
      </div>
    </section>
  );
}
