import { SITE } from "@/config/site";

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? SITE.url;

/** Organization entity — used site-wide (AI discovery + Google knowledge panel) */
export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name: SITE.brandName,
    alternateName: [SITE.brandNameEn, SITE.storeName],
    legalName: SITE.businessName,
    url: siteUrl,
    logo: `${siteUrl}/brand/helsa-logo.png`,
    image: `${siteUrl}/images/og-default.jpg`,
    slogan: SITE.slogan,
    description: SITE.description,
    email: SITE.email,
    telephone: `+98${SITE.landline.replace(/^0/, "")}`,
    sameAs: [SITE.instagramUrl],
    address: {
      "@type": "PostalAddress",
      streetAddress: "نیاوران، خیابان شهید باهنر، قبل از چهارراه مژده",
      addressLocality: "تهران",
      addressRegion: "تهران",
      addressCountry: "IR",
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: `+98${SITE.landline.replace(/^0/, "")}`,
        contactType: "customer service",
        areaServed: "IR",
        availableLanguage: ["fa", "Persian"],
      },
    ],
  };
}

/** WebSite entity + SearchAction so search engines expose a sitelinks searchbox */
export function webSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    url: siteUrl,
    name: SITE.storeName,
    description: SITE.description,
    inLanguage: "fa-IR",
    publisher: { "@id": `${siteUrl}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${siteUrl}/products?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

/** Breadcrumb list from ordered [label, path] pairs */
export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${siteUrl}${item.path}`,
    })),
  };
}

/** Product schema — only real fields; ratings only when reviews genuinely exist */
export function productSchema(p: {
  name: string;
  slug: string;
  description: string;
  image: string;
  sku: string;
  price: number;
  stock: number;
  weight?: string;
  rating?: number;
  reviews?: number;
}) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    image: [p.image],
    description: p.description,
    sku: p.sku,
    brand: { "@type": "Brand", name: SITE.brandName },
    ...(p.weight ? { weight: p.weight } : {}),
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/products/${p.slug}`,
      // قیمت‌ها در هلسا به «تومان» صحیح‌صحیح ذخیره می‌شوند؛ schema.org واحد پول را با
      // کد ISO-4217 می‌پذیرد و کد رسمی ایران «IRR» (ریال) است — بنابراین فقط در
      // لایهٔ دادهٔ ساختاریافته و به‌صورت صریح ×۱۰ تبدیل می‌شود (نه در هیچ محاسبهٔ دیگری).
      priceCurrency: "IRR",
      price: p.price * 10,
      availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@id": `${siteUrl}/#organization` },
    },
  };
  if (p.reviews && p.reviews > 0 && p.rating) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: p.rating,
      reviewCount: p.reviews,
    };
  }
  return schema;
}

/** Mazeh tray schema — a Product with serving information */
export function traySchema(t: {
  name: string;
  slug: string;
  description: string;
  image: string;
  price: number;
  servesMin: number;
  servesMax: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: t.name,
    image: [t.image],
    description: t.description,
    category: "سینی مزه هلسا",
    brand: { "@type": "Brand", name: SITE.brandName },
    additionalProperty: [
      { "@type": "PropertyValue", name: "تعداد مهمان", value: `${t.servesMin} تا ${t.servesMax} نفر` },
    ],
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/mazeh-trays/${t.slug}`,
      priceCurrency: "IRR",
      price: t.price * 10, // تومان → ریال؛ فقط نمایش ساختاریافته (ISO 4217)
      availability: "https://schema.org/InStock",
      seller: { "@id": `${siteUrl}/#organization` },
    },
  };
}

/** FAQPage — only for pages that genuinely present Q&A content */
export function faqSchema(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

/** CollectionPage — category / listing pages */
export function collectionPageSchema(p: { name: string; description: string; path: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: p.name,
    description: p.description,
    url: `${siteUrl}${p.path}`,
    inLanguage: "fa-IR",
    isPartOf: { "@id": `${siteUrl}/#website` },
    publisher: { "@id": `${siteUrl}/#organization` },
  };
}

/** LocalBusiness — local SEO entity with real hours/geo (Google-supported) */
export function localBusinessSchema() {
  // Real opening hours from SITE config (Persian day ranges mapped to schema days)
  const spec = [
    { days: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday"], opens: "09:00", closes: "18:00" },
    { days: ["Thursday"], opens: "09:00", closes: "13:00" },
  ];
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${siteUrl}/#localbusiness`,
    name: SITE.businessName,
    alternateName: SITE.storeName,
    description: SITE.description,
    url: siteUrl,
    image: `${siteUrl}/images/og-default.jpg`,
    logo: `${siteUrl}/brand/helsa-logo.png`,
    telephone: `+98${SITE.landline.replace(/^0/, "")}`,
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: "نیاوران، خیابان شهید باهنر، قبل از چهارراه مژده",
      addressLocality: "تهران",
      addressRegion: "تهران",
      addressCountry: "IR",
    },
    openingHoursSpecification: spec.flatMap(({ days, opens, closes }) =>
      days.map((day) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: day, opens, closes })),
    ),
    sameAs: [SITE.instagramUrl],
  };
}

/** Indexing gate (brief 1.5): search indexing is allowed ONLY in production,
 *  controlled by env. Default is off (noindex) for staging/local/tunnels. */
export const allowIndexing = process.env.ALLOW_INDEXING === "1";
