"use client";
import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { Landmark, ShieldAlert, Loader2, CheckCircle2, XCircle, Ban } from "lucide-react";
import { faDigits } from "@/lib/format";

/**
 * شبیه‌ساز درگاه پرداخت — فقط محیط توسعه (PAYMENTS_SANDBOX=1).
 * دکمه‌ها از مسیر امن سرور (توکن امضاشده) استفاده می‌کنند؛ کل خط لولهٔ
 * واقعی (callback، دوباره‌پرداخت، فاکتور) اجرا می‌شود.
 */
function PaymentSimulatorPageInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const token = sp.get("token") ?? "";
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  // نمایش اطلاعات تراکنش از payload توکن (بدون decode حساس — توکن امضاشده است)
  const [info] = useState<{ code: string; amount: number; method: string }>(() => {
    try {
      const payload = JSON.parse(atob((token.split(".")[1] ?? "").replace(/-/g, "+").replace(/_/g, "/")));
      return { code: String(payload.code ?? "—"), amount: Number(payload.amount ?? 0), method: String(payload.method ?? "online") };
    } catch {
      return { code: "—", amount: 0, method: "online" };
    }
  });

  const isInstallment = info.method === "snappay";

  const run = async (outcome: "success" | "failed" | "cancelled") => {
    setBusy(outcome);
    setMsg("");
    try {
      const res = await fetch("/api/payments/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, outcome }),
      });
      const data = (await res.json()) as { ok?: boolean; redirect?: string; message?: string; state?: string };
      if (data.redirect) {
        router.push(data.redirect);
        return;
      }
      setMsg(data.message ?? `نتیجه: ${data.state ?? "?"}`);
    } catch {
      setMsg("خطای شبکه در شبیه‌سازی");
    }
    setBusy(null);
  };

  return (
    <div className="container-x flex min-h-[75svh] items-center justify-center py-14">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border-2 border-dashed border-gold-400/60 bg-surface p-7 md:p-9">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-brand-700 text-inverse"><Landmark className="size-6" aria-hidden /></span>
            <div>
              <h1 className="text-base font-black text-heading">
                {isInstallment ? "شبیه‌ساز اسنپ‌پی (اقساطی)" : "شبیه‌ساز درگاه پرداخت"}
              </h1>
              <p className="text-[11px] font-bold text-gold-700">محیط توسعه — PAYMENTS_SANDBOX</p>
            </div>
          </div>

          <dl className="mt-6 space-y-2 rounded-xl bg-surface2 border border-line-soft p-4 text-xs">
            <div className="flex justify-between"><dt className="text-muted">سفارش</dt><dd className="font-black text-heading" dir="ltr">{info.code}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">مبلغ</dt><dd className="font-black text-heading">{faDigits(info.amount.toLocaleString("en-US"))} تومان</dd></div>
            <div className="flex justify-between"><dt className="text-muted">روش</dt><dd className="font-bold text-heading">{info.method}</dd></div>
          </dl>

          <p className="mt-4 flex items-start gap-2 rounded-xl border border-gold-400/40 bg-gold-50 p-3 text-[11px] leading-5 text-gold-700">
            <ShieldAlert className="size-4 shrink-0" aria-hidden />
            این صفحه فقط برای تست است. نتیجه از طریق توکن امضاشده به سرور می‌رود و همان
            خط لولهٔ امن واقعی (جلوگیری از دوباره‌پرداخت، فاکتور، لاگ) اجرا می‌شود.
          </p>

          <div className="mt-6 space-y-2.5">
            <button
              onClick={() => run("success")}
              disabled={Boolean(busy)}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-700 py-3 text-sm font-black text-inverse transition-colors hover:bg-brand-800 disabled:opacity-50"
            >
              {busy === "success" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CheckCircle2 className="size-4" aria-hidden />}
              {isInstallment ? "تأیید اقساط (پرداخت موفق)" : "پرداخت موفق"}
            </button>
            <button
              onClick={() => run("failed")}
              disabled={Boolean(busy)}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-accent-400/60 py-3 text-sm font-black text-accent-600 transition-colors hover:bg-accent-50 disabled:opacity-50"
            >
              {busy === "failed" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <XCircle className="size-4" aria-hidden />}
              {isInstallment ? "رد درخواست اقساط" : "پرداخت ناموفق"}
            </button>
            <button
              onClick={() => run("cancelled")}
              disabled={Boolean(busy)}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-line py-3 text-sm font-bold text-muted transition-colors hover:bg-surface2 disabled:opacity-50"
            >
              <Ban className="size-4" aria-hidden />
              انصراف از پرداخت
            </button>
          </div>

          {msg && <p className="mt-4 rounded-xl bg-surface2 border border-line-soft p-3 text-center text-[11px] font-bold text-heading">{msg}</p>}
        </div>
      </div>
    </div>
  );
}

export default function PaymentSimulatorPage() {
  return (
    <Suspense fallback={<div className="container-x py-14 min-h-[50svh] grid place-items-center text-sm font-bold text-muted">در حال بارگذاری…</div>}>
      <PaymentSimulatorPageInner />
    </Suspense>
  );
}
