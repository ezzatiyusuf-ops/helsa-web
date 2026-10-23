import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, CheckCircle2, FileText, PackageCheck, Truck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Reveal, Badge, SectionHead, LinkButton } from "@/components/ui/primitives";
import { JsonLd } from "@/components/seo/JsonLd";
import { getGiftPackageBySlug, getGiftPackages } from "@/services/gifts";
import { CORPORATE_WORKFLOW } from "@/config/corporate-gifts";
import { faDigits, formatToman } from "@/lib/format";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const pack = await getGiftPackageBySlug(slug);
  if (!pack || pack.kind !== "corporate") notFound();
  return {
    title: `${pack.name} | هدایای سازمانی هلسا`,
    description: `${pack.shortDescription} قیمت پایه از ${formatToman(pack.basePrice)}؛ حداقل سفارش ${faDigits(pack.minQty)} عدد. قیمت نهایی پس از استعلام کارشناسی.`,
    alternates: { canonical: `/gifts/corporate/${pack.slug}` },
    openGraph: {
      title: pack.name,
      description: pack.shortDescription,
      images: [{ url: pack.image }],
    },
  };
}

export default async function CorporateGiftDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pack = await getGiftPackageBySlug(slug);
  if (!pack || pack.kind !== "corporate") notFound();

  const others = (await getGiftPackages("corporate")).filter((g) => g.slug !== pack.slug).slice(0, 3);

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: pack.name,
    description: pack.shortDescription,
    image: `${siteUrl}${pack.image}`,
    category: "هدایای سازمانی",
    brand: { "@type": "Brand", name: "هلسا ایرانیان" },
    offers: {
      "@type": "Offer",
      priceCurrency: "IRR",
      price: pack.basePrice * 10,
      availability: "https://schema.org/InStock",
      url: `${siteUrl}/gifts/corporate/${pack.slug}`,
      description: "قیمت پایه؛ قیمت نهایی تیراژ و برندینگ پس از استعلام کارشناسی اعلام می‌شود.",
    },
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "خانه", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "هدایا", item: `${siteUrl}/gifts` },
      { "@type": "ListItem", position: 3, name: "هدایای سازمانی", item: `${siteUrl}/gifts/corporate` },
      { "@type": "ListItem", position: 4, name: pack.name, item: `${siteUrl}/gifts/corporate/${pack.slug}` },
    ],
  };

  return (
    <>
      <JsonLd data={productSchema} />
      <JsonLd data={breadcrumbSchema} />

      <PageHeader
        compact
        title={pack.name}
        desc={pack.shortDescription}
        crumbs={[
          { label: "خانه", href: "/" },
          { label: "هدایا", href: "/gifts" },
          { label: "هدایای سازمانی", href: "/gifts/corporate" },
          { label: pack.name, href: `/gifts/corporate/${pack.slug}` },
        ]}
      />

      <div className="container-x py-10 md:py-14 grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
        <Reveal>
          <div className="rounded-2xl overflow-hidden border border-line/70 bg-surface2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pack.image} alt={pack.imageAlt || pack.name} className="w-full aspect-[4/3] object-cover" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { icon: PackageCheck, t: "برندینگ اختصاصی" },
              { icon: FileText, t: "پیش‌فاکتور رسمی" },
              { icon: Truck, t: "تحویل هماهنگ" },
            ].map((s) => (
              <div key={s.t} className="rounded-xl border border-line/70 bg-surface p-3 text-center">
                <s.icon className="mx-auto size-4 text-brand-700" aria-hidden />
                <p className="mt-2 text-[10.5px] font-bold text-body leading-4">{s.t}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-[0.2em] text-gold-700">هدیه سازمانی هلسا</span>
            {pack.isFeatured && <Badge tone="gold">پیشنهاد هلسا</Badge>}
          </div>
          <h1 className="mt-3 text-2xl md:text-[32px] font-black text-heading leading-[1.45]">{pack.name}</h1>
          <p className="mt-4 text-sm leading-8 text-muted">{pack.description}</p>

          <h2 className="mt-7 text-sm font-black text-heading">محتوای پکیج</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {pack.contents.map((c) => (
              <li key={c} className="rounded-full border border-line bg-surface px-3 py-1.5 text-[11px] font-bold text-body">{c}</li>
            ))}
          </ul>

          <h2 className="mt-7 text-sm font-black text-heading">گزینه‌های جعبه و بسته‌بندی</h2>
          <ul className="mt-3 space-y-2">
            {pack.packagingOptions.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 rounded-xl border border-line/70 bg-surface px-4 py-3">
                <span className="flex items-center gap-2 text-[13px] font-bold text-body">
                  <CheckCircle2 className="size-4 text-brand-600 shrink-0" aria-hidden />
                  {o.label}
                </span>
                <span className="text-[11px] text-muted shrink-0">{o.price ? `+ ${formatToman(o.price)}` : "شامل قیمت پایه"}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 rounded-2xl border border-line/70 bg-surface p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] text-muted">قیمت پایه (هر واحد) از</p>
                <p className="mt-1 text-2xl font-black text-price">{formatToman(pack.basePrice)}</p>
              </div>
              <div className="text-end">
                <p className="text-[11px] text-muted">حداقل سفارش</p>
                <p className="mt-1 text-sm font-black text-heading">{faDigits(pack.minQty)} عدد</p>
              </div>
            </div>
            <p className="mt-4 rounded-xl bg-surface2 px-4 py-3 text-[11.5px] leading-6 text-muted">
              قیمت نهایی بر اساس تیراژ، نوع بسته‌بندی، برندینگ و زمان‌بندی تحویل محاسبه می‌شود و پس از ثبت استعلام، در قالب پیش‌فاکتور رسمی اعلام می‌گردد. هیچ مبلغی اینجا به‌عنوان پرداخت قطعی در نظر گرفته نمی‌شود.
            </p>
            <div className="mt-5 grid grid-cols-1 min-[420px]:grid-cols-2 gap-2">
              <LinkButton href={`/gifts/corporate/inquiry?package=${pack.slug}`} size="lg">درخواست استعلام این پکیج</LinkButton>
              <LinkButton href="/gifts/corporate" variant="outline" size="lg">سایر پکیج‌های سازمانی</LinkButton>
            </div>
          </div>
        </Reveal>
      </div>

      {/* workflow */}
      <section className="bg-surface2/70 border-y border-line/60 py-14" aria-label="فرآیند سفارش سازمانی">
        <div className="container-x">
          <Reveal>
            <SectionHead eyebrow="فرآیند سفارش" title={`سفارش ${pack.name} چگونه انجام می‌شود؟`} />
          </Reveal>
          <ol className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CORPORATE_WORKFLOW.map((w, i) => (
              <Reveal key={w.step} delay={i * 0.05}>
                <li className="h-full rounded-2xl border border-line/70 bg-surface p-5">
                  <span className="grid size-8 place-items-center rounded-full bg-brand-700 text-xs font-black text-inverse">{faDigits(w.step)}</span>
                  <h3 className="mt-3 text-[13px] font-black text-heading">{w.title}</h3>
                  <p className="mt-1.5 text-[11.5px] leading-6 text-muted">{w.desc}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* related */}
      {others.length > 0 && (
        <section className="container-x py-14" aria-label="سایر پکیج‌های سازمانی">
          <Reveal>
            <SectionHead eyebrow="مشابه این انتخاب" title="سایر پکیج‌های سازمانی هلسا" />
          </Reveal>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {others.map((g, i) => (
              <Reveal key={g.id} delay={i * 0.05}>
                <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line/70 bg-surface card-hover">
                  <Link href={`/gifts/corporate/${g.slug}`} className="block overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.image} alt={g.imageAlt || g.name} className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" loading="lazy" />
                  </Link>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="text-[15px] font-black text-heading">
                      <Link href={`/gifts/corporate/${g.slug}`} className="hover:text-brand-700 transition-colors">{g.name}</Link>
                    </h3>
                    <p className="mt-2 text-xs leading-6 text-muted line-clamp-2-fa">{g.shortDescription}</p>
                    <div className="mt-auto pt-4 flex items-center justify-between gap-2">
                      <p className="text-[13px] font-black text-price">{formatToman(g.basePrice)}</p>
                      <LinkButton href={`/gifts/corporate/${g.slug}`} size="sm" variant="outline">مشاهده</LinkButton>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="container-x pb-16 text-center" aria-label="دعوت به استعلام">
        <Reveal>
          <p className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.2em] text-gold-700"><Building2 className="size-4" aria-hidden /> هلسا ایرانیان</p>
          <h2 className="mt-4 text-2xl md:text-3xl font-black text-heading">آماده سفارش سازمانی هستید؟</h2>
          <p className="mt-3 text-sm text-muted">فرم استعلام را پر کنید؛ کارشناس هلسا پیش‌فاکتور رسمی را برای شما آماده می‌کند.</p>
          <div className="mt-6"><LinkButton href={`/gifts/corporate/inquiry?package=${pack.slug}`} size="lg">درخواست استعلام سازمانی</LinkButton></div>
        </Reveal>
      </section>
    </>
  );
}
