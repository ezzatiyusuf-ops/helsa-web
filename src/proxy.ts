import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/safe-url";

/**
 * Edge proxy (Next.js 16 — former "middleware" convention):
 * - blocks obvious admin probing without a session cookie (defense-in-depth; real auth still server-side)
 * - normalizes unsafe next= redirects on login
 * - ensures sensitive paths are never cached by intermediaries
 */
export function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const res = NextResponse.next();

  // ── HTTPS enforcement (production) ──
  // ترمینیشن SSL روی پراکسی/CDN است؛ این‌جا فقط وقتی http می‌آید و هاست
  // دقیقاً دامنهٔ عمومی پیکربندی‌شده است، 308 به https می‌زنیم.
  // میزبان‌های sandbox/preview (localhost، *.e2b.app) هرگز لمس نمی‌شوند.
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  if (site.startsWith("https://")) {
    try {
      const domain = new URL(site).host;
      const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
      const proto = req.headers.get("x-forwarded-proto") ?? "";
      if (host === domain && proto === "http") {
        // Location از دامنهٔ پیکربندی‌شده ساخته می‌شود (req.nextUrl پشت پراکسی
        // ممکن است host محلی باشد) — مسیر و کوئری دست‌نخورده حفظ می‌شوند.
        const target = `${site}${pathname}${req.nextUrl.search}`;
        return NextResponse.redirect(target, 308);
      }
    } catch {
      /* invalid site url — skip */
    }
  }

  if (pathname === "/login" || pathname === "/register") {
    const next = searchParams.get("next");
    if (next) {
      const safe = safeNextPath(next, "/account");
      if (safe !== next) {
        const url = req.nextUrl.clone();
        url.searchParams.set("next", safe);
        return NextResponse.redirect(url);
      }
    }
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const session = req.cookies.get("helsa_session")?.value;
    if (!session) {
      if (pathname.startsWith("/api/admin")) {
        return NextResponse.json({ ok: false, message: "برای دسترسی مدیریت وارد حساب مجاز شوید." }, { status: 401 });
      }
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", "/admin");
      return NextResponse.redirect(url);
    }
  }

  if (
    pathname.startsWith("/account") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/payment") ||
    pathname.startsWith("/api/")
  ) {
    res.headers.set("Cache-Control", "no-store");
  }

  // ── SEO: هاست غیرتولیدی هرگز ایندکس نشود ──
  // هر میزبانی (staging/preview/Netlify deploy دمو) که هاستش با دامنهٔ
  // NEXT_PUBLIC_SITE_URL یکی نیست، X-Robots-Tag: noindex می‌گیرد تا
  // محتوای تکراری در گوگل ساخته نشود. canonical/og:url از همان env می‌آید —
  // برای هر استقرار، مقدار همان استقرار را بگذارید.
  {
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const prodHost = site ? site.replace(/^https?:\/\//, "").replace(/\/$/, "") : "";
    const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").split(":")[0];
    if (prodHost && host && host !== prodHost) {
      res.headers.set("X-Robots-Tag", "noindex, nofollow");
    }
  }

  return res;
}

export const config = {
  // همهٔ مسیرها به‌جز assetهای استاتیک — تا ریدایرکت HTTPS و گاردها روی همهٔ صفحات اعمال شود
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
