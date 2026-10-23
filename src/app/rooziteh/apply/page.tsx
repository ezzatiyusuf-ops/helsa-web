"use client";
import { useState } from "react";
import Link from "next/link";
import { Loader2, Sprout, CheckCircle2, AlertTriangle } from "lucide-react";

/** فرم درخواست عضویت روزیته — هیچ فیلدی پیش‌پر نمی‌شود. */
export default function RoozitehApplyPage() {
  const [form, setForm] = useState({
    displayName: "", region: "", craft: "", bio: "", story: "", socialImpact: "",
    certifications: "", contactName: "", contactPhone: "", contactEmail: "",
  });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true); setResult(null);
    try {
      const r = await fetch("/api/rooziteh/apply", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, certifications: form.certifications.split(/[,،\n]/).map((s) => s.trim()).filter(Boolean) }),
      });
      const d = (await r.json()) as { ok: boolean; message?: string };
      setResult({ ok: d.ok, message: d.message ?? (d.ok ? "درخواست ثبت شد." : "ثبت درخواست انجام نشد.") });
    } catch { setResult({ ok: false, message: "خطای شبکه؛ دوباره تلاش کنید." }); }
    setSending(false);
  };

  const input = "w-full rounded-xl border border-line bg-surface2 px-3 py-2.5 text-sm text-heading outline-none focus:border-brand-500";
  const label = "mb-1 block text-[11px] font-bold text-heading";

  return (
    <div className="container-x py-10">
      <div className="mx-auto max-w-2xl">
        <header>
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-300 bg-brand-50 px-3 py-1 text-[11px] font-bold text-brand-800"><Sprout className="size-3.5" aria-hidden /> روزیته</span>
          <h1 className="mt-3 text-xl font-black text-heading">ثبت درخواست تولیدکننده</h1>
          <p className="mt-2 text-[11px] leading-6 text-muted">
            اطلاعات را دقیق و از زبان خودتان بنویسید. پس از ثبت، درخواست شما بررسی می‌شود و تا تأیید و انتشار در هیچ صفحهٔ عمومی
            نمایش داده نمی‌شود. هیچ‌کدام از ادعاهای گواهی یا تأثیر اجتماعی اجباری نیست؛ اگر چیزی را اعلام نکنید، در پروفایل خالی می‌ماند.
          </p>
        </header>

        <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-line bg-surface p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className={label}>نام تولیدکننده یا کارگاه *</span><input required value={form.displayName} onChange={set("displayName")} className={input} /></label>
            <label><span className={label}>منطقهٔ تولید *</span><input required value={form.region} onChange={set("region")} className={input} placeholder="مثلاً بم، کرمان" /></label>
            <label className="sm:col-span-2"><span className={label}>حوزهٔ تولید *</span><input required value={form.craft} onChange={set("craft")} className={input} placeholder="مثلاً خرمای پیارم، عرقیجات گیاهی" /></label>
          </div>
          <label className="block"><span className={label}>معرفی کوتاه * (حداقل ۳۰ نویسه)</span><textarea required rows={3} value={form.bio} onChange={set("bio")} className={input} /></label>
          <label className="block"><span className={label}>داستان کارگاه (اختیاری)</span><textarea rows={4} value={form.story} onChange={set("story")} className={input} /></label>
          <label className="block">
            <span className={label}>تأثیر اجتماعی — اگر مایل بودید اعلام کنید (اختیاری)</span>
            <textarea rows={2} value={form.socialImpact} onChange={set("socialImpact")} className={input} placeholder="مثلاً اشتغال فصلی برای … (فقط اگر واقعاً اجرا می‌کنید)" />
            <span className="mt-1 block text-[10px] text-faint">این متن در پروفایل با برچسب «اعلام تولیدکننده» نمایش داده می‌شود؛ نشان تأییدشدهٔ هلسا نیست.</span>
          </label>
          <label className="block">
            <span className={label}>گواهی‌ها (اختیاری، با کاما جدا کنید)</span>
            <input value={form.certifications} onChange={set("certifications")} className={input} placeholder="مثلاً پروانهٔ بهداشت، ISO 22000" />
            <span className="mt-1 block text-[10px] text-faint">هر گواهی تنها با مدرک قابل ارائه، در پروفایل نمایش داده می‌شود.</span>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className={label}>نام مسئول تماس *</span><input required value={form.contactName} onChange={set("contactName")} className={input} /></label>
            <label><span className={label}>همراه تماس *</span><input required inputMode="numeric" value={form.contactPhone} onChange={set("contactPhone")} className={input} placeholder="09xxxxxxxxx" /></label>
            <label className="sm:col-span-2"><span className={label}>ایمیل تماس (اختیاری)</span><input type="email" value={form.contactEmail} onChange={set("contactEmail")} className={input} /></label>
          </div>
          <p className="rounded-xl border border-line-soft bg-surface2 p-3.5 text-[10.5px] leading-6 text-muted">شمارهٔ تماس شما فقط برای کارشناسان هلسا قابل مشاهده است و در پروفایل عمومی منتشر نمی‌شود.</p>
          <button type="submit" disabled={sending} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-3 text-sm font-black text-white disabled:opacity-50">
            {sending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Sprout className="size-4" aria-hidden />}
            {sending ? "در حال ارسال…" : "ارسال درخواست"}
          </button>
          {result && (
            <p className={`rounded-xl border p-3.5 text-[11px] leading-6 ${result.ok ? "border-brand-300 bg-brand-50 text-brand-800" : "border-accent-400 bg-accent-50 text-accent-700"}`} role="status">
              {result.ok ? <CheckCircle2 className="me-1 inline size-3.5" aria-hidden /> : <AlertTriangle className="me-1 inline size-3.5" aria-hidden />}
              {result.message}
            </p>
          )}
        </form>
        <p className="mt-4 text-center text-[11px] text-muted"><Link href="/rooziteh" className="font-bold text-brand-700 underline">بازگشت به روزیته</Link></p>
      </div>
    </div>
  );
}
