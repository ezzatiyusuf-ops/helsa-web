"use client";

/**
 * HELSA — compact windowed pagination.
 * الگوی فشرده: 1 … 7 8 9 … 15 (به‌جای نمایش همهٔ شماره‌ها)
 * شامل: اولین/آخرین صفحه، قبلی/بعدی، هایلایت صفحهٔ فعال، ریسپانسیو موبایل.
 */
import { IconNext, IconPrev } from "@/lib/i18n";
import { faDigits } from "@/lib/format";
import { ChevronsLeft, ChevronsRight } from "lucide-react";

type Item = number | "…";

/** ساخت لیست فشردهٔ صفحات با ellipsis هوشمند */
export function windowedPages(page: number, total: number, siblings = 1): Item[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const nums = new Set<number>([1, total]);
  for (let n = Math.max(2, page - siblings); n <= Math.min(total - 1, page + siblings); n++) nums.add(n);
  // نزدیکی لبه‌ها: باز کردن پنجره برای خوانایی
  if (page <= 4) for (const n of [2, 3, 4]) if (n < total) nums.add(n);
  if (page >= total - 3) for (const n of [total - 3, total - 2, total - 1]) if (n > 1) nums.add(n);
  const sorted = [...nums].sort((a, b) => a - b);
  const out: Item[] = [];
  let prev = 0;
  for (const n of sorted) {
    if (n - prev > 1) out.push("…");
    out.push(n);
    prev = n;
  }
  return out;
}

export default function Pagination({
  page,
  totalPages,
  onChange,
  label,
  prevLabel,
  nextLabel,
}: {
  page: number;
  totalPages: number;
  onChange: (n: number) => void;
  label: string;
  prevLabel: string;
  nextLabel: string;
}) {
  if (totalPages <= 1) return null;
  const items = windowedPages(page, totalPages);

  const step = (
    dir: "first" | "prev" | "next" | "last",
    disabled: boolean,
    children: React.ReactNode,
    aria: string,
  ) => (
    <button
      type="button"
      onClick={() => {
        if (disabled) return;
        onChange(dir === "first" ? 1 : dir === "last" ? totalPages : page + (dir === "next" ? 1 : -1));
      }}
      disabled={disabled}
      aria-label={aria}
      title={aria}
      className="inline-flex size-10 items-center justify-center rounded-full border border-line text-heading transition-all duration-200 hover:bg-surface2 hover:border-brand-300 active:scale-95 disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  );

  return (
    <nav
      className="mt-10 flex flex-wrap items-center justify-center gap-1.5"
      aria-label={label}
      data-testid="pagination"
    >
      {/* اولین صفحه — فقط دسکتاپ/تبلت */}
      <span className="hidden sm:inline-flex">
        {step("first", page === 1, <ChevronsRight className="size-4" aria-hidden />, "اولین صفحه")}
      </span>

      {/* قبلی — موبایل: فقط آیکون */}
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        aria-label={prevLabel}
        className="inline-flex h-10 items-center gap-1 rounded-full border border-line px-3 text-xs font-bold text-heading transition-all duration-200 hover:bg-surface2 hover:border-brand-300 active:scale-95 disabled:pointer-events-none disabled:opacity-35 sm:px-4"
      >
        <IconPrev className="size-4" aria-hidden /> <span className="hidden sm:inline">{prevLabel}</span>
      </button>

      {items.map((it, i) =>
        it === "…" ? (
          <span key={`e${i}`} aria-hidden className="inline-flex h-10 w-6 select-none items-center justify-center text-xs font-bold text-faint">
            …
          </span>
        ) : (
          <button
            key={it}
            type="button"
            onClick={() => onChange(it)}
            aria-current={it === page ? "page" : undefined}
            aria-label={`صفحهٔ ${faDigits(it)}`}
            className={`inline-flex size-10 items-center justify-center rounded-full text-xs font-bold transition-all duration-200 active:scale-95 ${
              it === page
                ? "bg-brand-700 text-inverse shadow-soft scale-105"
                : "border border-line text-heading hover:bg-surface2 hover:border-brand-300"
            }`}
          >
            {faDigits(it)}
          </button>
        ),
      )}

      {/* بعدی — موبایل: فقط آیکون */}
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        aria-label={nextLabel}
        className="inline-flex h-10 items-center gap-1 rounded-full border border-line px-3 text-xs font-bold text-heading transition-all duration-200 hover:bg-surface2 hover:border-brand-300 active:scale-95 disabled:pointer-events-none disabled:opacity-35 sm:px-4"
      >
        <span className="hidden sm:inline">{nextLabel}</span> <IconNext className="size-4" aria-hidden />
      </button>

      {/* آخرین صفحه — فقط دسکتاپ/تبلت */}
      <span className="hidden sm:inline-flex">
        {step("last", page === totalPages, <ChevronsLeft className="size-4" aria-hidden />, "آخرین صفحه")}
      </span>
    </nav>
  );
}
