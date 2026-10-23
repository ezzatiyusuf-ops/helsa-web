import type { Metadata } from "next";
import Link from "next/link";
import { Building2, CheckCircle2, FileText, PackageCheck, Sparkles, Truck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Reveal, SectionHead, LinkButton, Badge } from "@/components/ui/primitives";
import { JsonLd } from "@/components/seo/JsonLd";
import { getGiftPackages } from "@/services/gifts";
import { CORPORATE_GIFT_CATEGORIES, CORPORATE_WORKFLOW, corporateCategoryOf, filterCorporatePackages } from "@/config/corporate-gifts";
import { faDigits, formatToman } from "@/lib/format";
import { siteUrl } from "@/lib/seo";
import { SmartImage } from "@/components/ui/SmartImage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "هدایای سازمانی هلسا | پکیج شرکتی با برندینگ اختصاصی",
  description: "هدایای سازمانی هلسا برای شرکت‌ها: پکیج کارکنان، مشتریان، همایش، یلدا و نوروز سازمانی با بسته‌بندی سفارشی، چاپ لوگو، پیش‌فاکتور رسمی و تحویل هماهنگ. قیمت نهایی پس از استعلام کارشناسی.",
  alternates: { canonical: "/gifts/corporate" },
  openGraph: {
    title: "هدایای سازمانی هلسا",
    description: "پکیج‌های شرکتی با برندینگ اختصاصی، تیراژ بالا و پیش‌فاکتور رسمی.",
    images: [{ url: "/images/tray-vip.jpg" }],
  },
};

const FAQS = [
  {
    q: "حداقل تعداد سفارش هدیه سازمانی هلسا چند عدد است؟",
    a: "حداقل تعداد برای هر پکیج متفاوت است و بین ۳ تا ۲۵ عدد تعیین شده؛ این عدد در صفحه هر پکیج درج شده است. برای تیراژ بالاتر از ۱۰۰۰ عدد، قیمت‌گذاری مشارکتی با کارشناس انجام می‌شود.",
  },
  {
    q: "آیا امکان چاپ لوگوی شرکت روی بسته‌بندی وجود دارد؟",
    a: "بله. تقریباً همه پکیج‌های سازمانی گزینه «بسته‌بندی با فضای لوگو» دارند که هزینه آن در همان صفحه هر پکیج اعلام شده و در پیش‌فاکتور نهایی لحاظ می‌شود.",
  },
  {
    q: "قیمت هدایای سازمانی چگونه و چه زمانی اعلام می‌شود؟",
    a: "قیمت پایه هر پکیج در سایت نمایش داده می‌شود، اما قیمت نهایی پس از ثبت فرم استعلام و بررسی کارشناسی (تعداد، برندینگ، زمان‌بندی تحویل) به‌صورت پیش‌فاکتور رسمی اعلام می‌گردد. هیچ مبلغی به‌عنوان پرداخت قطعی در سایت شبیه‌سازی نمی‌شود.",
  },
  {
    q: "فاکتور رسمی و پرداخت سازمانی چگونه انجام می‌شود؟",
    a: "پس از تأیید پیش‌فاکتور، فاکتور رسمی صادر می‌شود و پرداخت از طریق روش‌های سازمانی (کارت به کارت یا حساب شرکتی) انجام می‌گیرد. هماهنگی نهایی با کارشناس هلساست.",
  },
  {
    q: "ارسال هدایای سازمانی چگونه هماهنگ می‌شود؟",
    a: "تحویل می‌تواند یکجا یا زمان‌بندی‌شده (مثلاً در چند شعبه یا چند روز) انجام شود. زمان تحویل مطلوب را در فرم استعلام اعلام می‌کنید و تیم هلسا آن را تأیید و اجرا می‌کند.",
  },
];

