import type { Metadata } from "next";
import Link from "next/link";
import { Wine, Wand2, ShieldAlert, Users, PackageCheck, Truck, Headset, BadgeCheck, Clock3, Gift, Leaf, ChevronDown } from "lucide-react";
import { getTrays, getProducts } from "@/services/catalog";
import { TrayExplorer } from "@/components/mazeh/TrayExplorer";
import { MazehStickyBar, CorporateOrderCta } from "@/components/mazeh/MazehCta";
import { ProductCard } from "@/components/product/ProductCard";
import { CarouselRow } from "@/components/ui/CarouselRow";
import { BEVERAGE_PAIRINGS, SECTION_LABELS } from "@/data/trays";
import { Reveal, SectionHead, LinkButton } from "@/components/ui/primitives";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, faqSchema } from "@/lib/seo";
import { faDigits, formatToman } from "@/lib/format";
import { SITE } from "@/config/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "سینی مزه هلسا | سینی پذیرایی ایرانی، مهمانی و سازمانی",
  description:
    "سینی مزه هلسا؛ پذیرایی ایرانی با انتخاب دقیق — از دورهمی‌های کوچک تا مهمانی‌های بزرگ و پذیرایی سازمانی. سینی آماده انتخاب کنید یا سینی اختصاصی خود را بسازید.",
  alternates: { canonical: "/mazeh-trays" },
  openGraph: {
    type: "website",
    title: "سینی مزه هلسا | سینی پذیرایی ایرانی، مهمانی و سازمانی",
    description: "یک سینی، دنیایی از مزه‌ها؛ سینی آماده یا سینی اختصاصی خودتان — برای خانه، هدیه و سازمان.",
    images: [{ url: "/images/mazeh-board.jpg", width: 1200, height: 630, alt: "سینی مزه هلسا" }],
  },
};

/** FAQ (§22) — همهٔ پاسخ‌ها فقط بر پایهٔ قابلیت‌های واقعی سایت؛ بدون عدد و ادعای ساختگی */
const TRAY_FAQ = [
  { q: "سینی مزه هلسا برای چند نفر مناسب است؟", a: "سینی‌های آمادهٔ هلسا از ۴ تا ۲۰ نفر را پوشش می‌دهند؛ بازهٔ دقیق هر سینی روی کارت و صفحهٔ آن درج شده است. برای هر تعداد دیگری، سازندهٔ سینی هلسا در خدمت شماست." },
  { q: "آیا می‌توانم محتویات سینی را تغییر دهم؟", a: "بله؛ با «ساخت سینی» می‌توانید اقلام هر دسته را خودتان انتخاب، کم و زیاد کنید و قیمت را به‌صورت زنده ببینید." },
  { q: "آیا امکان ساخت سینی اختصاصی وجود دارد؟", a: "بله؛ سازندهٔ سینی هلسا در چهار مرحله کار می‌کند: اندازه و تعداد مهمان، مزه‌ها و اقلام، تزئین و بسته‌بندی هدیه، و بازبینی نهایی با قیمت دقیق." },
  { q: "آیا امکان سفارش سازمانی وجود دارد؟", a: "بله؛ از طریق فرم درخواست سفارش سازمانی، تعداد، تاریخ و بودجهٔ تقریبی را ثبت می‌کنید و پیش‌فاکتور صادر می‌شود." },
  { q: "محتویات سینی دقیقاً شامل چیست؟", a: "محتویات کامل هر سینی — به تفکیک هفت بخش — در صفحهٔ همان سینی به‌صورت شفاف فهرست شده است." },
  { q: "آیا امکان تغییر بودجه وجود دارد؟", a: "بله؛ قیمت سازندهٔ سینی همزمان با انتخاب‌های شما محاسبه می‌شود. با کم‌وزیاد کردن اقلام، سینی را دقیقاً در بودجهٔ خودتان نگه دارید." },
  { q: "زمان آماده‌سازی سفارش چقدر است؟", a: "بر اساس تعداد مهمان و اقلام انتخابی متفاوت است و هنگام ثبت سفارش هماهنگ می‌شود؛ برای زمان‌های حساس، پیش از ثبت با پشتیبانی هلسا هماهنگ کنید." },
  { q: "هزینه ارسال چگونه محاسبه می‌شود؟", a: `هزینهٔ ارسال در مرحلهٔ پرداخت و بر اساس آدرس محاسبه می‌شود؛ سفارش‌های بالای ${formatToman(SITE.freeShippingThreshold)} ارسال رایگان دارند.` },
  { q: "آیا می‌توانم برای مناسبت خاص سفارش بدهم؟", a: "بله؛ برای مناسبت‌های رسمی مانند یلدا و نوروز سینی‌های اختصاصی وجود دارد و برای هر مناسبت دیگری می‌توانید با سازندهٔ سینی، ترکیب مناسب خود را بسازید." },
  { q: "آیا امکان هدیه‌کردن سینی وجود دارد؟", a: "بله؛ در سازندهٔ سینی، بسته‌بندی هدیه و کارت پیام در مرحلهٔ تزئین قابل انتخاب است و سینی آمادهٔ هدیه تحویل می‌شود." },
];

