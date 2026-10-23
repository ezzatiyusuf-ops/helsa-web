import type { Metadata } from "next";
import { headers } from "next/headers";
import { ArrowLeft, CalendarDays, Gift, Sparkles, Wand2, Store } from "lucide-react";
import { getCampaigns, getProducts } from "@/services/catalog";
import { getCampaignStatus, campaignStatusLabel, campaignDaysRemaining, campaignEndIso, campaignNow, type CampaignStatus } from "@/lib/campaign-status";
import type { Campaign } from "@/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { Reveal, Countdown, SectionHead, LinkButton } from "@/components/ui/primitives";
import { CampaignEventLink } from "@/components/campaigns/CampaignEventLink";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/seo";
import { faDigits, faDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "جشنواره‌های هلسا | پیشنهادهای ویژه و مناسبتی",
  description:
    "جشنواره‌های واقعی و زمان‌بندی‌شدهٔ هلسا؛ تخفیف‌های مناسبتی روی خرما، آجیل، خشکبار و محصولات طبیعی — با تاریخ شروع و پایان شفاف.",
  alternates: { canonical: "/campaigns" },
  openGraph: {
    title: "جشنواره‌های هلسا | پیشنهادهای ویژه و مناسبتی",
    description: "از جشنوارهٔ هدیه تا جشنواره‌های خرما و آجیل — وضعیت هر جشنواره از تاریخ واقعی محاسبه می‌شود.",
    images: [{ url: "/images/opt/date-chocolate-walnut.jpg", width: 1200, height: 630, alt: "جشنواره‌های هلسا" }],
  },
};

/** اطلاعات واقعی تخفیف محصولات یک جشنواره — فقط از دادهٔ واقعی کاتالوگ، بدون تعمیم دستی */
function realOfferInfo(campaign: Campaign, products: { category: string; discount: number }[]) {
  const inCategory = campaign.category === "all" ? products : products.filter((p) => p.category === campaign.category);
  const discounted = inCategory.filter((p) => p.discount > 0);
  return {
    productCount: inCategory.length,
    discountedCount: discounted.length,
    maxDiscount: discounted.length ? Math.max(...discounted.map((p) => p.discount)) : 0,
  };
}

const statusBadge: Record<CampaignStatus, string> = {
  active: "bg-brand-700 text-inverse",
  upcoming: "bg-gold-500 text-brand-950",
  ended: "bg-surface2 text-muted border border-line",
};