export default async function CorporateGiftsPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const { cat } = await searchParams;
  const all = (await getGiftPackages("corporate")).filter((g) => g.slug !== "corporate-custom-gift" || !cat);
  const activeCategory = cat ? corporateCategoryOf(cat) : undefined;
  const packages = filterCorporatePackages(all, cat);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "خانه", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "هدایا", item: `${siteUrl}/gifts` },
      { "@type": "ListItem", position: 3, name: "هدایای سازمانی", item: `${siteUrl}/gifts/corporate` },
    ],
  };

  return (
    <>
      <JsonLd data={faqSchema} />
      <JsonLd data={breadcrumbSchema} />

      <PageHeader
        title="هدایای سازمانی هلسا"
        desc="پکیج‌های شرکتی هلسا برای کارکنان، مشتریان و رویدادها؛ با برندینگ اختصاصی، بسته‌بندی سفارشی، پیش‌فاکتور رسمی و تحویل هماهنگ. قیمت نهایی پس از استعلام کارشناسی اعلام می‌شود."
        crumbs={[{ label: "خانه", href: "/" }, { label: "هدایا", href: "/gifts" }, { label: "هدایای سازمانی", href: "/gifts/corporate" }]}
      />

      {/* AEO concise answer block */}
      <section className="container-x pt-8" aria-label="معرفی کوتاه هدایای سازمانی">
        <Reveal>
          <div className="rounded-2xl border border-brand-200 bg-brand-50 px-6 py-5">
            <h2 className="text-sm font-black text-heading">هدایای سازمانی هلسا در یک نگاه</h2>
            <p className="mt-2 text-[13px] leading-7 text-body">
              هدایای سازمانی هلسا شامل ۸ پکیج آماده برای تقدیر کارکنان، مشتریان، همایش، یلدا و نوروز است. هر پکیج حداقل تیراژ، محتوا و گزینه‌های بسته‌بندی مشخصی دارد؛ سفارش با فرم استعلام ثبت می‌شود، قیمت نهایی در قالب پیش‌فاکتور رسمی اعلام می‌گردد و تحویل به‌صورت هماهنگ در محل سازمان انجام می‌شود.
            </p>
          </div>
        </Reveal>
      </section>

      {/* categories */}
      <section className="container-x py-10 md:py-14" aria-label="دسته‌بندی هدایای سازمانی">
        <Reveal>
          <SectionHead eyebrow="دسته‌بندی‌ها" title="هدیه سازمانی را از کجا شروع کنیم؟" />
        </Reveal>
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <Reveal>
            <Link
              href="/gifts/corporate"
              className={`flex h-full flex-col justify-between rounded-2xl border p-4 transition-colors ${!activeCategory ? "border-brand-600 bg-brand-50" : "border-line/70 bg-surface hover:border-brand-300"}`}
            >
              <Building2 className="size-5 text-brand-700" aria-hidden />
              <span className="mt-3 text-xs font-black text-heading">همه پکیج‌ها</span>
            </Link>
          </Reveal>
          {CORPORATE_GIFT_CATEGORIES.map((c, i) => (
            <Reveal key={c.id} delay={i * 0.03}>
              <Link
                href={`/gifts/corporate?cat=${c.id}`}
                className={`flex h-full flex-col justify-between rounded-2xl border p-4 transition-colors ${activeCategory?.id === c.id ? "border-brand-600 bg-brand-50" : "border-line/70 bg-surface hover:border-brand-300"}`}
              >
                <Sparkles className="size-5 text-gold-700" aria-hidden />
                <span className="mt-3 text-xs font-black text-heading leading-5">{c.label}</span>
              </Link>
            </Reveal>
          ))}
        </div>
        {activeCategory && (
          <Reveal className="mt-4">
            <p className="text-xs text-muted">{activeCategory.desc}</p>
          </Reveal>
        )}
      </section>

      {/* packages grid */}
      <section className="bg-surface2/70 border-y border-line/60 py-14 md:py-20" aria-label="پکیج‌های سازمانی">
        <div className="container-x">
          <Reveal>
            <SectionHead
              eyebrow="پکیج‌های سازمانی"
              title={activeCategory ? activeCategory.label : "همه پکیج‌های شرکتی هلسا"}
              desc="قیمت‌ها پایه و «از» هستند؛ قیمت نهایی تیراژ و برندینگ پس از استعلام اعلام می‌شود."
            />
          </Reveal>

          {packages.length === 0 ? (
            <Reveal className="mt-10">
              <p className="rounded-2xl border border-line/70 bg-surface p-8 text-center text-sm text-muted">
                در این دسته فعلاً پکیجی ثبت نشده است؛ <Link href="/gifts/corporate" className="font-bold text-brand-700">همه پکیج‌ها</Link> را ببینید یا مستقیم <Link href="/gifts/corporate/inquiry" className="font-bold text-brand-700">استعلام سفارشی</Link> بدهید.
              </p>
            </Reveal>
          ) : (
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {packages.map((p, i) => (
                <Reveal key={p.id} delay={(i % 3) * 0.05}>
                  <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line/70 bg-surface card-hover">
                    <Link href={`/gifts/corporate/${p.slug}`} className="relative block overflow-hidden">
                      <SmartImage src={p.image} alt={p.imageAlt || p.name} sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 92vw" className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                      {p.isFeatured && (
                        <span className="absolute top-3 start-3"><Badge tone="gold">پیشنهاد هلسا</Badge></span>
                      )}
                    </Link>
                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex items-center gap-2">
                        <h3 className="text-[15px] font-black text-heading">
                          <Link href={`/gifts/corporate/${p.slug}`} className="hover:text-brand-700 transition-colors">{p.name}</Link>
                        </h3>
                      </div>
                      <p className="mt-2 text-xs leading-6 text-muted line-clamp-2-fa">{p.shortDescription}</p>

                      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="محتوا">
                        {p.contents.slice(0, 3).map((c) => (
                          <li key={c} className="rounded-full border border-line bg-surface2 px-2.5 py-1 text-[10.5px] font-bold text-body">{c}</li>
                        ))}
                        {p.contents.length > 3 && <li className="px-1 py-1 text-[10.5px] text-muted">+{faDigits(p.contents.length - 3)}</li>}
                      </ul>

                      <div className="mt-auto pt-4">
                        <div className="flex items-end justify-between gap-2">
                          <div>
                            <p className="text-[10.5px] text-muted">قیمت پایه از</p>
                            <p className="text-[15px] font-black text-price">{formatToman(p.basePrice)}</p>
                          </div>
                          <p className="text-[10.5px] text-muted">حداقل {faDigits(p.minQty)} عدد</p>
                        </div>
                        <div className="mt-4 grid grid-cols-1 min-[420px]:grid-cols-2 gap-2">
                          <LinkButton href={`/gifts/corporate/${p.slug}`} size="sm" variant="outline">مشخصات پکیج</LinkButton>
                          <LinkButton href={`/gifts/corporate/inquiry?package=${p.slug}`} size="sm">درخواست استعلام</LinkButton>
                        </div>
                      </div>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* services */}
      <section className="container-x py-14 md:py-20" aria-label="خدمات سازمانی">
        <Reveal>
          <SectionHead eyebrow="خدمات سازمانی" title="چه چیزی هدیه سازمانی هلسا را متفاوت می‌کند؟" />
        </Reveal>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: PackageCheck, t: "برندینگ اختصاصی", d: "چاپ لوگو، رنگ سازمانی و کارت اختصاصی روی بسته‌بندی" },
            { icon: FileText, t: "پیش‌فاکتور رسمی", d: "پیش‌فاکتور شفاف بدون هزینه پنهان؛ مناسب امور مالی سازمان" },
            { icon: Truck, t: "تحویل هماهنگ", d: "ارسال یکجا یا زمان‌بندی‌شده به چند شعبه در تاریخ موردنظر" },
            { icon: CheckCircle2, t: "تیراژ و یکدستی", d: "کیفیت یکسان در تیراژ بالا؛ از ۳ تا هزار عدد" },
          ].map((s, i) => (
            <Reveal key={s.t} delay={i * 0.05}>
              <div className="h-full rounded-2xl border border-line/70 bg-surface p-6">
                <span className="inline-flex size-11 items-center justify-center rounded-full border border-brand-200 text-brand-700">
                  <s.icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-sm font-black text-heading">{s.t}</h3>
                <p className="mt-2 text-xs leading-6 text-muted">{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* workflow */}
      <section className="bg-surface2/70 border-y border-line/60 py-14 md:py-20" aria-label="فرآیند سفارش سازمانی">
        <div className="container-x">
          <Reveal>
            <SectionHead eyebrow="فرآیند سفارش" title="از استعلام تا تحویل، در چهار گام" />
          </Reveal>
          <ol className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CORPORATE_WORKFLOW.map((w, i) => (
              <Reveal key={w.step} delay={i * 0.06}>
                <li className="h-full rounded-2xl border border-line/70 bg-surface p-6">
                  <span className="grid size-9 place-items-center rounded-full bg-brand-700 text-[13px] font-black text-inverse">{faDigits(w.step)}</span>
                  <h3 className="mt-4 text-sm font-black text-heading">{w.title}</h3>
                  <p className="mt-2 text-xs leading-6 text-muted">{w.desc}</p>
                </li>
              </Reveal>
            ))}
          </ol>
          <Reveal className="mt-10 text-center">
            <LinkButton href="/gifts/corporate/inquiry" size="lg">شروع درخواست سازمانی</LinkButton>
          </Reveal>
        </div>
      </section>

      {/* FAQ (AEO) */}
      <section className="container-x py-14 md:py-20" aria-label="سوالات متداول هدایای سازمانی">
        <Reveal>
          <SectionHead eyebrow="سوالات متداول" title="پرسش‌های پرتکرار سازمانی‌ها" />
        </Reveal>
        <div className="mt-8 space-y-3 max-w-3xl mx-auto">
          {FAQS.map((f, i) => (
            <Reveal key={f.q} delay={i * 0.04}>
              <details className="group rounded-2xl border border-line/70 bg-surface p-5 open:border-brand-300">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-black text-heading">
                  {f.q}
                  <span className="text-muted transition-transform duration-300 group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <p className="mt-3 text-[13px] leading-7 text-muted">{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
