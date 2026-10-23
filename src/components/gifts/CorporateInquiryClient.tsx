"use client";
import { trackEvent } from "@/lib/analytics";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Building2, Loader2, Send } from "lucide-react";
import { Reveal, Button, Price } from "@/components/ui/primitives";
import { FieldLabel, Input, Select, TextArea } from "@/components/ui/controls";
import { useToast } from "@/components/ui/Toast";
import type { GiftPackage } from "@/types";
import { faDigits, formatToman } from "@/lib/format";

export function CorporateInquiryClient() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const presetSlug = searchParams.get("package") ?? "";

  const [packages, setPackages] = useState<GiftPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ code: string; indicativeTotal: number | null } | null>(null);
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    mobile: "",
    email: "",
    packageSlug: presetSlug,
    quantity: 20,
    occasion: "تقدیر سازمانی",
    desiredDeliveryDate: "",
    brandingRequirements: "",
    packagingNotes: "",
    recipientNotes: "",
    additionalNotes: "",
  });

  useEffect(() => {
    fetch("/api/gifts?kind=corporate")
      .then((r) => r.json())
      .then((d) => {
        const list: GiftPackage[] = d.packages ?? [];
        setPackages(list);
        // prefill quantity from the preset package (async — safe for effects)
        const preset = presetSlug ? list.find((p) => p.slug === presetSlug) : undefined;
        if (preset) setForm((f) => ({ ...f, quantity: Math.max(f.quantity, preset.minQty) }));
      })
      .catch(() => setPackages([]))
      .finally(() => setLoading(false));
  }, [presetSlug]);

  const selected = useMemo(() => packages.find((p) => p.slug === form.packageSlug), [packages, form.packageSlug]);
  const indicative = selected ? selected.basePrice * Math.max(selected.minQty, form.quantity) : null;

  const submit = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/gifts/corporate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.ok) trackEvent("corporate_lead", { form: "corporate_gifts" });
      if (!res.ok || !data.ok) {
        toast.push(data.message || "ثبت درخواست ممکن نشد", "error");
        return;
      }
      setDone({ code: data.code, indicativeTotal: data.indicativeTotal ?? null });
      toast.push("درخواست سازمانی ثبت شد");
    } catch {
      toast.push("متأسفانه مشکلی پیش آمد. دوباره تلاش کنید.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-x py-12 md:py-16 grid grid-cols-1 lg:grid-cols-5 gap-10 items-start">
      <div className="lg:col-span-3 space-y-5">
        <Reveal>
          <div className="rounded-2xl border border-line/70 bg-surface p-6 md:p-8">
            <h2 className="text-base font-black text-heading flex items-center gap-2">
              <Building2 className="size-4 text-gold-700" aria-hidden /> فرم استعلام هدیه سازمانی
            </h2>

            {done ? (
              <div className="mt-6 rounded-2xl border border-brand-200 bg-brand-50 p-6">
                <p className="text-sm font-black text-heading">درخواست شما ثبت شد</p>
                <p className="mt-2 text-xs leading-7 text-muted">
                  کد پیگیری: <span dir="ltr" className="font-bold text-heading">{done.code}</span>
                </p>
                {done.indicativeTotal != null && (
                  <p className="mt-2 text-xs leading-7 text-muted">
                    مبلغ تقریبی اولیه: {formatToman(done.indicativeTotal)} — این مبلغ نهایی نیست و پس از بررسی کارشناسی اعلام می‌شود.
                  </p>
                )}
                <p className="mt-3 text-[11px] leading-6 text-muted">کارشناسان هلسا در ساعات کاری برای اعلام قیمت نهایی با شما تماس می‌گیرند.</p>
              </div>
            ) : (
              <div className="mt-6 grid sm:grid-cols-2 gap-4">
                <FieldLabel text="نام شرکت"><Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} placeholder="شرکت ..." /></FieldLabel>
                <FieldLabel text="نام مسئول"><Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} placeholder="نام و نام خانوادگی" /></FieldLabel>
                <FieldLabel text="موبایل"><Input dir="ltr" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/[^\d]/g, "") })} placeholder="0912..." /></FieldLabel>
                <FieldLabel text="ایمیل (اختیاری)"><Input dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@company.com" /></FieldLabel>
                <FieldLabel text="پکیج پیشنهادی" className="sm:col-span-2">
                  <Select value={form.packageSlug} onChange={(e) => setForm({ ...form, packageSlug: e.target.value })}>
                    <option value="">انتخاب نشده (مشاوره آزاد)</option>
                    {packages.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
                  </Select>
                </FieldLabel>
                <FieldLabel text="تعداد">
                  <Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Math.max(1, Number(e.target.value) || 1) })} />
                </FieldLabel>
                <FieldLabel text="مناسبت">
                  <Select value={form.occasion} onChange={(e) => setForm({ ...form, occasion: e.target.value })}>
                    {["تقدیر سازمانی", "تقدیر مشتری", "یلدا", "نوروز", "رویداد رسمی", "سایر"].map((o) => <option key={o}>{o}</option>)}
                  </Select>
                </FieldLabel>
                <FieldLabel text="تاریخ تحویل مطلوب" className="sm:col-span-2">
                  <Input value={form.desiredDeliveryDate} onChange={(e) => setForm({ ...form, desiredDeliveryDate: e.target.value })} placeholder="مثلاً هفته اول مهر" />
                </FieldLabel>
                <FieldLabel text="نیازمندی برندینگ / لوگو" className="sm:col-span-2">
                  <TextArea rows={3} value={form.brandingRequirements} onChange={(e) => setForm({ ...form, brandingRequirements: e.target.value })} placeholder="لوگو، رنگ سازمانی، کارت و ..." />
                </FieldLabel>
                <FieldLabel text="توضیحات بسته‌بندی سفارشی" className="sm:col-span-2">
                  <TextArea rows={2} value={form.packagingNotes} onChange={(e) => setForm({ ...form, packagingNotes: e.target.value })} placeholder="نوع جعبه، سایز، جنس و ..." />
                </FieldLabel>
                <FieldLabel text="توضیحات گیرندگان" className="sm:col-span-2">
                  <TextArea rows={2} value={form.recipientNotes} onChange={(e) => setForm({ ...form, recipientNotes: e.target.value })} placeholder="مثلاً پکیج متفاوت برای مدیران و کارکنان" />
                </FieldLabel>
                <FieldLabel text="توضیحات تکمیلی" className="sm:col-span-2">
                  <TextArea rows={3} value={form.additionalNotes} onChange={(e) => setForm({ ...form, additionalNotes: e.target.value })} />
                </FieldLabel>
                <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-2">
                  <p className="text-[11px] text-muted leading-6">
                    {indicative != null ? <>مبلغ تقریبی اولیه: <b className="text-heading">{formatToman(indicative)}</b> (غیرنهایی)</> : "پس از ثبت، کارشناس هلسا قیمت نهایی را اعلام می‌کند."}
                  </p>
                  <Button onClick={submit} disabled={busy}>
                    {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
                    ثبت درخواست سازمانی
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Reveal>
      </div>

      <div className="lg:col-span-2 space-y-4">
        <Reveal>
          <h2 className="text-sm font-black text-heading mb-3">پکیج‌های سازمانی</h2>
        </Reveal>
        {loading && <p className="text-xs text-muted">در حال بارگذاری...</p>}
        {packages.map((p, i) => (
          <Reveal key={p.id} delay={i * 0.04}>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, packageSlug: p.slug, quantity: Math.max(f.quantity, p.minQty) }))}
              className={`w-full text-start rounded-2xl border bg-surface p-4 transition-colors ${form.packageSlug === p.slug ? "border-brand-600 shadow-soft" : "border-line/70 hover:border-brand-300"}`}
            >
              <div className="flex gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image} alt={p.imageAlt || p.name} className="size-16 rounded-xl object-cover border border-line/60" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-black text-heading truncate">{p.name}</p>
                  <p className="mt-1 text-[11px] text-muted line-clamp-2-fa">{p.shortDescription}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <Price price={p.basePrice} size="sm" />
                    <span className="text-[10.5px] text-muted">حداقل {faDigits(p.minQty)} عدد</span>
                  </div>
                </div>
              </div>
            </button>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
