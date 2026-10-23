import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import type { Category, Product } from "@/types";
import { Hero } from "@/components/home/Hero";
import { ProductCard } from "@/components/product/ProductCard";
import { Reveal, SectionHead, LinkButton, Price } from "@/components/ui/primitives";
import { faDigits, formatToman } from "@/lib/format";
import imageVariants from "@/data/image-variants.json";
import { NewsletterSection } from "@/components/home/NewsletterSection";
import { CarouselRow } from "@/components/ui/CarouselRow";
import { FlashOfferStrip } from "@/components/home/FlashOfferStrip";
import { FeaturedTabs } from "@/components/home/FeaturedTabs";
import { getTrays } from "@/services/catalog";
import { Building2, Mic2, ArrowLeft as ArrowLeftIcon, BadgeCheck, PackageCheck, Truck, Headset, Store, Grape } from "lucide-react";
import { SmartImage } from "@/components/ui/SmartImage";

/**
 * Homepage preserves the HELSA flagship language:
 * Hero → curated products → bestsellers → trust → Mazeh hospitality → selected categories → story → newsletter → final CTA
 * Business data comes from the catalog service, not hardcoded arrays.
 */
export async function HomepageLite({ products, categories }: { products: Product[]; categories: Category[] }) {
  const activeTrays = (await getTrays()).filter((t) => t.active);
  const golden = activeTrays.find((t) => t.slug === "golden");
  const minTrayPrice = activeTrays.length ? Math.min(...activeTrays.map((t) => t.basePrice)) : null;
  const selectedCategories = categories.slice(0, 4);
  // قهرمانان فرآوردهٔ خرما (فیچرهای اختصاصی CRO) — محصولات واقعی کاتالوگ
  const chocolate = products.find((p) => p.slug === "handmade-date-chocolate");
  const dateSugar = products.find((p) => p.slug === "date-sugar") ?? products.find((p) => p.slug === "helsa-date-sugar");
  // پرفروش‌ها = همان مرتب‌سازی «محبوب» فروشگاه (امتیاز × تعداد نظر) — دادهٔ واقعی؛
  // dedupe تصویری: محصولات متفاوت با عکس مشترک (مثل پیارم/مضافتی) فقط یک‌بار می‌آیند تا
  // ردیف پرفروش‌ها «تکراری» به نظر نرسد — جای خالی به بعدیِ رتبه می‌رسد.
  const bestsellers: Product[] = [];
  const seenImages = new Set<string>();
  for (const p of [...products].sort((a, b) => b.rating * b.reviews - a.rating * a.reviews)) {
    if (seenImages.has(p.image)) continue;
    seenImages.add(p.image);
    bestsellers.push(p);
    if (bestsellers.length >= 6) break;
  }
  // Trust bar: every number comes from the live catalog (approved reviews only).
  // With zero reviews the rating/count tiles are hidden — no fabricated social proof.
  const totalReviews = products.reduce((s, p) => s + (p.reviews || 0), 0);
  const avgRating = totalReviews > 0
    ? products.reduce((s, p) => s + (p.rating || 0) * (p.reviews || 0), 0) / totalReviews
    : 0;

  // پیش‌بارگذاری تصاویر پرفروش‌ها (480w AVIF ~۱۰KB) — سکشن درست زیر تایید نمایش است؛
  // lazy باعث می‌شد دانلود فقط هنگام اسکرول شروع شود و کاربر «کندی» ببیند. الان روی اسکرول = فوری.
  const variants = imageVariants as Record<string, { avif: number[] }>;
  const preloads = bestsellers
    .map((p) => {
      const m = p.image.match(/^\/images\/(?:opt\/)?(.+)\.jpg$/);
      return m && variants[m[1]]?.avif?.includes(480) ? `/images/opt/${m[1]}-480.avif` : null;
    })
    .filter((x): x is string => Boolean(x));

  return (
    <>
      {/* preload پرفروش‌ها — کم‌اولویت تا با LCP هیرو رقابت نکند */}
      {preloads.map((href) => (
        <link key={href} rel="preload" as="image" href={href} fetchPriority="low" />
      ))}
      <Hero products={products} />

      {/* محصولات ویژه (CRO §7) — تب‌های واقعی: پرفروش/پیشنهاد هلسا/تخفیف‌دار */}
      <FeaturedTabs products={products} />

      {/* نوار پیشنهاد ویژه (CRO) — تخفیف‌های واقعی + شمارش معکوس کمپین فعال */}
      <FlashOfferStrip products={products} />

      {/* خرید بر اساس حال‌وهوا (CRO) — ورودی‌های مناسبت‌محور به مقصدهای واقعی */}
      <section className="container-x py-14 md:py-18" aria-label="خرید بر اساس مناسبت">
        {/* §بریف مناسبت: محتوای ۱۰۰٪ استاتیک — بدون Reveal تا پیش از هیدراسیون هم فوراً دیده شود
            (ریشهٔ کندی قبلی: initial opacity:0 فریم‌موشن کارت‌ها را تا بعد از لود JS مخفی می‌کرد) */}
        <SectionHead eyebrow="انتخاب هوشمند" title="امروز برای چه مناسبتی خرید می‌کنید؟" desc="مناسبت خود را انتخاب کنید؛ هلسا مسیر خرید را برایتان آماده کرده است." />
        <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6 md:gap-4">
          {[
            { icon: "🍽️", label: "پذیرایی مهمان", href: "/mehmani" },
            { icon: "🎁", label: "هدیه لوکس", href: "/gifts" },
            { icon: "☕", label: "عصرانه سالم", href: "/products?cat=natural" },
            { icon: "👨‍👩‍👧", label: "دورهمی خانوادگی", href: "/products?cat=nuts" },
            { icon: "🏢", label: "جلسه کاری", href: "/wholesale" },
            { icon: "🌙", label: "شب یلدا", href: "/campaigns" },
          ].map((m) => (
            <li key={m.href}>
              <Link href={m.href} className="group flex h-full flex-col items-center gap-2.5 rounded-2xl border border-line/70 bg-surface p-5 text-center shadow-soft transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift">
                <span className="text-3xl transition-transform duration-300 group-hover:scale-110" aria-hidden>{m.icon}</span>
                <span className="text-[12px] font-black text-heading group-hover:text-brand-700">{m.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* نوار اعتماد مشتریان (CRO) — فقط آمار واقعی کاتالوگ، بدون نظر ساختگی */}
      <section className="bg-surface2/70 border-y border-line/60 py-12 md:py-14" aria-label="اعتماد مشتریان هلسا">
        <div className="container-x">
          <Reveal>
            <ul className={`grid grid-cols-1 gap-6 text-center sm:grid-cols-2 ${totalReviews > 0 ? "lg:grid-cols-4" : ""}`}>
              {[
                ...(totalReviews > 0
                  ? [
                      { v: `${faDigits(avgRating.toFixed(1))} از ۵`, l: `میانگین امتیاز از ${faDigits(totalReviews)} نظر تأییدشده` },
                      { v: faDigits(totalReviews), l: "نظر تأییدشدهٔ مشتریان" },
                    ]
                  : []),
                { v: `${faDigits(products.length)}+`, l: "محصول طبیعی با ضمانت اصالت و تازگی" },
                { v: faDigits(categories.length), l: "دسته‌بندی محصولات هلسا" },
              ].map((t, i, arr) => (
                <li key={t.l} className={i > 0 && i < arr.length - 1 ? "sm:border-x sm:border-line/60" : ""}>
                  <p className="text-3xl font-black text-heading">{t.v.includes("از ۵") ? <>{t.v.replace(" از ۵", "")} <span className="text-lg text-gold-700">از ۵</span></> : t.v}</p>
                  <p className="mt-1.5 text-xs font-bold text-muted">{t.l}</p>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <section className="bg-surface2/70 border-y border-line/60 py-16 md:py-24" aria-label="مهمانی و مزه هلسا">
        <div className="container-x grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <Reveal>
            <div className="rounded-2xl overflow-hidden border border-line/70 img-zoom">
              <SmartImage
                src="/images/opt/hero-mazeh-tray.jpg"
                alt="سینی پذیرایی هلسا با شکلات خرما، مغز گردو، کشمش سبز و انجیر خشک روی سینی چوبی"
                sizes="(min-width:1024px) 50vw, 100vw"
                className="w-full aspect-[4/3] object-cover"
              />
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <span className="text-[11px] font-bold tracking-[0.2em] text-gold-700">مهمانی و مزه هلسا</span>
            <h2 className="mt-4 text-2xl md:text-[38px] font-black leading-[1.5] text-heading">
              یک سینی،
              <br />
              دنیایی از مزه‌ها
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <p className="inline-flex items-center gap-1.5 rounded-full border border-gold-300/70 bg-gold-50 px-3.5 py-1.5 text-[11px] font-bold text-gold-700">
                از ۲ تا ۲۰ نفر — مناسب هدیه و مراسم
              </p>
              {golden && (
                <p className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-[11px] font-bold text-brand-700">
                  سینی طلایی هلسا: {formatToman(golden.basePrice)}
                </p>
              )}
              {minTrayPrice && (
                <p className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface2 px-3.5 py-1.5 text-[11px] font-bold text-muted">
                  سینی‌های آماده از {formatToman(minTrayPrice)}
                </p>
              )}
            </div>
            {golden && golden.shortDescription && (
              <p className="mt-3 text-[12px] leading-6 text-muted">{golden.shortDescription}</p>
            )}
            <p className="mt-5 text-sm md:text-[15px] leading-8 text-muted max-w-md">
              از ترکیب‌های دست‌چین مزه تا سینی‌های پذیرایی واقعی؛ هلسا کمک می‌کند میز مهمانی شما ساده‌تر، زیباتر و به‌یادماندنی‌تر چیده شود.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/mazeh-trays" variant="primary" size="lg">
                مشاهده سینی‌های آماده
                <ArrowLeft className="size-4" aria-hidden />
              </LinkButton>
              <LinkButton href="/mazeh-trays/build" variant="outline" size="lg">
                سینی خودت را بساز
              </LinkButton>
            </div>
          </Reveal>
        </div>
      </section>

      {/* فیچرهای اختصاصی فرآوردهٔ خرما (CRO) — دو محصول واقعی، دو مسیر خرید */}
      {chocolate && dateSugar && (
      <section className="container-x py-14 md:py-18" aria-label="فرآورده‌های ویژه خرما هلسا">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          <Reveal>
            <article className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-line/70 bg-surface shadow-soft transition-shadow hover:shadow-lift">
              <div className="relative aspect-[16/10] overflow-hidden img-zoom">
                { }
                <SmartImage src={chocolate.image} alt={chocolate.imageAlt || chocolate.name} sizes="(min-width:1024px) 50vw, 100vw" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                {chocolate.discount > 0 && <span className="absolute top-4 start-4 rounded-full bg-accent-600 text-inverse px-3 py-1 text-[11px] font-black">{faDigits(chocolate.discount)}٪ تخفیف</span>}
              </div>
              <div className="flex flex-1 flex-col p-6 md:p-7">
                <span className="text-[11px] font-bold tracking-[0.18em] text-gold-700">امضای کارگاه هلسا</span>
                <h3 className="mt-2.5 text-xl font-black leading-8 text-heading">شکلاتی که با خرما شروع می‌شود</h3>
                <p className="mt-2.5 text-[13px] leading-7 text-muted">{chocolate.shortDescription || chocolate.description.slice(0, 120)}</p>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-6">
                  <Price price={chocolate.price} oldPrice={chocolate.oldPrice} size="lg" />
                  <LinkButton href={`/products/${chocolate.slug}`} variant="primary">سفارش شکلات خرما</LinkButton>
                </div>
              </div>
            </article>
          </Reveal>
          <Reveal delay={0.08}>
            <article className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-line/70 bg-surface2/60 shadow-soft transition-shadow hover:shadow-lift">
              <div className="relative aspect-[16/10] overflow-hidden img-zoom">
                { }
                <SmartImage src={dateSugar.image} alt={dateSugar.imageAlt || dateSugar.name} sizes="(min-width:1024px) 50vw, 100vw" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
              </div>
              <div className="flex flex-1 flex-col p-6 md:p-7">
                <span className="text-[11px] font-bold tracking-[0.18em] text-brand-600">شیرینی طبیعی</span>
                <h3 className="mt-2.5 text-xl font-black leading-8 text-heading">شیرینی طبیعی، بدون شکر سفید</h3>
                <p className="mt-2.5 text-[13px] leading-7 text-muted">قند خرما؛ جایگزین طبیعی شکر برای چای، دسر و پخت‌وپز — با مزهٔ کاراملی ملایم و مواد مؤثر خرما.</p>
                <p className="mt-2 text-[12px] leading-6 text-brand-700">ایدهٔ دسر: در شله‌زرد و حلوا جایگزین شکر کنید — رنگ غنی‌تر و شیرینی طبیعی‌تر.</p>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-6">
                  <Price price={dateSugar.price} size="lg" />
                  <LinkButton href={`/products/${dateSugar.slug}`} variant="outline">مشاهده قند خرما</LinkButton>
                </div>
              </div>
            </article>
          </Reveal>
        </div>
      </section>
      )}

      {/* چرا هلسا (CRO) — چهار ارزش، متن کوتاه */}
      <section className="container-x py-14 md:py-16" aria-label="چرا هلسا">
        <SectionHead eyebrow="وعدهٔ هلسا" title="چرا هلسا؟" />
        <ul className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
          {[
            { icon: "BadgeCheck", title: "کیفیت انتخاب‌شده", desc: "هر محصول از منبع معتبر، دست‌چین و کنترل‌شده." },
            { icon: "Grape", title: "تنوع محصولات", desc: "از خرما و آجیل تا سینی مزه و هدایای سازمانی." },
            { icon: "Store", title: "مناسب خرید عمده", desc: "قیمت پلکانی و شرایط ویژه برای کافه‌ها، رستوران‌ها و فروشگاه‌ها." },
            { icon: "PackageCheck", title: "بسته‌بندی حرفه‌ای", desc: "بسته‌بندی پرمیوم و شکیل، آمادهٔ هدیه." },
            { icon: "Truck", title: "ارسال سریع", desc: "ارسال به سراسر کشور با بسته‌بندی ایمن." },
            { icon: "Headset", title: "پشتیبانی واقعی", desc: "پاسخ‌گویی واقعی، قبل و بعد از خرید." },
          ].map((c) => (
            <li key={c.icon}>
              <div className="flex h-full flex-col items-center gap-3 rounded-2xl border border-line/70 bg-surface p-6 text-center shadow-soft transition-shadow hover:shadow-lift">
                  {c.icon === "BadgeCheck" && <BadgeCheck className="size-7 text-brand-600" aria-hidden />}
                  {c.icon === "Grape" && <Grape className="size-7 text-brand-600" aria-hidden />}
                  {c.icon === "Store" && <Store className="size-7 text-gold-700" aria-hidden />}
                  {c.icon === "PackageCheck" && <PackageCheck className="size-7 text-gold-700" aria-hidden />}
                  {c.icon === "Truck" && <Truck className="size-7 text-brand-600" aria-hidden />}
                  {c.icon === "Headset" && <Headset className="size-7 text-gold-700" aria-hidden />}
                  <h3 className="text-[13.5px] font-black text-heading">{c.title}</h3>
                  <p className="text-[11.5px] leading-6 text-muted">{c.desc}</p>
                </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="container-x py-16 md:py-24" aria-label="دسته‌بندی محصولات">
        <Reveal>
          <SectionHead eyebrow="ویترین هلسا" title="دسته‌بندی‌های منتخب" />
        </Reveal>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-8">
          {selectedCategories.map((c, i) => (
            <Reveal key={c.slug} delay={i * 0.06}>
              <Link href={`/products?cat=${c.slug}`} className="group block">
                <span className="block rounded-2xl overflow-hidden aspect-[4/5] bg-surface2 border border-line/60">
                  <SmartImage src={c.image} alt={c.imageAlt || `${c.name} هلسا`} sizes="(min-width:768px) 22vw, 45vw" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                </span>
                <span className="mt-3 block text-[15px] font-black text-heading group-hover:text-brand-600 transition-colors">{c.name}</span>
                <span className="mt-1 block text-xs leading-6 text-muted line-clamp-2-fa">{c.shortDescription || c.description}</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="bg-surface2/70 border-y border-line/60 py-16 md:py-24" aria-label="داستان هلسا">
        <div className="container-x grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <Reveal>
            <div className="rounded-2xl overflow-hidden border border-line/70 img-zoom">
              { }
              <SmartImage src="/images/opt/hero-piarom.jpg" alt="خرمای پیارم هلسا روی بشقاب سنگی — عکس واقعی محصول" sizes="(min-width:1024px) 50vw, 100vw" className="w-full aspect-[4/3] object-cover" />
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <span className="text-[11px] font-bold tracking-[0.2em] text-gold-700">داستان هلسا</span>
            <h2 className="mt-4 text-2xl md:text-[36px] font-black leading-[1.5] text-heading">
              طعم طبیعت ایران،
              <br />
              با نگاهی امروزی
            </h2>
            <p className="mt-5 text-sm md:text-[15px] leading-8 text-muted max-w-md">
              هلسا ایرانیان با انتخاب دقیق مواد اولیه، بسته‌بندی شکیل و نگاه مدرن به پذیرایی ایرانی، محصولات طبیعی را به شکلی آبرومند به سفره شما می‌رساند.
            </p>
            <div className="mt-7">
              <LinkButton href="/about" variant="outline">آشنایی با هلسا</LinkButton>
            </div>
          </Reveal>
        </div>
      </section>

      {/* بنر B2B (CRO) — پذیرایی سازمانی */}
      <section className="container-x pb-4" aria-label="پذیرایی سازمانی هلسا">
        <Reveal>
          <div className="relative overflow-hidden rounded-[1.75rem] bg-brand-950 p-7 shadow-lift md:p-10">
            <div aria-hidden className="pointer-events-none absolute -top-24 -end-24 size-72 rounded-full bg-gold-500/10 blur-3xl" />
            <div className="relative flex flex-wrap items-center justify-between gap-6">
              <div className="max-w-xl">
                <p className="inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-500/10 px-3.5 py-1.5 text-[11px] font-bold text-gold-300">
                  <Building2 className="size-3.5" aria-hidden /> هلسا برای کسب‌وکارها
                </p>
                <h2 className="mt-4 text-xl font-black leading-9 text-inverse md:text-2xl">پذیرایی حرفه‌ای برای شرکت‌ها و مراسم</h2>
                <p className="mt-2.5 text-[12.5px] leading-7 text-inverse/70">جلسات، رویدادها و هدایای سازمانی — با قیمت‌گذاری پلکانی و پیش‌فاکتور رسمی.</p>
              </div>
              <LinkButton href="/gifts/corporate/inquiry" variant="primary" size="lg">دریافت پیش‌فاکتور سازمانی</LinkButton>
            </div>
          </div>
        </Reveal>
      </section>



      <NewsletterSection />

      <section className="container-x py-16 md:py-20 text-center" aria-label="شروع خرید از هلسا">
        <Reveal>
          <Sparkles className="size-5 mx-auto text-gold-700" aria-hidden />
          <h2 className="mt-4 text-2xl md:text-[34px] font-black leading-[1.5] text-heading">انتخاب خود را از هلسا آغاز کنید</h2>
          <div className="mt-8 flex justify-center gap-3">
            <LinkButton href="/products" variant="primary" size="lg">مشاهده محصولات</LinkButton>
            <LinkButton href="/experience" variant="outline" size="lg">مهمانی و مزه هلسا</LinkButton>
          </div>
        </Reveal>
      </section>
    </>
  );
}
