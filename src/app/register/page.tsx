import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthPanel, type SocialProviders } from "@/components/auth/AuthPanel";

export const metadata: Metadata = {
  title: "ساخت حساب جدید | هلسا",
  description: "ساخت حساب کاربری هلسا با شماره موبایل و ایمیل.",
  robots: { index: false, follow: true },
};

function detectSocialProviders(): SocialProviders {
  return {
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    apple: Boolean(process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY),
  };
}

export default function RegisterPage() {
  return (
    <div className="container-x py-14 max-w-4xl">
      {/* h1 بیرون از Suspense می‌ماند: AuthPanel با useSearchParams کلاینتی است و
          محتوای داخل مرز Suspense در HTML سرور با fallback جایگزین می‌شود. */}
      <h1 className="sr-only">ساخت حساب جدید در هلسا</h1>
      <Suspense fallback={<div className="container-x py-14 min-h-[50svh] grid place-items-center text-sm font-bold text-muted">در حال بارگذاری…</div>}>
        <AuthPanel mode="register" socialEnabled={detectSocialProviders()} />
      </Suspense>
    </div>
  );
}
