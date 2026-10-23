"use client";
import type { ReactNode, ButtonHTMLAttributes } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Star, StarHalf, Minus, Plus } from "lucide-react";
import { formatToman, formatPriceShort } from "@/lib/format";

/* ——— Brand logo ———
 * Official HELSA mark (uploaded asset, green on transparent, ~1:1).
 * Rendered from /brand/helsa-logo.png — never distorted, aspect preserved.
 * On dark surfaces the monochrome green still reads, so `light` only adds a
 * subtle cream plate for tight dark compositions. */
export const LOGO_GREEN = "#3e8701";

export function HelsaLogo({ className = "h-10", light = false }: { className?: string; light?: boolean }) {
  const mark = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/helsa-logo-160.png"
      alt="هلسا ایرانیان — لوگوی فروشگاه هلسا"
      width={174}
      height={160}
      className="h-full w-auto object-contain"
      decoding="async"
      fetchPriority="high"
    />
  );
  if (light) {
    return (
      <span className={`inline-flex items-center rounded-xl bg-surface px-2.5 py-1 ${className}`}>
        {mark}
      </span>
    );
  }
  return <span className={`inline-flex items-center ${className}`}>{mark}</span>;
}

/* ——— Buttons: dark green primary / cream-outline secondary ——— */
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "accent" | "outline" | "ghost" | "gold" | "cream";
  size?: "sm" | "md" | "lg";
};

const variants: Record<string, string> = {
  primary: "bg-brand-700 text-inverse hover:bg-brand-800",
  accent: "bg-accent-500 text-inverse hover:bg-accent-600",
  gold: "bg-gold-500 text-brand-950 hover:bg-gold-600",
  outline: "border border-brand-700/40 text-heading hover:border-brand-700 hover:bg-brand-50",
  cream: "bg-surface text-heading hover:bg-surface2 border border-line",
  ghost: "text-heading hover:bg-brand-50",
};
const sizes: Record<string, string> = {
  sm: "h-9 px-4 text-xs rounded-full gap-1.5",
  md: "h-11 px-6 text-sm rounded-full gap-2",
  lg: "h-12 px-8 text-sm rounded-full gap-2.5",
};

export function Button({ variant = "primary", size = "md", className = "", ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center font-bold transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
    />
  );
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
  onClick,
}: {
  href: string;
  variant?: BtnProps["variant"];
  size?: BtnProps["size"];
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      onClick={onClick}
      href={href}
      className={`inline-flex items-center justify-center font-bold transition-all duration-300 active:scale-[0.98] ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </Link>
  );
}

/* ——— Badges (used sparingly) ——— */
export function Badge({ children, tone = "brand" }: { children: ReactNode; tone?: "brand" | "accent" | "gold" | "ink" }) {
  const tones = {
    brand: "bg-brand-700 text-inverse",
    accent: "bg-accent-500 text-[#331a04]",
    gold: "bg-gold-500 text-brand-950",
    ink: "bg-ink-900/85 text-inverse",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10.5px] font-bold ${tones[tone]}`}>
      {children}
    </span>
  );
}

/* ——— Rating ——— */
export function Stars({ rating, reviews }: { rating: number; reviews?: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`امتیاز ${rating} از ۵`}>
      <span className="flex items-center gap-0.5 text-gold-500">
        {Array.from({ length: 5 }).map((_, i) =>
          i < full ? (
            <Star key={i} className="size-3.5 fill-current" aria-hidden />
          ) : i === full && half ? (
            <StarHalf key={i} className="size-3.5 fill-current" aria-hidden />
          ) : (
            <Star key={i} className="size-3.5 text-faint" aria-hidden />
          ),
        )}
      </span>
      {reviews ? <span className="text-[11px] text-muted">({reviews.toLocaleString("fa-IR")})</span> : null}
    </span>
  );
}

/* ——— Price ——— */
export function Price({ price, oldPrice, size = "md" }: { price: number; oldPrice?: number | null; size?: "sm" | "md" | "lg" }) {
  const s = size === "lg" ? "text-[22px]" : size === "sm" ? "text-[15px]" : "text-[17px]";
  return (
    <span className="flex items-baseline gap-1.5 flex-wrap">
      <span className={`${s} font-black tabular-nums text-price`}>{formatPriceShort(price)}</span>
      <span className={`${size === "lg" ? "text-[11px]" : "text-[10px]"} font-bold text-muted`}>تومان</span>
      {oldPrice && oldPrice > price && (
        <span className="ms-1 flex items-baseline gap-1 text-faint line-through">
          <span className="text-[11px] tabular-nums">{formatPriceShort(oldPrice)}</span>
          <span className="text-[10px] font-bold">تومان</span>
        </span>
      )}
    </span>
  );
}

