"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, RefreshCw, Share, X, Sparkles } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "helsa-pwa-dismissed";
const DISMISS_DAYS = 30;

/**
 * Registers the service worker and hosts two subtle, non-intrusive prompts:
 *  - install  «اپلیکیشن هلسا را نصب کنید»
 *  - update   «نسخه جدید هلسا آماده است.»
 * Dismissal is remembered for 30 days; nothing is ever force-refreshed.
 */
export function PwaManager() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [showIOS, setShowIOS] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const waitingRef = useRef<ServiceWorker | null>(null);

  // register the service worker (production only — avoids dev caching surprises)
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    let reg: ServiceWorkerRegistration | undefined;
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        reg = registration;
        if (registration.waiting) {
          waitingRef.current = registration.waiting;
          setShowUpdate(true);
        }
        registration.addEventListener("updatefound", () => {
          const next = registration.installing;
          if (!next) return;
          next.addEventListener("statechange", () => {
            if (next.state === "installed" && navigator.serviceWorker.controller) {
              waitingRef.current = next;
              setShowUpdate(true);
            }
          });
        });
      })
      .catch(() => undefined);

    return () => {
      void reg;
    };
  }, []);

  // capture the install opportunity
  useEffect(() => {
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    const stillDismissed = dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 86_400_000;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      setShowIOS(false); // اگر مرورگر نصب بومی را پشتیبانی می‌کند، راهنمای iOS لازم نیست
      if (!stillDismissed) {
        // wait until the visitor has actually engaged with the page
        setTimeout(() => setShowInstall(true), 12_000);
      }
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => setShowInstall(false));
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  // iOS/Safari — رویداد beforeinstallprompt وجود ندارد؛
  // راهنمای «اشتراک‌گذاری ← افزودن به صفحهٔ اصلی» نمایش داده می‌شود.
  useEffect(() => {
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    const stillDismissed = dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 86_400_000;
    if (stillDismissed) return;

    const nav = navigator as Navigator & { standalone?: boolean };
    const ua = nav.userAgent;
    // iPhone/iPad/iPod؛ iPadOS 13+ خود را Mac معرفی می‌کند → با لمسِ زیاد تشخیص داده می‌شود
    const isIOS = /iphone|ipad|ipod/i.test(ua) || (nav.platform === "MacIntel" && nav.maxTouchPoints > 1);
    const isStandalone = nav.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
    if (!isIOS || isStandalone) return;

    const timer = setTimeout(() => setShowIOS(true), 12_000);
    return () => clearTimeout(timer);
  }, []);

  const install = useCallback(async () => {
    if (!installEvent) return;
    setShowInstall(false);
    await installEvent.prompt();
    await installEvent.userChoice.catch(() => undefined);
    setInstallEvent(null);
  }, [installEvent]);

  const dismissInstall = useCallback(() => {
    setShowInstall(false);
    setShowIOS(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* storage unavailable */
    }
  }, []);

  const applyUpdate = useCallback(() => {
    const waiting = waitingRef.current;
    setShowUpdate(false);
    if (!waiting) return;
    waiting.postMessage("SKIP_WAITING");
    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true });
  }, []);

  return (
    <>
      {/* install prompt — نوار چسبانِ باریکِ پایین (فاز UX):
          غیرمزاحم، تک‌خطی، بالای ناوبری موبایل؛ بسته‌شدن ۳۰ روز به‌خاطر سپرده می‌شود
          و فقط پس از تعامل معنادار (۱۲ ثانیه) و حداکثر یک‌بار در دوره نمایش می‌یابد. */}
      <AnimatePresence>
        {showInstall && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom))] lg:bottom-0 inset-x-0 z-[76] border-t border-line/80 bg-surface/95 backdrop-blur-md"
            role="dialog"
            aria-label="نصب اپلیکیشن هلسا"
          >
            <div className="container-x flex h-14 items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-700 text-inverse">
                <Download className="size-3.5" aria-hidden />
              </span>
              <p className="flex-1 min-w-0 truncate text-[12.5px] font-bold text-heading">
                اپلیکیشن هلسا — دسترسی سریع‌تر به محصولات و سینی‌های مزه
              </p>
              <button
                onClick={install}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-brand-700 px-5 text-[11.5px] font-bold text-inverse transition-colors hover:bg-brand-800"
              >
                <Sparkles className="size-3.5" aria-hidden /> نصب اپلیکیشن
              </button>
              <button onClick={dismissInstall} aria-label="بستن اعلان نصب" className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface2 hover:text-heading">
                <X className="size-4" aria-hidden />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS/Safari install guide — همان الگوی غیرمزاحم:
          پس از ۱۲ ثانیه تعامل، یک‌بار در دوره؛ بسته‌شدن ۳۰ روز به‌خاطر سپرده می‌شود.
          iOS رویداد نصب بومی ندارد؛ کاربر باید از منوی اشتراک‌گذاری سافاری
          «افزودن به صفحهٔ اصلی» را بزند. */}
      <AnimatePresence>
        {showIOS && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom))] lg:bottom-0 inset-x-0 z-[76] border-t border-line/80 bg-surface/95 backdrop-blur-md"
            role="dialog"
            aria-label="نصب اپ هلسا در آیفون"
          >
            <div className="container-x flex items-center gap-3 py-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-700 text-inverse">
                <Download className="size-4" aria-hidden />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-black text-heading">اپ هلسا روی آیفون شما نصب می‌شود</p>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] leading-5 font-bold text-muted">
                  در سافاری این‌گونه بزنید:
                  <Share className="size-3.5 shrink-0 text-brand-700" aria-hidden />
                  <span>اشتراک‌گذاری</span>
                  <span aria-hidden>←</span>
                  <span>افزودن به صفحهٔ اصلی</span>
                </p>
              </div>
              <button onClick={dismissInstall} aria-label="بستن اعلان نصب" className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface2 hover:text-heading">
                <X className="size-4" aria-hidden />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* update prompt — top centre, never auto-refreshes */}
      <AnimatePresence>
        {showUpdate && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed top-4 inset-x-4 z-[86] mx-auto flex max-w-sm items-center gap-3 rounded-full border border-line bg-surface px-4 py-2.5 shadow-lift"
            role="status"
          >
            <RefreshCw className="size-4 shrink-0 text-brand-600" aria-hidden />
            <p className="flex-1 text-[12px] font-bold text-heading">نسخه جدید هلسا آماده است.</p>
            <button onClick={applyUpdate} className="h-8 shrink-0 rounded-full bg-brand-700 px-4 text-[11px] font-bold text-inverse transition-colors hover:bg-brand-800">
              به‌روزرسانی
            </button>
            <button onClick={() => setShowUpdate(false)} aria-label="بستن" className="rounded-md p-1 text-muted hover:text-heading">
              <X className="size-3.5" aria-hidden />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
