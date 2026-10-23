"use client";
import { useCallback, useEffect, useState } from "react";
import { AdminPageHead } from "@/components/admin/AdminShell";
import { PRODUCER_LABELS } from "@/lib/producer";
import { faDate } from "@/lib/format";
import { AlertTriangle, BadgeCheck, Loader2, RefreshCw, Rocket, ShieldOff, Undo2 } from "lucide-react";

/** مدیریت روزیته — انتشار تنها راه دیده‌شدن عمومی؛ رد/تعلیق دلیل اجباری دارند. */
type Producer = {
  id: number; slug: string; displayName: string; region: string; craft: string;
  bio: string; story: string; socialImpact: string; certifications: string[];
  contactName: string; contactPhone: string; contactEmail: string;
  status: string; submittedAt: string; reviewedBy: string | null; reviewedAt: string | null;
  decisionReason: string; publishedAt: string | null;
};
const TABS = [
  { key: "submitted", label: "در انتظار بررسی" },
  { key: "approved", label: "تأییدشده (منتشرنشده)" },
  { key: "published", label: "منتشرشده" },
  { key: "unavailable", label: "تعلیق" },
  { key: "rejected", label: "ردشده" },
] as const;

export default function AdminRoozitehPage() {
  const [tab, setTab] = useState<string>("submitted");
  const [rows, setRows] = useState<Producer[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [reasonFor, setReasonFor] = useState<{ id: number; action: "reject" | "take_down"; name: string } | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async (status: string) => {
    const r = await fetch(`/api/admin/producers?status=${encodeURIComponent(status)}`, { cache: "no-store" });
    const d = await r.json();
    if (d.ok) { setRows(d.producers ?? []); setErr(""); } else setErr(d.message || "خطا در دریافت فهرست");
    setLoading(false);
  }, []);

  useEffect(() => {
    let alive = true;
    fetch(`/api/admin/producers?status=${encodeURIComponent(tab)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (d.ok) { setRows(d.producers ?? []); setErr(""); } else { setRows([]); setErr(d.message || "خطا در دریافت فهرست"); }
      })
      .catch((e) => { if (alive) { setRows([]); setErr(e instanceof Error ? e.message : "خطا"); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [tab]);

  const act = async (id: number, action: string, why?: string) => {
    setBusyId(id); setMsg(""); setErr("");
    try {
      const r = await fetch(`/api/admin/producers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, reason: why }) });
      const d = await r.json();
      if (!d.ok) throw new Error(d.message || "عملیات انجام نشد");
      setMsg(d.message); await load(tab);
    } catch (e) { setErr(e instanceof Error ? e.message : "خطا"); }
    setBusyId(null); setReasonFor(null); setReason("");
  };

  return (
    <>
      <AdminPageHead title="روزیته — تولیدکنندگان" desc="هیچ پروفایلی بدون «تأیید» و سپس «انتشار» در سایت دیده نمی‌شود. محصولات متصل به تولیدکنندهٔ منتشرنشده هم از کاتالوگ عمومی حذف می‌مانند." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => { setLoading(true); setTab(t.key); }}
            className={`rounded-full border px-3.5 py-1.5 text-[11px] font-bold ${tab === t.key ? "border-brand-600 bg-brand-50 text-brand-800" : "border-line bg-surface text-muted hover:border-brand-300"}`}>
            {t.label}
          </button>
        ))}
        <button onClick={() => { setLoading(true); void load(tab); }} className="ms-auto inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-[11px] font-bold text-muted"><RefreshCw className="size-3.5" aria-hidden /> به‌روزرسانی</button>
      </div>

      {msg && <p className="mb-3 rounded-xl border border-brand-300 bg-brand-50 p-3 text-xs font-bold text-brand-800" role="status">{msg}</p>}
      {err && <p className="mb-3 rounded-xl border border-accent-400 bg-accent-50 p-3 text-xs font-bold text-accent-700" role="alert">{err}</p>}
      {loading && <p className="flex items-center gap-2 text-sm text-muted"><Loader2 className="size-4 animate-spin" aria-hidden /> در حال بارگذاری…</p>}
      {!loading && rows.length === 0 && <p className="text-xs text-muted">در این بخش درخواستی نیست.</p>}

      <div className="space-y-3">
        {rows.map((p) => (
          <article key={p.id} className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-black text-heading">{p.displayName}</span>
                <span className="rounded-full bg-surface2 px-2.5 py-1 text-[10px] font-bold text-muted" dir="ltr">{p.slug}</span>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${p.status === "published" ? "bg-brand-50 text-brand-800" : p.status === "rejected" ? "bg-accent-50 text-accent-700" : "bg-gold-50 text-gold-800"}`}>
                  {PRODUCER_LABELS[p.status as keyof typeof PRODUCER_LABELS] ?? p.status}
                </span>
              </div>
              <span className="text-[10px] text-faint">{faDate(p.submittedAt)}</span>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] sm:grid-cols-4">
              <div><dt className="text-muted">منطقه</dt><dd className="font-bold text-heading">{p.region || "—"}</dd></div>
              <div><dt className="text-muted">حوزهٔ تولید</dt><dd className="font-bold text-heading">{p.craft || "—"}</dd></div>
              <div><dt className="text-muted">تماس</dt><dd className="font-bold text-heading" dir="ltr">{p.contactPhone || "—"}</dd></div>
              <div><dt className="text-muted">مسئول</dt><dd className="font-bold text-heading">{p.contactName || "—"}</dd></div>
            </dl>

            <p className="mt-2 rounded-lg bg-surface2 p-2.5 text-[11px] leading-6 text-muted">{p.bio || "بدون معرفی"}</p>
            {p.story && <details className="mt-2 text-[11px] text-muted"><summary className="cursor-pointer font-bold text-heading">داستان کارگاه</summary><p className="mt-1.5 whitespace-pre-line leading-6">{p.story}</p></details>}
            {p.socialImpact && <details className="mt-1 text-[11px] text-muted"><summary className="cursor-pointer font-bold text-heading">تأثیر اجتماعی (اعلام تولیدکننده)</summary><p className="mt-1.5 whitespace-pre-line leading-6">{p.socialImpact}</p></details>}
            {p.certifications.length > 0 && <p className="mt-2 text-[11px] text-muted">گواهی‌های اعلامی: {p.certifications.join("، ")}</p>}
            {p.decisionReason && <p className="mt-2 rounded-lg bg-surface2 p-2.5 text-[11px] leading-6 text-muted">دلیل ثبت‌شده: {p.decisionReason}</p>}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {p.status === "submitted" && (
                <>
                  <button disabled={busyId === p.id} onClick={() => act(p.id, "approve")} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"><BadgeCheck className="size-3.5" aria-hidden /> تأیید</button>
                  <button disabled={busyId === p.id} onClick={() => { setReasonFor({ id: p.id, action: "reject", name: p.displayName }); setReason(""); }} className="inline-flex items-center gap-1.5 rounded-lg border border-accent-400 px-3 py-1.5 text-[11px] font-bold text-accent-700 disabled:opacity-50"><AlertTriangle className="size-3.5" aria-hidden /> رد</button>
                </>
              )}
              {p.status === "approved" && (
                <>
                  <button disabled={busyId === p.id} onClick={() => act(p.id, "publish")} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"><Rocket className="size-3.5" aria-hidden /> انتشار عمومی</button>
                  <button disabled={busyId === p.id} onClick={() => { setReasonFor({ id: p.id, action: "reject", name: p.displayName }); setReason(""); }} className="rounded-lg border border-accent-400 px-3 py-1.5 text-[11px] font-bold text-accent-700 disabled:opacity-50">رد</button>
                </>
              )}
              {p.status === "published" && (
                <>
                  <a href={`/rooziteh/${encodeURIComponent(p.slug)}`} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-line px-3 py-1.5 text-[11px] font-bold text-muted">مشاهدهٔ صفحهٔ عمومی</a>
                  <button disabled={busyId === p.id} onClick={() => { setReasonFor({ id: p.id, action: "take_down", name: p.displayName }); setReason(""); }} className="inline-flex items-center gap-1.5 rounded-lg border border-gold-300 px-3 py-1.5 text-[11px] font-bold text-gold-800 disabled:opacity-50"><ShieldOff className="size-3.5" aria-hidden /> تعلیق موقت</button>
                </>
              )}
              {p.status === "unavailable" && (
                <button disabled={busyId === p.id} onClick={() => act(p.id, "restore")} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"><Undo2 className="size-3.5" aria-hidden /> بازگردانی انتشار</button>
              )}
              {p.status === "rejected" && (
                <button disabled={busyId === p.id} onClick={() => act(p.id, "resubmit")} className="rounded-lg border border-line px-3 py-1.5 text-[11px] font-bold text-muted disabled:opacity-50">بازگشت به صف بررسی</button>
              )}
            </div>
          </article>
        ))}
      </div>

      {reasonFor && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="p-reason-title">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
            <h2 id="p-reason-title" className="text-sm font-black text-heading">{reasonFor.action === "reject" ? `رد درخواست ${reasonFor.name}` : `تعلیق ${reasonFor.name}`}</h2>
            <p className="mt-1 text-[11px] text-muted">دلیل در سابقه ثبت می‌شود و مبنای اطلاع‌رسانی به تولیدکننده است.</p>
            <label className="mt-3 block text-[11px]">
              <span className="mb-1 block font-bold text-heading">دلیل (الزامی)</span>
              <textarea value={reason} onChange={(e) => setReason(e.target.value.slice(0, 2000))} rows={3} className="w-full rounded-xl border border-line bg-surface2 px-3 py-2 text-xs text-heading outline-none focus:border-brand-500" />
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
