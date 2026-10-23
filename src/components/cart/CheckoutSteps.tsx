import { Check } from "lucide-react";

/**
 * نشانگر مسیر پرداخت (CRO ج۳۷) — سبد خرید → اطلاعات ارسال → پرداخت → تکمیل سفارش
 * فقط نمایشی است و مرحلهٔ فعلی را برجسته می‌کند؛ مسیر واقعی checkout چندمرحله‌ای موجود است.
 */
const STEPS = [
  { id: "cart", label: "سبد خرید" },
  { id: "shipping", label: "اطلاعات ارسال" },
  { id: "payment", label: "پرداخت" },
  { id: "done", label: "تکمیل سفارش" },
] as const;

export function CheckoutSteps({ current = "cart" }: { current?: (typeof STEPS)[number]["id"] }) {
  const currentIndex = STEPS.findIndex((s) => s.id === current);
  return (
    <nav aria-label="مراحل ثبت سفارش" className="container-x">
      <ol className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar py-1">
        {STEPS.map((step, i) => {
          const active = i === currentIndex;
          const done = i < currentIndex;
          return (
            <li key={step.id} className="flex items-center gap-2 sm:gap-3 shrink-0" aria-current={active ? "step" : undefined}>
              <span
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${
                  active
                    ? "border-brand-700 bg-brand-700 text-inverse"
                    : done
                      ? "border-brand-200 bg-brand-50 text-brand-700"
                      : "border-line bg-surface text-muted"
                }`}
              >
                <span
                  className={`grid size-5 place-items-center rounded-full text-[10px] font-black ${
                    active ? "bg-inverse/20 text-inverse" : done ? "bg-brand-700 text-inverse" : "bg-surface2 text-muted"
                  }`}
                  aria-hidden
                >
                  {done ? <Check className="size-3" /> : `${i + 1}`}
                </span>
                {step.label}
              </span>
              {i < STEPS.length - 1 && <span className="h-px w-4 sm:w-8 bg-line" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
