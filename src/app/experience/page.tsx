import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft, Gift, Crown, ShieldCheck, Truck, BadgeCheck, Headset, Leaf, Package, ChevronDown,
} from "lucide-react";
import { getTrays, getProducts } from "@/services/catalog";
import { ExperienceJourney } from "@/components/mazeh/ExperienceJourney";
import { ProductCard } from "@/components/product/ProductCard";
import { Reveal, SectionHead, LinkButton } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "تجربهٔ مهمانی هلسا | پذیرایی‌ای که به یاد می‌ماند",
  description:
    "برای لحظه‌هایی که ارزش به‌یادماندن دارند: سینی مزه دست‌ساز، خرما، هدیه و محصولات طبیعی هلسا — از دورهمی دو نفره تا پذیرایی سازمانی.",
  alternates: { canonical: "/experience" },
  openGraph: {
    title: "تجربهٔ مهمانی هلسا | پذیرایی ایرانی با امضای هلسا",
    description: "سفر پذیرایی شما: تعداد مهمان، مناسبت، پیشنهاد هلسا، سینی — در چند ثانیه.",
  },
};

/** §7 — کراس‌سل «میز خود را کامل کنید»: فقط محصولات واقعی کاتالوگ با موجودی */
const CROSS_SELL_SLUGS = ["piaram-dates", "handmade-date-chocolate", "lahijan-black-tea", "herbal-tea-borage", "premium-mixed-nuts"];

/** §6 — مراحل سازندهٔ سینی (مسیر واقعی /mazeh-trays/build) */
const BUILDER_STEPS = ["تعداد مهمان", "مناسبت", "ذائقه", "بودجه", "محتوا", "پیش‌نمایش", "سبد خرید"];

