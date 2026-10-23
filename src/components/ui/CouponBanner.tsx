"use client";
import { Copy, Check, TicketPercent } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { LinkButton } from "@/components/ui/primitives";

/** Reusable discount banner — flat, editorial, copyable code */
export function CouponBanner({
  code = "HELSA10",
  title = "پیشنهاد ویژه هلسا",
  text = "۱۰٪ تخفیف برای اولین خرید",
  cta = "استفاده از تخفیف",
  href = "/products",
}: {
  code?: string;
  title?: string;
  text?: string;
  cta?: string;
  href?: string;
}) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      /* clipboard unavailable */
    }
    setCopied(true);
    toast.push(`کد تخفیف ${code} کپی شد`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-brand-900 text-inverse p-8 md:p-10">
      <div className="pattern-persian-light absolute inset-y-0 end-0 w-48 opacity-70" aria-hidden />
      <div className="relative flex flex-col md:flex-row items-start md:items-center gap-7 justify-between">
        <div className="flex items-start gap-4">
          <span className="size-11 rounded-full border border-gold-400/40 flex items-center justify-center shrink-0">
            <TicketPercent className="size-5 text-gold-400" aria-hidden />
          </span>
          <div>
            <p className="text-[11px] font-bold tracking-[0.2em] text-gold-400">{title}</p>
            <h3 className="mt-2 text-xl md:text-2xl font-black">{text}</h3>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={copy}
            className="group flex items-center gap-2 rounded-full border border-dashed border-cream-50/40 px-5 py-3 font-black tracking-widest text-inverse hover:border-gold-400 hover:text-gold-300 transition-colors"
            dir="ltr"
            aria-label={`کپی کد تخفیف ${code}`}
          >
            {code}
            {copied ? <Check className="size-4 text-gold-300" aria-hidden /> : <Copy className="size-4 opacity-70 group-hover:opacity-100" aria-hidden />}
          </button>
          <LinkButton href={href} variant="cream" size="md">{cta}</LinkButton>
        </div>
      </div>
    </div>
  );
}
