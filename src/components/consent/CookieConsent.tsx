"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, Settings, Check, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Non-blocking cookie consent + preference manager.
 *
 * Categories (privacy-friendly defaults — only "necessary" is on):
 *  - necessary: session, cart, theme (always active; cannot be disabled)
 *  - analytics: OFF by default — no analytics cookie is set today; the stored
 *    preference gates future GA4/GTM integration.
 *  - marketing: OFF by default — future-ready, never set without consent.
 *
 * Stored in localStorage `helsa-consent-v2` as JSON:
 *  { necessary: true, analytics: boolean, marketing: boolean, at: ISO }
 */
const KEY = "helsa-consent-v2";

interface Consent {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  at: string;
}

function readConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<Consent>;
    if (typeof p.analytics !== "boolean" || typeof p.marketing !== "boolean") return null;
    return { necessary: true, analytics: p.analytics, marketing: p.marketing, at: p.at ?? new Date().toISOString() };
  } catch {
    return null;
  }
}

function writeConsent(analytics: boolean, marketing: boolean): Consent {
  const c: Consent = { necessary: true, analytics, marketing, at: new Date().toISOString() };
  try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* ignore */ }
  // legacy key compatibility (old banner stored "accepted"/"declined")
  try { localStorage.setItem("helsa-consent", analytics ? "accepted" : "declined"); } catch { /* ignore */ }
  return c;
}

function Toggle({ checked, onChange, label, desc, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`flex w-full items-start justify-between gap-3 rounded-xl border p-3.5 text-start transition-colors ${disabled ? "border-line/50 bg-surface2 opacity-80" : checked ? "border-brand-500 bg-brand-50" : "border-line/70 bg-surface hover:border-brand-300"}`}
    >
      <span>
        <span className="block text-[12.5px] font-black text-heading">{label}</span>
        <span className="mt-1 block text-[10.5px] leading-5 text-muted">{desc}</span>
      </span>
      <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border transition-colors ${checked ? "border-brand-600 bg-brand-700 text-inverse" : "border-line bg-surface2 text-transparent"}`} aria-hidden>
        <Check className="size-3.5" />
      </span>
    </button>
  );
}

export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    try {
      const existing = readConsent();
      if (existing === null && localStorage.getItem("helsa-consent") === null) {
        const t = setTimeout(() => setOpen(true), 1600);
        return () => clearTimeout(t);
      }
    } catch {
      /* storage blocked — don't nag */
    }
  }, []);

  useEffect(() => {
    document.documentElement.toggleAttribute("data-consent-open", open);
    return () => document.documentElement.removeAttribute("data-consent-open");
  }, [open]);

  const acceptAll = () => { writeConsent(true, true); setOpen(false); setPrefs(false); };
  const rejectOptional = () => { writeConsent(false, false); setOpen(false); setPrefs(false); };
  const savePrefs = () => { writeConsent(analytics, marketing); setOpen(false); setPrefs(false); };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.35 }}
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] lg:bottom-6 inset-x-4 z-[75] mx-auto max-w-xl rounded-2xl border border-line bg-surface shadow-lift p-5 lg:ms-28"
          role="dialog"
          aria-label="مدیریت رضایت کوکی"
        >
          <div className="flex items-start gap-3">
            <span className="inline-flex size-9 shrink-0 rounded-full bg-brand-50 text-brand-700 items-center justify-center"><Cookie className="size-4" aria-hidden /></span>
            <div className="flex-1">
              <p className="text-sm font-black text-heading">حریم خصوصی شما</p>
              <p className="mt-1 text-[11px] leading-5 text-muted">
                هلسا برای کارکرد فروشگاه (سبد خرید، ورود، حالت شب/روشن) از کوکی‌های ضروری استفاده می‌کند. کوکی تحلیلی و تبلیغاتی <b>به‌صورت پیش‌فرض خاموش</b> است و فقط با رضایت شما فعال می‌شود.
              </p>
              <p className="mt-1 text-[10.5px] text-muted"><Link href="/privacy" className="text-brand-link font-bold underline">مطالعه سیاست حریم خصوصی</Link></p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="بستن" className="grid size-7 shrink-0 place-items-center rounded-full border border-line text-muted hover:bg-surface2"><X className="size-3.5" aria-hidden /></button>
          </div>

          {prefs ? (
            <div className="mt-4 space-y-2">
              <Toggle checked onChange={() => undefined} disabled label="کوکی‌های ضروری" desc="سبد خرید، نشست ورود و تنظیمات نمایش — همیشه فعال" />
              <Toggle checked={analytics} onChange={setAnalytics} label="کوکی‌های تحلیلی" desc="آمار بازدید برای بهبود تجربه (در حال حاضر هیچ کوکی تحلیلی ثبت نمی‌شود)" />
              <Toggle checked={marketing} onChange={setMarketing} label="کوکی‌های تبلیغاتی" desc="پیشنهادهای شخصی‌سازی‌شده (آینده — فعلاً استفاده نمی‌شود)" />
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {prefs ? (
              <>
                <button onClick={savePrefs} className="h-9 rounded-full bg-brand-700 px-5 text-[12px] font-bold text-inverse hover:bg-brand-800 transition-colors">ذخیره ترجیحات</button>
                <button onClick={acceptAll} className="h-9 rounded-full border border-line px-5 text-[12px] font-bold text-heading hover:bg-surface2 transition-colors">پذیرش همه</button>
              </>
            ) : (
              <>
                <button onClick={acceptAll} className="h-9 rounded-full bg-brand-700 px-5 text-[12px] font-bold text-inverse hover:bg-brand-800 transition-colors">پذیرش همه</button>
                <button onClick={rejectOptional} className="h-9 rounded-full border border-line px-5 text-[12px] font-bold text-heading hover:bg-surface2 transition-colors">فقط ضروری</button>
                <button onClick={() => setPrefs(true)} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-[12px] font-bold text-heading hover:bg-surface2 transition-colors">
                  <Settings className="size-3.5" aria-hidden /> تنظیمات
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
