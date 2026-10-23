import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { ArrowLeft, CalendarDays, Gift, Sparkles, Store, Wand2, Building2, BadgeCheck, Truck, Headset, PackageCheck } from "lucide-react";
import { getCampaigns, getProducts } from "@/services/catalog";
import Link from "next/link";
import { getCampaignStatus, campaignStatusLabel, campaignDaysRemaining, campaignEndIso, campaignNow } from "@/lib/campaign-status";
import { ProductCard } from "@/components/product/ProductCard";
import { Reveal, Countdown, SectionHead, LinkButton } from "@/components/ui/primitives";
import { CampaignEventLink } from "@/components/campaigns/CampaignEventLink";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/seo";
import { faDigits, faDate } from "@/lib/format";
import type { Product } from "@/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const campaign = (await getCampaigns()).find((c) => c.slug === slug);
  if (!campaign) notFound();
  return {
    title: `${campaign.title} | جشنواره‌های هلسا`,
    description: campaign.description.slice(0, 158),
    alternates: { canonical: `/campaigns/${campaign.slug}` },
    openGraph: {
      title: campaign.title,
      description: campaign.description.slice(0, 158),
      images: [{ url: campaign.banner, width: 1200, height: 630, alt: campaign.title }],
    },
  };
}

export default async function CampaignPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [campaigns, products] = await Promise.all([getCampaigns(), getProducts()]);
  const campaign = campaigns.find((c) => c.slug === slug);
  if (!campaign) notFound();

  const headerList = await headers();
  const now = campaignNow(headerList.get("date"));
  const status = getCampaignStatus(campaign, now);
  const days = campaignDaysRemaining(campaign, now);

  // محصولات جشنواره — فقط محصولات واقعیِ فعلی از دستهٔ واقعی جشنواره
  const campaignProducts: Product[] =
    campaign.category === "all"
      ? [...products].sort((a, b) => b.rating * b.reviews - a.rating * a.reviews).slice(0, 8)
      : products.filter((p) => p.category === campaign.category);
  const discounted = campaignProducts.filter((p) => p.discount > 0);
  const maxDiscount = discounted.length ? Math.max(...discounted.map((p) => p.discount)) : 0;

  // کراس‌سل واقعی: بهترین‌های سایر دسته‌ها (خارج از دستهٔ جشنواره)
  const bestOther = (cat: string) =>
    products.filter((p) => p.category === cat && p.category !== campaign.category).sort((a, b) => b.reviews - a.reviews)[0];
  const crossSell = [bestOther("dates"), bestOther("nuts"), bestOther("dried-fruits"), bestOther("natural")].filter(
    (p): p is Product => Boolean(p),
  );

  const statusChip =
    status === "active"
      ? "bg-brand-700 text-inverse"
      : status === "upcoming"
        ? "bg-gold-500 text-brand-950"
        : "bg-surface2 text-muted border border-line";

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "خانه", path: "/" },
          { name: "جشنواره‌ها", path: "/campaigns" },
          { name: campaign.title, path: `/campaigns/${campaign.slug}` },
        ])}
      />

      {/* ————— هیروی جشنواره ————— */}
      <section className="relative overflow-hidden border-b border-line/60" aria-label={campaign.title}>
        <div className="absolute inset-0" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={campaign.banner} alt={`بنر جشنواره ${campaign.title}`} className="size-full object-cover" fetchPriority="high" decoding="async" />
          <div className="absolute inset-0 bg-gradient-to-l from-canvas/95 via-canvas/85 to-canvas/70" />
        </div>
        <div className="relative container-x py-12 md:py-16">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-black ${statusChip}`}>
            <Sparkles className="size-3.5" aria-hidden /> {campaignStatusLabel(status)}
            {status === "active" && days > 7 ? ` · ${faDigits(days)} روز مانده` : ""}
          </span>
          <h1 className="mt-4 max-w-2xl text-2xl font-black leading-[1.6] text-heading md:text-[36px]">{campaign.title}</h1>
          <p className="mt-4 max-w-xl text-[13px] leading-8 text-muted md:text-[14px]">{campaign.description}</p>
          <p className="mt-4 flex items-center gap-1.5 text-[11.5px] font-bold text-muted">
            <CalendarDays className="size-3.5" aria-hidden /> از {faDate(campaign.startDate)} تا {faDate(campaign.endDate)}
            {status === "active" && discounted.length > 0
              ? ` · تا ${faDigits(maxDiscount)}٪ تخفیف واقعی روی ${faDigits(discounted.length)} محصول این جشنواره`
              : ""}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-4">
            {status === "active" ? (
              <>
                <CampaignEventLink
                  href="#campaign-products"
                  event="campaign_click"
                  params={{ campaign: campaign.slug, position: "hero" }}
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-brand-700 px-7 text-[13px] font-bold text-inverse transition-colors hover:bg-brand-800"
                >
                  خرید از این جشنواره <ArrowLeft className="size-4" aria-hidden />
                </CampaignEventLink>
                <div aria-label="شمارش معکوس پایان جشنواره">
                  <Countdown until={campaignEndIso(campaign)} />
                </div>
              </>
            ) : status === "upcoming" ? (
              <p className="rounded-2xl border border-gold-300/70 bg-gold-50 px-5 py-3 text-[12px] font-bold text-gold-700">
                این جشنواره هنوز شروع نشده است — از {faDate(campaign.startDate)} فعال می‌شود.
              </p>
            ) : (
              <p className="rounded-2xl border border-line bg-surface px-5 py-3 text-[12px] font-bold text-muted">
                این جشنواره پایان یافته است؛ محصولات این دسته همچنان در ویترین فعلی هلسا موجودند.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ————— محصولات جشنواره (واقعی) ————— */}
      <section id="campaign-products" className="container-x scroll-mt-24 py-12 md:py-16" aria-label="محصولات جشنواره">
        <Reveal>
          <SectionHead
            eyebrow="ویترین جشنواره"
            title={status === "ended" ? "محصولات این دسته، از ویترین فعلی هلسا" : "محصولات این جشنواره"}
            desc={
              status === "active" && discounted.length > 0
                ? `${faDigits(campaignProducts.length)} محصول واقعی — قیمت و تخفیف هر محصول از ویترین فعلی هلسا.`
                : `${faDigits(campaignProducts.length)} محصول واقعی از ویترین فعلی هلسا.`
            }
          />
        </Reveal>
        {campaignProducts.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-[12.5px] leading-7 text-muted">
            در حال حاضر محصول فعالی در این دسته ثبت نشده است —{" "}
            <Link href="/products" className="font-bold text-brand-700 underline underline-offset-4">
              ویترین کامل هلسا
            </Link>{" "}
            را ببینید.
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-3 min-[400px]:gap-4 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
            {campaignProducts.slice(0, 8).map((p, i) => (
              <Reveal key={p.id} delay={(i % 4) * 40}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        )}
        {campaignProducts.length > 8 && (
          <Reveal className="mt-8 text-center">
            <CampaignEventLink
              href={campaign.category === "all" ? "/products" : `/products?cat=${campaign.category}`}
              event="campaign_click"
              params={{ campaign: campaign.slug, position: "all-products" }}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-6 text-[12.5px] font-bold text-body transition-colors hover:border-brand-400 hover:text-brand-700"
            >
              <Store className="size-4" aria-hidden /> همهٔ {faDigits(campaignProducts.length)} محصول این دسته
            </CampaignEventLink>
          </Reveal>
        )}
      </section>

      {/* ————— کراس‌سل ظریف ————— */}
      {crossSell.length >= 2 && (
        <section className="container-x pb-12 md:pb-16" aria-label="تکمیل‌کننده‌های جشنواره">
          <Reveal>
            <h2 className="text-[15px] font-black text-heading">جشنواره را کامل‌تر کنید</h2>
            <p className="mt-1 text-xs text-muted">منتخب هلسا از دسته‌های دیگر — با همان سبد و همان ارسال.</p>
          </Reveal>
          <div className="mt-5 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            {crossSell.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* ————— سینی مزه و هدیه ————— */}
      <section className="bg-surface2/70 border-y border-line/60 py-12 md:py-16" aria-label="پذیرایی و هدیه">
        <div className="container-x grid gap-5 md:grid-cols-2">
          <Reveal>
            <div className="flex h-full flex-col items-start gap-4 rounded-2xl border border-line/70 bg-surface p-7 shadow-soft">
              <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-700"><Wand2 className="size-5" aria-hidden /></span>
              <div>
                <h2 className="text-[16px] font-black text-heading">جشن را با سینی مزه هلسا کامل کنید</h2>
                <p className="mt-2 text-[12.5px] leading-7 text-muted">از دورهمی‌های کوچک تا پذیرایی‌های بزرگ — سینی آماده یا سینی اختصاصی خودتان.</p>
              </div>
              <CampaignEventLink
                href="/mazeh-trays"
                event="campaign_mazeh_click"
                params={{ campaign: campaign.slug, position: "mid" }}
                className="mt-auto inline-flex h-11 items-center gap-2 rounded-full bg-brand-700 px-6 text-[12.5px] font-bold text-inverse transition-colors hover:bg-brand-800"
              >
                مشاهده سینی‌های مزه <ArrowLeft className="size-4" aria-hidden />
              </CampaignEventLink>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="flex h-full flex-col items-start gap-4 rounded-2xl border border-gold-300/60 bg-surface p-7 shadow-soft">
              <span className="grid size-12 place-items-center rounded-2xl bg-gold-500/15 text-gold-700"><Gift className="size-5" aria-hidden /></span>
              <div>
                <h2 className="text-[16px] font-black text-heading">هدیه‌ای از دل همین جشنواره</h2>
                <p className="mt-2 text-[12.5px] leading-7 text-muted">جعبه‌های هدیهٔ شخصی و سازمانی هلسا با بسته‌بندی شیک و پیام اختصاصی.</p>
              </div>
              <CampaignEventLink
                href="/gifts"
                event="campaign_gift_click"
                params={{ campaign: campaign.slug, position: "mid" }}
                className="mt-auto inline-flex h-11 items-center gap-2 rounded-full border border-gold-400/70 px-6 text-[12.5px] font-black text-gold-700 transition-colors hover:bg-gold-50"
              >
                مشاهده هدایای هلسا <ArrowLeft className="size-4" aria-hidden />
              </CampaignEventLink>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ————— اعتماد + B2B ————— */}
      <section className="container-x py-12 md:py-16" aria-label="اعتماد و سفارش سازمانی">
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { icon: BadgeCheck, t: "کیفیت انتخاب‌شده" },
            { icon: PackageCheck, t: "بسته‌بندی پرمیوم" },
            { icon: Truck, t: "ارسال به سراسر کشور" },
            { icon: Headset, t: "پشتیبانی واقعی" },
          ].map((c) => (
            <li key={c.t} className="flex items-center gap-3 rounded-2xl border border-line/70 bg-surface p-4 shadow-soft">
              <c.icon className="size-5 shrink-0 text-brand-600" aria-hidden />
              <span className="text-[12px] font-black text-heading">{c.t}</span>
            </li>
          ))}
        </ul>
        <Reveal className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line/70 bg-surface2/60 p-6">
            <div className="flex items-center gap-3.5">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><Building2 className="size-5" aria-hidden /></span>
              <p className="text-[12.5px] font-bold leading-6 text-body">
                خرید سازمانی از این جشنواره؟ برای تعداد بالا، پیش‌فاکتور رسمی صادر می‌شود.
              </p>
            </div>
            <CampaignEventLink
              href="/gifts/corporate/inquiry"
              event="campaign_b2b_click"
              params={{ campaign: campaign.slug }}
              className="inline-flex h-11 shrink-0 items-center rounded-full bg-gold-500 px-6 text-[12.5px] font-black text-brand-950 transition-colors hover:bg-gold-400"
            >
              دریافت پیش‌فاکتور سازمانی
            </CampaignEventLink>
          </div>
        </Reveal>
      </section>

      {/* ————— CTA نهایی ————— */}
      <section className="container-x pb-16 md:pb-20" aria-label="ادامه خرید">
        <Reveal>
          <div className="rounded-[1.5rem] border border-line/70 bg-surface p-7 text-center shadow-soft md:p-9">
            <h2 className="text-lg font-black text-heading">طعم بعدی‌تان را پیدا کنید</h2>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <LinkButton href="/products" variant="primary">مشاهده محصولات</LinkButton>
              <LinkButton href="/mazeh-trays" variant="outline">ساخت سینی مزه</LinkButton>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
