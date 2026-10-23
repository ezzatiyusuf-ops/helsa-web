import type { Metadata } from "next";
import { defaultOpenGraph } from "@/lib/metadata";
import type { Product } from "@/types";
import Link from "next/link";
import { getProducts, getCategories } from "@/services/catalog";
import { ArrowLeft, Building2, Coffee, Gift, UtensilsCrossed, Percent, Hammer, Headset, Truck, ShieldCheck, BadgeCheck, Store } from "lucide-react";
import { faDigits, normalizeFa } from "@/lib/format";
import { ProductsExplorer } from "@/components/product/ProductsExplorer";
import { FirstPurchaseBanner } from "@/components/product/FirstPurchaseBanner";
import { JsonLd } from "@/components/seo/JsonLd";
import { collectionPageSchema, breadcrumbSchema } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ cat?: string; q?: string }> }): Promise<Metadata> {
  const { cat } = await searchParams;
  if (cat) {
    const categories = await getCategories();
    const active = categories.find((c) => c.slug === cat);
    if (active) {
      const title = active.seoTitle?.trim() || `خرید ${active.name} | قیمت و انواع`;
      const description = active.seoDescription?.trim() || (active.shortDescription || active.description).slice(0, 158);
      return {
        title,
        description,
        alternates: { canonical: "/products" },
        openGraph: { ...defaultOpenGraph, title, description, url: "/products", type: "website", locale: "fa_IR", images: [{ url: active.image, width: 1200, height: 630, alt: active.imageAlt || active.name }] },
        twitter: { card: "summary_large_image", title, description },
      };
    }
  }
  return {
    title: "خرید محصولات هلسا | خرما، آجیل، خشکبار و محصولات طبیعی",
    description: "خرید آنلاین خرما، آجیل، خشکبار، شکلات خرما، عسل، زعفران و محصولات طبیعی هلسا با قیمت روز؛ جستجو و فیلتر هوشمند، ارسال سریع به سراسر ایران.",
    alternates: { canonical: "/products" },
    openGraph: {
      title: "محصولات هلسا مارکت",
      description: "خرما، آجیل، خشکبار و محصولات طبیعی هلسا با جستجو، فیلتر و مرتب‌سازی سریع.",
      url: "/products",
      type: "website",
      locale: "fa_IR",
    },
    twitter: { card: "summary_large_image", title: "محصولات هلسا مارکت", description: "خرما، آجیل، خشکبار و محصولات طبیعی هلسا با جستجو و فیلتر سریع." },
  };
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ cat?: string; q?: string }> }) {
  const { cat = "", q = "" } = await searchParams;
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  const active = cat ? categories.find((c) => c.slug === cat) : undefined;
  // پیشنهادهای امروز (CRO): اولویت پرامپت با اسلاگ‌های واقعی کاتالوگ + سینی طلایی
  const pick = (slug: string) => products.find((p) => p.slug === slug);
  // «پیشنهاد امروز» — به‌جای کاروسل جدا، بج روی همان کارت در گرید
  const todaySlugs = ["date-sugar", "handmade-date-chocolate", "piaram-dates"].filter((slug) => pick(slug));
  // پیشنهاد حالت خالی: ۴ محصول برتر بر اساس امتیاز×نظرِ واقعی
  // تا وقتی نظر واقعی ثبت نشده، امتیاز همه صفر است؛ ترتیب با انتخاب تحریریه و تازگی قطعی می‌شود.
  const suggestions = [...products]
    .sort((a, b) => (b.rating * b.reviews - a.rating * a.reviews) || (Number(b.isFeatured ?? false) - Number(a.isFeatured ?? false)) || (+new Date(b.createdAt) - +new Date(a.createdAt)))
    .slice(0, 4);

  // شمارش هم‌ارز با گرید کلاینت (بریف 4.5): جستجو/فیلتر URL باید همان عدد گرید را نشان دهد
  const matchesQuery = q
    ? products.filter((p) => normalizeFa([p.name, p.description, p.sku, ...p.tags].join(" ")).includes(normalizeFa(q))).length
    : 0;
  const count = q ? matchesQuery : active ? products.filter((p) => p.category === active.slug).length : products.length;

  const SERVICE_CHIPS = [
    { icon: Hammer, label: "ساخت سینی اختصاصی", href: "/mazeh-trays/build" },
    { icon: Gift, label: "هدایای سازمانی", href: "/gifts/corporate" },
    { icon: Building2, label: "پرتال عمده B2B", href: "/wholesale" },
  ] as const;

  const TRUST = [
    { icon: Truck, label: "ارسال سریع" },
    { icon: ShieldCheck, label: "پرداخت امن" },
    { icon: BadgeCheck, label: "تضمین کیفیت" },
    { icon: Headset, label: "پشتیبانی خرید" },
  ] as const;

  return (
    <>
      <JsonLd
        data={collectionPageSchema({
          name: active ? active.name : "محصولات هلسا",
          description: active ? active.shortDescription || active.description : "خرما، آجیل، خشکبار و محصولات طبیعی هلسا",
          path: "/products",
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "خانه", path: "/" },
          { name: "محصولات هلسا", path: "/products" },
          ...(active ? [{ name: active.name, path: `/products?cat=${active.slug}` }] : []),
        ])}
      />

      {/* سربرگ لاغر: بردکرامب یک‌خطی + یک H1 با شمار محصولات (شاخهٔ زیتون ظریف) */}
      <header className="container-x pt-5">
        <nav aria-label="مسیر صفحه" className="flex items-center gap-1.5 text-[11px] font-bold text-muted">
          <Link href="/" className="transition-colors hover:text-brand-700">خانه</Link>
          <span aria-hidden>/</span>
          <Link href="/products" className="transition-colors hover:text-brand-700">محصولات هلسا</Link>
          {active && (
            <>
              <span aria-hidden>/</span>
              <span className="text-heading">{active.name}</span>
            </>
          )}
        </nav>
        <div className="relative mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <svg className="pointer-events-none absolute -top-4 end-0 hidden h-16 w-28 text-gold-500/15 sm:block" viewBox="0 0 112 64" fill="none" aria-hidden>
            <path d="M104 8C88 14 62 30 48 56" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <ellipse cx="86" cy="18" rx="7" ry="3" transform="rotate(-32 86 18)" fill="currentColor" />
            <ellipse cx="70" cy="30" rx="7" ry="3" transform="rotate(-38 70 30)" fill="currentColor" />
            <ellipse cx="57" cy="43" rx="7" ry="3" transform="rotate(-44 57 43)" fill="currentColor" />
          </svg>
          <h1 className="text-xl font-black text-heading md:text-2xl">{active ? active.name : "محصولات هلسا"}</h1>
          <p className="text-[12px] font-bold text-muted">{faDigits(count)} محصول</p>
        </div>
      </header>

      <div className="container-x pb-16">
        {!active && (
          <>
            {/* نوار پروموی لاغر — هدیهٔ واقعی اولین خرید (کوپن از بک‌اند صادر می‌شود) */}
            <FirstPurchaseBanner />

            {/* چیپ‌های خدمات — قرص‌های افقی (به‌جای کارت‌های تبلیغاتی بزرگ) */}
            <nav aria-label="خدمات ویژهٔ هلسا" className="mt-5">
              <ul className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-0.5">
                {SERVICE_CHIPS.map((chip) => (
                  <li key={chip.href}>
                    <Link
                      href={chip.href}
                      className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-line/80 bg-surface px-4 text-[12px] font-bold text-body shadow-soft transition-colors duration-200 hover:border-brand-400 hover:text-brand-700"
                    >
                      <chip.icon className="size-4 text-brand-600" aria-hidden />
                      {chip.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* نوار اعتماد — یک ردیف مینیمال با آیکون‌های خطی تک‌رنگ */}
            <ul className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-line/60 py-3" aria-label="تضمین‌های هلسا">
              {TRUST.map((item) => (
                <li key={item.label} className="flex items-center gap-2 text-[11.5px] font-bold text-muted">
                  <item.icon className="size-4 text-brand-700" aria-hidden strokeWidth={1.75} />
                  {item.label}
                </li>
              ))}
            </ul>
          </>
        )}

        <ProductsExplorer
          products={products}
          categories={categories}
          initialCat={cat}
          initialQ={q}
          suggestions={suggestions}
          todaySlugs={todaySlugs}
        />


        {/* ── سفارش عمده و همکاری تجاری (فاز UX/CRO) ── */}
        <section className="mt-14" aria-label="سفارش عمده و همکاری تجاری">
          <div className="overflow-hidden rounded-[1.75rem] border border-line/70 bg-gradient-to-l from-brand-950 via-brand-900 to-brand-800 shadow-lift">
            <div className="grid gap-8 p-7 md:p-10 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-6">
                <p className="inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-500/10 px-3.5 py-1.5 text-[11px] font-bold text-gold-400">
                  <Percent className="size-3.5" aria-hidden /> قیمت‌گذاری پلکانی برای کسب‌وکارها
                </p>
                <h2 className="mt-4 text-2xl font-black leading-[1.5] text-white md:text-[27px]">
                  خرید عمده هلسا؛
                  <br />
                  <span className="text-gold-300">برای رستوران، کافه و بازار</span>
                </h2>
                <p className="mt-4 max-w-lg text-[13px] leading-8 text-white/70">
                  تیراژ بالا، اسناد رسمی، تحویل منظم و قیمت اختصاصی؛ از خرمای پذیرایی رستوران تا آجیل و
                  خشکبار قفسهٔ سوپرمارکت — با پشتیبانی یک کارشناس اختصاصی از استعلام تا تحویل.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/wholesale"
                    className="inline-flex h-12 items-center gap-2 rounded-full bg-gold-500 px-7 text-[13px] font-black text-brand-950 transition-colors hover:bg-gold-400"
                  >
                    قیمت همکاری دریافت کنید <ArrowLeft className="size-4" aria-hidden />
                  </Link>
                  <Link
                    href="/wholesale/register"
                    className="inline-flex h-12 items-center rounded-full border border-white/25 px-7 text-[13px] font-bold text-white transition-colors hover:bg-white/10"
                  >
                    ثبت سفارش عمده
                  </Link>
                </div>
              </div>
              <div className="lg:col-span-6">
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                  {[
                    { icon: UtensilsCrossed, label: "رستوران", desc: "پذیرایی و میوهٔ خشک" },
                    { icon: Coffee, label: "کافه", desc: "خرما و شکلات دست‌ساز" },
                    { icon: Store, label: "سوپرمارکت", desc: "قفسه‌چینی و تیراژ" },
                    { icon: Building2, label: "سازمانی", desc: "هدیه و مناسبت" },
                  ].map((a) => (
                    <li key={a.label}>
                      <Link
                        href="/wholesale/register"
                        className="group flex h-full flex-col gap-2 rounded-2xl border border-white/12 bg-white/[0.06] p-4 backdrop-blur-sm transition-colors hover:border-gold-400/40 hover:bg-white/[0.1]"
                      >
                        <a.icon className="size-5 text-gold-300" aria-hidden />
                        <span className="text-[12.5px] font-black text-white">{a.label}</span>
                        <span className="text-[10.5px] leading-4 text-white/55">{a.desc}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* خدمات ویژهٔ هلسا — لینک‌های آرام قبل از فوتر */}
        <section className="mt-10" aria-label="خدمات ویژه هلسا">
          <h2 className="text-[15px] font-black text-heading">خدمات ویژهٔ هلسا</h2>
          <ul className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { icon: Hammer, title: "سینی اختصاصی شما", desc: "چیدمان دلخواهتان را بسازید", href: "/mazeh-trays/build" },
              { icon: Gift, title: "بسته‌بندی هدیه", desc: "جعبه‌ای که آدم را می‌خواهد بوبوید؟ نه — که یادش می‌ماند", href: "/gifts" },
              { icon: BadgeCheck, title: "ضمانت تازگی", desc: "تا ۷ روز، با بسته‌بندی پلمپ — طبق شرایط مرجوعی", href: "/refund" },
              { icon: Headset, title: "مشاورهٔ خرید", desc: "کارشناسان پذیرایی پاسخ‌گویند", href: "/contact" },
            ].map((srv) => (
              <li key={srv.href}>
                <Link href={srv.href} className="group flex h-full flex-col gap-2 rounded-[18px] border border-line/70 bg-surface p-4 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200">
                  <srv.icon className="size-5 text-brand-700" aria-hidden strokeWidth={1.75} />
                  <span className="text-[12.5px] font-black text-heading">{srv.title}</span>
                  <span className="text-[10.5px] leading-4 text-muted">{srv.desc}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
