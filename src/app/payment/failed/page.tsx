"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { XCircle, CreditCard } from "lucide-react";
import { useStore } from "@/lib/store";
import { LinkButton } from "@/components/ui/primitives";

function PaymentFailedPageInner() {
  const sp = useSearchParams();
  const code = sp.get("code") ?? "";
  const order = useStore((s) => s.getOrder(code));
  return (
    <div className="container-x flex min-h-[60svh] items-center justify-center py-16">
      <div className="max-w-md w-full text-center rounded-2xl border border-line bg-surface p-10">
        <span className="inline-flex size-14 rounded-full bg-accent-500/15 text-accent-600 items-center justify-center"><XCircle className="size-6" aria-hidden /></span>
        <h1 className="mt-4 text-lg font-black text-heading">پرداخت انجام نشد</h1>
        <p className="mt-2 text-sm text-muted leading-7">پرداخت شما تکمیل نشد؛ مبلغی کسر نشده است. اطلاعات سفارش شما محفوظ می‌ماند و می‌توانید دوباره تلاش کنید.</p>
        {order && (
          <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted">
            <CreditCard className="size-3.5 text-brand-600" aria-hidden />
            مبلغ: {order.total.toLocaleString("fa-IR")} تومان
          </p>
        )}
        <div className="mt-6 flex flex-col gap-2">
          <LinkButton href={`/checkout?retry=${encodeURIComponent(code)}`} variant="primary">تلاش مجدد</LinkButton>
          <LinkButton href="/checkout" variant="outline">تغییر روش پرداخت</LinkButton>
          <LinkButton href={`/account/orders/${encodeURIComponent(code)}`} variant="ghost">بازگشت به سفارش</LinkButton>
        </div>
      </div>
    </div>
  );
}

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={<div className="container-x py-14 min-h-[50svh] grid place-items-center text-sm font-bold text-muted">در حال بارگذاری…</div>}>
      <PaymentFailedPageInner />
    </Suspense>
  );
}
