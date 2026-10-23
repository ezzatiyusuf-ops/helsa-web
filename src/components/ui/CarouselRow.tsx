"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * CarouselRow — نوار افقی کشویی با فلش چپ/راست (RTL-hognht).
 * برای سکشن‌های «پرفروش‌ها» و «اینستاگرام» صفحهٔ اصلی:
 * یک ردیف کنار-هم به‌جای گرید چندردیفی → تصاویر کمتری هم‌زمان لود می‌شوند
 * (lazy افقی) و خریدار به‌جای اسکرول عمودی طولانی، با یک سوایپ/کلیک مرور می‌کند.
 *
 * ویژگی‌ها: snap لبه‌ای، دکمه‌های ۴۴px با حالت غیرفعال در دو سر، اسکرول‌بار مخفی،
 * جهت RTL خودکار (بعدی = چپ)، بدون وابستگی خارجی.
 */
export function CarouselRow({
  children,
  ariaLabel,
  className = "",
}: {
  children: React.ReactNode;
  ariaLabel: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const pos = Math.abs(el.scrollLeft); // در RTL اسکرول منفی می‌شود
    setAtStart(pos < 8);
    setAtEnd(max - pos < 8);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    el?.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const go = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const amount = Math.round(el.clientWidth * 0.85);
    const rtl = getComputedStyle(el).direction === "rtl";
    // جسمی: در RTL «بعدی» به سمت چپ است (left منفی)
    el.scrollBy({ left: rtl ? -dir * amount : dir * amount, behavior: "smooth" });
  };

  const arrowBase =
    "absolute top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-surface/95 text-heading shadow-lift backdrop-blur transition-colors hover:border-brand-400 hover:text-brand-600 disabled:pointer-events-none disabled:opacity-25";

  return (
    <div className={`relative ${className}`}>
      <div
        ref={ref}
        role="group"
        aria-label={ariaLabel}
        className="flex gap-3 overflow-x-auto scroll-smooth snap-x [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-[400px]:gap-4"
      >
        {children}
      </div>

      {/* قبلی — لبهٔ راست در RTL */}
      <button type="button" onClick={() => go(-1)} disabled={atStart} aria-label="قبلی" className={`${arrowBase} start-0`}>
        <ChevronRight className="size-5" aria-hidden />
      </button>
      {/* بعدی — لبهٔ چپ در RTL */}
      <button type="button" onClick={() => go(1)} disabled={atEnd} aria-label="بعدی" className={`${arrowBase} end-0`}>
        <ChevronLeft className="size-5" aria-hidden />
      </button>
    </div>
  );
}