export default async function CampaignsPage() {
  const [campaigns, products] = await Promise.all([getCampaigns(), getProducts()]);
  // ساعت درخواست برای رندر سمت سرور (الگوی موجود پروژه)
  const headerList = await headers();
  const now = campaignNow(headerList.get("date"));

  const withStatus = campaigns.map((c) => ({ c, status: getCampaignStatus(c, now) }));
  const active = withStatus.filter((x) => x.status === "active");
  const upcoming = withStatus.filter((x) => x.status === "upcoming");
  const ended = withStatus.filter((x) => x.status === "ended");
  const spotlight = active[0]?.c ?? null;
  const spotlightOffer = spotlight ? realOfferInfo(spotlight, products) : null;

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "خانه", path: "/" },
          { name: "جشنواره‌ها", path: "/campaigns" },
        ])}
      />
      <PageHeader
        compact
        title="جشنواره‌های هلسا"
        desc="طعم‌های فصل، پیشنهادهای زمان‌بندی‌شده و جشن‌های مناسبتی هلسا — وضعیت هر جشنواره از تاریخ واقعی امروز محاسبه می‌شود."
        crumbs={[{ label: "خانه", href: "/" }, { label: "جشنواره‌ها", href: "/campaigns" }]}
      />

      <div className="container-x py-10 md:py-14">
        {/* ————— هیرو: جشنوارهٔ فعال برجسته ————— */}
        {spotlight ? (
          <Reveal>
            <section
              className="relative overflow-hidden rounded-[1.75rem] border border-gold-300/70 bg-gradient-to-l from-gold-50 via-surface to-surface shadow-lift"
              aria-label={`جشنوارهٔ فعال: ${spotlight.title}`}
            >
              <div className="grid lg:grid-cols-2">
                <div className="relative aspect-[16/10] overflow-hidden lg:aspect-auto lg:min-h-[320px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={spotlight.banner}
                    alt={spotlight.title}
                    fetchPriority="high"
                    decoding="async"
                    className="absolute inset-0 size-full object-cover"
                  />
                  <span className={`absolute top-4 start-4 rounded-full px-3 py-1.5 text-[11px] font-black ${statusBadge.active}`}>
                    در حال برگزاری
                  </span>
                </div>
                <div className="flex flex-col justify-center p-6 md:p-9">
                  <p className="inline-flex items-center gap-1.5 text-[11px] font-bold text-gold-700">
                    <Sparkles className="size-3.5" aria-hidden /> جشنوارهٔ ویژهٔ هلسا
                  </p>
                  <h2 className="mt-2.5 text-xl font-black leading-9 text-heading md:text-2xl">{spotlight.title}</h2>
                  <p className="mt-2.5 text-[13px] leading-7 text-muted">{spotlight.description}</p>
                  <p className="mt-3 text-[11.5px] font-bold text-muted">
                    <CalendarDays className="mb-0.5 inline size-3.5" aria-hidden /> تا {faDate(spotlight.endDate)}
                    {spotlightOffer && spotlightOffer.discountedCount > 0
                      ? ` · تا ${faDigits(spotlightOffer.maxDiscount)}٪ تخفیف واقعی روی ${faDigits(spotlightOffer.discountedCount)} محصول این جشنواره`
                      : ""}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-4">
                    <CampaignEventLink
                      href={`/campaigns/${spotlight.slug}`}
                      event="campaign_click"
                      params={{ campaign: spotlight.slug, position: "spotlight" }}
                      className="inline-flex h-12 items-center gap-2 rounded-full bg-brand-700 px-7 text-[13px] font-bold text-inverse transition-colors hover:bg-brand-800"
                    >
                      خرید از جشنواره <ArrowLeft className="size-4" aria-hidden />
                    </CampaignEventLink>
                    <div aria-label="شمارش معکوس پایان جشنواره">
                      <Countdown until={campaignEndIso(spotlight)} />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </Reveal>
        ) : (
          /* حالت خالی: بدون جشنوارهٔ فعال — بدون اختراع تاریخ آینده */
          <Reveal>
            <section className="rounded-[1.75rem] border border-line/70 bg-surface2/60 p-10 text-center" aria-label="جشنوارهٔ فعال">
              <Sparkles className="mx-auto size-8 text-gold-700" aria-hidden />
              <h2 className="mt-4 text-lg font-black text-heading">در حال آماده‌سازی جشنوارهٔ بعدی هلسا هستیم</h2>
              <p className="mx-auto mt-2.5 max-w-md text-[12.5px] leading-7 text-muted">
                جشنواره‌های هلسا با تاریخ شروع و پایان واقعی اعلام می‌شوند؛ تا آن زمان، ویترین کامل هلسا در دسترس شماست.
              </p>
              <div className="mt-6">
                <LinkButton href="/products" variant="primary" size="lg">مشاهده محصولات هلسا</LinkButton>
              </div>
            </section>
          </Reveal>
        )}

        {/* ————— جشنواره‌های فعال (بجز اسپات‌لایت) ————— */}
        {active.length > 1 && (
          <section className="mt-12" aria-label="جشنواره‌های فعال">
            <SectionHead eyebrow="هم‌اکنون" title="جشنواره‌های فعال" />
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {active.slice(1).map(({ c }, i) => (
                <CampaignCard key={c.slug} campaign={c} status="active" index={i} products={products} />
              ))}
            </div>
          </section>
        )}

        {/* ————— به‌زودی ————— */}
        <section className="mt-12" aria-label="جشنواره‌های پیش‌رو">
          <SectionHead eyebrow="تقویم هلسا" title="به‌زودی" />
          {upcoming.length === 0 ? (
            <p className="mt-5 rounded-2xl border border-dashed border-line bg-surface p-6 text-center text-[12.5px] leading-7 text-muted">
              در حال حاضر جشنوارهٔ جدیدی با تاریخ شروع اعلام‌شده ثبت نشده است — به‌محض اعلام، همین‌جا با تاریخ دقیق منتشر می‌شود.
            </p>
          ) : (
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {upcoming.map(({ c }, i) => (
                <CampaignCard key={c.slug} campaign={c} status="upcoming" index={i} products={products} />
              ))}
            </div>
          )}
        </section>

        {/* ————— گذشته (اولویت بصری پایین) ————— */}
        {ended.length > 0 && (
          <section className="mt-14" aria-label="جشنواره‌های گذشته">
            <SectionHead eyebrow="آرشیو" title="جشنواره‌های گذشته" desc="جشنواره‌های پایان‌یافته — محصولات این دسته‌ها همچنان در ویترین فعلی هلسا موجودند." />
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {ended.map(({ c }, i) => (
                <CampaignCard key={c.slug} campaign={c} status="ended" index={i} products={products} muted />
              ))}
            </div>
          </section>
        )}

        {/* ————— CTA نهایی ————— */}
        <Reveal className="mt-14">
          <div className="relative overflow-hidden rounded-[1.75rem] bg-brand-950 p-8 text-center shadow-lift md:p-12">
            <div aria-hidden className="pointer-events-none absolute -top-24 -start-24 size-72 rounded-full bg-gold-500/10 blur-3xl" />
            <h2 className="relative text-xl font-black leading-9 text-inverse md:text-2xl">طعم بعدی‌تان را پیدا کنید</h2>
            <p className="relative mx-auto mt-2.5 max-w-lg text-[12.5px] leading-7 text-inverse/70">
              از ویترین کامل محصولات تا سینی مزه و هدیه‌های هلسا — مسیر بعدی خریدتان را انتخاب کنید.
            </p>
            <div className="relative mt-6 flex flex-wrap items-center justify-center gap-3">
              <CampaignEventLink
                href="/products"
                event="campaign_click"
                params={{ target: "products", position: "final-cta" }}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-gold-500 px-7 text-[13px] font-black text-brand-950 transition-colors hover:bg-gold-400"
              >
                <Store className="size-4" aria-hidden /> مشاهده محصولات
              </CampaignEventLink>
              <CampaignEventLink
                href="/mazeh-trays"
                event="campaign_mazeh_click"
                params={{ position: "final-cta" }}
                className="inline-flex h-12 items-center gap-2 rounded-full border border-white/25 px-7 text-[13px] font-bold text-white transition-colors hover:bg-white/10"
              >
                <Wand2 className="size-4" aria-hidden /> ساخت سینی مزه
              </CampaignEventLink>
              <CampaignEventLink
                href="/gifts"
                event="campaign_gift_click"
                params={{ position: "final-cta" }}
                className="inline-flex h-12 items-center gap-2 rounded-full border border-white/25 px-7 text-[13px] font-bold text-white transition-colors hover:bg-white/10"
              >
                <Gift className="size-4" aria-hidden /> مشاهده هدایا
              </CampaignEventLink>
            </div>
          </div>
        </Reveal>
      </div>
    </>
  );
}

