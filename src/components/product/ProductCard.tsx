"use client";
import { useState } from "react";
import Link from "next/link";
import { ShoppingBag, Check, PackageX, Leaf, Heart } from "lucide-react";
import type { Product } from "@/types";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { useLang } from "@/lib/i18n";
import { Badge, Price } from "@/components/ui/primitives";
import { SmartImage } from "@/components/ui/SmartImage";
import { isOrganic } from "@/lib/product-flags";
import { cheapestAvailableVariant } from "@/lib/variants";
import { faDigits } from "@/lib/format";

/**
 * کارت محصول هلسا — بازطراحی ۱۴۰۵/۰۶ (بر اساس رفرنس بصری کاربر):
 * عکس‌محور و تمام‌عرض (بدون قاب داخلی و بوردر) · پس‌زمینهٔ سفید تمیز ·
 * لهجهٔ جوهری تیره (ink-950) برای نام/قیمت/دکمه · فوتر فشرده با قیمت +
 * دکمهٔ گردِ مینیمال «افزودن به سبد» · بج‌های کوچک فقط روی گوشهٔ تصویر.
 * (تحلیل رفرنس: پالت روشن + لهجهٔ سرمه‌ای تیره rgb(0,24,64) + عکس‌های
 * تمام‌عرض بدون gutter — اندازه‌گیری‌شده، جزئیات چشمی با کاربر تأیید می‌شود.)
 */
export function ProductCard({ product, today = false, priority = false }: { product: Product; today?: boolean; priority?: boolean }) {
  const addItem = useStore((s) => s.addItem);
  const toast = useToast();
  const { t } = useLang();
  const [added, setAdded] = useState(false);
  const wishlist = useStore((s) => s.wishlist);
  const toggleWishlist = useStore((s) => s.toggleWishlist);
  const out = product.stock <= 0;
  // ═══ قیمت/وزن واریانت‌آگاه (F-02) — منبع واحد: src/lib/variants.ts ═══
  // کارتِ محصولِ چند-واریانتی، ارزان‌ترین واریانتِ فعالِ موجود را با پسوند «از» نشان می‌دهد
  // و همان واریانت را با کلید variant-scoped به سبد می‌افزاید (هم‌راستا با سرور: p-{id}-v-{vid}).
  const cheapest = cheapestAvailableVariant(product);
  const displayPrice = cheapest?.price ?? product.price;
  const displayWeight = cheapest?.name ?? product.weight;
  const displayOld = cheapest ? (cheapest.compareAtPrice ?? null) : product.oldPrice;
  const fromPrice = Boolean(cheapest) && (product.variants?.length ?? 0) > 1;
  const organic = isOrganic(product);
  const name = product.name;
  const wished = wishlist.includes(product.id);

  const onWish = () => {
    const addedNow = toggleWishlist(product.id);
    toast.push(addedNow ? "به علاقه‌مندی‌ها اضافه شد" : "از علاقه‌مندی‌ها حذف شد");
  };

  const onAdd = () => {
    if (out) {
      toast.push(t("toast.unavailable"), "error");
      return;
    }
    addItem(
      {
        key: cheapest ? `p-${product.id}-v-${cheapest.id}` : `p-${product.id}`,
        kind: "product",
        id: product.id,
        name: cheapest ? `${product.name} - ${cheapest.name}` : product.name,
        slug: product.slug,
        image: product.image,
        price: displayPrice,
        weight: displayWeight,
      },
      Math.min(1, cheapest?.stock ?? product.stock),
    );
    toast.push(t("toast.added"));
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2200);
  };

  return (
    <article className="group card-lift flex h-full flex-col overflow-hidden rounded-card bg-surface shadow-soft">
      {/* تصویر تمام‌بخش بالای کارت — بدون قاب داخلی (الگوی رفرنس) */}
      <div className="relative aspect-square overflow-hidden bg-surface2">
        <Link href={`/products/${product.slug}`} aria-label={name} className="block size-full">
          <SmartImage
            src={product.image}
            alt={product.imageAlt || name}
            sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw"
            priority={priority}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        </Link>

        {/* بج‌ها — فقط گوشهٔ تصویر، کوچک و آرام */}
        <div className="absolute top-2.5 start-2.5 flex flex-col items-start gap-1.5">
          {today && (
            <span className="inline-flex items-center gap-1 rounded-full border border-gold-400/60 bg-ink-950/65 px-2.5 py-1 text-[9.5px] font-black text-gold-300 backdrop-blur-md">
              پیشنهاد امروز
            </span>
          )}
          {product.badge && product.badge !== "تخفیف" && <Badge tone="brand">{product.badge}</Badge>}
          {product.discount > 0 && <Badge tone="accent">{faDigits(product.discount)}٪ تخفیف</Badge>}
          {organic && (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-ink-950/60 px-2.5 py-1 text-[9.5px] font-bold text-white backdrop-blur-md" title="کاملاً طبیعی و بدون افزودنی">
              <Leaf className="size-3" aria-hidden /> طبیعی
            </span>
          )}
        </div>

        {out && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/70 backdrop-blur-[2px]">
            <span className="flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-xs font-bold text-body">
              <PackageX className="size-4" aria-hidden /> {t("card.out")}
            </span>
          </div>
        )}

        {/* علاقه‌مندی — گوشهٔ پایین تصویر؛ متصل به wishlist واقعی (صفحهٔ علاقه‌مندی‌ها) */}
        <button
          onClick={onWish}
          aria-pressed={wished}
          aria-label={wished ? `حذف ${name} از علاقه‌مندی‌ها` : `افزودن ${name} به علاقه‌مندی‌ها`}
          className={`absolute bottom-2.5 end-2.5 grid size-9 place-items-center rounded-full border backdrop-blur-md transition-all duration-200 active:scale-[0.92] ${
            wished
              ? "border-gold-400/70 bg-ink-950/50 text-gold-300"
              : "border-white/30 bg-ink-950/35 text-white hover:border-gold-300/60 hover:text-gold-300"
          }`}
        >
          <Heart className={`size-4 ${wished ? "fill-current" : ""}`} aria-hidden />
        </button>
      </div>

      {/* فوتر اطلاعات — سفید تمیز و فشرده */}
      <div className="flex flex-1 flex-col px-4 pb-4 pt-3.5">
        <Link href={`/products/${product.slug}`} className="group/title">
          <h3 className="text-[13.5px] font-extrabold leading-6 text-heading line-clamp-2-fa transition-colors duration-200 group-hover/title:text-brand-600">
            {name}
          </h3>
        </Link>
        <p className="mt-1 text-[10.5px] font-bold text-muted">{displayWeight}</p>

        <div className="mt-auto flex items-end justify-between gap-2.5 pt-3">
          {fromPrice && <span className="text-[10.5px] font-bold text-muted">از </span>}<Price price={displayPrice} oldPrice={displayOld} size="md" />
          <button
            onClick={onAdd}
            disabled={out}
            aria-label={`افزودن ${name} به سبد`}
            className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full text-inverse shadow-soft transition-all duration-200 active:scale-[0.94] disabled:opacity-40 ${
              added ? "bg-brand-600" : "bg-ink-950 hover:bg-brand-700"
            }`}
          >
            {added ? <Check className="size-[18px]" aria-hidden /> : <ShoppingBag className="size-[18px]" aria-hidden />}
          </button>
        </div>
      </div>
    </article>
  );
}
