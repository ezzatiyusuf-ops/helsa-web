"use client";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import { ToastProvider } from "@/components/ui/Toast";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ReturnCartBanner } from "@/components/layout/ReturnCartBanner";
import { SupportButton } from "@/components/layout/SupportButton";
import { PwaManager } from "@/components/pwa/PwaManager";
import { CookieConsent } from "@/components/consent/CookieConsent";
import { LangProvider } from "@/lib/i18n";

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  useEffect(() => { trackEvent("page_view", { page_path: pathname }); }, [pathname]);
  const admin = pathname.startsWith("/admin");
  if (admin) {
    return <LangProvider><ToastProvider>{children}</ToastProvider></LangProvider>;
  }
  return (
    <LangProvider>
    <ToastProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-[100] focus:bg-brand-600 focus:text-inverse focus:px-4 focus:py-2 focus:rounded-xl text-sm"
      >
        پرش به محتوای اصلی
      </a>
      <Header />
      <ReturnCartBanner />
      <main id="main" className="min-h-[calc(100dvh-9rem)]">
        {/* min-height حفاظتی CLS (فاز پرفورمنس): تا رسیدن محتوای استریم‌شدهٔ صفحات
            داینامیک، فوتر زیر تاشوی اولیه می‌ماند و جابه‌جایی‌اش حساب نمی‌شود.
            9rem ≈ نوار اعلان + هدر؛ در صفحات کوتاه فوتر به پایین ویوپورت می‌چسبد. */}
        {children}
      </main>
      <Footer />
      <SupportButton />
      <PwaManager />
      <CookieConsent />
    </ToastProvider>
    </LangProvider>
  );
}
