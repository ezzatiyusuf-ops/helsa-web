"use client";
import { useCallback, useEffect, useState } from "react";
import { AdminPageHead } from "@/components/admin/AdminShell";
import { CARD_RECEIPT_LABELS } from "@/lib/card-payment";
import { faDate, faDigits, formatToman } from "@/lib/format";
import { AlertTriangle, CheckCircle2, Eye, FileText, Loader2, RefreshCw, RotateCcw, XCircle } from "lucide-react";

/** صف رسیدهای کارت‌به‌کارت — verify تصمیمی صریح با تأیید دومرحله‌ای است. */
type Receipt = {
  id: number; status: string; amountDeclared: number; transferDate: string; trackingNumber: string;
  payerName: string; payerCardLast4: string; fileName: string; mimeType: string; fileSize: number;
  submittedAt: string; reviewStartedAt: string | null; reviewedBy: string | null;
  decidedAt: string | null; decisionReason: string;
  orderCode: string; orderTotal: number; orderPaymentStatus: string; orderStatus: string;
};
const TABS = [
  { key: "receipt_submitted", label: "رسید جدید" },
  { key: "pending_verification", label: "در حال بررسی" },
  { key: "verified", label: "تأییدشده" },
  { key: "requires_more_information", label: "نیازمند اطلاعات" },
  { key: "rejected", label: "ردشده" },
] as const;

