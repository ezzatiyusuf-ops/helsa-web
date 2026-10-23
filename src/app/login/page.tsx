import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthPanel, type SocialProviders } from "@/components/auth/AuthPanel";

export const metadata: Metadata = {
  title: "ورود به حساب هلسا",
  description: "ورود به حساب هلسا با شماره موبایل، کد یک‌بارمصرف یا رمز عبور.",
  robots: { index: false, follow: true },
};

/** Only offer social login the backend is actually configured for — never decorative buttons. */
function detectSocialProviders(): SocialProviders {
  return {
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    apple: Boolean(process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY),
  };
}

export default function LoginPage() {
  return (
    <div className="container-x py-14 max-w-4xl">
      {/* h1 سروری — AuthPanel داخل Suspense (useSearchParams) کلاینت‌رندر است، پس عنوان
          ساختاری صفحه باید همین‌جا سرور-رندر شود تا outline و SEO درست بماند. */}
      <h1 className="sr-only">ورود به حساب هلسا</h1>
      <Suspense fallback={<div className="container-x py-14 min-h-[50svh] grid place-items-center text-sm font-bold text-muted">در حال بارگذاری…</div>}>
        <AuthPanel mode="login" socialEnabled={detectSocialProviders()} />
      </Suspense>
    </div>
  );
}
