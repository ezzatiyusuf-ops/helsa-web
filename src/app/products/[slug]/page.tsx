import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getCategories, getProducts, getProductBySlug, wasCatalogDbHealthy } from "@/services/catalog";
import { BLOG_POSTS } from "@/data/content";
import { ProductDetailClient, type FaqItem } from "@/components/product/ProductDetailClient";
import { isOrganic, deliveryEstimate } from "@/lib/product-flags";
import { firstActiveVariant } from "@/lib/variants";
import { formatToman } from "@/lib/format";
import { JsonLd } from "@/components/seo/JsonLd";
import { productSchema, breadcrumbSchema, faqSchema } from "@/lib/seo";

/**
 * ISR — کش کامل مسیر با اعتبار ۶۰ ثانیه:
 *  • همهٔ محصولات فعال هنگام build پیش‌رندر می‌شوند (generateStaticParams) — تعداد از دیتابیس می‌آید.
 *  • محصولِ تازه (مثلاً ساخته‌شده در پنل ادمین) در اولین بازدید رندر و کش می‌شود — بدون نیاز به rebuild.
 *  • existence-check حفظ شده: بعد از پنجرهٔ revalidate، اگر محصول در DB نباشد notFound() → 404 واقعی.
 */
export const revalidate = 60;
export const dynamicParams = true; // اسلاگ‌های خارج از build: رندر در لحظه (اگر در DB باشد) یا 404 واقعی

