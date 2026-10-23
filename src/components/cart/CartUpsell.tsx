"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Star, ArrowLeft } from "lucide-react";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { formatToman, faDigits } from "@/lib/format";
import { trackEvent } from "@/lib/analytics";
import { SmartImage } from "@/components/ui/SmartImage";

interface ProductSuggestion {
  type: "product";
  id: number;
  slug: string;
  name: string;
  price: number;
  image: string;
  weight: string;
  rating: number;
  reviews: number;
}
interface LinkSuggestion {
  type: "link";
  href: string;
  title: string;
  desc: string;
}
type Suggestion = ProductSuggestion | LinkSuggestion;

/**
 * کراس‌سل قطعی سبد (CRO ج۳۷) — «این سفارش را کامل‌تر کنید»
 * منطق نگاشت سیگنال→دسته سمت سرور اجرا می‌شود (API واقعی + محصولات واقعی و موجود)؛
 * افزودن یک‌ضربه‌ای با همان add-item استاندارد؛ جمع‌ها همان‌لحظه به‌روز می‌شوند.
 */
export function CartUpsell() {
  const [remote, setRemote] = useState<Suggestion[]>([]);
  const [loaded, setLoaded] = useState(false);
  const addItem = useStore((s) => s.addItem);
  const inCart = useStore((s) => s.items);
  const toast = useToast();

  useEffect(() => {
    const body = JSON.stringify({
      items: inCart.map((i) => ({ key: i.key, kind: i.kind, id: typeof i.id === "number" ? i.id : undefined, slug: i.slug })),
    });
    fetch("/api/products/cross-sell", { method: "POST", headers: { "Content-Type": "application/json" }, body })
      .then((r) => r.json())
      .then((d: { ok: boolean; items: Suggestion[] }) => { setRemote(d.items ?? []); setLoaded(true); })
      .catch(() => setLoaded(true));
    // فقط با تغییر ترکیب سبد (کلیدها) دوباره واکشی می‌شود — نه با هر تغییر تعداد
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inCart.map((i) => i.key).join("|")]);

  const suggestions = remote.filter((s) => s.type !== "product" || !inCart.some((i) => i.slug === s.slug)).slice(0, 4);
  if (!loaded || suggestions.length === 0) return null;

  const add = (s: ProductSuggestion) => {
    addItem({ key: `p-${s.id}`, kind: "product", id: s.id, name: s.name, slug: s.slug, image: s.image, price: s.price, weight: s.weight }, 1);
    trackEvent("cross_sell_add", { item_name: s.name, item_id: s.id, value: s.price });
    toast.push(`${s.name} به سبد اضافه شد`);
  };

  return (
    <section className="mt-8 rounded-2xl border border-gold-300/60 bg-gradient-to-l from-gold-50/80 via-surface to-surface p-5" aria-label="تکمیل سفارش">
      <p className="text-[11px] font-black tracking-[0.18em] text-gold-700">برای کامل‌تر شدن سفارش شما</p>
      <h3 className="mt-1.5 text-sm font-black text-heading">این سفارش را کامل‌تر کنید</h3>
      <ul className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {suggestions.map((s) =>
          s.type === "product" ? (
            <li key={`p-${s.id}`} className="flex flex-col gap-2 rounded-xl border border-line/70 bg-surface p-3">
              <Link
                href={`/products/${s.slug}`}
                onClick={() => trackEvent("cross_sell_click", { item_name: s.name, item_id: s.id })}
                className="group flex items-center gap-2.5"
              >
                { }
                <SmartImage src={s.image} alt={s.name} sizes="48px" className="size-12 shrink-0 rounded-lg object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-bold text-heading group-hover:text-brand-700">{s.name}</span>
                  <span className="mt-0.5 flex items-center gap-1 text-[10.5px] text-muted">
                    <Star className="size-3 text-gold-500" aria-hidden /> {faDigits(s.rating)} ({faDigits(s.reviews)})
                  </span>
                </span>
              </Link>
              <div className="mt-auto flex items-center justify-between gap-2">
                <span className="text-[11.5px] font-black text-heading">{formatToman(s.price)}</span>
                <button
                  onClick={() => add(s)}
                  aria-label={`افزودن ${s.name} به سبد`}
                  className="grid size-11 place-items-center rounded-full bg-brand-700 text-inverse transition-colors hover:bg-brand-800"
                >
                  <Plus className="size-4" aria-hidden />
                </button>
              </div>
            </li>
          ) : (
            <li key={`l-${s.href}`} className="flex flex-col justify-between gap-2 rounded-xl border border-gold-300/60 bg-gold-50/60 p-3">
              <div>
                <p className="text-[12px] font-black text-heading">{s.title}</p>
                <p className="mt-1 text-[10.5px] leading-5 text-muted">{s.desc}</p>
              </div>
              <Link
                href={s.href}
                onClick={() => trackEvent("cross_sell_click", { item_name: s.title, link: s.href })}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-gold-400/70 bg-surface text-[11px] font-bold text-heading transition-colors hover:border-brand-500 hover:text-brand-700"
              >
                {s.href.includes("gift") ? "مشاهده هدایا" : "مشاهده سینی‌ها"}
                <ArrowLeft className="size-3.5" aria-hidden />
              </Link>
            </li>
          ),
        )}
      </ul>
    </section>
  );
}
