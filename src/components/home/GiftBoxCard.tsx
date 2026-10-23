"use client";
import { useState } from "react";
import { Badge, Price } from "@/components/ui/primitives";
import Link from "next/link";
import { ShoppingBag, Check, PackageX } from "lucide-react";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { faDigits } from "@/lib/format";
import type { GiftPackage } from "@/types";
import { SmartImage } from "@/components/ui/SmartImage";

/**
 * کارت جعبهٔ هدیه برای نوار پیشنهاد ویژه — یکی از ۴ محصول هیروی هلسا
 * (شکلات خرمایی · قند خرما · سینی مزه · جعبهٔ هدیه). قیمت/موجودی واقعی از
 * جدول gift_packages؛ Quick Add با kind="gift" (همان مسیر پرداخت هدیه).
 * §بریف یکسان‌سازی کارت: ساختار دقیقاً همان پوستهٔ ProductCard
 * (prem-card · p-3 · تصویر مربع ۱:۱ · بج روی گوشهٔ تصویر · عنوان/متا/Price · CTA h-10).
 */
export function GiftBoxCard({ gift }: { gift: GiftPackage }) {
  const addItem = useStore((s) => s.addItem);
  const toast = useToast();
  const [added, setAdded] = useState(false);
  const out = gift.stock <= 0;
  const discount = gift.oldPrice && gift.oldPrice > gift.basePrice
    ? Math.round((1 - gift.basePrice / gift.oldPrice) * 100)
    : 0;

  const quickAdd = () => {
    if (out) return;
    addItem(
      {
        key: `g-${gift.id}`,
        kind: "gift",
        id: gift.id,
        name: gift.name,
        slug: gift.slug,
        image: gift.image,
        price: gift.basePrice,
        meta: "جعبهٔ هدیهٔ هلسا",
      },
      1,
    );
    toast.push("جعبهٔ هدیه به سبد خرید اضافه شد");
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2200);
  };

  return (
    <article className="group card-framed card-lift flex h-full flex-col p-3 shadow-soft">
      <div className="relative overflow-hidden rounded-[14px] border border-line-soft bg-gradient-to-br from-surface2 to-surface3/70 aspect-square">
        <Link
          href={`/gifts/${gift.kind === "corporate" ? "corporate" : "personal"}/${gift.slug}`}
          aria-label={gift.name}
          className="block size-full"
        >
          <SmartImage
            src={gift.image}
            alt={gift.name}
            sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw"
            className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
          />
        </Link>
        <div className="absolute top-2.5 start-2.5 flex flex-col items-start gap-1.5">
          {discount > 0 && <Badge tone="accent">{faDigits(discount)}٪ تخفیف</Badge>}
        </div>
        {out && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/70 backdrop-blur-[2px]">
            <span className="flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-xs font-bold text-body">
              <PackageX className="size-4" aria-hidden /> ناموجود
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col px-0.5 pt-3">
        <Link
          href={`/gifts/${gift.kind === "corporate" ? "corporate" : "personal"}/${gift.slug}`}
          className="group/title"
        >
          <h3 className="text-[13px] font-extrabold leading-6 text-heading line-clamp-2-fa transition-colors duration-200 group-hover/title:text-brand-600">
            {gift.name}
          </h3>
        </Link>
        <p className="mt-1 text-[10.5px] font-bold text-muted">جعبهٔ هدیهٔ هلسا</p>

        <div className="mt-2.5 mb-3">
          <Price price={gift.basePrice} oldPrice={gift.oldPrice} size="md" />
        </div>

        <button
          onClick={quickAdd}
          disabled={out}
          aria-label={`افزودن ${gift.name} به سبد`}
          className="mt-auto inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-brand-700 text-[11.5px] font-black text-inverse shadow-soft transition-all duration-200 hover:bg-brand-800 active:scale-[0.98] disabled:opacity-40"
        >
          {added ? <Check className="size-4 shrink-0" aria-hidden /> : <ShoppingBag className="size-4 shrink-0" aria-hidden />}
          {added ? "افزوده شد" : "افزودن به سبد"}
        </button>
      </div>
    </article>
  );
}
