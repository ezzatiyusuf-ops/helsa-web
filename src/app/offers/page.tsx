import type { Metadata } from "next";
import { defaultOpenGraph } from "@/lib/metadata";
import { BadgeCheck, ShieldCheck, ReceiptText } from "lucide-react";
import { getProducts } from "@/services/catalog";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProductCard } from "@/components/product/ProductCard";
import { CouponBanner } from "@/components/ui/CouponBanner";
import { Reveal, SectionHead } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/offers" }, openGraph: { ...defaultOpenGraph, url: "/offers" },
  title: "پیشنهادهای ویژه هلسا",
  description: "محصولات واقعاً تخفیف‌دار هلسا و کدهای معتبر با قیمت شفاف و اعتبارسنجی سمت سرور.",
};

export default async function OffersPage() {
  const products = await getProducts();
  const discounted = products.filter((product) => product.discount > 0 && product.oldPrice && product.oldPrice > product.price);

  return (
    <>
      <PageHeader
        compact
        title="پیشنهادهای ویژه هلسا"
        desc="قیمت‌های واقعی از کاتالوگ هلسا؛ بدون شمارنده ساختگی، فوریت مصنوعی یا هزینه پنهان."
        crumbs={[{ label: "خانه", href: "/" }, { label: "پیشنهادهای ویژه", href: "/offers" }]}
      />

      <div className="container-x py-12 space-y-14">
        <Reveal><CouponBanner /></Reveal>

        <section aria-label="محصولات تخفیف‌دار هلسا">
          <Reveal>
            <SectionHead
              align="start"
              eyebrow="تخفیف‌های فعال"
              title="محصولات منتخب با قیمت بهتر"
              desc="فقط محصولاتی نمایش داده می‌شوند که قیمت قبلی و قیمت فعلی معتبر در داده کاتالوگ دارند."
            />
          </Reveal>

          {discounted.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 min-[400px]:gap-4 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
              {discounted.slice(0, 8).map((product, index) => (
                <Reveal key={product.id} delay={(index % 4) * 0.05}>
                  <ProductCard product={product} />
                </Reveal>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-sm text-muted">
              در حال حاضر پیشنهاد تخفیف‌دار فعالی در کاتالوگ ثبت نشده است.
            </p>
          )}
        </section>

        <section className="grid gap-4 sm:grid-cols-3" aria-label="شفافیت پیشنهادهای هلسا">
          {[
            { icon: ReceiptText, title: "قیمت شفاف", desc: "قیمت قبلی و فعلی دقیقاً از داده محصول خوانده می‌شود." },
            { icon: BadgeCheck, title: "کد معتبر", desc: "کد تخفیف و محدودیت‌های آن در سرور بررسی می‌شود." },
            { icon: ShieldCheck, title: "بدون هزینه پنهان", desc: "جمع کالا، تخفیف و ارسال پیش از ثبت سفارش نمایش داده می‌شود." },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-line bg-surface p-6 text-center">
              <item.icon className="mx-auto size-5 text-gold-700" aria-hidden />
              <h3 className="mt-3 text-sm font-black text-heading">{item.title}</h3>
              <p className="mt-2 text-[11px] leading-6 text-muted">{item.desc}</p>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
