"use client";
import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CreditCard, AlertCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { LinkButton } from "@/components/ui/primitives";

/**
 * This page plays TWO roles in the gateway flow:
 *  1) ورود از checkout (?code=…) → لینک پرداخت از سرور می‌گیرد و به درگاه می‌رود
 *  2) بازگشت از درگاه (?code=…&Authority=…&Status=OK|NOK) → verify سرور-به-سرور
 *     (هیچ‌گاه به state کلاینت یا پارامتر URL اعتماد نمی‌شود — فقط پاسخ verify درگاه)
 */
function PaymentPageInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const code = sp.get("code") ?? "";
  const authority = sp.get("Authority") ?? sp.get("authority") ?? "";
  const gatewayStatus = sp.get("Status") ?? sp.get("status") ?? "";
  const amount = Number(sp.get("amount") ?? 0);
  const getOrder = useStore((s) => s.getOrder);
  const order = getOrder(code);
  const [state, setState] = useState<"checking" | "failed" | "unconfigured">("checking");
  const started = useRef(false);

  useEffect(() => {
    if (!code || started.current) return;
    started.current = true;

    (async () => {
      // ── بازگشت از درگاه: Authority داریم → verify سرور-به-سرور
      if (authority) {
        if (gatewayStatus.toUpperCase() === "NOK") {
          setState("failed");
          return;
        }
        try {
          const res = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, method: "online", remoteRef: authority }),
          });
          const data = (await res.json()) as { state?: string };
          if (data.state === "unconfigured") {
            setState("unconfigured");
          } else if (data.state === "success") {
            router.replace(`/payment/success?code=${encodeURIComponent(code)}&state=success`);
          } else if (data.state === "pending") {
            setState("checking"); // درگاه در حال بررسی است؛ کاربر می‌تواند بعداً دوباره تلاش کند
            setTimeout(() => { started.current = false; }, 4000); // اجازهٔ retry محدود
          } else {
            setState("failed");
          }
        } catch {
          setState("failed");
        }
        return;
      }

      // ── ورود از checkout: هنوز به درگاه نرفته‌ایم → لینک پرداخت از سرور
      try {
        const res = await fetch(`/api/payments/verify?code=${encodeURIComponent(code)}`);
        const data = (await res.json()) as { ok?: boolean; url?: string; message?: string };
        if (data.ok && data.url) {
          window.location.href = data.url; // انتقال امن به درگاه (authority واقعی)
          return;
        }
        setState(data.message?.includes("پیکربندی") ? "unconfigured" : "failed");
      } catch {
        setState("failed");
      }
    })();
  }, [code, authority, gatewayStatus, router]);

  return (
    <div className="container-x flex min-h-[60svh] items-center justify-center py-16">
      <div className="max-w-md text-center rounded-2xl border border-line bg-surface p-10">
        {state === "checking" && (
          <>
            <Loader2 className="size-8 animate-spin mx-auto text-brand-600" aria-hidden />
            <h1 className="mt-5 text-lg font-black text-heading">
              {authority ? "در حال تأیید پرداخت..." : "در حال انتقال به درگاه پرداخت..."}
            </h1>
            <p className="mt-2 text-sm text-muted">
              {authority
                ? <>پاسخ درگاه در حال بررسی امن از سمت سرور هلسا است.</>
                : <>سفارش <span dir="ltr">{code || "—"}</span> ثبت شد؛ در حال اتصال امن به درگاه.</>}
            </p>
          </>
        )}
        {(state === "failed" || state === "unconfigured") && (
          <>
            <span className="inline-flex size-14 rounded-full bg-accent-500/15 text-accent-600 items-center justify-center"><AlertCircle className="size-6" aria-hidden /></span>
            <h1 className="mt-4 text-lg font-black text-heading">پرداخت انجام نشد</h1>
            <p className="mt-2 text-sm text-muted leading-7">
              {state === "unconfigured" ? "درگاه پرداخت آنلاین در این محیط پیکربندی نشده است؛ لطفاً از روش «کارت به کارت» یا «پرداخت در محل» استفاده کنید." : "متأسفانه پرداخت انجام نشد. اطلاعات سفارش شما محفوظ است؛ می‌توانید دوباره تلاش کنید."}
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <LinkButton href={`/checkout?retry=${encodeURIComponent(code)}`} variant="primary">تلاش مجدد</LinkButton>
              <LinkButton href="/checkout" variant="outline">تغییر روش پرداخت</LinkButton>
              <LinkButton href={`/account/orders/${encodeURIComponent(code)}`} variant="ghost">بازگشت به سفارش</LinkButton>
            </div>
            {order && (
              <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted">
                <CreditCard className="size-3.5 text-brand-600" aria-hidden />
                مبلغ: {order.total.toLocaleString("fa-IR")} تومان — سفارش حفظ شده است
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="container-x py-14 min-h-[50svh] grid place-items-center text-sm font-bold text-muted">در حال بارگذاری…</div>}>
      <PaymentPageInner />
    </Suspense>
  );
}
