"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/controls";
import { Button } from "@/components/ui/primitives";
import { formatToman, faDigits } from "@/lib/format";
import type { Product } from "@/types";

export default function CompareClient() {
  const { compare, toggleCompare, clearCompare } = useStore();
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => setCatalog(d.products ?? []))
      .catch(() => setCatalog([]))
      .finally(() => setLoading(false));
  }, []);

  const list = catalog.filter((p) => compare.includes(p.id));
  const row = (label: string, fn: (i: number) => string) => (
    <div className="grid" style={{ gridTemplateColumns: `110px repeat(${Math.max(list.length, 1)}, minmax(0,1fr))` }}>
      <div className="px-3 py-3 text-[11px] font-bold text-muted border-b border-line-soft">{label}</div>
      {list.map((p, i) => (
        <div key={`${label}${i}`} className="px-3 py-3 text-[12px] font-bold text-heading text-center border-b border-line-soft">{fn(i)}</div>
      ))}
    </div>
  );

  return (
    <>
      <PageHeader title="مقایسه محصولات" desc="وزن، قیمت، تخفیف، دسته و امتیاز محصولات انتخابی را کنار هم ببینید." crumbs={[{ label: "خانه", href: "/" }, { label: "مقایسه", href: "/compare" }]} />
      <div className="container-x py-12">
        {loading ? (
          <p className="text-sm text-muted">در حال بارگذاری...</p>
        ) : list.length === 0 ? (
          <EmptyState icon={<X className="size-7" aria-hidden />} title="هنوز محصولی برای مقایسه انتخاب نکرده‌اید" desc="از ویترین هلسا محصولات را به مقایسه اضافه کنید." ctaLabel="مشاهده محصولات" ctaHref="/products" />
        ) : (
          <div>
            <div className="flex items-center justify-between mb-5">
              <p className="text-xs text-muted">{faDigits(list.length)} محصول در مقایسه</p>
              <Button size="sm" variant="outline" onClick={clearCompare}>پاک کردن</Button>
            </div>
            <div className="rounded-2xl border border-line bg-surface overflow-x-auto no-scrollbar">
              <div className="grid min-w-[520px]" style={{ gridTemplateColumns: `110px repeat(${list.length}, minmax(0,1fr))` }}>
                <div />
                {list.map((p) => (
                  <div key={p.id} className="p-3 text-center">
                    <div className="relative inline-block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.image} alt={p.name} className="size-20 rounded-xl object-cover border border-line/70" />
                      <button onClick={() => toggleCompare(p.id)} aria-label="حذف از مقایسه" className="absolute -top-2 -end-2 size-5 rounded-full bg-surface border border-line text-muted hover:text-accent-600 flex items-center justify-center">
                        <X className="size-3" aria-hidden />
                      </button>
                    </div>
                    <Link href={`/products/${p.slug}`} className="mt-2 block text-[12px] font-bold text-heading hover:text-brand-600 leading-5">{p.name}</Link>
                  </div>
                ))}
              </div>
              {row("وزن", (i) => list[i]?.weight ?? "—")}
              {row("قیمت", (i) => formatToman(list[i]?.price ?? 0))}
              {row("تخفیف", (i) => list[i]?.discount ? `${faDigits(list[i]!.discount)}٪` : "—")}
              {row("دسته‌بندی", (i) => list[i]?.category ?? "—")}
              {row("امتیاز", (i) => faDigits(list[i]?.rating ?? 0))}
              <div className="grid min-w-[520px]" style={{ gridTemplateColumns: `110px repeat(${list.length}, minmax(0,1fr))` }}>
                <div />
                {list.map((p) => (
                  <div key={p.id} className="p-3 text-center">
                    <Link href={`/products/${p.slug}`} className="inline-flex h-9 items-center rounded-full bg-brand-700 px-4 text-[11px] font-bold text-inverse hover:bg-brand-800 transition-colors">مشاهده محصول</Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
