"use client";
import { useState, useSyncExternalStore } from "react";
import { Check, Share2, MessageCircle, Send, Link as LinkIcon } from "lucide-react";

/** Persian-first social share row (copy-link + Telegram + WhatsApp + X). */
export function ShareButtons({ title, path }: { title: string; path: string }) {
  const [copied, setCopied] = useState(false);
  // origin فقط بعد از mount در دسترس است (server snapshot = "") تا SSR و رندر اول کلاینت
  // دقیقاً href یکسان داشته باشند؛ پس از mount آدرس مطلق جایگزین می‌شود.
  const origin = useSyncExternalStore(
    () => () => {}, // origin با ناوبری درون‌صفحه‌ای تغییر نمی‌کند
    () => window.location.origin,
    () => "",
  );
  const url = origin ? new URL(path, origin).toString() : path;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard blocked */ }
  };

  const share = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try { await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({ title, url }); return; } catch { /* cancelled */ }
    }
    void copy();
  };

  const btn = "inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-2 text-[11px] font-bold text-heading transition-colors hover:border-brand-400 hover:text-brand-700";

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="اشتراک‌گذاری مقاله">
      <button type="button" onClick={share} className={btn}><Share2 className="size-3.5" aria-hidden /> اشتراک‌گذاری</button>
      <a href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`} target="_blank" rel="noopener noreferrer" className={btn} aria-label="اشتراک در تلگرام"><Send className="size-3.5" aria-hidden /> تلگرام</a>
      <a href={`https://wa.me/?text=${encodeURIComponent(title + " " + url)}`} target="_blank" rel="noopener noreferrer" className={btn} aria-label="اشتراک در واتس‌اپ"><MessageCircle className="size-3.5" aria-hidden /> واتس‌اپ</a>
      <button type="button" onClick={copy} className={btn} aria-label="کپی لینک">
        {copied ? <Check className="size-3.5 text-brand-600" aria-hidden /> : <LinkIcon className="size-3.5" aria-hidden />}
        {copied ? "کپی شد" : "کپی لینک"}
      </button>
    </div>
  );
}
