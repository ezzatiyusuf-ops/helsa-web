/**
 * /.well-known/assetlinks.json — تأیید دیجیتال App Links برای اپ اندروید
 * ─────────────────────────────────────────────────────────────────────────────
 * اپ اندروید هلسا (`ir.helsairanian.app`) با intent-filter `autoVerify` ساخته شده؛
 * اندروید تا وقتی این فایل روی **دامنهٔ تولید** با اثر انگشت SHA-256 گواهی امضا سرو
 * نشود، لینک‌ها را به اپ باز نمی‌کند.
 *
 * قاعدهٔ پروژه: «بدون credential ⇒ آداپتور + مستندسازی، نه شبیه‌سازی».
 * پس اگر `ANDROID_APP_SHA256` تنظیم نشده باشد، پاسخ صادقانه ۴۰۴ است و هیچ
 * اثر انگشت ساختگی‌ای ساخته نمی‌شود.
 *
 * تنظیم: ANDROID_APP_SHA256 = اثر انگشت(های) SHA-256 امضا، جدا‌شده با کاما
 *        نام پکیج اختیاری: ANDROID_APP_PACKAGE (پیش‌فرض ir.helsairanian.app).
 */
import { NextResponse } from "next/server";

const DEFAULT_PACKAGE = "ir.helsairanian.app";

export const dynamic = "force-static";
export const revalidate = 3600;

export function GET() {
  const raw = (process.env.ANDROID_APP_SHA256 ?? "").trim();
  const pkg = (process.env.ANDROID_APP_PACKAGE ?? DEFAULT_PACKAGE).trim();

  // اثر انگشت معتبر: ۳۲ بایت = ۶۴ نویسهٔ هگز با دو‌نقطه؛ هر چیز دیگری رد می‌شود
  // تا فایل نامعتبری منتشر نشود که اندروید را گمراه کند.
  const fingerprints = raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(s));

  if (fingerprints.length === 0) {
    return new NextResponse(
      JSON.stringify({
        error: "assetlinks_not_configured",
        hint: "ANDROID_APP_SHA256 را با اثر انگشت SHA-256 گواهی امضا تنظیم کنید (مقادیر جدا‌شده با کاما).",
      }),
      { status: 404, headers: { "content-type": "application/json; charset=utf-8" } },
    );
  }

  const body = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: pkg,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];

  return NextResponse.json(body, { headers: { "cache-control": "public, max-age=3600" } });
}
