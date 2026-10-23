"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, PenLine, Sparkles } from "lucide-react";
import type { GiftPackage } from "@/types";
import { GIFT_OCCASIONS, GIFT_RECIPIENTS, giftBudgetBands, recommendGifts } from "@/lib/gift-recommend";
import { SmartImage } from "@/components/ui/SmartImage";
import { Price } from "@/components/ui/primitives";
import { trackEvent } from "@/lib/analytics";

/**
 * ساخت هدیه اختصاصی (§17/§30) — راهنمای سه‌سؤالی با همان موتور پیشنهاد قطعی.
 * نتیجه به صفحهٔ همان هدیه می‌رود؛ جایی که شخصی‌سازی واقعی (بسته‌بندی، نام گیرنده،
 * پیام، قیمت‌گذاری سمت سرور و افزودن ساختاری به سبد) پیاده‌سازی شده است.
 */
/** گام‌های فرم — کامپوننت ایستا در سطح ماژول (بدون ساخت مجدد در هر رندر) */
function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section aria-label={`مرحلهٔ ${n}: ${title}`} className="mt-8">
      <h2 className="flex items-center gap-2 text-[15px] font-black text-heading">
        <span className="grid size-7 place-items-center rounded-full bg-brand-700 text-[12px] font-black text-inverse">{n}</span>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}


