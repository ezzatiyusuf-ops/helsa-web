"use client";
import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Camera, Check, CheckCircle2, Clock, Copy, CreditCard, FileText, ImagePlus, Loader2, ShieldCheck, Upload, XCircle } from "lucide-react";
import { faDate, faDigits, formatToman } from "@/lib/format";
import { CARD_RECEIPT_LABELS } from "@/lib/card-payment";

/**
 * /payment/card?code=ORDER — پرداخت کارت‌به‌کارت.
 * شمارهٔ کارت و وضعیت از سرور می‌آید. این صفحه هرگز «پرداخت‌شده» نمی‌سازد.
 */
type CardDetails = { number: string; holder: string; bank: string };
type Receipt = { id: number; status: string; amountDeclared: number; submittedAt: string; decidedAt: string | null; decisionReason: string };
type StateResponse = {
  ok: boolean; message?: string; state?: string; orderPaid?: boolean;
  order?: { code: string; total: number; paymentMethod: string | null };
  card?: CardDetails | null; cardDisabledReason?: string | null; receipts?: Receipt[];
};
const STEPS = ["awaiting_payment", "receipt_submitted", "pending_verification", "verified"] as const;
const groupNumber = (n: string) => (n || "").replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim().replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!);

function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); }
    catch {
      const el = document.createElement("textarea");
      el.value = value; el.setAttribute("readonly", ""); el.style.position = "fixed"; el.style.opacity = "0";
      document.body.appendChild(el); el.select();
      try { document.execCommand("copy"); } catch { /* unavailable */ }
      document.body.removeChild(el);
    }
    setDone(true); setTimeout(() => setDone(false), 1800);
  };
  return (
    <button type="button" onClick={copy} aria-label={label} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11px] font-bold text-muted hover:border-brand-300 hover:text-brand-700">
      {done ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      {done ? "کپی شد" : "کپی"}
    </button>
  );
}

function StatusTimeline({ state }: { state: string }) {
  if (state === "rejected" || state === "requires_more_information") {
    const rejected = state === "rejected";
    return (
      <div className={`flex items-start gap-3 rounded-2xl border p-4 ${rejected ? "border-accent-400 bg-accent-50" : "border-gold-300 bg-gold-50"}`}>
        {rejected ? <XCircle className="mt-0.5 size-5 shrink-0 text-accent-600" aria-hidden /> : <AlertTriangle className="mt-0.5 size-5 shrink-0 text-gold-700" aria-hidden />}
        <div className="text-xs leading-6">
          <p className="font-black text-heading">{CARD_RECEIPT_LABELS[state as keyof typeof CARD_RECEIPT_LABELS]}</p>
          <p className="text-muted">{rejected ? "برای ادامه، رسید معتبر جدید ارسال کنید یا با پشتیبانی هلسا در تماس باشید." : "لطفاً اطلاعات خواسته‌شده را تکمیل و رسید را دوباره ارسال کنید."}</p>
        </div>
      </div>
    );
  }
  if (state === "refunded") return <div className="rounded-2xl border border-line bg-surface2 p-4 text-xs font-bold text-muted">این پرداخت مرجوع شده و وجه به شما بازگردانده شده است.</div>;
  const idx = STEPS.indexOf(state as (typeof STEPS)[number]);
  const active = idx < 0 ? 0 : idx;
  return (
    <ol className="grid grid-cols-4 gap-1.5" aria-label="مراحل پرداخت">
      {STEPS.map((s, i) => (
        <li key={s} className="min-w-0">
          <div className={`h-1.5 rounded-full ${i <= active ? "bg-brand-700" : "bg-surface3"}`} />
          <p className={`mt-2 text-[10px] leading-4 ${i <= active ? "font-bold text-heading" : "text-faint"}`}>{CARD_RECEIPT_LABELS[s]}</p>
        </li>
      ))}
    </ol>
  );
}

