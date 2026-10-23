import type { Metadata } from "next";
import Link from "next/link";
import { Gift, Building2, PenLine, PackageCheck, BadgeCheck, Headset, Truck, ShieldAlert, ChevronDown, Clock3, Sparkles } from "lucide-react";
import { getGiftPackages } from "@/services/gifts";
import { GiftFinder, GiftsStickyBar } from "@/components/gifts/GiftFinder";
import { CorporateCalculator } from "@/components/gifts/CorporateCalculator";
import { Reveal, SectionHead, LinkButton } from "@/components/ui/primitives";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, faqSchema } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "هدیه هلسا | جعبه هدیه ایرانی، هدیه سازمانی و پک مناسبتی",
  description:
    "هدیه‌ای که فقط هدیه نیست؛ بخشی از خاطره است. جعبه‌های هدیه شخصی و سازمانی هلسا با بسته‌بندی شیک، پیام اختصاصی و محتویات طبیعی — برای تولد، تشکر، یلدا، نوروز و پذیرایی سازمانی.",
  alternates: { canonical: "/gifts" },
  openGraph: {
    title: "هدیه هلسا | جعبه هدیه ایرانی، هدیه سازمانی و پک مناسبتی",
    description: "از هدیهٔ شخصی و خانوادگی تا پک‌های سازمانی؛ مناسبت و بودجه را انتخاب کنید، هلسا پیشنهاد می‌دهد.",
    images: [{ url: "/images/chocolate-craft.jpg", width: 1200, height: 630, alt: "جعبه هدیه هلسا" }],
  },
};

/** کاربردهای سازمانی (§25) — هر کارت به پکیج واقعی همان کاربرد در دیتابیس متصل است */
const CORPORATE_USE_CASES = [
  { icon: "👤", label: "هدیه کارکنان", slug: "corporate-staff-gift" },
  { icon: "🤝", label: "هدیه مشتریان", slug: "corporate-client-gift" },
  { icon: "⭐", label: "هدیه مدیران", slug: "corporate-executive-gift" },
  { icon: "🤝", label: "شروع همکاری", slug: "corporate-welcome-kit" },
  { icon: "🎪", label: "همایش و رویداد", slug: "corporate-event-pack" },
  { icon: "🌙", label: "یلدای سازمانی", slug: "corporate-yalda-gift" },
  { icon: "🌱", label: "نوروز سازمانی", slug: "corporate-norooz-gift" },
  { icon: "✨", label: "پک سفارشی سازمانی", slug: "corporate-custom-gift" },
];

/** FAQ (§35) — پاسخ‌ها فقط بر پایهٔ قابلیت‌های واقعی پیاده‌سازی‌شده */
const GIFT_FAQ = [
  { q: "چه نوع هدایایی در هلسا وجود دارد؟", a: "دو دسته: جعبه‌های هدیهٔ شخصی (کلاسیک، یلدا، نوروز، لوکس) و پکیج‌های سازمانی برای کارکنان، مشتریان، مدیران و رویدادها. محتویات و قیمت هر بسته در صفحهٔ همان هدیه شفاف درج شده است." },
  { q: "آیا امکان شخصی‌سازی هدیه وجود دارد؟", a: "بله؛ در صفحهٔ هدیه‌های دارای قابلیت شخصی‌سازی می‌توانید نوع بسته‌بندی را انتخاب و نام گیرنده و پیام اختصاصی بنویسید. قیمت نهایی همان‌جا و توسط سرور محاسبه می‌شود." },
  { q: "آیا می‌توانم داخل هدیه محصولات را انتخاب کنم؟", a: "محتویات هر جعبه به‌صورت curated و ثابت است تا هماهنگی طعم‌ها حفظ شود؛ فهرست کامل محتویات در صفحهٔ هر هدیه آمده است. برای ترکیب کاملاً دلخواه، سازندهٔ سینی مزه هلسا در اختیار شماست." },
  { q: "آیا امکان نوشتن پیام برای گیرنده وجود دارد؟", a: "بله؛ هدیه‌هایی که «قابل شخصی‌سازی» هستند، فیلد پیام (تا ۲۴۰ کاراکتر) و نام گیرنده دارند و پیام شما همراه هدیه ارسال می‌شود." },
  { q: "هدیه سازمانی برای چه تعداد قابل سفارش است؟", a: "پکیج‌های سازمانی برای تیراژ بالا طراحی شده‌اند؛ تعداد تقریبی، تاریخ و بودجه را در فرم استعلام ثبت می‌کنید و کارشناسان هلسا پیش‌فاکتور رسمی صادر می‌کنند." },
  { q: "آیا برای سفارش سازمانی قیمت متفاوتی وجود دارد؟", a: "پکیج‌های سازمانی قیمت پایهٔ مشخصی دارند؛ قیمت نهایی تیراژهای بالا پس از بررسی کارشناسی و متناسب با تعداد و بسته‌بندی اعلام می‌شود." },
  { q: "زمان آماده‌سازی هدیه چقدر است؟", a: "بر اساس نوع هدیه و تیراژ متفاوت است و هنگام ثبت سفارش هماهنگ می‌شود؛ برای تاریخ‌های حساس، پیش از ثبت با پشتیبانی هلسا هماهنگ کنید." },
  { q: "هزینه ارسال چگونه محاسبه می‌شود؟", a: "هزینهٔ ارسال در مرحلهٔ پرداخت و بر اساس آدرس محاسبه می‌شود؛ جزئیات کامل در صفحهٔ ارسال آمده است." },
  { q: "آیا امکان سفارش مناسبتی وجود دارد؟", a: "بله؛ پک‌های واقعی یلدا، نوروز و مناسبت‌های سازمانی در مجموعه وجود دارند و برای هر مناسبت دیگر می‌توانید درخواست هدیهٔ اختصاصی ثبت کنید." },
  { q: "آیا می‌توان هدیه را مستقیم برای گیرنده ارسال کرد؟", a: "آدرس تحویل هنگام ثبت سفارش مشخص می‌شود؛ برای ارسال مستقیم به گیرنده، در توضیحات سفارش ذکر کنید یا با پشتیبانی هماهنگ کنید." },
];