export default function GiftsCustomizePage() {
  const [gifts, setGifts] = useState<GiftPackage[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [step, setStep] = useState(1);
  const [recipient, setRecipient] = useState("");
  const [occasion, setOccasion] = useState("");
  const [budget, setBudget] = useState("");

  useEffect(() => {
    trackEvent("gift_customizer_started", { source: "/gifts/customize" });
    // از API عمومی موجود (بدون import سرویس DB در کلاینت)
    fetch("/api/gifts")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("api"))))
      .then((d: { ok: boolean; packages?: GiftPackage[] }) => {
        if (d.ok && Array.isArray(d.packages) && d.packages.length) setGifts(d.packages);
        else setFailed(true);
      })
      .catch(() => setFailed(true));
  }, []);

  const bands = useMemo(() => (gifts ? giftBudgetBands(gifts) : []), [gifts]);
  const result = useMemo(
    () => (gifts ? recommendGifts(gifts, { recipient: recipient || undefined, occasion: occasion || undefined, budget: budget || undefined }) : null),
    [gifts, recipient, occasion, budget],
  );

  const chip = (active: boolean) =>
    `h-10 shrink-0 rounded-full px-4 text-[11.5px] font-bold transition-colors ${
      active ? "bg-brand-700 text-inverse shadow-soft" : "border border-line bg-surface text-body hover:border-brand-300"
    }`;


  return (
    <div className="container-x max-w-3xl pb-20 pt-12 md:pt-16">
      <span className="text-[11px] font-bold tracking-[0.2em] text-gold-700">هدیه اختصاصی هلسا</span>
      <h1 className="mt-3 text-2xl font-black leading-[1.6] text-heading md:text-[30px]">ساخت هدیه اختصاصی</h1>
      <p className="mt-3 text-[13px] leading-7 text-muted">
        سه سؤال کوتاه — هدیه برای کسی است، برای چه مناسبتی و با چه بودجه‌ای؟ هلسا از میان بسته‌های واقعی، نزدیک‌ترین انتخاب را پیشنهاد می‌دهد و در صفحهٔ همان هدیه، بسته‌بندی، نام گیرنده و پیامتان را اضافه می‌کنید.
      </p>

      {failed && (
        <p className="mt-8 rounded-2xl border border-dashed border-line bg-surface p-6 text-center text-[12.5px] leading-7 text-muted">
          در حال حاضر فهرست بسته‌ها در دسترس نیست؛ لطفاً دوباره تلاش کنید یا از{" "}
          <Link href="/gifts/personal" className="font-bold text-brand-700 underline underline-offset-4">هدایای شخصی هلسا</Link> دیدن کنید.
        </p>
      )}

      {!gifts && !failed && (
        <div className="mt-8 space-y-4" aria-busy="true" aria-label="در حال بارگذاری">
          <div className="skeleton h-10 w-2/3 rounded-xl" />
          <div className="skeleton h-24 w-full rounded-2xl" />
          <div className="skeleton h-24 w-full rounded-2xl" />
        </div>
      )}

      {gifts && (
        <>
          <Step n={1} title="هدیه برای چه کسی است؟">
            <div className="flex flex-wrap gap-2">
              {GIFT_RECIPIENTS.map((r) => (
                <button key={r.id} type="button" aria-pressed={recipient === r.id}
                  onClick={() => { setRecipient(r.id); setStep(2); trackEvent("gift_recipient_selected", { step: "customizer", recipient: r.id }); }}
                  className={chip(recipient === r.id)}>{r.label}</button>
              ))}
            </div>
          </Step>

          {step >= 2 && (
            <Step n={2} title="برای چه مناسبتی؟">
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {GIFT_OCCASIONS.map((o) => (
                  <li key={o.id}>
                    <button type="button" aria-pressed={occasion === o.id}
                      onClick={() => { setOccasion(o.id); setStep(3); trackEvent("gift_occasion_selected", { step: "customizer", occasion: o.id }); }}
                      className={`flex w-full flex-col items-center gap-1.5 rounded-2xl border p-3.5 text-center transition-all ${
                        occasion === o.id ? "border-brand-600 bg-brand-50 shadow-soft" : "border-line/70 bg-surface hover:border-brand-300"
                      }`}>
                      <span className="text-xl" aria-hidden>{o.icon}</span>
                      <span className="text-[11px] font-black text-heading">{o.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Step>
          )}

          {step >= 3 && bands.length > 0 && (
            <Step n={3} title="بودجه شما چقدر است؟">
              <div className="flex flex-wrap gap-2">
                {bands.map((b) => (
                  <button key={b.id} type="button" aria-pressed={budget === b.id}
                    onClick={() => { setBudget(b.id); trackEvent("gift_budget_selected", { step: "customizer", budget: b.id }); }}
                    className={chip(budget === b.id)}>{b.label}</button>
                ))}
              </div>
            </Step>
          )}

          {step >= 3 && result?.primary && (
            <section className="mt-10" aria-label="پیشنهاد هلسا برای شما">
              <h2 className="flex items-center gap-2 text-[15px] font-black text-heading">
                <Sparkles className="size-4 text-gold-700" aria-hidden /> پیشنهاد هلسا برای شما
              </h2>
              <div className="mt-4 rounded-2xl border border-brand-300 bg-surface p-5 shadow-soft">
                <div className="flex flex-wrap items-center gap-5">
                  <span className="block size-24 shrink-0 overflow-hidden rounded-xl border border-line-soft">
                    <SmartImage src={result.primary.image} alt={result.primary.imageAlt || result.primary.name} sizes="96px" className="size-full object-cover" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-black text-heading">{result.primary.name}</p>
                    <p className="mt-1 text-[11.5px] leading-6 text-muted">{result.primary.shortDescription}</p>
                    <div className="mt-2"><Price price={result.primary.basePrice} oldPrice={result.primary.oldPrice} size="sm" /></div>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Link
                    href={result.primary.kind === "corporate" ? `/gifts/corporate/${result.primary.slug}` : `/gifts/personal/${result.primary.slug}`}
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-brand-700 px-6 text-[12.5px] font-bold text-inverse transition-colors hover:bg-brand-800"
                  >
                    <PenLine className="size-4" aria-hidden /> شخصی‌سازی و انتخاب این هدیه <ArrowLeft className="size-4" aria-hidden />
                  </Link>
                  {result.alternatives[0] && (
                    <span className="text-[11px] text-muted">
                      جایگزین:{" "}
                      <Link href={`/gifts/personal/${result.alternatives[0].slug}`} className="font-bold text-brand-700 underline underline-offset-4">
                        {result.alternatives[0].name}
                      </Link>
                    </span>
                  )}
                </div>
                <p className="mt-3 text-[10.5px] leading-5 text-faint">
                  قیمت نهایی با انتخاب بسته‌بندی و پیام، در صفحهٔ هدیه از سرور محاسبه و تأیید می‌شود.
                </p>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
