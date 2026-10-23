import type { Metadata } from "next";
import Link from "next/link";
import { Store, UtensilsCrossed, Coffee, Hotel, Truck, Building2, CheckCircle2, BadgeCheck, FileText, Repeat2, Headset } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Reveal, SectionHead, LinkButton } from "@/components/ui/primitives";
import { JsonLd } from "@/components/seo/JsonLd";
import { WHOLESALE_TYPES, WHOLESALE_BENEFITS, WHOLESALE_WORKFLOW, WHOLESALE_MIN_SUBTOTAL, WHOLESALE_MIN_ITEM_QTY } from "@/config/wholesale";
import { faDigits } from "@/lib/format";
import { siteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "خرید عمده هلسا | پرتال B2B برای کسب‌وکارها",
  description: `پرتال خرید عمده هلسا برای سوپرمارکت، رستوران، کافه، هتل، توزیع‌کننده و سازمان‌ها: ثبت‌نام کسب‌وکار، تأیید کارشناسی، قیمت همکاری شفاف، حداقل سفارش ${WHOLESALE_MIN_SUBTOTAL.toLocaleString("fa-IR")} تومان، فاکتور رسمی و سفارش تکراری.`,
  alternates: { canonical: "/wholesale" },
  openGraph: {
    type: "website",
    title: "خرید عمده هلسا | پرتال B2B",
    description: "ثبت‌نام کسب‌وکار، تأیید کارشناسی و خرید با قیمت همکاری از پنل عمده هلسا.",
    images: [{ url: "/images/opt/hero-mazeh-tray.jpg" }],
  },
};

const TYPE_ICONS = { supermarket: Store, restaurant: UtensilsCrossed, cafe: Coffee, hotel: Hotel, distributor: Truck, corporate: Building2 } as const;
const BENEFIT_ICONS = [BadgeCheck, CheckCircle2, FileText, Repeat2, Truck, Headset] as const;

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "خرید عمده از هلسا چگونه انجام می‌شود؟",
      acceptedAnswer: {
        "@type": "Answer",
        text: `ابتدا در پرتال عمده ثبت‌نام می‌کنید؛ کارشناس B2B هلسا اطلاعات کسب‌وکار شما را بررسی و تأیید می‌کند. پس از تأیید، در پنل عمده قیمت‌های همکاری را می‌بینید و سفارش ثبت می‌کنید. حداقل جمع سفارش ${WHOLESALE_MIN_SUBTOTAL.toLocaleString("fa-IR")} تومان و حداقل تعداد هر کالا ${WHOLESALE_MIN_ITEM_QTY} عدد است.`,
      },
    },
    {
      "@type": "Question",
      name: "قیمت همکاری عمده چگونه محاسبه می‌شود؟",
      acceptedAnswer: {
        "@type": "Answer",
        text: "پس از تأیید حساب، درصد تخفیف همکاری اختصاصی کسب‌وکار شما توسط کارشناس B2B تعیین می‌شود و به‌صورت خودکار روی قیمت روز کاتالوگ اعمال می‌گردد. قیمت‌ها همیشه سمت سرور محاسبه می‌شوند و در فاکتور رسمی درج می‌شوند.",
      },
    },
    {
      "@type": "Question",
      name: "چه کسب‌وکارهایی می‌توانند در پرتال عمده هلسا ثبت‌نام کنند؟",
      acceptedAnswer: {
        "@type": "Answer",
        text: "سوپرمارکت‌ها و فروشگاه‌ها، رستوران‌ها، کافه‌ها، هتل‌ها، توزیع‌کنندگان و خریداران سازمانی می‌توانند ثبت‌نام کنند. پس از بررسی مدارک و مشخصات، حساب عمده فعال می‌شود.",
      },
    },
  ],
};

