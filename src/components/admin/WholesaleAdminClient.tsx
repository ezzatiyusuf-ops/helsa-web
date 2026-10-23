"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, PauseCircle, Loader2, RefreshCcw } from "lucide-react";
import { AdminPageHead } from "@/components/admin/AdminShell";
import { Button, Badge } from "@/components/ui/primitives";
import { Input, Select } from "@/components/ui/controls";
import { useToast } from "@/components/ui/Toast";
import { faDate, faDigits } from "@/lib/format";
import { WHOLESALE_BUSINESS_TYPE_LABEL, WHOLESALE_STATUS_LABEL } from "@/config/wholesale";

interface Business {
  id: number; code: string; businessName: string; businessType: string; contactName: string;
  mobile: string; email: string; city: string; discountPercent: number;
  status: "pending" | "approved" | "rejected" | "suspended"; adminNote: string; createdAt: string;
}

export function WholesaleAdminClient() {
  const toast = useToast();
  const [rows, setRows] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [discountDraft, setDiscountDraft] = useState<Record<number, number>>({});
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async (status = filter) => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/admin/wholesale${status ? `?status=${status}` : ""}`, { cache: "no-store" });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.message || "خطا در دریافت فهرست");
      setRows(body.businesses);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در دریافت فهرست");
    } finally { setLoading(false); }
  };

  // initial load (deferred to avoid sync setState in effect)
  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const review = async (b: Business, status: Business["status"], discountPercent?: number) => {
    setBusyId(b.id);
    try {
      const res = await fetch(`/api/admin/wholesale/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...(discountPercent != null ? { discountPercent } : {}) }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) { toast.push(body.message || "ذخیره نشد", "error"); return; }
      toast.push(`${b.businessName}: ${WHOLESALE_STATUS_LABEL[status]}`);
      setRows((rs) => rs.map((r) => (r.id === b.id ? body.business : r)));
    } finally { setBusyId(null); }
  };

  const filtered = rows;

  return (
    <>
      <AdminPageHead title="کسب‌وکارهای عمده (B2B)" desc="تأیید ثبت‌نام‌ها، تعیین درصد تخفیف همکاری و مدیریت وضعیت حساب‌ها." />

      <div className="rounded-2xl border border-line bg-surface p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filter} onChange={(e) => { setFilter(e.target.value); void load(e.target.value); }} aria-label="فیلتر وضعیت">
            <option value="">همه وضعیت‌ها</option>
            <option value="pending">در انتظار تأیید</option>
            <option value="approved">تأییدشده</option>
            <option value="rejected">ردشده</option>
            <option value="suspended">معلق</option>
          </Select>
          <Button variant="outline" size="sm" onClick={() => void load()}><RefreshCcw className="size-3.5" aria-hidden /> به‌روزرسانی</Button>
          {loading && <Loader2 className="size-4 animate-spin text-brand-600" aria-hidden />}
        </div>
      </div>

      {error && <p className="mt-4 rounded-xl border border-accent-500/30 bg-accent-500/10 p-4 text-sm text-accent-600">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <p className="mt-6 rounded-2xl border border-line bg-surface p-8 text-center text-sm text-muted">در این وضعیت کسب‌وکاری ثبت نشده است.</p>
      )}

      <div className="mt-4 space-y-3">
        {filtered.map((b) => (
          <div key={b.id} className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-black text-heading">{b.businessName}</h2>
                  <Badge tone={b.status === "approved" ? "brand" : b.status === "pending" ? "gold" : "ink"}>
                    {WHOLESALE_STATUS_LABEL[b.status] ?? b.status}
                  </Badge>
                  {b.status === "approved" && <Badge tone="gold">{faDigits(b.discountPercent)}٪ همکاری</Badge>}
                </div>
                <p className="mt-1.5 text-[11px] text-muted">
                  {WHOLESALE_BUSINESS_TYPE_LABEL[b.businessType] ?? b.businessType} · {b.contactName} · <span dir="ltr">{b.mobile}</span> · {b.city} · کد <span dir="ltr">{b.code}</span> · {faDate(b.createdAt.slice(0, 10))}
                </p>
                {b.email && <p dir="ltr" className="mt-0.5 text-[10.5px] text-muted text-end md:text-start">{b.email}</p>}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {b.status !== "approved" && (
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number" min={0} max={60} dir="ltr" className="w-20"
                      value={discountDraft[b.id] ?? b.discountPercent ?? 12}
                      onChange={(e) => setDiscountDraft((d) => ({ ...d, [b.id]: Number(e.target.value) }))}
                      aria-label={`درصد تخفیف ${b.businessName}`}
                    />
                    <Button size="sm" disabled={busyId === b.id} onClick={() => void review(b, "approved", discountDraft[b.id] ?? 12)}>
                      {busyId === b.id ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <CheckCircle2 className="size-3.5" aria-hidden />}
                      تأیید
                    </Button>
                  </div>
                )}
                {b.status === "approved" && (
                  <>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number" min={0} max={60} dir="ltr" className="w-20"
                        value={discountDraft[b.id] ?? b.discountPercent}
                        onChange={(e) => setDiscountDraft((d) => ({ ...d, [b.id]: Number(e.target.value) }))}
                        aria-label={`تغییر درصد ${b.businessName}`}
                      />
                      <Button size="sm" variant="outline" disabled={busyId === b.id} onClick={() => void review(b, "approved", discountDraft[b.id] ?? b.discountPercent)}>
                        ثبت درصد
                      </Button>
                    </div>
                    <Button size="sm" variant="outline" disabled={busyId === b.id} onClick={() => void review(b, "suspended")}>
                      <PauseCircle className="size-3.5" aria-hidden /> تعلیق
                    </Button>
                  </>
                )}
                {b.status !== "rejected" && (
                  <Button size="sm" variant="outline" disabled={busyId === b.id} onClick={() => void review(b, "rejected")}>
                    <XCircle className="size-3.5" aria-hidden /> رد
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
