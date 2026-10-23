"use client";
import { useEffect, useState } from "react";
import { ListTree, UserRound } from "lucide-react";
import Link from "next/link";

/**
 * تجربهٔ خواندن پرمیوم (فاز ۱۲):
 * - نوار پیشرفت مطالعه — ۳px طلایی، سمت چپ ثابت (RTL)
 * - فهرست مطالب چسبان با اسکرول‌اسپای — فقط وقتی مقاله heading داشته باشد
 */
export function ReadingProgress() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setPct(max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="fixed top-0 inset-x-0 z-[80] h-[3px] bg-transparent pointer-events-none" aria-hidden>
      <div
        className="h-full bg-gradient-to-l from-gold-400 to-gold-600 transition-[width] duration-150 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Toc({ items }: { items: { id: string; text: string }[] }) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    if (!items.length) return;
    const heads = items.map((i) => document.getElementById(i.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-20% 0px -65% 0px" }
    );
    heads.forEach((h) => io.observe(h));
    return () => io.disconnect();
  }, [items]);
  if (items.length < 2) return null;
  return (
    <nav aria-label="فهرست مطالب" className="hidden lg:block">
      <p className="flex items-center gap-2 text-[11px] font-black tracking-wide text-heading">
        <ListTree className="size-4 text-gold-700" aria-hidden /> فهرست مطالب
      </p>
      <ul className="mt-4 space-y-1 border-s border-line/80">
        {items.map((i) => (
          <li key={i.id}>
            <a
              href={`#${i.id}`}
              className={`-ms-px block border-s-2 py-1.5 ps-4 text-[12px] leading-6 transition-colors ${
                active === i.id ? "border-gold-500 font-bold text-heading" : "border-transparent text-muted hover:text-heading"
              }`}
            >
              {i.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function AuthorCard({ name, role, href }: { name: string; role?: string; href?: string }) {
  return (
    <div className="mt-10 flex items-center gap-4 rounded-2xl border border-line/70 bg-surface p-5 shadow-soft">
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
        <UserRound className="size-5" aria-hidden />
      </span>
      <div className="flex-1">
        <p className="text-[10.5px] text-muted">نویسنده</p>
        <p className="mt-0.5 text-sm font-black text-heading">{name}</p>
        {role && <p className="mt-0.5 text-[11px] text-muted">{role}</p>}
      </div>
      {href && (
        <Link href={href} className="shrink-0 rounded-full border border-line px-4 py-2 text-[11px] font-bold text-heading transition-colors hover:border-brand-300 hover:bg-brand-50">
          بیشتر بدانید
        </Link>
      )}
    </div>
  );
}
