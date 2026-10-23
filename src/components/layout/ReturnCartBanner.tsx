"use client";

/**
 * بنر بازگشتِ سبد رهاشده (CRO — بازیابی سبد).
 * برای بازدیدکنندهٔ بازگشته‌ای که سبدش هنوز پر است (سبد در localStorage ماندگار است)
 * یک نوار جمع‌وجمع نشان می‌دهیم: «X قلم منتظر شماست — ادامهٔ خرید».
 * - فقط سمت کلاینت و بعد از mount رندر می‌شود (بدون hydration mismatch).
 * - با بستن، تا پایان نشست مخفی می‌ماند (sessionStorage).
 * - روی خود صفحات سبد/پرداخت معنا ندارد و مخفی است.
 * - رویداد GTM «cart_return_view» برای اندازه‌گیری.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ShoppingCart, X } from "lucide-react";
import { useStore, cartSubtotal } from "@/lib/store";
import { faDigits, formatToman } from "@/lib/format";
import { trackEvent } from "@/lib/analytics";

const DISMISS_KEY = "helsa-cart-return-dismissed";
const HIDDEN_PREFIXES = ["/cart", "/checkout", "/payment", "/account", "/admin"];

const subscribeNoop = () => () => undefined;

export function ReturnCartBanner() {
  const items = useStore((s) => s.items);
  const pathname = usePathname();
  // الگوی سمت‌کلاینتِ امن (SSR=false) بدون setState همزمان در effect
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        if (sessionStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
      } catch {
        /* حالت خصوصی مرورگر — بنر نشان داده می‌شود */
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  const count = items.reduce((a, i) => a + i.qty, 0);
  const hidden =
    !mounted ||
    dismissed ||
    count === 0 ||
    HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));

  useEffect(() => {
    if (!hidden && count > 0) trackEvent("cart_return_view", { items: count, value: cartSubtotal(items) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidden ? 0 : count]);

  if (hidden) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <aside
      aria-label="سبد خرید باز شما"
      className="border-b border-brand-200/70 bg-brand-50/90 text-brand-900"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6">
        <ShoppingCart className="size-4 shrink-0 text-brand-700" aria-hidden />
        <p className="min-w-0 flex-1 truncate text-[11.5px] font-bold leading-5">
          سبد خرید شما با {faDigits(count)} قلم کالا منتظر شماست ({formatToman(cartSubtotal(items))})
        </p>
        <Link
          href="/cart"
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-700 px-3.5 py-1.5 text-[11px] font-bold text-inverse transition-colors hover:bg-brand-800"
        >
          ادامهٔ خرید
          <ArrowLeft className="size-3.5" aria-hidden />
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="بستن پیام سبد خرید"
          className="shrink-0 rounded-full p-1.5 text-brand-700/70 transition-colors hover:bg-brand-100 hover:text-brand-800"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </aside>
  );
}