/* ——— Quantity picker ——— */
export function QtyPicker({ value, onChange, max = 99 }: { value: number; onChange: (v: number) => void; max?: number }) {
  return (
    <div className="inline-flex items-center rounded-full border border-line bg-surface overflow-hidden">
      <button
        type="button"
        aria-label="افزایش تعداد"
        onClick={() => onChange(Math.min(value + 1, max))}
        className="px-3.5 h-10 hover:bg-brand-50 text-brand-700 transition-colors"
      >
        <Plus className="size-4" aria-hidden />
      </button>
      <span className="w-9 text-center font-bold tabular-nums text-sm">{value.toLocaleString("fa-IR")}</span>
      <button
        type="button"
        aria-label="کاهش تعداد"
        onClick={() => onChange(Math.max(value - 1, 1))}
        className="px-3.5 h-10 hover:bg-brand-50 text-brand-700 transition-colors"
      >
        <Minus className="size-4" aria-hidden />
      </button>
    </div>
  );
}

/* ——— Section heading: airy, one ornament ——— */
export function SectionHead({
  eyebrow,
  title,
  desc,
  align = "center",
  light = false,
}: {
  eyebrow?: string;
  title: string;
  desc?: string;
  align?: "center" | "start";
  light?: boolean;
}) {
  return (
    <div className={`${align === "center" ? "text-center mx-auto" : "text-start"} max-w-2xl mb-14 md:mb-20`}>
      {eyebrow && (
        <span className={`inline-block text-[11px] font-bold tracking-[0.2em] mb-4 ${light ? "text-gold-400" : "text-gold-700"}`}>
          {eyebrow}
        </span>
      )}
      <h2 className={`text-[26px] md:text-4xl font-black leading-[1.5] md:leading-[1.45] ${light ? "text-inverse" : "text-heading"}`}>
        {title}
      </h2>
      {desc && <p className={`mt-5 text-sm md:text-[15px] leading-8 ${light ? "text-inverse/75" : "text-muted"}`}>{desc}</p>}
      <span className={`mt-7 inline-flex items-center gap-3 ${light ? "text-gold-400/80" : "text-gold-500/80"}`} aria-hidden>
        <span className="h-px w-12 bg-current opacity-50" />
        <svg viewBox="0 0 24 24" className="size-3 fill-current"><path d="M12 2l2.4 6.2L21 9l-5 4.4 1.5 6.6L12 16.6 6.5 20 8 13.4 3 9l6.6-.8z" /></svg>
        <span className="h-px w-12 bg-current opacity-50" />
      </span>
    </div>
  );
}

/* ——— Restrained scroll reveal (200–500ms) ——— */
export function Reveal({
  children,
  delay = 0,
  y = 18,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className ? `${className} rvl h-full` : "rvl h-full"}
    >
      {children}
    </motion.div>
  );
}

/* ——— Countdown ——— */
export function Countdown({ until, light = false }: { until: string; light?: boolean }) {
  return <CountdownInner until={until} light={light} />;
}

import { useEffect, useState } from "react";
import { countdownParts } from "@/lib/countdown";

function CountdownInner({ until, light }: { until: string; light?: boolean }) {
  // مقدار اولیه همان‌جا محاسبه می‌شود (نه صفر) → SSR و اولین فریم هم عدد درست را می‌بینند
  const [left, setLeft] = useState(() => countdownParts(until));
  useEffect(() => {
    const tick = () => setLeft(countdownParts(until));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [until]);
  if (!left) return null; // تاریخ نامعتبر یا گذشته → مخفی، هرگز صفرِ دروغین
  const cell = (v: number, l: string) => (
    <span className={`flex flex-col items-center rounded-xl px-3 py-2 min-w-14 ${light ? "bg-surface/10 text-inverse" : "bg-brand-800 text-inverse"}`}>
      {/* suppressHydrationWarning: زمان سرور و کلاینت ذره‌ای فرق دارد — مقدار کلاینت معتبر است */}
      <span className="text-lg font-black tabular-nums" suppressHydrationWarning>{v.toLocaleString("fa-IR", { minimumIntegerDigits: 2 })}</span>
      <span className="text-[10px] opacity-80">{l}</span>
    </span>
  );
  return (
    <div className="flex items-center gap-2" role="timer" aria-label="زمان باقی‌مانده">
      {cell(left.d, "روز")}
      {cell(left.h, "ساعت")}
      {cell(left.m, "دقیقه")}
      {cell(left.s, "ثانیه")}
    </div>
  );
}