/* ————— کارت جشنواره (سروری، اشتراکی بین بخش‌ها) ————— */
function CampaignCard({
  campaign,
  status,
  index,
  products,
  muted = false,
}: {
  campaign: Campaign;
  status: CampaignStatus;
  index: number;
  products: { category: string; discount: number }[];
  muted?: boolean;
}) {
  const offer = realOfferInfo(campaign, products);
  const days = campaignDaysRemaining(campaign);
  const href = `/campaigns/${campaign.slug}`;
  return (
    <Reveal delay={index * 40}>
      <article
        className={`group flex h-full flex-col overflow-hidden rounded-2xl border bg-surface transition-shadow hover:shadow-lift ${
          muted ? "border-line/50 opacity-80 hover:opacity-100" : "border-line/70 shadow-soft"
        }`}
      >
        <div className={`relative aspect-[16/9] overflow-hidden img-zoom ${muted ? "grayscale-[35%]" : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={campaign.banner}
            alt={campaign.title}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <span className={`absolute top-3 start-3 rounded-full px-2.5 py-1 text-[10.5px] font-black ${statusBadge[status]}`}>
            {campaignStatusLabel(status)}
          </span>
          {status === "active" && days <= 7 && (
            <span className="absolute bottom-3 start-3 rounded-full bg-accent-600 px-2.5 py-1 text-[10.5px] font-black text-inverse">
              {days <= 2 ? "روزهای آخر" : `${faDigits(days)} روز مانده`}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col p-5">
          <h3 className={`font-black leading-7 text-heading ${muted ? "text-[14px]" : "text-[15px]"}`}>{campaign.title}</h3>
          <p className="mt-1.5 line-clamp-2-fa text-[11.5px] leading-6 text-muted">{campaign.description}</p>
          <p className="mt-2.5 text-[10.5px] font-bold text-muted">
            {faDate(campaign.startDate)} تا {faDate(campaign.endDate)}
            {status === "active" && offer.discountedCount > 0
              ? ` · تا ${faDigits(offer.maxDiscount)}٪ تخفیف روی ${faDigits(offer.discountedCount)} محصول`
              : ""}
          </p>
          <div className="mt-auto pt-4">
            {status === "active" ? (
              <CampaignEventLink
                href={href}
                event="campaign_click"
                params={{ campaign: campaign.slug, position: "active-grid" }}
                className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-brand-700 px-5 text-[11.5px] font-bold text-inverse transition-colors hover:bg-brand-800"
              >
                خرید از جشنواره <ArrowLeft className="size-3.5" aria-hidden />
              </CampaignEventLink>
            ) : status === "upcoming" ? (
              <CampaignEventLink
                href={href}
                event="campaign_click"
                params={{ campaign: campaign.slug, position: "upcoming" }}
                className="inline-flex h-10 w-full items-center justify-center rounded-full border border-line px-5 text-[11.5px] font-bold text-body transition-colors hover:border-brand-400 hover:text-brand-700"
              >
                مشاهده جزئیات
              </CampaignEventLink>
            ) : (
              <CampaignEventLink
                href={campaign.category === "all" ? "/products" : `/products?cat=${campaign.category}`}
                event="campaign_click"
                params={{ campaign: campaign.slug, position: "ended" }}
                className="inline-flex h-10 w-full items-center justify-center rounded-full border border-line bg-surface2 px-5 text-[11.5px] font-bold text-muted transition-colors hover:border-brand-300 hover:text-brand-700"
              >
                محصولات این دسته در ویترین فعلی
              </CampaignEventLink>
            )}
          </div>
        </div>
      </article>
    </Reveal>
  );
}