export default async function GiftsPage({
  searchParams,
}: {
  searchParams: Promise<{ occasion?: string; recipient?: string; budget?: string }>;
}) {
  const { occasion, recipient, budget } = await searchParams;
  const gifts = await getGiftPackages();

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "خانه", path: "/" },
          { name: "هدایا", path: "/gifts" },
        ])}
      />
      <JsonLd data={faqSchema(GIFT_FAQ)} />

      <GiftsStickyBar />

      {/* ————— §7/8 هیرو ————— */}
      <section className="container-x pt-14 md:pt-20 pb-4" aria-label="هدیه هلسا">
        <div className="max-w-2xl">
          <span className="text-[11px] font-bold tracking-[0.2em] text-gold-700">هدیه هلسا</span>
          <h1 className="mt-4 text-3xl font-black leading-[1.5] text-heading md:text-[44px]">
            هدیه‌ای که فقط هدیه نیست؛
            <br />
            بخشی از خاطره است.
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-8 text-muted md:text-[15px]">
            از هدیه شخصی و خانوادگی تا پک‌های سازمانی، هلسا ترکیبی از طعم‌های ایرانی و بسته‌بندی شایسته هدیه ارائه می‌کند.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <LinkButton href="#finder" variant="primary" size="lg">انتخاب هدیه</LinkButton>
            <LinkButton href="/gifts/corporate/inquiry" variant="outline" size="lg">سفارش سازمانی</LinkButton>
            <LinkButton href="/gifts/customize" variant="outline" size="lg">
              <PenLine className="size-4" aria-hidden /> ساخت هدیه اختصاصی
            </LinkButton>
          </div>
          <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-bold text-muted">
            <li className="flex items-center gap-1.5"><Gift className="size-3.5 text-gold-700" aria-hidden /> انتخاب متناسب با مناسبت</li>
            <li className="flex items-center gap-1.5"><PenLine className="size-3.5 text-gold-700" aria-hidden /> امکان شخصی‌سازی</li>
            <li className="flex items-center gap-1.5"><PackageCheck className="size-3.5 text-gold-700" aria-hidden /> بسته‌بندی هدیه</li>
            <li className="flex items-center gap-1.5"><Building2 className="size-3.5 text-gold-700" aria-hidden /> سفارش سازمانی</li>
          </ul>
        </div>
      </section>

      {/* ————— §9-12 کشف هدیه: مناسبت → گیرنده → بودجه → پیشنهاد ————— */}
      <section className="container-x py-12 md:py-16" aria-label="کشف هدیه">
        <GiftFinder gifts={gifts} initialOccasion={occasion ?? ""} initialRecipient={recipient ?? ""} initialBudget={budget ?? ""} />
      </section>

      {/* ————— §24-27 هدیه سازمانی ————— */}
      <section className="bg-brand-950 py-16 md:py-20" aria-label="هدیه سازمانی هلسا">
        <div className="container-x">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-500/10 px-3.5 py-1.5 text-[11px] font-bold text-gold-300">
                <Building2 className="size-3.5" aria-hidden /> هلسا برای کسب‌وکارها
              </p>
              <h2 className="mt-4 text-2xl font-black leading-[1.6] text-inverse md:text-[28px]">هدیه سازمانی هلسا</h2>
              <p className="mt-4 max-w-lg text-[13px] leading-8 text-inverse/70">
                برای کارکنان، مشتریان، مدیران، شرکای تجاری، رویدادها و مناسبت‌های سازمانی، هلسا می‌تواند ترکیب و بسته‌بندی متناسب با تعداد و بودجه شما پیشنهاد دهد.
              </p>
              <ul className="mt-6 grid gap-3 text-[12px] font-bold text-inverse/80 sm:grid-cols-2">
                <li className="flex items-center gap-2"><BadgeCheck className="size-4 shrink-0 text-gold-400" aria-hidden /> انتخاب ترکیب متناسب با بودجه</li>
                <li className="flex items-center gap-2"><PackageCheck className="size-4 shrink-0 text-gold-400" aria-hidden /> بسته‌بندی مناسب سازمان</li>
                <li className="flex items-center gap-2"><Truck className="size-4 shrink-0 text-gold-400" aria-hidden /> امکان سفارش تعداد بالا</li>
                <li className="flex items-center gap-2"><PenLine className="size-4 shrink-0 text-gold-400" aria-hidden /> امکان شخصی‌سازی</li>
                <li className="flex items-center gap-2"><Sparkles className="size-4 shrink-0 text-gold-400" aria-hidden /> هماهنگی برای مناسبت‌ها</li>
                <li className="flex items-center gap-2"><Headset className="size-4 shrink-0 text-gold-400" aria-hidden /> پشتیبانی فروش</li>
              </ul>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/gifts/corporate/inquiry"
                  className="inline-flex h-12 items-center rounded-full bg-gold-500 px-7 text-[13px] font-black text-brand-950 transition-colors hover:bg-gold-400"
                >
                  درخواست سفارش سازمانی
                </Link>
                <Link
                  href="/gifts/corporate"
                  className="inline-flex h-12 items-center rounded-full border border-white/25 px-7 text-[13px] font-bold text-white transition-colors hover:bg-white/10"
                >
                  مشاهده پیشنهادهای سازمانی
                </Link>
              </div>
            </div>
            <div className="flex flex-col gap-6">
              {/* کاربردها — هر کارت به پکیج واقعی همان کاربرد */}
              <div>
                <h3 className="text-[13.5px] font-black text-inverse">برای چه استفاده‌ای؟</h3>
                <ul className="mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                  {CORPORATE_USE_CASES.map((u) => (
                    <li key={u.slug}>
                      <Link
                        href={`/gifts/corporate/${u.slug}`}
                        className="flex h-full flex-col items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 p-3.5 text-center transition-colors hover:border-gold-400/50 hover:bg-white/10"
                      >
                        <span className="text-xl" aria-hidden>{u.icon}</span>
                        <span className="text-[10.5px] font-bold leading-4 text-inverse/90">{u.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <CorporateCalculator />
            </div>
          </div>
        </div>
      </section>

      {/* ————— §33 چرا هدیه هلسا ————— */}
      <section className="container-x py-14 md:py-20" aria-label="چرا هدیه هلسا">
        <Reveal>
          <SectionHead eyebrow="وعدهٔ هلسا" title="چرا هدیه هلسا؟" />
        </Reveal>
        <ul className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
          {[
            { icon: Gift, title: "محصولات ایرانی", desc: "خرما، آجیل و خشکبار منتخب ایرانی در هر جعبه." },
            { icon: BadgeCheck, title: "کیفیت انتخاب‌شده", desc: "محتویات هر بسته دست‌چین و در صفحهٔ هدیه شفاف درج شده است." },
            { icon: PackageCheck, title: "بسته‌بندی شایسته هدیه", desc: "بسته‌بندی استاندارد تا پریمیوم، متناسب با موقعیت." },
            { icon: PenLine, title: "شخصی‌سازی واقعی", desc: "نام گیرنده و پیام اختصاصی، با قیمت‌گذاری سمت سرور." },
            { icon: Building2, title: "تجربهٔ سازمانی", desc: "پکیج‌های ویژه برای کارکنان، مشتریان و رویدادها." },
            { icon: Headset, title: "پشتیبانی هلسا", desc: "پاسخ‌گویی واقعی، قبل و بعد از ثبت هدیه." },
          ].map((c, i) => (
            <li key={c.title}>
              <Reveal delay={i * 40}>
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

      {/* ————— §34 قبل از سفارش بدانید ————— */}
      <section className="container-x pb-14 md:pb-20" aria-label="قبل از سفارش بدانید">
        <Reveal>
          <div className="rounded-[1.5rem] border border-line/70 bg-surface2/60 p-6 md:p-8">
            <h2 className="flex items-center gap-2 text-[15px] font-black text-heading">
              <Clock3 className="size-4.5 text-gold-700" aria-hidden /> قبل از سفارش بدانید
            </h2>
            <ul className="mt-5 grid gap-4 text-[12px] leading-6 text-muted sm:grid-cols-2 lg:grid-cols-3">
              <li className="flex gap-2.5"><BadgeCheck className="size-4 shrink-0 text-brand-600" aria-hidden /> قیمت نهایی هدیهٔ شخصی همراه با بسته‌بندی و پیام، از سرور محاسبه می‌شود.</li>
              <li className="flex gap-2.5"><Building2 className="size-4 shrink-0 text-brand-600" aria-hidden /> سفارش سازمانی پس از بررسی کارشناسی و صدور پیش‌فاکتور نهایی می‌شود.</li>
              <li className="flex gap-2.5"><PackageCheck className="size-4 shrink-0 text-brand-600" aria-hidden /> گزینه‌های بسته‌بندی هر هدیه در صفحهٔ همان هدیه فهرست شده است.</li>
              <li className="flex gap-2.5"><PenLine className="size-4 shrink-0 text-brand-600" aria-hidden /> شخصی‌سازی (نام گیرنده و پیام) هنگام ثبت سفارش اعمال می‌شود.</li>
              <li className="flex gap-2.5"><ShieldAlert className="size-4 shrink-0 text-brand-600" aria-hidden /> زمان آماده‌سازی بر اساس نوع هدیه و تیراژ، هنگام ثبت هماهنگ می‌شود.</li>
              <li className="flex gap-2.5"><Truck className="size-4 shrink-0 text-brand-600" aria-hidden /> جزئیات پوشش و هزینهٔ ارسال در <Link href="/shipping" className="font-bold text-brand-700 underline underline-offset-4">صفحهٔ ارسال</Link> آمده است.</li>
            </ul>
          </div>
        </Reveal>
      </section>

      {/* ————— §35 پرسش‌های متداول ————— */}
      <section className="container-x pb-14 md:pb-20" aria-label="پرسش‌های متداول هدیه">
        <Reveal>
          <SectionHead eyebrow="پرسش‌های متداول" title="هر آنچه قبل از انتخاب هدیه بدانید" />
        </Reveal>
        <div className="mx-auto mt-8 max-w-3xl divide-y divide-line/70 rounded-2xl border border-line/70 bg-surface shadow-soft">
          {GIFT_FAQ.map((f) => (
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

      {/* ————— §36 CTA نهایی ————— */}
      <section className="container-x pb-20 md:pb-28" aria-label="شروع انتخاب هدیه">
        <Reveal>
          <div className="relative overflow-hidden rounded-[1.75rem] bg-brand-950 p-8 text-center shadow-lift md:p-12">
            <div aria-hidden className="pointer-events-none absolute -top-24 -end-24 size-72 rounded-full bg-gold-500/10 blur-3xl" />
            <h2 className="relative text-xl font-black leading-9 text-inverse md:text-2xl">هدیه‌ای انتخاب کنید که ارزش به یاد ماندن داشته باشد.</h2>
            <div className="relative mt-6 flex flex-wrap items-center justify-center gap-3">
              <LinkButton href="#finder" variant="primary" size="lg">انتخاب هدیه</LinkButton>
              <LinkButton href="/gifts/customize" variant="outline" size="lg">ساخت هدیه اختصاصی</LinkButton>
              <LinkButton href="/gifts/corporate/inquiry" variant="outline" size="lg">سفارش سازمانی</LinkButton>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
