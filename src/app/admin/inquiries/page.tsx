"use client";
import { useEffect, useState } from "react";
import { AdminPageHead } from "@/components/admin/AdminShell";
import { faDigits, formatToman } from "@/lib/format";

type Corp = { code: string; companyName: string; contactName: string; mobile: string; quantity: number; status: string; indicativeTotal: number | null; createdAt: string };
type Ws = { code: string; companyName: string; contactName: string; mobile: string; businessType: string; city: string; status: string; createdAt: string };
type Rev = { id: number; productId: number; productName: string | null; author: string; rating: number; title: string; text: string; verifiedPurchase: boolean; isApproved: boolean; createdAt: string };

export default function AdminInquiriesPage() {
  const [corporate, setCorporate] = useState<Corp[]>([]);
  const [wholesale, setWholesale] = useState<Ws[]>([]);
  const [pendingReviews, setPendingReviews] = useState<Rev[]>([]);
  const [reviewMsg, setReviewMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/inquiries")
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error(d.message || "خطا");
        setCorporate(d.corporate ?? []);
        setWholesale(d.wholesale ?? []);
        return fetch("/api/admin/reviews?status=pending").then((r) => r.json());
      })
      .then((d2) => { if (d2 && d2.ok) setPendingReviews(d2.reviews ?? []); })
      .catch((e) => setError(e instanceof Error ? e.message : "خطا"))
      .finally(() => setLoading(false));
  }, []);

  const moderate = async (id: number, approve: boolean) => {
    setReviewMsg("");
    const r = await fetch("/api/admin/reviews", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, approve }) });
    const d = await r.json();
    if (d.ok) { setPendingReviews((list) => list.filter((x) => x.id !== id)); setReviewMsg(d.message); }
    else setReviewMsg(d.message || "خطا");
  };

  return (
    <>
      <AdminPageHead title="درخواست‌های سازمانی، عمده و نظرات" desc="درخواست‌های ثبت‌شده از وب‌سایت؛ قیمت نهایی فقط پس از بررسی کارشناسی." />
      {loading && <p className="text-sm text-muted">در حال بارگذاری...</p>}
      {reviewMsg && <p className="mb-3 text-xs font-bold text-brand-700">{reviewMsg}</p>}
      <section className="mb-8" aria-label="نظرات در انتظار بررسی">
        <h2 className="mb-3 text-sm font-black">نظرات در انتظار بررسی ({faDigits(pendingReviews.length)})</h2>
        {pendingReviews.length === 0 && <p className="text-xs text-muted">نظری در انتظار بررسی نیست.</p>}
        <div className="space-y-3">
          {pendingReviews.map((rv) => (
            <div key={rv.id} className="rounded-xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold">{rv.title} — {rv.productName ?? `محصول #${rv.productId}`} · امتیاز {faDigits(rv.rating)}/۵</p>
                <div className="flex gap-2">
                  <button onClick={() => moderate(rv.id, true)} className="rounded-lg bg-brand-600 px-3 py-1.5 text-[11px] font-bold text-inverse">تأیید و انتشار</button>
                  <button onClick={() => moderate(rv.id, false)} className="rounded-lg border border-accent-400 px-3 py-1.5 text-[11px] font-bold text-accent-700">رد</button>
                </div>
              </div>
              <p className="mt-2 text-xs leading-6 text-muted">{rv.text}</p>
              <p className="mt-1 text-[10px] text-faint">{rv.author} · {rv.verifiedPurchase ? "خریدار تأییدشده ✓" : "بدون خرید تأییدشده"}</p>
            </div>
          ))}
        </div>
      </section>
      {error && <p className="text-sm text-accent-600">{error}</p>}
      <section className="space-y-8">
        <div>
          <h2 className="mb-3 text-sm font-black">هدایای سازمانی</h2>
          {!corporate.length && !loading ? <p className="text-xs text-muted">درخواستی ثبت نشده است.</p> : (
            <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
              <table className="w-full min-w-[720px] text-xs">
                <thead className="bg-surface2"><tr><th className="p-3 text-start">کد</th><th>شرکت</th><th>مسئول</th><th>تعداد</th><th>تقریبی</th><th>وضعیت</th></tr></thead>
                <tbody>
                  {corporate.map((r) => (
                    <tr key={r.code} className="border-t border-line-soft">
                      <td className="p-3" dir="ltr">{r.code}</td>
                      <td className="text-center">{r.companyName}</td>
                      <td className="text-center">{r.contactName}<br /><span dir="ltr">{r.mobile}</span></td>
                      <td className="text-center">{faDigits(r.quantity)}</td>
                      <td className="text-center">{r.indicativeTotal ? formatToman(r.indicativeTotal) : "—"}</td>
                      <td className="text-center">{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div>
          <h2 className="mb-3 text-sm font-black">خرید عمده</h2>
          {!wholesale.length && !loading ? <p className="text-xs text-muted">درخواستی ثبت نشده است.</p> : (
            <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
              <table className="w-full min-w-[720px] text-xs">
                <thead className="bg-surface2"><tr><th className="p-3 text-start">کد</th><th>مجموعه</th><th>نوع</th><th>شهر</th><th>مسئول</th><th>وضعیت</th></tr></thead>
                <tbody>
                  {wholesale.map((r) => (
                    <tr key={r.code} className="border-t border-line-soft">
                      <td className="p-3" dir="ltr">{r.code}</td>
                      <td className="text-center">{r.companyName}</td>
                      <td className="text-center">{r.businessType}</td>
                      <td className="text-center">{r.city}</td>
                      <td className="text-center">{r.contactName}<br /><span dir="ltr">{r.mobile}</span></td>
                      <td className="text-center">{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