export default async function ExperiencePage() {
  const [trays, products] = await Promise.all([getTrays(), getProducts()]);
  const crossSell = CROSS_SELL_SLUGS.map((slug) => products.find((p) => p.slug === slug && p.stock > 0)).filter(
    (p): p is NonNullable<typeof p> => Boolean(p),
  );

  return (
    <>
      {/* ——— §1 HERO: احساس + دو CTA + اعتماد ——— */}
      <section className="relative bg-canvas overflow-hidden" aria-label="تجربهٔ مهمانی هلسا">
        <div className="grid lg:grid-cols-12 min-h-[68svh]">
          <div className="relative lg:order-2 lg:col-span-7 min-h-[40svh] lg:min-h-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/mazeh-light.jpg" alt="سینی مزه هلسا با چیدمان پنیر، زیتون، خرما و شکلات" className="absolute inset-0 size-full object-cover" fetchPriority="high" />
            <div className="hidden lg:block absolute inset-y-0 start-0 w-40 bg-gradient-to-l from-canvas to-transparent" aria-hidden />
            <div className="lg:hidden absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-canvas to-transparent" aria-hidden />
          </div>
          <div className="relative lg:order-1 lg:col-span-5 flex items-center">
            <div className="w-full px-6 md:px-12 lg:ps-14 lg:pe-8 py-14 lg:py-20">
              <Reveal>
                <p className="text-[11px] font-bold tracking-[0.25em] text-gold-700">تجربهٔ پذیرایی هلسا</p>
                <h1 className="mt-4 text-[30px] md:text-[42px] font-black leading-[1.4] text-heading">
                  برای لحظه‌هایی که
                  <br />
                  ارزش به‌یادماندن دارند
                </h1>
                <span className="mt-5 block w-16 rule-gold" aria-hidden />
                <p className="mt-4 max-w-md text-sm md:text-[15px] leading-8 text-muted">
                  پذیرایی پرمیوم ایرانی با سینی‌های مزهٔ دست‌ساز، خرما، هدیه و محصولات طبیعی — چیدمانی که مهمان‌تان تا ماه‌ها بعد یادش می‌ماند.
                </p>
              </Reveal>
              <Reveal delay={0.12}>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <LinkButton href="/mazeh-trays/build" variant="primary" size="lg">
                    ساخت سینی من
                  </LinkButton>
                  <LinkButton href="#trays" variant="outline" size="lg">
                    سینی‌های آماده
                    <ArrowLeft className="size-4" aria-hidden />
                  </LinkButton>
                </div>
              </Reveal>
              <Reveal delay={0.2}>
                <ul className="mt-7 grid grid-cols-2 gap-x-5 gap-y-2.5 border-t border-line/80 pt-5 text-[11px] font-bold text-muted sm:grid-cols-4 lg:grid-cols-2">
                  <li className="flex items-center gap-1.5"><Leaf className="size-4 text-brand-600" aria-hidden /> مواد تازه و منتخب</li>
                  <li className="flex items-center gap-1.5"><Crown className="size-4 text-gold-700" aria-hidden /> چیدمان لوکس</li>
                  <li className="flex items-center gap-1.5"><ShieldCheck className="size-4 text-brand-600" aria-hidden /> پرداخت امن</li>
                  <li className="flex items-center gap-1.5"><Truck className="size-4 text-brand-600" aria-hidden /> ارسال سریع</li>
                </ul>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ——— §2–§5: سفر تعاملی (مهمان ← مناسبت ← پیشنهاد ← سینی‌ها) ——— */}
      <section id="trays" className="container-x py-14 md:py-20 scroll-mt-20" aria-label="انتخاب سینی مزه">
        <SectionHead
          eyebrow="سفر پذیرایی"
          title="در چند ثانیه، سینی مناسب جمع شما"
          desc="تعداد مهمان و بهانهٔ جمع‌شدن را انتخاب کنید؛ پیشنهاد هلسا از میان سینی‌های واقعی محاسبه می‌شود."
        />
        <div className="mt-9">
          <ExperienceJourney trays={trays} />
        </div>
      </section>

      {/* ——— §6: ساخت سینی اختصاصی (قوی‌ترین سکشن) ——— */}
      <section className="relative overflow-hidden border-y border-line/60 bg-gradient-to-l from-brand-50 via-surface to-surface py-14 md:py-20" aria-label="ساخت سینی اختصاصی">
        <div className="container-x">
          <div className="grid items-center gap-10 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <p className="text-[11px] font-bold tracking-[0.25em] text-gold-700">سینی مزه اختصاصی هلسا</p>
              <h2 className="mt-3 text-xl font-black leading-9 text-heading md:text-2xl">
                سینی‌ای که برای جمعِ خودتان طراحی می‌شود
              </h2>
              <p className="mt-3 max-w-lg text-[13px] leading-7 text-muted">
                اندازه، مزه‌ها، تزئین و بسته‌بندی — همه به انتخاب شما. قیمت را سرور لحظه‌ای و شفاف محاسبه می‌کند؛ بدون سورپرایز.
              </p>
              {/* مسیر ۷ مرحله‌ای — همان مسیر واقعی سازنده */}
              <ol className="mt-6 flex flex-wrap items-center gap-2" aria-label="مراحل ساخت سینی">
                {BUILDER_STEPS.map((step, i) => (
                  <li key={step} className="flex items-center gap-2">
                    <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-[11px] font-bold text-body">
                      <span className="text-gold-700">{("۰۱۲۳۴۵۶۷"[i])}</span> {step}
                    </span>
                    {i < BUILDER_STEPS.length - 1 && <ChevronDown className="size-3.5 rotate-90 text-faint max-sm:hidden" aria-hidden />}
                  </li>
                ))}
              </ol>
              <div className="mt-7 flex flex-wrap gap-3">
                <LinkButton href="/mazeh-trays/build" variant="primary" size="lg">ساخت سینی من</LinkButton>
                <LinkButton href="/mazeh-trays" variant="outline" size="lg">
                  الهام از سینی‌های آماده
                  <ArrowLeft className="size-4" aria-hidden />
                </LinkButton>
              </div>
            </div>
            <div className="lg:col-span-6">
              <Link href="/mazeh-trays/build" className="group relative block overflow-hidden rounded-[1.75rem] border border-line shadow-lift" aria-label="ساخت سینی مزه اختصاصی">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/opt/hero-slide-mazeh.jpg" alt="چیدمان پنیر، آجیل و میوه روی تختهٔ چوبی برای پذیرایی" loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover img-zoom" />
                <span className="absolute bottom-4 start-4 rounded-full border border-white/30 bg-ink-950/40 px-4 py-2 text-[11px] font-bold text-white backdrop-blur-md">
                  قیمت زنده از سرور · بدون حداقل سفارش پنهان
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ——— §7: میز خود را کامل کنید (کراس‌سل واقعی) ——— */}
      {crossSell.length > 0 && (
        <section className="container-x py-14 md:py-20" aria-label="میز خود را کامل کنید">
          <SectionHead
            eyebrow="پذیرایی کامل‌تر"
            title="میز خود را کامل کنید"
            desc="هم‌نشین‌های واقعی سینی هلسا — انتخاب مشتریان از ویترین امروز."
          />
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5 md:gap-5">
            {crossSell.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>
      )}



      {/* ——— §9: CTA نهایی سه‌مسیره ——— */}
      <section className="relative overflow-hidden bg-gradient-to-l from-brand-800 via-brand-700 to-brand-800 py-16 md:py-24" aria-label="دعوت نهایی هلسا">
        <div className="pattern-persian-light absolute inset-0 opacity-60" aria-hidden />
        <div className="container-x relative text-center">
          <Gift className="mx-auto size-10 text-gold-300" aria-hidden />
          <h2 className="mt-4 text-2xl font-black leading-relaxed text-inverse md:text-3xl">
            جمع بعدی شما، لایقِ هلساست
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[13px] leading-7 text-inverse/80">
            سینی اختصاصی بسازید، از مجموعهٔ آماده انتخاب کنید یا برای سازمانتان استعلام بگیرید.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <LinkButton href="/mazeh-trays/build" variant="cream" size="lg">ساخت سینی من</LinkButton>
            <LinkButton href="/mazeh-trays" variant="outline" size="lg" className="!border-inverse/40 !text-inverse hover:!bg-inverse/10">سینی‌های آماده</LinkButton>
            <LinkButton href="/gifts/corporate" variant="gold" size="lg">سفارش سازمانی</LinkButton>
          </div>
        </div>
      </section>
    </>
  );
}