export async function generateStaticParams() {
  const products = await getProducts();
  // اگر DB در بیلد در دسترس نبود (fallback به seed)، پیش‌رندر نمی‌کنیم:
  // صفحات در لحظه و با دادهٔ واقعی رندر می‌شوند (dynamicParams=true) و هیچ
  // نسخهٔ کهنه/seed‌ای در خروجی استاتیک بیک نمی‌شود.
  if (!wasCatalogDbHealthy()) return [];
  return products.filter((p) => p.isActive).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const title = product.seoTitle?.trim() || `خرید ${product.name} | قیمت و مشخصات`;
  // F-02/F-03: منبع واحد قیمت/وزنِ نمایش = واریانت پیش‌فرضِ فعال (همان چیزی که صفحه نشان می‌دهد)
  const metaVariant = firstActiveVariant(product);
  const description =
    product.seoDescription?.trim() ||
    `${product.name} ${metaVariant?.name ?? product.weight} اصل هلسا با قیمت ${formatToman(metaVariant?.price ?? product.price)}؛ ${product.shortDescription ?? product.description.slice(0, 90)} ارسال سریع به سراسر ایران.`.slice(0, 158);
  return {
    title,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title,
      description,
      url: `/products/${product.slug}`,
      siteName: "هلسا مارکت",
      locale: "fa_IR",
      type: "website",
      images: [{ url: product.image, width: 1200, height: 630, alt: product.imageAlt || product.name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [product.image],
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [product, all, categories] = await Promise.all([getProductBySlug(slug), getProducts(), getCategories()]);
  if (!product) notFound();

  const related = all.filter((p) => p.category === product.category && p.id !== product.id);
  const cat = categories.find((c) => c.slug === product.category);

  // GEO: concise, honest FAQ derived from real product data (mirrored as FAQPage schema)
  const delivery = deliveryEstimate();
  // F-02/F-03: واریانت پیش‌فرضِ فعال — قیمت/وزنِ نمایش‌داده‌شده در صفحه (انتخاب اولیهٔ کاربر)
  const baseVariant = firstActiveVariant(product);
  const displayPrice = baseVariant?.price ?? product.price;
  const displayWeight = baseVariant?.name ?? product.weight;
  const organic = isOrganic(product);
  const faq: FaqItem[] = [
    {
      q: `قیمت ${product.name} چقدر است؟`,
      a: `قیمت ${product.name} ${displayWeight} در هلسا ${formatToman(displayPrice)} است و به‌صورت روزانه بر اساس بازار به‌روزرسانی می‌شود.${(product.variants?.length ?? 0) > 1 ? ` بسته‌های دیگر: ${product.variants!.filter((v) => v.isActive !== false).map((v) => `${v.name} ${formatToman(v.price)}`).join(" · ")}.` : ""}`,
    },
    {
      q: `ارسال ${product.name} چقدر طول می‌کشد؟`,
      a: `ارسال به تهران ${delivery.tehran} و به سایر شهرهای ایران ${delivery.cities} انجام می‌شود؛ بسته‌بندی حفظ تازگی برای همه سفارش‌ها رعایت می‌شود.`,
    },
    ...(product.storage
      ? [{ q: `${product.name} را چگونه نگهداری کنیم؟`, a: product.storage }]
      : []),
    ...(organic
      ? [{ q: `${product.name} طبیعی و بدون افزودنی است؟`, a: `بله؛ ${product.name} ${product.ingredients ? `با ${product.ingredients} و ` : ""}بدون افزودنی غیرضروری تولید می‌شود و از کنترل کیفی چندمرحله‌ای هلسا می‌گذرد.` }]
      : []),
    {
      q: `خرید عمده ${product.name} امکان‌پذیر است؟`,
      a: `بله؛ کسب‌وکارها می‌توانند از پرتال عمده هلسا با تخفیف همکاری، فاکتور رسمی و سفارش تکراری این محصول را تهیه کنند (حداقل جمع سفارش ۵٬۰۰۰٬۰۰۰ تومان).`,
    },
  ];

  // internal linking: related magazine articles by topical keyword
  const TOPIC: Record<string, string[]> = {
    dates: ["خرما"], "date-products": ["خرما"], "date-chocolate": ["خرما", "شکلات"], "date-bars": ["خرما"],
    "date-sugar": ["خرما"], nuts: ["آجیل"], "nuts-dried-fruits": ["آجیل", "خشکبار"], "dried-fruits": ["خشکبار"],
    honey: ["عسل", "تغذیه"], natural: ["تغذیه", "طبیعی"], seeds: ["آجیل", "میان‌وعده"], saffron: ["زعفران"],
  };
  const topicWords = TOPIC[product.category] ?? [];
  const relatedArticles = BLOG_POSTS.filter((b) =>
    topicWords.some((w) => b.title.includes(w) || b.category.includes(w) || b.tags?.some((tg) => tg.includes(w))),
  ).slice(0, 3);

  const jsonLd = productSchema({
    name: product.name,
    slug: product.slug,
    description: product.description,
    image: product.image,
    sku: product.sku,
    price: displayPrice,
    stock: Math.min(product.stock, baseVariant?.stock ?? product.stock),
    weight: displayWeight,
    rating: product.rating,
    reviews: product.reviews,
  });
  const breadcrumbLd = breadcrumbSchema([
    { name: "خانه", path: "/" },
    { name: "محصولات", path: "/products" },
    { name: cat?.name ?? "محصولات", path: `/products?cat=${product.category}` },
    { name: product.name, path: `/products/${product.slug}` },
  ]);

  return (
    <>
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={faqSchema(faq)} />
      <div className="container-x pt-6">
        <nav aria-label="مسیر صفحه" className="text-[11px] text-muted">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li className="flex items-center gap-1.5"><Link href="/" className="transition-colors hover:text-brand-700">خانه</Link><ChevronLeft className="size-3 opacity-50" aria-hidden /></li>
            <li className="flex items-center gap-1.5"><Link href="/products" className="transition-colors hover:text-brand-700">محصولات</Link><ChevronLeft className="size-3 opacity-50" aria-hidden /></li>
            {cat && <li className="flex items-center gap-1.5"><Link href={`/products?cat=${product.category}`} className="transition-colors hover:text-brand-700">{cat.name}</Link><ChevronLeft className="size-3 opacity-50" aria-hidden /></li>}
            <li className="font-bold text-heading">{product.name}</li>
          </ol>
        </nav>
        <p className="sr-only">قیمت: {formatToman(product.price)}</p>
      </div>
      <ProductDetailClient product={product} related={related} categoryName={cat?.name} faq={faq} />

      {relatedArticles.length > 0 && (
        <section className="container-x pb-16" aria-label="مقالات مرتبط هلسا">
          <h2 className="mb-5 text-lg font-black text-heading">از مجله هلسا</h2>
          <ul className="grid gap-4 md:grid-cols-3">
            {relatedArticles.map((b) => (
              <li key={b.slug}>
                <Link href={`/blog/${b.slug}`} className="group flex gap-4 rounded-2xl border border-line/70 bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-soft">
                  <span className="size-16 shrink-0 overflow-hidden rounded-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={b.image} alt={`تصویر ${b.title}`} loading="lazy" className="size-full object-cover" />
                  </span>
                  <span>
                    <span className="block text-[12.5px] font-bold leading-6 text-heading group-hover:text-brand-700">{b.title}</span>
                    <span className="mt-1 block text-[10.5px] text-muted">{b.category} · {b.readMinutes} دقیقه مطالعه</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