export default function WholesalePage() {
  return (
    <>
      <JsonLd data={faqSchema} />

      <PageHeader
        title="خرید عمده هلسا"
        desc="پرتال اختصاصی کسب‌وکارها؛ جدا از خرید خرد. ثبت‌نام کنید، پس از تأیید کارشناسی، قیمت همکاری شما در پنل عمده فعال می‌شود — بدون عدد پنهان و بدون پرداخت جعلی."
        crumbs={[{ label: "خانه", href: "/" }, { label: "خرید عمده", href: "/wholesale" }]}
      />

      {/* AEO answer block */}
      <section className="container-x pt-8" aria-label="خرید عمده هلسا در یک نگاه">
        <Reveal>
          <div className="rounded-2xl border border-brand-200 bg-brand-50 px-6 py-5">
            <h2 className="text-sm font-black text-heading">خرید عمده هلسا در یک نگاه</h2>
            <p className="mt-2 text-[13px] leading-7 text-body">
              خرید عمده هلسا برای سوپرمارکت، رستوران، کافه، هتل، توزیع‌کننده و سازمان‌هاست. مسیر آن چهار گام دارد: ثبت‌نام کسب‌وکار، تأیید کارشناسی، خرید از پنل عمده با قیمت همکاری اختصاصی، و صدور فاکتور رسمی با تحویل هماهنگ. حداقل جمع سفارش {faDigits(WHOLESALE_MIN_SUBTOTAL)} تومان است.
            </p>
          </div>
        </Reveal>
      </section>

      {/* audience */}
      <section className="container-x py-12 md:py-16" aria-label="برای چه کسب‌وکارهایی">
        <Reveal>
          <SectionHead eyebrow="مخاطبان پرتال" title="هلسا، تأمین‌کننده کسب‌وکار شما" desc="از قفسه سوپرمارکت تا منوی کافه؛ کیفیت پایدار و تیراژ مناسب." />
        </Reveal>
        <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-4">
          {WHOLESALE_TYPES.map((t, i) => {
            const Icon = TYPE_ICONS[t.id as keyof typeof TYPE_ICONS];
            return (
              <Reveal key={t.id} delay={i * 0.05}>
                <div className="h-full rounded-2xl border border-line/70 bg-surface p-5 card-hover">
                  <span className="inline-flex size-11 items-center justify-center rounded-full border border-brand-200 text-brand-700">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-sm font-black text-heading">{t.label}</h3>
                  <p className="mt-1.5 text-[11.5px] leading-6 text-muted">{t.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* rules */}
      <section className="bg-surface2/70 border-y border-line/60 py-12 md:py-16" aria-label="قواعد خرید عمده">
        <div className="container-x">
          <Reveal>
            <SectionHead eyebrow="قواعد شفاف" title="بدون عدد پنهان" />
          </Reveal>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Reveal>
              <div className="h-full rounded-2xl border border-line/70 bg-surface p-6 text-center">
                <p className="text-2xl font-black text-price">{faDigits(WHOLESALE_MIN_SUBTOTAL / 1_000_000)} میلیون</p>
                <p className="mt-2 text-xs font-bold text-heading">حداقل جمع هر سفارش عمده</p>
                <p className="mt-1 text-[10.5px] text-muted">تومان</p>
              </div>
            </Reveal>
            <Reveal delay={0.06}>
              <div className="h-full rounded-2xl border border-line/70 bg-surface p-6 text-center">
                <p className="text-2xl font-black text-price">{faDigits(WHOLESALE_MIN_ITEM_QTY)} عدد</p>
                <p className="mt-2 text-xs font-bold text-heading">حداقل تعداد هر کالا</p>
                <p className="mt-1 text-[10.5px] text-muted">در هر خط سفارش</p>
              </div>
            </Reveal>
            <Reveal delay={0.12}>
              <div className="h-full rounded-2xl border border-line/70 bg-surface p-6 text-center">
                <p className="text-2xl font-black text-price">اختصاصی</p>
                <p className="mt-2 text-xs font-bold text-heading">درصد تخفیف همکاری</p>
                <p className="mt-1 text-[10.5px] text-muted">پس از تأیید، روی قیمت روز کاتالوگ</p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* benefits */}
      <section className="container-x py-12 md:py-16" aria-label="مزایای همکاری">
        <Reveal>
          <SectionHead eyebrow="مزایای همکاری" title="چرا کسب‌وکارها هلسا را انتخاب می‌کنند؟" />
        </Reveal>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {WHOLESALE_BENEFITS.map((b, i) => {
            const Icon = BENEFIT_ICONS[i % BENEFIT_ICONS.length];
            return (
              <Reveal key={b.title} delay={(i % 3) * 0.05}>
                <div className="h-full rounded-2xl border border-line/70 bg-surface p-6">
                  <Icon className="size-5 text-gold-700" aria-hidden />
                  <h3 className="mt-3 text-sm font-black text-heading">{b.title}</h3>
                  <p className="mt-2 text-xs leading-6 text-muted">{b.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* workflow */}
      <section className="bg-surface2/70 border-y border-line/60 py-12 md:py-16" aria-label="فرآیند همکاری">
        <div className="container-x">
          <Reveal>
            <SectionHead eyebrow="فرآیند همکاری" title="از ثبت‌نام تا فاکتور، در چهار گام" />
          </Reveal>
          <ol className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {WHOLESALE_WORKFLOW.map((w, i) => (
              <Reveal key={w.step} delay={i * 0.06}>
                <li className="h-full rounded-2xl border border-line/70 bg-surface p-6">
                  <span className="grid size-9 place-items-center rounded-full bg-brand-700 text-[13px] font-black text-inverse">{faDigits(w.step)}</span>
                  <h3 className="mt-4 text-sm font-black text-heading">{w.title}</h3>
                  <p className="mt-2 text-xs leading-6 text-muted">{w.desc}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="container-x py-14 md:py-20 text-center" aria-label="شروع همکاری">
        <Reveal>
          <h2 className="text-2xl md:text-3xl font-black text-heading">آماده همکاری عمده هستید؟</h2>
          <p className="mt-3 text-sm text-muted">همین امروز ثبت‌نام کنید؛ تأیید معمولاً کمتر از یک روز کاری طول می‌کشد.</p>
          <div className="mt-7 flex justify-center flex-wrap gap-3">
            <LinkButton href="/wholesale/register" size="lg">ثبت‌نام کسب‌وکار</LinkButton>
            <LinkButton href="/wholesale/dashboard" variant="outline" size="lg">ورود به پنل عمده</LinkButton>
          </div>
          <p className="mt-6 text-[11px] text-muted">
            سوال دارید؟ <Link href="/contact" className="font-bold text-brand-700">با کارشناس B2B تماس بگیرید</Link>
          </p>
        </Reveal>
      </section>
    </>
  );
}