export default function AdminReceiptsPage() {
  const [tab, setTab] = useState<string>("receipt_submitted");
  const [rows, setRows] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirmVerify, setConfirmVerify] = useState<Receipt | null>(null);
  const [reason, setReason] = useState("");
  const [reasonFor, setReasonFor] = useState<{ id: number; action: "reject" | "request_info" } | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/admin/receipts?status=${encodeURIComponent(tab)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (d.ok) { setRows(d.receipts ?? []); setErr(""); } else { setRows([]); setErr(d.message || "خطا در دریافت رسیدها"); }
      })
      .catch((e) => { if (alive) { setRows([]); setErr(e instanceof Error ? e.message : "خطا"); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [tab]);

  const reload = useCallback(async () => {
    const r = await fetch(`/api/admin/receipts?status=${encodeURIComponent(tab)}`, { cache: "no-store" });
    const d = await r.json();
    if (d.ok) { setRows(d.receipts ?? []); setErr(""); } else setErr(d.message || "خطا در دریافت رسیدها");
    setLoading(false);
  }, [tab]);

  const act = async (id: number, action: string, why?: string) => {
    setBusyId(id); setMsg(""); setErr("");
    try {
      const r = await fetch(`/api/admin/receipts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, reason: why }) });
      const d = await r.json();
      if (!d.ok) throw new Error(d.message || "عملیات انجام نشد");
      setMsg(d.message); await reload();
    } catch (e) { setErr(e instanceof Error ? e.message : "خطا"); }
    setBusyId(null); setConfirmVerify(null); setReasonFor(null); setReason("");
  };

  return (
    <>
      <AdminPageHead title="رسیدهای کارت‌به‌کارت" desc="ارسال رسید به معنای پرداخت نیست؛ فقط «تأیید واریز» سفارش را پرداخت‌شده می‌کند. همهٔ تصمیم‌ها با بازبین، زمان و دلیل ثبت می‌شوند." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => { setLoading(true); setTab(t.key); }}
            className={`rounded-full border px-3.5 py-1.5 text-[11px] font-bold ${tab === t.key ? "border-brand-600 bg-brand-50 text-brand-800" : "border-line bg-surface text-muted hover:border-brand-300"}`}>
            {t.label}
          </button>
        ))}
        <button onClick={() => { setLoading(true); void reload(); }} className="ms-auto inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-[11px] font-bold text-muted"><RefreshCw className="size-3.5" aria-hidden /> به‌روزرسانی</button>
      </div>

      {msg && <p className="mb-3 rounded-xl border border-brand-300 bg-brand-50 p-3 text-xs font-bold text-brand-800" role="status">{msg}</p>}
      {err && <p className="mb-3 rounded-xl border border-accent-400 bg-accent-50 p-3 text-xs font-bold text-accent-700" role="alert">{err}</p>}
      {loading && <p className="flex items-center gap-2 text-sm text-muted"><Loader2 className="size-4 animate-spin" aria-hidden /> در حال بارگذاری…</p>}
      {!loading && rows.length === 0 && <p className="text-xs text-muted">در این بخش رسیدی نیست.</p>}

      <div className="space-y-3">
        {rows.map((r) => {
          const mismatch = r.amountDeclared > 0 && r.amountDeclared !== r.orderTotal;
          return (
            <article key={r.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-surface2 px-2.5 py-1 text-[11px] font-black text-heading" dir="ltr">{r.orderCode}</span>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${r.status === "verified" ? "bg-brand-50 text-brand-800" : r.status === "rejected" ? "bg-accent-50 text-accent-700" : "bg-gold-50 text-gold-800"}`}>
                    {CARD_RECEIPT_LABELS[r.status as keyof typeof CARD_RECEIPT_LABELS] ?? r.status}
                  </span>
                  {r.orderPaymentStatus === "paid" && <span className="rounded-full bg-brand-700 px-2.5 py-1 text-[10px] font-bold text-white">سفارش پرداخت‌شده</span>}
                  {mismatch && <span className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-2.5 py-1 text-[10px] font-bold text-accent-700"><AlertTriangle className="size-3" aria-hidden /> مبلغ اعلامی با سفارش نمی‌خواند</span>}
                </div>
                <span className="text-[10px] text-faint">{faDate(r.submittedAt)}</span>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] sm:grid-cols-4">
                <div><dt className="text-muted">مبلغ سفارش</dt><dd className="font-bold text-heading">{formatToman(r.orderTotal)}</dd></div>
                <div><dt className="text-muted">مبلغ اعلامی</dt><dd className={`font-bold ${mismatch ? "text-accent-700" : "text-heading"}`}>{r.amountDeclared ? formatToman(r.amountDeclared) : "—"}</dd></div>
                <div><dt className="text-muted">پیگیری واریز</dt><dd className="font-bold text-heading" dir="ltr">{r.trackingNumber || "—"}</dd></div>
                <div><dt className="text-muted">تاریخ واریز</dt><dd className="font-bold text-heading">{r.transferDate || "—"}</dd></div>
                <div><dt className="text-muted">پرداخت‌کننده</dt><dd className="font-bold text-heading">{r.payerName || "—"}</dd></div>
                <div><dt className="text-muted">۴ رقم آخر کارت</dt><dd className="font-bold text-heading" dir="ltr">{r.payerCardLast4 ? `•••• ${r.payerCardLast4}` : "—"}</dd></div>
                <div><dt className="text-muted">فایل</dt><dd className="font-bold text-heading">{faDigits((r.fileSize / 1024).toFixed(0))} کیلوبایت</dd></div>
                <div><dt className="text-muted">بازبین</dt><dd className="font-bold text-heading">{r.reviewedBy ?? "—"}</dd></div>
              </dl>

              {r.decisionReason && <p className="mt-2 rounded-lg bg-surface2 p-2.5 text-[11px] leading-6 text-muted">دلیل ثبت‌شده: {r.decisionReason}</p>}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <a href={`/api/admin/receipts/${r.id}/file`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-[11px] font-bold text-muted hover:border-brand-300 hover:text-brand-700">
                  {r.mimeType === "application/pdf" ? <FileText className="size-3.5" aria-hidden /> : <Eye className="size-3.5" aria-hidden />} مشاهدهٔ رسید
                </a>
                {r.status === "receipt_submitted" && (
                  <button disabled={busyId === r.id} onClick={() => act(r.id, "claim")} className="rounded-lg border border-gold-300 bg-gold-50 px-3 py-1.5 text-[11px] font-bold text-gold-800 disabled:opacity-50">شروع بازبینی</button>
                )}
                {r.status === "pending_verification" && (
                  <>
                    <button disabled={busyId === r.id} onClick={() => setConfirmVerify(r)} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"><CheckCircle2 className="size-3.5" aria-hidden /> تأیید واریز</button>
                    <button disabled={busyId === r.id} onClick={() => { setReasonFor({ id: r.id, action: "request_info" }); setReason(""); }} className="inline-flex items-center gap-1.5 rounded-lg border border-gold-300 px-3 py-1.5 text-[11px] font-bold text-gold-800 disabled:opacity-50"><AlertTriangle className="size-3.5" aria-hidden /> اطلاعات بیشتر</button>
                    <button disabled={busyId === r.id} onClick={() => { setReasonFor({ id: r.id, action: "reject" }); setReason(""); }} className="inline-flex items-center gap-1.5 rounded-lg border border-accent-400 px-3 py-1.5 text-[11px] font-bold text-accent-700 disabled:opacity-50"><XCircle className="size-3.5" aria-hidden /> رد رسید</button>
                  </>
                )}
                {r.status === "verified" && r.orderPaymentStatus === "paid" && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-[11px] font-bold text-brand-800"><CheckCircle2 className="size-3.5" aria-hidden /> پرداخت ثبت شد{r.decidedAt ? ` — ${faDate(r.decidedAt)}` : ""}</span>
                )}
                {r.status === "requires_more_information" && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-gold-50 px-3 py-1.5 text-[11px] font-bold text-gold-800"><RotateCcw className="size-3.5" aria-hidden /> در انتظار ارسال مجدد مشتری</span>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {confirmVerify && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="verify-title">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
            <h2 id="verify-title" className="text-sm font-black text-heading">تأیید واریز سفارش {confirmVerify.orderCode}</h2>
            <p className="mt-2 text-[11px] leading-6 text-muted">
              این عمل سفارش را <b>پرداخت‌شده</b> می‌کند، فاکتور صادر می‌شود و کالا وارد جریان ارسال می‌شود.
              پیش از تأیید، واریز مبلغ <b>{formatToman(confirmVerify.orderTotal)}</b> را در حساب بانکی هلسا بررسی کنید.
            </p>
            {confirmVerify.amountDeclared > 0 && confirmVerify.amountDeclared !== confirmVerify.orderTotal && (
              <p className="mt-2 rounded-lg border border-accent-400 bg-accent-50 p-2.5 text-[11px] font-bold text-accent-700">هشدار: مبلغ اعلامی ({formatToman(confirmVerify.amountDeclared)}) با مبلغ سفارش برابر نیست.</p>
            )}
            <label className="mt-3 block text-[11px]">
              <span className="mb-1 block font-bold text-heading">یادداشت بازبینی (اختیاری)</span>
              <input value={reason} onChange={(e) => setReason(e.target.value.slice(0, 1000))} className="w-full rounded-xl border border-line bg-surface2 px-3 py-2 text-xs text-heading outline-none focus:border-brand-500" placeholder="مثلاً استعلام حساب بانکی انجام شد" />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => { setConfirmVerify(null); setReason(""); }} className="rounded-xl border border-line px-4 py-2 text-[11px] font-bold text-muted">انصراف</button>
              <button disabled={busyId === confirmVerify.id} onClick={() => act(confirmVerify.id, "verify", reason)} className="rounded-xl bg-brand-700 px-4 py-2 text-[11px] font-bold text-white disabled:opacity-50">{busyId === confirmVerify.id ? "در حال ثبت…" : "بله، واریز تأیید شد"}</button>
            </div>
          </div>
        </div>
      )}

      {reasonFor && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="reason-title">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
            <h2 id="reason-title" className="text-sm font-black text-heading">{reasonFor.action === "reject" ? "ثبت رد رسید" : "درخواست اطلاعات بیشتر"}</h2>
            <p className="mt-1 text-[11px] text-muted">دلیل برای مشتری نمایش داده می‌شود و در سابقهٔ حسابرسی ثبت می‌گردد.</p>
            <label className="mt-3 block text-[11px]">
              <span className="mb-1 block font-bold text-heading">دلیل (الزامی)</span>
              <textarea value={reason} onChange={(e) => setReason(e.target.value.slice(0, 1000))} rows={3} className="w-full rounded-xl border border-line bg-surface2 px-3 py-2 text-xs text-heading outline-none focus:border-brand-500" />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setReasonFor(null)} className="rounded-xl border border-line px-4 py-2 text-[11px] font-bold text-muted">انصراف</button>
              <button disabled={!reason.trim() || busyId === reasonFor.id} onClick={() => act(reasonFor.id, reasonFor.action, reason)} className="rounded-xl bg-brand-700 px-4 py-2 text-[11px] font-bold text-white disabled:opacity-50">ثبت تصمیم</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
