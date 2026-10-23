"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Headset, Phone, Mail, X, MessageCircle, BookOpenText, ArrowLeft } from "lucide-react";
import { SITE } from "@/config/site";
import { useLang } from "@/lib/i18n";

function WhatsAppIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35z" />
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.86 9.86 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.02h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.17 8.17 0 0 1-1.25-4.35c0-4.54 3.69-8.23 8.23-8.23 2.2 0 4.26.86 5.82 2.41a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.21-8.24 8.21z" />
    </svg>
  );
}

/** A compact HELSA concierge entry point — never a generic question-mark bubble. */
export function SupportButton() {
  const { t } = useLang();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [footerNear, setFooterNear] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setVisible(true), 1100);
    return () => window.clearTimeout(id);
  }, []);

  // روی موبایل، وقتی فوتر (که خودش اطلاعات تماس دارد) دیده می‌شود،
  // دکمهٔ شناور محو می‌شود تا روی لینک‌ها نیفتد — بدون هک layout.
  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => setFooterNear(entries.some((e) => e.isIntersecting)),
      { rootMargin: "-8% 0px -8% 0px" },
    );
    io.observe(footer);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const oldOverflow = document.body.style.overflow;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
  }, [open]);

  const whatsappUrl = SITE.whatsappUrl;
  // On product and tray details, clear the sticky purchase bar on mobile.
  const hasStickyPurchase = /^\/products\/[^/]+$/.test(pathname) || /^\/mazeh-trays\/[^/]+$/.test(pathname);
  const options = [
    { key: "call", label: t("support.call"), value: SITE.landline, href: `tel:${SITE.landline}`, Icon: Phone, external: false },
    { key: "whatsapp", label: t("support.whatsapp"), value: SITE.mobile, href: whatsappUrl, Icon: WhatsAppIcon, external: true },
    { key: "instagram", label: t("support.messaging"), value: SITE.instagram, href: SITE.instagramUrl, Icon: MessageCircle, external: true },
    { key: "faq", label: t("support.faq"), value: "پاسخ پرسش‌های پرتکرار", href: "/faq", Icon: BookOpenText, external: false },
    { key: "contact", label: t("support.contact"), value: "فرم تماس و آدرس", href: "/contact", Icon: Mail, external: false },
  ];

  return (
    <>
      <div
        aria-hidden={footerNear}
        className={`helsa-support fixed start-4 z-[74] lg:bottom-6 lg:start-6 transition-all duration-300 ${footerNear ? "opacity-0 pointer-events-none translate-y-3 lg:opacity-100 lg:pointer-events-auto lg:translate-y-0" : ""} ${hasStickyPurchase ? "bottom-[calc(9.5rem+env(safe-area-inset-bottom))]" : "bottom-[calc(5rem+env(safe-area-inset-bottom))]"}`}
      >
        <AnimatePresence>
          {visible && (
            <motion.button
              ref={triggerRef}
              type="button"
              initial={{ opacity: 0, scale: 0.86 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.86 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              onClick={() => setOpen(true)}
              aria-label={t("support.title")}
              aria-haspopup="dialog"
              aria-expanded={open}
              title={t("support.title")}
              className="group relative grid size-11 place-items-center rounded-full border border-gold-500/45 bg-brand-700 text-inverse shadow-lift transition-colors hover:bg-brand-800 lg:size-12"
            >
              <Headset className="size-5" aria-hidden />
              <span className="pointer-events-none absolute end-full me-3 hidden whitespace-nowrap rounded-full border border-line bg-surface px-3 py-1.5 text-[11px] font-bold text-heading opacity-0 shadow-soft transition-all group-hover:opacity-100 group-focus-visible:opacity-100 lg:block">
                {t("support.title")}
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[84] bg-ink-900/40 backdrop-blur-[1px]"
            onClick={() => setOpen(false)}
          >
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="absolute inset-y-0 start-0 flex w-[min(88vw,21rem)] flex-col border-s border-line bg-surface shadow-lift lg:w-[22rem]"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="support-title"
            >
              <div className="relative shrink-0 overflow-hidden bg-brand-800 px-5 py-5">
                <div className="pattern-persian-light absolute inset-0 opacity-50" aria-hidden />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-full border border-gold-400/50 text-gold-300"><Headset className="size-4.5" aria-hidden /></span>
                    <div>
                      <h2 id="support-title" className="text-sm font-black text-inverse">{t("support.title")}</h2>
                      <p className="mt-1 text-[10.5px] text-inverse/75">شنبه تا چهارشنبه، {SITE.supportHours}</p>
                    </div>
                  </div>
                  <button onClick={() => setOpen(false)} aria-label={t("support.close")} className="grid size-10 place-items-center rounded-full bg-inverse/10 text-inverse transition-colors hover:bg-inverse/20">
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                <ul className="space-y-1.5">
                  {options.map(({ key, label, value, href, Icon, external }) => {
                    const content = (
                      <>
                        <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface2 text-brand-600 transition-colors group-hover:border-brand-600 group-hover:bg-brand-700 group-hover:text-inverse">
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[12.5px] font-bold text-heading">{label}</span>
                          <span className="block truncate text-[10.5px] text-muted" dir={key === "call" || key === "whatsapp" ? "ltr" : undefined}>{value}</span>
                        </span>
                        <ArrowLeft className="size-3.5 shrink-0 text-faint transition-transform group-hover:-translate-x-0.5" aria-hidden />
                      </>
                    );
                    const cls = "group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-line hover:bg-surface2";
                    return <li key={key}>{external ? <a href={href} target="_blank" rel="noreferrer" className={cls}>{content}</a> : <Link href={href} onClick={() => setOpen(false)} className={cls}>{content}</Link>}</li>;
                  })}
                </ul>
                <p className="mt-6 rounded-xl border border-line bg-surface2 px-4 py-3 text-[10.5px] leading-5 text-muted">{SITE.address}</p>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
