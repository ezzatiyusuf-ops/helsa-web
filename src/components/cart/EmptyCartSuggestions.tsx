"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Star } from "lucide-react";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { formatToman, faDigits } from "@/lib/format";
import { trackEvent } from "@/lib/analytics";
import { SmartImage } from "@/components/ui/SmartImage";

interface Suggestion {
  id: number;
  slug: string;
  name: string;
  price: number;
  image: string;
  weight: string;
  rating: number;
  reviews: number;
}

/**
 * پیشنهادهای سبد خالی (CRO — طبق پرامپت: «سبد خالی → پیام + ۶ محصول پیشنهادی»)
 * داده از /api/products/featured (پرفروش‌های واقعی)؛ افزودن یک‌ضربه‌ای.
 */
export function EmptyCartSuggestions() {
  const [items, setItems] = useState<Suggestion[]>([]);
  const addItem = useStore((s) => s.addItem);
  const toast = useToast();

  useEffect(() => {
    fetch("/api/products/featured?limit=6")
      .then((r) => r.json())
      .then((d: { ok: boolean; items: Suggestion[] }) => setItems(d.items ?? []))
      .catch(() => setItems([]));
  }, []);

  if (!items.length) return null;

  const add = (s: Suggestion) => {
    addItem({ key: `p-${s.id}`, kind: "product", id: s.id, name: s.name, slug: s.slug, image: s.image, price: s.price, weight: s.weight }, 1);
    trackEvent("cross_sell_add", { item_name: s.name, item_id: s.id, value: s.price, surface: "empty_cart" });
    toast.push("به سبد اضافه شد");
  };

  return (
    <section className="mt-10" aria-label="محصولات پیشنهادی">
      <h2 className="text-base font-black text-heading">پیشنهادهای هلسا</h2>
      <p className="mt-1.5 text-xs text-muted">برای شروع، پرفروش‌ترین‌های هلسا را ببینید.</p>
      <ul className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {items.slice(0, 6).map((s) => (
          <li key={s.slug} className="flex flex-col gap-2 card-framed shadow-soft p-3.5">
            <Link href={`/products/${s.slug}`} onClick={() => trackEvent("cross_sell_click", { item_name: s.name, item_id: s.id, surface: "empty_cart" })} className="group flex items-center gap-3">
              { }
              <SmartImage src={s.image} alt={s.name} sizes="64px" className="size-16 shrink-0 rounded-xl object-cover" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-bold text-heading group-hover:text-brand-700">{s.name}</span>
                <span className="mt-1 flex items-center gap-1 text-[10.5px] text-muted">
                  <Star className="size-3 text-gold-500" aria-hidden /> {faDigits(s.rating)} ({faDigits(s.reviews)} نظر)
                </span>
              </span>
            </Link>
            <div className="mt-auto flex items-center justify-between gap-2">
              <span className="text-[12px] font-black text-heading">{formatToman(s.price)}</span>
              <button
                onClick={() => add(s)}
                aria-label={`افزودن ${s.name} به سبد`}
                className="inline-flex h-11 items-center gap-1.5 rounded-full bg-brand-700 px-4 text-[11px] font-bold text-inverse transition-colors hover:bg-brand-800"
              >
                <Plus className="size-3.5" aria-hidden /> افزودن
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
