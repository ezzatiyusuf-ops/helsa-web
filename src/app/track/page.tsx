"use client";
import { useState, useSyncExternalStore } from "react";
import { Search, Package, Check, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/primitives";
import { faDigits, formatToman } from "@/lib/format";

const STATUS_LABEL: Record<string, string> = {
  pending: "در انتظار پرداخت",
  paid: "پرداخت شده",
  preparing: "در حال آماده‌سازی",
  shipped: "تحویل به پست",
  transit: "در مسیر",
  delivered: "تحویل شده",
  cancelled: "لغو شده",
  refunded: "مرجوع شده",
};

type Tracked = {
  code: string;
  status: string;
  paymentStatus: string;
  total: number;
  createdAt: string;
  items: { name: string; qty: number; price: number; meta?: string }[];
};

export default function TrackPage() {
  const [mobile, setMobile] = useState("");
  // deep-link support: /track?code=HLA-XXXX prefills the form (payment success → track)
  // مقدار کوئری به‌عنوان external store خوانده می‌شود: در SSR/هیدریشن خالی (قطعی) و فقط
  // بعد از mount مقدار واقعی می‌آید — بدون setState همگام داخل effect.
  const deepLinkCode = useSyncExternalStore(
    () => () => {}, // پارامتر کوئری فقط با ناوبری تازه می‌شود
    () => (new URLSearchParams(window.location.search).get("code") ?? "").trim().toUpperCase(),
    () => "",
  );
  const [editedCode, setEditedCode] = useState<string | null>(null);
  const code = editedCode ?? deepLinkCode;
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<Tracked | null>(null);
  const steps = ["pending", "paid", "preparing", "shipped", "transit", "delivered"];

  const search = async () => {
    setErr("");
    setFound(null);
    setBusy(true);
    try {
      const res = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), mobile: mobile.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErr(data.message || "سفارشی با این مشخصات پیدا نشد؛ شماره سفارش و موبایل را بررسی کنید.");
        return;
      }
      setFound(data.order);
    } catch {
      setErr("متأسفانه مشکلی پیش آمد. دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="پیگیری سفارش" desc="وضعیت سفارش خود را با شماره سفارش و شماره موبایل پیگیری کنید." crumbs={[{ label: "خانه", href: "/" }, { label: "پیگیری سفارش", href: "/track" }]} />
      <div className="container-x py-14 max-w-2xl">
        <div className="rounded-2xl border border-line bg-surface p-6 md:p-8">
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-bold text-heading mb-1.5 block">شماره سفارش</span>
              <input value={code} onChange={(e) => setEditedCode(e.target.value)} className={cls} placeholder="مثلاً HLA-1234567" dir="ltr" />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-heading mb-1.5 block">شماره موبایل</span>
              <input value={mobile} onChange={(e) => setMobile(e.target.value.replace(/[^\d]/g, ""))} className={cls} placeholder="۰۹۱۲۳۴۵۶۷۸۹" dir="ltr" inputMode="numeric" />
            </label>
          </div>
          <Button className="mt-5" onClick={search} disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Search className="size-4" aria-hidden />} پیگیری</Button>
          {err && <p className="mt-3 text-[11px] font-bold text-accent-600">{err}</p>}
        </div>

        {found && (
          <div className="mt-6 rounded-2xl border border-line bg-surface p-6 md:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-heading" dir="ltr">{found.code}</p>
                <p className="text-[11px] text-muted mt-1">{faDigits(found.items.length)} قلم · {formatToman(found.total)}</p>
              </div>
              <span className="rounded-full bg-brand-700 text-inverse px-3 py-1 text-[11px] font-bold">{STATUS_LABEL[found.status] ?? found.status}</span>
            </div>
            <div className="rounded-2xl border border-line-soft bg-surface2 p-5">
              <p className="text-xs font-bold text-heading mb-3">مراحل ارسال</p>
              <ol className="flex flex-wrap gap-2">
                {steps.map((s, i) => {
                  const idx = steps.indexOf(found.status);
                  const done = idx >= 0 && i <= idx;
                  return (
                    <li key={s} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ${done ? "bg-brand-700 text-inverse" : "bg-surface text-muted border border-line"}`}>
                      {done ? <Check className="size-3" aria-hidden /> : <Package className="size-3" aria-hidden />}
                      {STATUS_LABEL[s]}
                    </li>
                  );
                })}
              </ol>
            </div>
            <div>
              <h2 className="text-sm font-black text-heading mb-3">اقلام</h2>
              <ul className="space-y-2">
                {found.items.map((it, i) => (
                  <li key={`${it.name}-${i}`} className="flex items-center justify-between gap-3 rounded-xl border border-line-soft bg-surface2 px-4 py-3 text-xs">
                    <span className="font-bold text-heading">{it.name}</span>
                    <span className="text-muted">{faDigits(it.qty)} × {formatToman(it.price)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
const cls = "w-full h-11 rounded-xl border border-line bg-surface2 px-4 text-sm text-heading placeholder:text-muted outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 transition-[border-color,box-shadow,background-color]";