export default async function MazehTraysPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; guests?: string }>;
}) {
  const { cat, guests } = await searchParams;
  const [trays, products] = await Promise.all([getTrays(), getProducts()]);
  // کراس‌سل (§18) — فقط محصولات واقعی کاتالوگ
  const bySlug = (slug: string) => products.find((p) => p.slug === slug);
  const addOns = [bySlug("handmade-date-chocolate"), bySlug("date-sugar"), bySlug("piaram-dates"), bySlug("akbari-pistachios")].filter(
    (p): p is NonNullable<typeof p> => Boolean(p),
  );

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "خانه", path: "/" },
          { name: "سینی مزه هلسا", path: "/mazeh-trays" },
        ])}
      />
      <JsonLd data={faqSchema(TRAY_FAQ)} />

      <MazehStickyBar />

      {/* ————— §6 هیرو پرمیوم ————— */}
      <section className="container-x pt-14 md:pt-20 pb-6 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center" aria-label="سینی مزه هلسا">
        <div>
          <span className="text-[11px] font-bold tracking-[0.2em] text-gold-700">زیربرند امضای هلسا</span>
          <h1 className="mt-4 text-4xl md:text-[52px] font-black leading-[1.35] text-heading">
            یک سینی،
            <br />
            دنیایی از مزه‌ها
          </h1>
          <span className="mt-6 block w-16 rule-gold" aria-hidden />
          <p className="mt-6 max-w-md text-sm md:text-[15px] leading-8 text-muted">
            پذیرایی ایرانی، با انتخاب دقیق هلسا؛ برای دورهمی‌های کوچک تا مهمانی‌های بزرگ و پذیرایی‌های سازمانی.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href="/mazeh-trays/build" variant="primary" size="lg">
              <Wand2 className="size-4" aria-hidden /> ساخت سینی من
            </LinkButton>
            <LinkButton href="#trays" variant="outline" size="lg">انتخاب سینی آماده</LinkButton>
          </div>
          {/* نشان‌های اعتماد/ارزش نزد CTA */}
          <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-bold text-muted">
            <li className="flex items-center gap-1.5"><Users className="size-3.5 text-gold-700" aria-hidden /> مناسب مهمانی</li>
            <li className="flex items-center gap-1.5"><Leaf className="size-3.5 text-gold-700" aria-hidden /> انتخاب ترکیبات</li>
            <li className="flex items-center gap-1.5"><Gift className="size-3.5 text-gold-700" aria-hidden /> بسته‌بندی شیک</li>
            <li className="flex items-center gap-1.5"><Truck className="size-3.5 text-gold-700" aria-hidden /> ارسال مطمئن</li>
          </ul>
        </div>
        <div className="rounded-2xl overflow-hidden border border-line/70 img-zoom">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/mazeh-light.jpg" alt="سینی مزه هلسا با چیدمان پنیر، زیتون، خرما و شکلات" className="w-full aspect-[4/3] object-cover" fetchPriority="high" />
        </div>
      </section>

      {/* ————— §13 بند غالب «سینی خودت را بساز» ————— */}
      <section className="container-x pt-6 pb-4" aria-label="ساخت سینی اختصاصی">
        <Reveal>
          <div className="relative overflow-hidden rounded-[1.75rem] border border-brand-200/70 bg-gradient-to-l from-brand-50 via-surface to-gold-50/60 p-7 shadow-soft md:p-10">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="max-w-xl">
                <h2 className="text-xl font-black leading-9 text-heading md:text-2xl">سینی‌ای که برای مهمانی تو ساخته می‌شود</h2>
                <p className="mt-2.5 text-[13px] leading-7 text-muted">
                  تعداد مهمان‌ها، مناسبت، ذائقه و بودجه را انتخاب کن. هلسا ترکیب مناسب را به تو پیشنهاد می‌دهد.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <LinkButton href="/mazeh-trays/build" variant="primary" size="lg">ساخت سینی من</LinkButton>
                <LinkButton href="#contents" variant="outline" size="lg">راهنمای انتخاب</LinkButton>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ————— §7/8/12 انتخاب سینی: فیلتر نفرات + مناسبت + پیشنهاد هلسا اول ————— */}
      <section id="trays" className="container-x py-14 md:py-20" aria-label="سینی‌های مزه هلسا">
        <Reveal>
          <SectionHead
            eyebrow="کدام سینی برای شما مناسب است؟"
            title="سینی مزه خود را انتخاب کنید"
            desc="تعداد مهمان‌ها و نوع پذیرایی را انتخاب کنید تا سریع‌تر به انتخاب مناسب برسید — پیشنهادهای هلسا بالای فهرست‌اند."
          />
        </Reveal>
        <TrayExplorer trays={trays} initialCat={cat ?? "all"} initialGuests={guests ?? "all"} />
      </section>

      {/* ————— §18 کراس‌سل ظریف: سینی را کامل‌تر کنید ————— */}
      {addOns.length >= 2 && (
        <section className="container-x pb-14 md:pb-20" aria-label="تکمیل‌کننده‌های سینی">
          <Reveal>
            <h2 className="text-[15px] font-black text-heading">این سینی را کامل‌تر کنید</h2>
            <p className="mt-1 text-xs text-muted">منتخب هلسا برای کنار سینی — از همان ارسال با سینی شما راه می‌افتند.</p>
          </Reveal>
          <CarouselRow ariaLabel="تکمیل‌کننده‌های سینی — نوار کشویی" className="mt-5">
            {addOns.map((p) => (
              <div key={p.slug} className="w-[68vw] min-[400px]:w-[60vw] sm:w-[292px] lg:w-[268px] shrink-0 snap-start">
                <ProductCard product={p} />
              </div>
            ))}
          </CarouselRow>
        </section>
      )}

      {/* ————— §11 ارزش‌شناسی: هفت بخش یک سینی ————— */}
      <section id="contents" className="bg-surface2/70 border-y border-line/60 py-20 md:py-28 relative overflow-hidden">
        <div className="pattern-persian absolute inset-0 opacity-60" aria-hidden />
        <div className="relative container-x">
          <Reveal>
            <SectionHead eyebrow="داخل این سینی چیست؟" title="در یک سینی هلسا چه چیزی دریافت می‌کنید؟" desc="هر سینی هلسا از هفت بخش تشکیل می‌شود تا هیچ ذائقه‌ای بی‌پاسخ نماند." />
          </Reveal>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {Object.entries(SECTION_LABELS).map(([code, label], i) => (
              <Reveal key={code} delay={i * 0.05}>
                <div className="rounded-2xl border border-line/70 bg-surface p-5 text-center h-full">
                  <span className="text-gold-700 font-black text-lg">{faDigits(i + 1)}</span>
                  <p className="mt-2 text-[11.5px] font-bold text-heading">{label}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-8">
            <p className="text-center text-xs text-muted flex items-center justify-center gap-2">
              <ShieldAlert className="size-4 text-gold-700" aria-hidden />
              اطلاعات آلرژن‌ها (مغزها، لبنیات، گلوتن و ...) در صفحه هر سینی به‌صورت شفاف درج شده است.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ————— پیشنهاد نوشیدنی (موجود) ————— */}
      <section id="pairing" className="container-x py-16 md:py-24" aria-label="پیشنهاد نوشیدنی">
        <Reveal>
          <SectionHead eyebrow="پیشنهاد هلسا برای نوشیدنی" title="هر مزه، یک همراه نوشیدنی" desc="چای، قهوه، آبمیوه طبیعی و موکتل‌های بدون الکل؛ جفت‌شدن‌هایی که طعم سینی را کامل می‌کنند." />
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {BEVERAGE_PAIRINGS.map((b, i) => (
            <Reveal key={b.pair} delay={(i % 4) * 0.07}>
              <div className="rounded-2xl bg-surface border border-line p-5 h-full card-hover">
                <span className="inline-flex size-10 rounded-xl bg-brand-50 text-brand-600 items-center justify-center">
                  <Wine className="size-5" aria-hidden />
                </span>
                <p className="mt-3 text-sm font-black text-heading">{b.pair}</p>
                <p className="mt-1 text-xs font-bold text-accent-600">{b.drink}</p>
                <p className="mt-2 text-[11px] text-muted leading-5">{b.note}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ————— §19 پذیرایی سازمانی ————— */}
      <section className="container-x pb-16 md:pb-20" aria-label="پذیرایی سازمانی هلسا">
        <Reveal>
          <div className="overflow-hidden rounded-[1.75rem] border border-line/70 bg-gradient-to-l from-brand-950 via-brand-900 to-brand-800 shadow-lift">
            <div className="flex flex-wrap items-center justify-between gap-6 p-7 md:p-10">
              <div className="max-w-xl">
                <p className="inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-500/10 px-3.5 py-1.5 text-[11px] font-bold text-gold-300">
                  <BadgeCheck className="size-3.5" aria-hidden /> هلسا برای کسب‌وکارها
                </p>
                <h2 className="mt-4 text-xl font-black leading-9 text-inverse md:text-2xl">پذیرایی سازمانی هلسا</h2>
                <p className="mt-2.5 text-[12.5px] leading-7 text-inverse/70">
                  برای جلسات، همایش‌ها، مناسبت‌ها و هدیه سازمانی، ترکیب و بسته‌بندی متناسب با تعداد و بودجه شما طراحی می‌شود.
                </p>
              </div>
              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <CorporateOrderCta />
                <Link
                  href="/gifts/corporate"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-white/25 px-7 text-[13px] font-bold text-white transition-colors hover:bg-white/10"
                >
                  مشاهده هدایای سازمانی
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ————— §20 چرا هلسا (فقط ادعاهای واقعی سایت) ————— */}
      <section className="container-x pb-16 md:pb-20" aria-label="چرا هلسا">
        <Reveal>
          <SectionHead eyebrow="وعدهٔ هلسا" title="چرا هلسا؟" />
        </Reveal>
        <ul className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { icon: BadgeCheck, title: "انتخاب دقیق مواد", desc: "هر قلم از منبع معتبر، دست‌چین و کنترل‌شده." },
            { icon: PackageCheck, title: "بسته‌بندی پرمیوم", desc: "چیدمان روز، مدالیون امضا و بسته‌بندی شیک." },
            { icon: Truck, title: "تحویل یخچال‌دار", desc: "تحویل فقط در تهران، ۲۴ تا ۴۸ ساعت پیش از مراسم، با خودرو یخچال‌دار." },
            { icon: Headset, title: "پشتیبانی واقعی", desc: "پاسخ‌گویی واقعی، قبل و بعد از سفارش." },
          ].map((c, i) => (
            <li key={c.title}>
              <Reveal delay={i * 50}>
                <div className="flex h-full flex-col items-center gap-3 rounded-2xl border border-line/70 bg-surface p-6 text-center shadow-soft transition-shadow hover:shadow-lift">
                  <c.icon className="size-7 text-brand-600" aria-hidden />
                  <h3 className="text-[13.5px] font-black text-heading">{c.title}</h3>
                  <p className="text-[11.5px] leading-6 text-muted">{c.desc}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      {/* ————— §21 قبل از سفارش بدانید (فقط اطلاعات واقعی) ————— */}
      <section className="container-x pb-16 md:pb-20" aria-label="قبل از سفارش بدانید">
        <Reveal>
          <div className="rounded-[1.5rem] border border-line/70 bg-surface2/60 p-6 md:p-8">
            <h2 className="flex items-center gap-2 text-[15px] font-black text-heading">
              <Clock3 className="size-4.5 text-gold-700" aria-hidden /> قبل از سفارش بدانید
            </h2>
            <ul className="mt-5 grid gap-4 text-[12px] leading-6 text-muted sm:grid-cols-2 lg:grid-cols-3">
              <li className="flex gap-2.5"><PackageCheck className="size-4 shrink-0 text-brand-600" aria-hidden /> هر سینی با چیدمان روز و مواد تازه آماده می‌شود.</li>
              <li className="flex gap-2.5"><Truck className="size-4 shrink-0 text-brand-600" aria-hidden /> تحویل فقط در تهران، ۲۴ تا ۴۸ ساعت پیش از زمان مورد نظر، با خودرو یخچال‌دار.</li>
              <li className="flex gap-2.5"><ShieldAlert className="size-4 shrink-0 text-brand-600" aria-hidden /> آلرژن‌های هر سینی در صفحهٔ همان سینی درج شده است.</li>
              <li className="flex gap-2.5"><Gift className="size-4 shrink-0 text-brand-600" aria-hidden /> بسته‌بندی هدیه و کارت پیام در سازندهٔ سینی قابل انتخاب است.</li>
              <li className="flex gap-2.5"><Users className="size-4 shrink-0 text-brand-600" aria-hidden /> زمان آماده‌سازی بر اساس تعداد مهمان، هنگام ثبت سفارش هماهنگ می‌شود.</li>
              <li className="flex gap-2.5"><Truck className="size-4 shrink-0 text-brand-600" aria-hidden /> جزئیات پوشش و هزینهٔ ارسال در <Link href="/shipping" className="font-bold text-brand-700 underline underline-offset-4">صفحهٔ ارسال</Link> آمده است.</li>
            </ul>
          </div>
        </Reveal>
      </section>

      {/* ————— §22 پرسش‌های متداول ————— */}
      <section className="container-x pb-16 md:pb-20" aria-label="پرسش‌های متداول سینی مزه">
        <Reveal>
          <SectionHead eyebrow="پرسش‌های متداول" title="هر آنچه قبل از سفارش سینی بدانید" />
        </Reveal>
        <div className="mx-auto mt-8 max-w-3xl divide-y divide-line/70 rounded-2xl border border-line/70 bg-surface shadow-soft">
          {TRAY_FAQ.map((f) => (
            <details key={f.q} className="group px-5 md:px-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-4 text-[13px] font-black text-heading transition-colors hover:text-brand-700 [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown className="size-4 shrink-0 text-muted transition-transform duration-300 group-open:rotate-180" aria-hidden />
              </summary>
              <p className="pb-4 text-[12.5px] leading-7 text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ————— §23 CTA نهایی ————— */}
      <section className="container-x pb-20 md:pb-28" aria-label="شروع سفارش سینی">
        <Reveal>
          <div className="relative overflow-hidden rounded-[1.75rem] bg-brand-950 p-8 text-center shadow-lift md:p-12">
            <div aria-hidden className="pointer-events-none absolute -top-24 -start-24 size-72 rounded-full bg-gold-500/10 blur-3xl" />
            <h2 className="relative text-xl font-black leading-9 text-inverse md:text-2xl">مهمانی بعدی‌ات را با هلسا کامل کن.</h2>
            <div className="relative mt-6 flex flex-wrap items-center justify-center gap-3">
              <LinkButton href="/mazeh-trays/build" variant="primary" size="lg">ساخت سینی من</LinkButton>
              <LinkButton href="#trays" variant="outline" size="lg">انتخاب سینی آماده</LinkButton>
            </div>
            <p className="relative mt-5 text-[12px] text-inverse/70">
              پذیرایی سازمانی؟{" "}
              <Link href="/gifts/corporate/inquiry" className="font-black text-gold-300 underline underline-offset-4">سفارش سازمانی</Link>
            </p>
          </div>
        </Reveal>
      </section>
    </>
  );
}
