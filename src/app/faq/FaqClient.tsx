"use client";
import { useState } from "react";
import { ChevronDown, MessageCircleQuestion } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { FAQ_ITEMS } from "@/data/content";
import { PageHeader } from "@/components/layout/PageHeader";
import { Reveal, LinkButton } from "@/components/ui/primitives";
import { JsonLd } from "@/components/seo/JsonLd";
import { faqSchema } from "@/lib/seo";

const CATEGORIES = ["همه", "سفارش", "پرداخت", "ارسال", "مرجوعی", "محصولات", "حساب کاربری"];

export default function FaqClient() {
  const [cat, setCat] = useState("همه");
  const [open, setOpen] = useState<number | null>(0);
  const filtered = cat === "همه" ? FAQ_ITEMS : FAQ_ITEMS.filter((f) => f.cat === cat);
  const hasAccount = FAQ_ITEMS.filter((f) => f.cat === "حساب کاربری");

  return (
    <>
      <JsonLd data={faqSchema(FAQ_ITEMS.map((f) => ({ q: f.q, a: f.a })))} />
      <PageHeader title="سوالات متداول" desc="پاسخ پرسش‌های پرتکرار شما درباره سفارش، پرداخت، ارسال، مرجوعی و حساب کاربری." crumbs={[{ label: "خانه", href: "/" }, { label: "سوالات متداول", href: "/faq" }]} />
      <div className="container-x py-14 max-w-3xl">
        {/* category tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-8" role="tablist" aria-label="دسته‌بندی سوالات">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              role="tab"
              aria-selected={cat === c}
              onClick={() => { setCat(c); setOpen(0); }}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold border transition-colors ${cat === c ? "bg-brand-700 text-inverse border-brand-700" : "border-line text-muted hover:border-brand-400"}`}
            >
              {c}
            </button>
          ))}
        </div>

        {cat === "حساب کاربری" && hasAccount.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-muted">سوالی در دسته «حساب کاربری» ثبت نشده؛ به بخش‌های دیگر مراجعه کنید.</p>
        ) : null}

        <div className="space-y-3">
          {filtered.map((f, i) => (
            <Reveal key={f.q} delay={i * 0.03}>
              <div className="rounded-2xl border border-line bg-surface overflow-hidden">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  aria-expanded={open === i}
                  className="w-full flex items-center justify-between gap-4 p-5 text-start"
                >
                  <span className="text-sm font-black text-heading flex items-center gap-3">
                    <span className="size-8 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
                      <MessageCircleQuestion className="size-4" aria-hidden />
                    </span>
                    {f.q}
                  </span>
                  <ChevronDown className={`size-5 text-brand-600 transition-transform duration-300 ${open === i ? "rotate-180" : ""}`} aria-hidden />
                </button>
                <AnimatePresence initial={false}>
                  {open === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
                      <p className="px-5 pb-5 ps-16 text-sm leading-8 text-body">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-10 text-center">
          <p className="text-sm text-muted mb-4">پاسخ خود را پیدا نکردید؟</p>
          <LinkButton href="/contact" variant="outline">تماس با پشتیبانی هلسا</LinkButton>
        </Reveal>
      </div>
    </>
  );
}
