"use client";
import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Heart, Bookmark } from "lucide-react";
import type { Product } from "@/types";
import { useStore } from "@/lib/store";
import { readSaved, type SavedItem } from "@/lib/saved";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProductCard } from "@/components/product/ProductCard";
import { LinkButton } from "@/components/ui/primitives";


export function WishlistClient({ products }: { products: Product[] }) {
  const wishlist = useStore((s) => s.wishlist);
  const user = useStore((s) => s.user);
  const list = products.filter((p) => wishlist.includes(p.id));

  return (
    <>
      <PageHeader title="علاقه‌مندی‌ها" desc="محصولاتی که قلب شما را برده‌اند، این‌جا نگه داشته می‌شوند." crumbs={[{ label: "خانه", href: "/" }, { label: "علاقه‌مندی‌ها", href: "/wishlist" }]} />
      <div className="container-x py-12">
        {!user && (
          <p className="mb-6 rounded-2xl bg-brand-50 border border-brand-100 p-4 text-xs font-bold text-brand-700">
            برای همگام‌سازی علاقه‌مندی‌ها بین دستگاه‌ها، <Link href="/login" className="underline">وارد حساب خود شوید</Link>.
          </p>
        )}
        <SavedForLater products={products} />

        {list.length === 0 ? (
          <div className="py-20 text-center">
            <span className="mx-auto flex size-16 items-center justify-center rounded-full border border-line bg-surface2 text-brand-600"><Heart className="size-6" aria-hidden /></span>
            <h2 className="mt-5 text-lg font-black text-heading">هنوز محصولی انتخاب نشده است</h2>
            <p className="mt-2 text-sm text-muted">محصولات هلسا را مشاهده کنید و با قلب کنار هر محصول، این‌جا ذخیره‌شان کنید.</p>
            <LinkButton href="/products" className="mt-6">مشاهده محصولات</LinkButton>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {list.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function SavedForLater({ products }: { products: Product[] }) {
  // localStorage-backed store — hydration-safe (server snapshot = empty)
  const saved = useSyncExternalStore(
    (cb) => {
      window.addEventListener("storage", cb);
      return () => window.removeEventListener("storage", cb);
    },
    () => readSaved(),
    () => [] as SavedItem[],
  );
  const list = saved.map((s) => products.find((p) => p.slug === s.slug)).filter((p): p is Product => Boolean(p));
  if (!list.length) return null;
  return (
    <section className="mt-16" aria-label="ذخیره برای بعد">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-full border border-line bg-surface text-brand-600"><Bookmark className="size-4" aria-hidden /></span>
        <div>
          <h2 className="text-base font-black text-heading">ذخیره برای بعد</h2>
          <p className="text-[11px] text-muted">مواردی که با نشانک «بعداً می‌خرم» نگه داشته‌اید (فقط در این مرورگر).</p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {list.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}