function CardPaymentInner() {
  const sp = useSearchParams();
  const code = (sp.get("code") ?? "").trim();
  const [data, setData] = useState<StateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [amount, setAmount] = useState("");
  const [tracking, setTracking] = useState("");
  const [transferDate, setTransferDate] = useState("");
  const [payerName, setPayerName] = useState("");
  const [payerCard, setPayerCard] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string>("");

  const applyState = useCallback((d: StateResponse) => {
    if (!d.ok) { setError(d.message ?? "دریافت وضعیت سفارش ممکن نشد."); return; }
    setData(d); setError("");
    if (d.order?.total) setAmount((prev) => prev || String(d.order!.total));
  }, []);

  useEffect(() => {
    if (!code) return;
    let alive = true;
    fetch(`/api/payments/card-receipt?code=${encodeURIComponent(code)}`, { cache: "no-store" })
      .then((r) => r.json() as Promise<StateResponse>)
      .then((d) => { if (alive) applyState(d); })
      .catch(() => { if (alive) setError("خطای شبکه؛ دوباره تلاش کنید."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [code, applyState]);

  const reload = useCallback(async () => {
    if (!code) return;
    try {
      const r = await fetch(`/api/payments/card-receipt?code=${encodeURIComponent(code)}`, { cache: "no-store" });
      applyState((await r.json()) as StateResponse);
    } catch { setError("خطای شبکه؛ دوباره تلاش کنید."); }
    setLoading(false);
  }, [code, applyState]);

  const setPreviewFor = (f: File | null) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = "";
    if (f && f.type.startsWith("image/")) {
      const url = URL.createObjectURL(f);
      previewRef.current = url; setPreview(url);
    } else setPreview("");
  };
  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);

  const state = data?.state ?? "awaiting_payment";
  const canUpload = useMemo(
    () => !data?.orderPaid && (state === "awaiting_payment" || state === "requires_more_information" || state === "rejected"),
    [data?.orderPaid, state],
  );

  const onPick = (f: File | null) => {
    setResult(null);
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setResult({ ok: false, message: "حجم فایل باید کمتر از ۵ مگابایت باشد." }); return; }
    setFile(f); setPreviewFor(f);
  };

  const submit = async () => {
    if (!file) { setResult({ ok: false, message: "ابتدا تصویر رسید را انتخاب کنید." }); return; }
    setSending(true); setResult(null);
    const fd = new FormData();
    fd.append("orderCode", code); fd.append("file", file);
    if (amount) fd.append("amount", amount);
    if (tracking) fd.append("trackingNumber", tracking);
    if (transferDate) fd.append("transferDate", transferDate);
    if (payerName) fd.append("payerName", payerName);
    if (payerCard) fd.append("payerCard", payerCard);
    try {
      const r = await fetch("/api/payments/card-receipt", { method: "POST", body: fd });
      const d = (await r.json()) as { ok: boolean; message?: string };
      setResult({ ok: d.ok, message: d.message ?? (d.ok ? "رسید ثبت شد." : "ارسال رسید انجام نشد.") });
      if (d.ok) { setFile(null); setPreviewFor(null); await reload(); }
    } catch { setResult({ ok: false, message: "خطای شبکه در ارسال رسید؛ دوباره تلاش کنید." }); }
    setSending(false);
  };

  if (!code) {
    return (
      <div className="container-x py-14">
        <div className="mx-auto max-w-lg rounded-2xl border border-line bg-surface p-8 text-center">
          <AlertTriangle className="mx-auto size-8 text-accent-600" aria-hidden />
          <h1 className="mt-3 text-lg font-black text-heading">کد سفارش در آدرس نیست</h1>
          <p className="mt-2 text-xs leading-6 text-muted">از صفحهٔ سفارش‌های من دوباره وارد شوید.</p>
          <Link href="/account/orders" className="mt-5 inline-block rounded-xl bg-brand-700 px-5 py-2.5 text-xs font-bold text-white">سفارش‌های من</Link>
        </div>
      </div>
    );
  }
  if (loading) return <div className="container-x grid min-h-[50svh] place-items-center py-14 text-sm font-bold text-muted"><Loader2 className="me-2 size-4 animate-spin" aria-hidden /> در حال دریافت اطلاعات…</div>;
  if (error) {
    return (
      <div className="container-x py-14">
        <div className="mx-auto max-w-lg rounded-2xl border border-line bg-surface p-8 text-center">
          <AlertTriangle className="mx-auto size-8 text-accent-600" aria-hidden />
          <h1 className="mt-3 text-lg font-black text-heading">امکان نمایش این صفحه نیست</h1>
          <p className="mt-2 text-xs leading-6 text-muted">{error}</p>
          <Link href="/account/orders" className="mt-5 inline-block rounded-xl bg-brand-700 px-5 py-2.5 text-xs font-bold text-white">سفارش‌های من</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-x pb-28 pt-10 md:pb-14">
      <div className="mx-auto max-w-2xl space-y-5">
        <header className="rounded-2xl border border-line bg-surface p-6">
          <p className="text-[11px] font-bold tracking-[0.2em] text-gold-700">پرداخت کارت‌به‌کارت</p>
          <h1 className="mt-1.5 text-xl font-black text-heading">انتقال وجه و ارسال رسید</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
            <span>شمارهٔ سفارش: <b className="text-heading" dir="ltr">{code}</b></span>
            <CopyButton value={code} label="کپی شمارهٔ سفارش" />
            {data?.order?.total ? <span>مبلغ قابل پرداخت: <b className="text-heading">{formatToman(data.order.total)}</b></span> : null}
          </div>
          <div className="mt-5"><StatusTimeline state={state} /></div>
        </header>

        {data?.card ? (
          <section aria-labelledby="card-box" className="rounded-2xl border border-line bg-surface p-6">
            <h2 id="card-box" className="flex items-center gap-2 text-sm font-black text-heading"><CreditCard className="size-4 text-brand-700" aria-hidden /> اطلاعات کارت مقصد</h2>
            <div className="mt-4 rounded-xl border border-line-soft bg-surface2 p-4">
              <p className="text-[10.5px] text-muted">شمارهٔ کارت</p>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                <p className="text-lg font-black tracking-[0.12em] text-heading" dir="ltr">{groupNumber(data.card.number)}</p>
                <CopyButton value={data.card.number} label="کپی شمارهٔ کارت" />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                <div><dt className="text-muted">صاحب حساب</dt><dd className="font-bold text-heading">{data.card.holder}</dd></div>
                <div><dt className="text-muted">بانک</dt><dd className="font-bold text-heading">{data.card.bank}</dd></div>
              </dl>
            </div>
            <p className="mt-3 rounded-xl border border-gold-300 bg-gold-50 p-3.5 text-[11px] leading-6 text-gold-800">
              <b>مهم:</b> دقیقاً مبلغ سفارش را واریز کنید. پس از واریز، تصویر رسید را همین‌جا بفرستید. ارسال رسید به معنای پرداخت نیست؛ پرداخت پس از <b>تأیید هلسا</b> ثبت می‌شود.
            </p>
          </section>
        ) : (
          <div className="rounded-2xl border border-accent-400 bg-accent-50 p-4 text-xs font-bold text-accent-700">
            {data?.cardDisabledReason ?? "پرداخت کارت‌به‌کارت در حال حاضر پیکربندی نشده است؛ با پشتیبانی تماس بگیرید."}
          </div>
        )}

        {data?.orderPaid ? (
          <section className="rounded-2xl border border-brand-300 bg-brand-50 p-6 text-center">
            <CheckCircle2 className="mx-auto size-9 text-brand-700" aria-hidden />
            <p className="mt-2 text-sm font-black text-heading">پرداخت این سفارش تأیید شده است</p>
            <p className="mt-1 text-[11px] text-muted">نیازی به ارسال رسید نیست. سفارش در حال آماده‌سازی است.</p>
          </section>
        ) : canUpload && data?.card ? (
          <section aria-labelledby="upload-box" className="rounded-2xl border border-line bg-surface p-6">
            <h2 id="upload-box" className="flex items-center gap-2 text-sm font-black text-heading"><ImagePlus className="size-4 text-brand-700" aria-hidden /> ارسال تصویر رسید</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => cameraRef.current?.click()} className="flex items-center justify-center gap-2 rounded-xl border border-line bg-surface2 px-4 py-3 text-xs font-bold text-heading hover:border-brand-300"><Camera className="size-4" aria-hidden /> عکس گرفتن</button>
              <button type="button" onClick={() => galleryRef.current?.click()} className="flex items-center justify-center gap-2 rounded-xl border border-line bg-surface2 px-4 py-3 text-xs font-bold text-heading hover:border-brand-300"><Upload className="size-4" aria-hidden /> انتخاب از گالری</button>
            </div>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => onPick(e.target.files?.[0] ?? null)} aria-label="عکس گرفتن از رسید" />
            <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={(e) => onPick(e.target.files?.[0] ?? null)} aria-label="انتخاب فایل رسید" />

            {file && (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-line-soft bg-surface2 p-3">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="پیش‌نمایش رسید" className="size-14 rounded-lg border border-line object-cover" />
                ) : <span className="grid size-14 place-items-center rounded-lg border border-line bg-surface text-muted"><FileText className="size-5" aria-hidden /></span>}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-bold text-heading">{file.name}</p>
                  <p className="text-[10px] text-muted">{faDigits((file.size / 1024).toFixed(0))} کیلوبایت</p>
                </div>
                <button type="button" onClick={() => { setFile(null); setPreviewFor(null); }} className="rounded-lg border border-line px-2.5 py-1.5 text-[10px] font-bold text-muted">حذف</button>
              </div>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-[11px]">
                <span className="mb-1 block font-bold text-heading">مبلغ واریزشده (تومان)</span>
                <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d۰-۹]/g, ""))} className="w-full rounded-xl border border-line bg-surface2 px-3 py-2.5 text-sm text-heading outline-none focus:border-brand-500" placeholder="مثلاً 350000" />
              </label>
              <label className="block text-[11px]">
                <span className="mb-1 block font-bold text-heading">شمارهٔ پیگیری واریز (اختیاری)</span>
                <input inputMode="numeric" value={tracking} onChange={(e) => setTracking(e.target.value.replace(/[^\d۰-۹]/g, "").slice(0, 24))} className="w-full rounded-xl border border-line bg-surface2 px-3 py-2.5 text-sm text-heading outline-none focus:border-brand-500" placeholder="از پیامک بانک" />
              </label>
              <label className="block text-[11px]">
                <span className="mb-1 block font-bold text-heading">تاریخ واریز (اختیاری)</span>
                <input value={transferDate} onChange={(e) => setTransferDate(e.target.value.slice(0, 40))} className="w-full rounded-xl border border-line bg-surface2 px-3 py-2.5 text-sm text-heading outline-none focus:border-brand-500" placeholder="۱۴۰۵/۰۸/۰۱" />
              </label>
              <label className="block text-[11px]">
                <span className="mb-1 block font-bold text-heading">نام پرداخت‌کننده (اختیاری)</span>
                <input value={payerName} onChange={(e) => setPayerName(e.target.value.slice(0, 120))} className="w-full rounded-xl border border-line bg-surface2 px-3 py-2.5 text-sm text-heading outline-none focus:border-brand-500" />
              </label>
              <label className="block text-[11px] sm:col-span-2">
                <span className="mb-1 block font-bold text-heading">۴ رقم آخر کارت پرداخت‌کننده (اختیاری)</span>
                <input inputMode="numeric" value={payerCard} onChange={(e) => setPayerCard(e.target.value.replace(/[^\d۰-۹]/g, "").slice(0, 4))} className="w-full rounded-xl border border-line bg-surface2 px-3 py-2.5 text-sm text-heading outline-none focus:border-brand-500" placeholder="۱۲۳۴" />
              </label>
            </div>

            <button type="button" onClick={submit} disabled={sending || !file} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-3 text-sm font-black text-white disabled:opacity-50">
              {sending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ShieldCheck className="size-4" aria-hidden />}
              {sending ? "در حال ارسال…" : "ارسال رسید برای بررسی"}
            </button>
            {result && (
              <p className={`mt-3 rounded-xl border p-3.5 text-[11px] leading-6 ${result.ok ? "border-brand-300 bg-brand-50 text-brand-800" : "border-accent-400 bg-accent-50 text-accent-700"}`} role="status">{result.message}</p>
            )}
          </section>
        ) : null}

        {data?.receipts?.length ? (
          <section aria-labelledby="hist" className="rounded-2xl border border-line bg-surface p-6">
            <h2 id="hist" className="flex items-center gap-2 text-sm font-black text-heading"><Clock className="size-4 text-brand-700" aria-hidden /> سابقهٔ رسیدها</h2>
            <ul className="mt-3 divide-y divide-line-soft">
              {data.receipts.map((r) => (
                <li key={r.id} className="py-3 text-[11px]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-heading">{CARD_RECEIPT_LABELS[r.status as keyof typeof CARD_RECEIPT_LABELS] ?? r.status}</span>
                    <span className="text-muted">{faDate(r.submittedAt)}</span>
                  </div>
                  {r.amountDeclared ? <p className="mt-1 text-muted">مبلغ اعلامی: {formatToman(r.amountDeclared)}</p> : null}
                  {r.decisionReason ? <p className="mt-1 rounded-lg bg-surface2 p-2 text-muted">دلیل هلسا: {r.decisionReason}</p> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="text-center text-[11px] text-muted">
          سؤالی دارید؟ <Link href="/contact" className="font-bold text-brand-700 underline">با پشتیبانی هلسا</Link> در تماس باشید. رسید شما فقط برای تیم مالی هلسا قابل مشاهده است.
        </p>
      </div>
    </div>
  );
}

export default function CardPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="container-x grid min-h-[50svh] place-items-center py-14 text-sm font-bold text-muted">
          {/* صفحه کلاینت‌محور است؛ برای اسکرین‌ریدر و خزش، عنوان صفحه در پوستهٔ سرور حاضر باشد */}
          <h1 className="sr-only">پرداخت کارت‌به‌کارت</h1>
          <span>در حال بارگذاری…</span>
        </div>
      }
    >
      <CardPaymentInner />
    </Suspense>
  );
}
