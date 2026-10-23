"use client";
import { useEffect, useState } from "react";
import { freeShippingPhrase } from "@/config/shipping";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

/**
 * نوار اعلان بالای هدر (CRO) — چسبان، ۳۴px، سبز زیتونی تیره، چرخش هر ۴ ثانیه.
 * متن‌ها از نظر حقوقی سالم‌اند (بازگشت وجه «طبق شرایط هلسا»؛ ارسال رایگان با آستانهٔ واقعی).
 * هر اسلاید کلیک‌پذیر است. هاور = توقف چرخش.
 */
const SLIDES = [
  { icon: "🎁", text: "اولین خرید شما؟ ۲۰۰ هزار تومان هدیه خرید (حداقل خرید ۱ میلیون)", href: "/#newsletter" },
  { icon: "🚚", text: freeShippingPhrase, href: "/shipping" },
  { icon: "⭐", text: "محصولات ویژه این هفته با تخفیف محدود", href: "/offers" },
  { icon: "💚", text: "خرید با اطمینان؛ تضمین کیفیت طبق شرایط هلسا", href: "/refund" },
];

export function AnnouncementBar() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setI((v) => (v + 1) % SLIDES.length), 4000);
    return () => window.clearInterval(id);
  }, [paused]);

  const s = SLIDES[i];
  return (
    <div
      className="sticky top-0 z-[75] h-[34px] bg-[#23452F] text-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="region"
      aria-label="اعلان‌های ویژه هلسا"
    >
      <div className="container-x relative flex h-full items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Link href={s.href} className="flex min-w-0 items-center gap-2 px-4 text-[11px] font-bold sm:text-[11.5px] transition-colors hover:text-gold-300">
              <span aria-hidden>{s.icon}</span>
              <span className="truncate">{s.text}</span>
            </Link>
          </motion.div>
        </AnimatePresence>
        {/* نشانگر اسلایدها */}
        {/* dotnav: پیش‌تر aria-hidden بود ولی دکمه‌های فوکوس‌پذیر داخلش جا داشت (axe: aria-hidden-focus) */}
        <div className="absolute end-3 hidden items-center gap-1 sm:flex" role="group" aria-label="انتخاب اعلان">
          {SLIDES.map((_, k) => (
            <button
              key={k}
              type="button"
              onClick={() => setI(k)}
              aria-label={`اعلان ${k + 1}`}
              className={`h-1.5 rounded-full transition-all ${k === i ? "w-4 bg-gold-400" : "w-1.5 bg-inverse/30"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
