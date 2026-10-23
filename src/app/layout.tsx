import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import "./globals.css";
import "./fonts.css";
import { GTM_ID, gtmEnabled } from "@/lib/gtm";
import { SITE } from "@/config/site";
import { Shell } from "@/components/layout/Shell";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { JsonLd } from "@/components/seo/JsonLd";
import { allowIndexing, organizationSchema, webSiteSchema, localBusinessSchema, siteUrl } from "@/lib/seo";
import { ImageFallbackGuard } from "@/components/ui/ImageFallbackGuard";
import { MotionProvider } from "@/components/ui/MotionProvider";

export const metadata: Metadata = {
  // noindex on non-production environments (brief 1.5) — indexing is opt-in via ALLOW_INDEXING=1
  robots: allowIndexing ? { index: true, follow: true } : { index: false, follow: false, nocache: true },
  metadataBase: new URL(siteUrl),
  title: {
    default: `${SITE.storeName} | ${SITE.brandName} — ${SITE.slogan}`,
    template: `%s | ${SITE.storeName}`,
  },
  description: SITE.description,
  openGraph: {
    type: "website",
    locale: "fa_IR",
    siteName: SITE.storeName,
    title: `${SITE.storeName} | ${SITE.brandName}`,
    description: SITE.description,
    url: SITE.url,
    images: [{ url: "/images/og-default.jpg", width: 1200, height: 630, alt: SITE.storeName }],
  },
  twitter: { card: "summary_large_image", title: SITE.storeName, description: SITE.description },
  // Google Search Console verification — set NEXT_PUBLIC_GSC_VERIFICATION in env (or remove if verifying via DNS)
  ...(process.env.NEXT_PUBLIC_GSC_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION } }
    : {}),
  formatDetection: { telephone: false, address: false, email: false },
  manifest: "/manifest.webmanifest",
  applicationName: "هلسا",
  appleWebApp: { capable: true, title: "هلسا", statusBarStyle: "default" },
  // آیکون‌ها با قرارداد فایلی Next: src/app/favicon.ico · icon.png · apple-icon.png
  // (پکیج برند — سبتمبر ۲۰۲۶). آیکون‌های PWA در public/icons + manifest.ts.
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0b5f3b" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1712" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        {/* فونت وزیرمتن — میزبانی محلی (متغیر ۱۱۱KB، همهٔ وزن‌ها؛ حذف CDN خارجی) */}
        <link rel="preload" href="/fonts/Vazirmatn-Variable.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="icon" href="/icons/favicon.ico" sizes="48x48" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <JsonLd data={organizationSchema()} />
        <JsonLd data={webSiteSchema()} />
        <JsonLd data={localBusinessSchema()} />
        {/* FOUC guard — resolve theme before first paint; also mark JS availability
            so CSS can keep Reveal content visible when client JS is blocked */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{document.documentElement.classList.add('js');}catch(e){}try{var p=localStorage.getItem('helsa-theme')||'system';var d=p==='dark'||(p==='system'&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';document.documentElement.dataset.theme=d;document.documentElement.style.colorScheme=d;}catch(e){document.documentElement.dataset.theme='light';}})();",
          }}
        />
      </head>
      <body className="bg-canvas text-heading antialiased">
        {/* GTM — فقط وقتی NEXT_PUBLIC_GTM_ID تنظیم شده باشد (نبودنش = بدون تگ خارجی) */}
        {gtmEnabled() && (
          <>
            <noscript>
              <iframe
                src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
                height="0"
                width="0"
                style={{ display: "none", visibility: "hidden" }}
                title="gtm"
              />
            </noscript>
            <Script id="gtm-loader" strategy="beforeInteractive">
              {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`}
            </Script>
          </>
        )}
        <ImageFallbackGuard />
        <ThemeProvider>
          <Shell><MotionProvider>{children}</MotionProvider></Shell>
        </ThemeProvider>
      </body>
    </html>
  );
}
