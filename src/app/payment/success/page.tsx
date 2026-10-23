"use client";
import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { trackEvent } from "@/lib/analytics";
import { CheckCircle2, CalendarDays, CreditCard, Package } from "lucide-react";
import { useStore } from "@/lib/store";
import { LinkButton } from "@/components/ui/primitives";
import { faDate, faDigits, formatToman } from "@/lib/format";

function PaymentSuccessPageInner() {
  const sp = useSearchParams();
  const code = sp.get("code") ?? "";
  const state = sp.get("state") ?? "pending";
  const order = useStore((s) => s.getOrder(code));

  // رویداد purchase — یک‌بار به‌ازای هر کد سفارش (گارد ضدتکرار در refresh)
  useEffect(() => {
    if (!code) return;
    try {
      const key = `helsa-purchase-${code}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
      trackEvent("purchase", { order_code: code, order_state: state, value: order?.total ?? undefined });
    } catch {
      trackEvent("purchase", { order_code: code, order_state: state });
    }
  }, [code, state, order?.total]);

  return (
    <div className="container-x flex min-h-[70svh] items-center justify-center py-16">
      <div className="max-w-lg w-full">
        <div className="rounded-2xl border border-line bg-surface p-8 md:p-10 text-center">
          <span className="inline-flex size-16 rounded-full bg-brand-700 text-inverse items-center justify-center">
            <CheckCircle2 className="size-8" aria-hidden />
          </span>
          <p className="mt-4 text-[11px] font-bold tracking-[0.2em] text-gold-700">{state === "success" ? "پرداخت با موفقیت انجام شد" : "سفارش شما ثبت شد"}</p>
          <h1 className="mt-2 text-2xl font-black text-heading">
            {state === "success" ? "پرداخت با موفقیت انجام شد" : (state === "pending" ? "سفارش شما با موفقیت ثبت شد" : "سفارش شما با موفقیت ثبت شد")}
          </h1>
          <p className="mt-3 text-sm text-muted leading-7">
            {state === "success"
              ? "✅ پرداخت · ✅ ثبت سفارش — تیم هلسا به‌زودی سفارش شما را آماده می‌کند."
              : state === "pending"
                ? "✅ پرداخت (در انتظار تأیید) · ✅ ثبت سفارش — پس از تأیید پرداخت، سفارش آماده‌سازی می‌شود."
                : "✅ ثبت سفارش"}
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-3 text-start">
            <div className="rounded-xl border border-line bg-surface2 p-4">
              <dt className="text-[10.5px] text-muted flex items-center gap-1"><Package className="size-3" aria-hidden /> شماره سفارش</dt>
              <dd className="mt-1 font-black text-heading" dir="ltr">{code || "—"}</dd>
            </div>
            <div className="rounded-xl border border-line bg-surface2 p-4">
              <dt className="text-[10.5px] text-muted flex items-center gap-1"><CreditCard className="size-3" aria-hidden /> مبلغ</dt>
              <dd className="mt-1 font-black text-heading">{order ? formatToman(order.total) : "—"}</dd>
            </div>
            <div className="rounded-xl border border-line bg-surface2 p-4">
              <dt className="text-[10.5px] text-muted flex items-center gap-1"><CalendarDays className="size-3" aria-hidden /> تاریخ</dt>
              <dd className="mt-1 font-black text-heading">{order ? faDate(order.date) : faDigits(new Date().toISOString())}</dd>
            </div>
            <div className="rounded-xl border border-line bg-surface2 p-4">
              <dt className="text-[10.5px] text-muted">روش پرداخت</dt>
              <dd className="mt-1 font-black text-heading">{order ? PAY[order.paymentMethod] ?? order.paymentMethod : "—"}</dd>
            </div>
          </dl>

          {order?.supportContribution ? (
            <p className="mt-4 rounded-xl border border-line bg-surface2 p-3.5 text-xs leading-6 text-muted">
              🌱 مبلغ {formatToman(order.supportContribution)} به‌عنوان مشارکت داوطلبانه در حمایت از تولیدکنندگان ثبت شد؛ ممنون از همراهی شما.
            </p>
          ) : null}
          {order?.note && (
            <p className="mt-4 rounded-xl border border-line bg-surface2 p-3.5 text-xs text-muted leading-6">
              یادداشت سفارش شما: «{order.note}» — همراه سفارش برای تیم هلسا ارسال شد.
            </p>
          )}
          {order?.isGift && (
            <p className="mt-2 rounded-xl border border-line bg-surface2 p-3.5 text-xs text-muted leading-6">
              🎁 این سفارش به‌عنوان هدیه ثبت شد{order.giftRecipient ? ` برای ${order.giftRecipient}` : ""}{order.giftMessage ? ` با پیام «${order.giftMessage}»` : ""} — اطلاعات هدیه همراه سفارش برای تیم هلسا ارسال شد.
            </p>
          )}

          <div className="mt-7 flex flex-wrap justify-center gap-2">
            <LinkButton href={`/account/orders/${encodeURIComponent(code)}`} variant="primary">پیگیری سفارش</LinkButton>
            <LinkButton href={`/account/orders/${encodeURIComponent(code)}`} variant="outline">مشاهده سفارش</LinkButton>
            <LinkButton href="/products" variant="ghost">ادامه خرید</LinkButton>
          </div>
        </div>
      </div>
    </div>
  );
}
const PAY: Record<string, string> = { online: "آنلاین", card: "کارت به کارت", cod: "در محل" };

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="container-x py-14 min-h-[50svh] grid place-items-center text-sm font-bold text-muted">در حال بارگذاری…</div>}>
      <PaymentSuccessPageInner />
    </Suspense>
  );
}
