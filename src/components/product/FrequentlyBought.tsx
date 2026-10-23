"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Plus, ShoppingBag } from "lucide-react";
import type { Product } from "@/types";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { formatToman, faDigits } from "@/lib/format";
import { SmartImage } from "@/components/ui/SmartImage";

/**
 * Frequently Bought Together — honest bundle: this product + 2 in-stock
 * companions from the same category. Combined price is a plain sum
 * (no invented bundle discount); every line keeps its own cart item.
 */
export function FrequentlyBought({ product, pool }: { product: Product; pool: Product[] }) {
  const { addItem } = useStore();
  const toast = useToast();
  const [added, setAdded] = useState(false);

  const companions = useMemo(
    () => pool.filter((p) => p.id !== product.id && p.stock > 0 && p.category === product.category).slice(0, 2),
    [pool, product],
  );
  const items = [product, ...companions];
  if (companions.length === 0) return null;

  const total = items.reduce((a, p) => a + p.price, 0);

  const addAll = () => {
    for (const p of items) {
      addItem(
        {
          key: `p-${p.id}`,
          kind: "product",
          id: p.id,
          name: p.name,
          slug: p.slug,
          image: p.image,
          price: p.price,
          weight: p.weight,
        },
        1,
      );
    }
    setAdded(true);
    toast.push(`${faDigits(items.length)} محصول به سبد خرید اضافه شد`);
    window.setTimeout(() => setAdded(false), 1600);
  };

  return (
    <section className="mt-14 rounded-[1.75rem] border border-line/70 bg-surface p-6 md:p-8" aria-label="اغلب با هم خریده می‌شوند">
      <h2 className="text-base md:text-lg font-black text-heading">اغلب با هم خریده می‌شوند</h2>
      <p className="mt-1.5 text-xs text-muted">انتخاب مشتریان هلسا برای یک سبد کامل</p>

      <div className="mt-6 flex flex-col lg:flex-row lg:items-center gap-5">
        <ul className="flex flex-1 flex-wrap items-center justify-center gap-3 sm:gap-4" aria-label="محصولات پیشنهادی مجموعه">
          {items.map((p, i) => (
            <li key={p.id} className="flex items-center gap-3 sm:gap-4">
              <Link
                href={`/products/${p.slug}`}
                className="group card-framed card-lift flex w-36 sm:w-40 flex-col items-center bg-surface2 p-3"
              >
                <span className="relative block aspect-square w-full overflow-hidden rounded-xl">
                  <SmartImage src={p.image} alt={p.imageAlt || p.name} sizes="180px" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
                </span>
                <span className="mt-2 line-clamp-1-fa text-[11px] font-bold text-heading">{p.name}</span>
                <span className="mt-0.5 text-[11px] font-black text-price">{formatToman(p.price)}</span>
              </Link>
              {i < items.length - 1 && <Plus className="size-4 shrink-0 text-faint" aria-hidden />}
            </li>
          ))}
        </ul>

        <div className="flex shrink-0 flex-col items-center gap-3 border-t border-line/60 pt-5 lg:border-s lg:border-t-0 lg:ps-8 lg:pt-0">
          <span className="text-[11px] text-muted">مجموع سبد پیشنهادی:</span>
          <span className="text-xl font-black tabular-nums text-price">{formatToman(total)}</span>
          <button
            onClick={addAll}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-brand-700 px-7 text-[13px] font-bold text-inverse transition-all hover:bg-brand-800 active:scale-[0.98]"
          >
            {added ? <Check className="size-4" aria-hidden /> : <ShoppingBag className="size-4" aria-hidden />}
            {added ? "افزوده شد" : `افزودن هر ${faDigits(items.length)} محصول`}
          </button>
        </div>
      </div>
    </section>
  );
}
