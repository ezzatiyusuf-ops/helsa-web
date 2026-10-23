import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// GTM (اختیاری): فقط وقتی NEXT_PUBLIC_GTM_ID تنظیم شده باشد،
// دامنه‌های Google Tag Manager به CSP اضافه می‌شوند — در غیر این صورت CSP سخت‌گیرانه می‌ماند.
const gtmId = (process.env.NEXT_PUBLIC_GTM_ID ?? "").trim();
const gtmOn = /^GTM-[A-Za-z0-9_-]{4,}$/.test(gtmId);

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self' https://appleid.apple.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      // React dev mode (dev overlay/call-stack reconstruction) requires eval();
      // allowed in development only — production CSP stays strict.
      `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}${gtmOn ? " https://www.googletagmanager.com" : ""}`,
      "connect-src 'self' https:",
      "worker-src 'self'",
      "manifest-src 'self'",
      // iframe noscript کانتینر GTM
      // نقشهٔ تماس (OpenStreetMap) همیشه در /contact هست؛ GTM فقط در صورت فعال‌بودن —
      // دایرکتیو تکراری frame-src ممنوع: مرورگر دومی را نادیده می‌گیرد (خطای کنسول + شکست GTM در تولید)
      `frame-src https://www.openstreetmap.org${gtmOn ? " https://www.googletagmanager.com" : ""}`,
    ].join("; "),
  },
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" }]
    : []),
];

// OpenNext (Cloudflare Workers) به خروجی standalone نیاز دارد؛ در توسعه/تست محلی
// خروجی پیش‌فرض می‌ماند تا `next start` (بدون هشدار/رفتار نامشخص) کار کند.
// فعال‌سازی: NEXT_OUTPUT_STANDALONE=1 (در اسکریپت‌های cf:build/deploy و محیط CI کلادفلر)
const cloudflareBuild = process.env.NEXT_OUTPUT_STANDALONE === "1";

const nextConfig: NextConfig = {
  ...(cloudflareBuild ? { output: "standalone" as const } : {}),
  async rewrites() {
    return [
      // URL عمومی قدیمی حفظ می‌شود؛ پوشهٔ «build» در snapshot سندباکس حذف می‌شود (نام مستثنی)،
      // بنابراین مسیر واقعی صفحه tray-builder است و این rewrite شفاف راه را هموار می‌کند.
      { source: "/mazeh-trays/build", destination: "/mazeh-trays/tray-builder" },
    ];
  },
  // Sandbox/live-preview hosts (e.g. https://{port}-{sandboxId}.e2b.app) must be
  // allowed to load Next dev resources (/_next/*, HMR), otherwise the page HTML
  // renders but client JS is blocked with 403 and animated content stays hidden.
  allowedDevOrigins: ["*.e2b.app"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        // فاز Performance — کش immutable برای assetهای نسخه‌دار/محتوایی:
        // تصاویر opt فقط با تغییر نام فایل عوض می‌شوند → کش سالانه امن است.
        source: "/images/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/fonts/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/icons/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
  poweredByHeader: false,
};

export default nextConfig;
