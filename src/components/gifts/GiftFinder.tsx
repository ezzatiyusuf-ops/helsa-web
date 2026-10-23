"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { RotateCcw, PenLine, Sparkles } from "lucide-react";
import type { GiftPackage } from "@/types";
import {
  GIFT_OCCASIONS, GIFT_RECIPIENTS, giftBudgetBands, recommendGifts,
} from "@/lib/gift-recommend";
import { SmartImage } from "@/components/ui/SmartImage";
import { Price, Reveal } from "@/components/ui/primitives";
import { faDigits } from "@/lib/format";
import { trackEvent } from "@/lib/analytics";

/**
 * سفر کشف هدیه (§9-12): مناسبت → گیرنده → بودجه → «پیشنهاد هلسا برای شما».
 * موتور پیشنهاد قطعی (src/lib/gift-recommend) روی بسته‌های واقعی؛ URL state با حفظ انتخاب.
 */
export function GiftFinder({
  gifts,
  initialOccasion = "",
  initialRecipient = "",
  initialBudget = "",
}: {
  gifts: GiftPackage[];
  initialOccasion?: string;
  initialRecipient?: string;
  initialBudget?: string;
}) {
  const valid = (list: { id: string }[], v: string) => (list.some((x) => x.id === v) ? v : "");
  const [occ, setOcc] = useState(valid(GIFT_OCCASIONS, initialOccasion));
  const [rec, setRec] = useState(valid(GIFT_RECIPIENTS, initialRecipient));
  const [bud, setBud] = useState(initialBudget); // اعتبارسنجی با باندهای واقعی پایین‌تر
  const bands = useMemo(() => giftBudgetBands(gifts), [gifts]);
  const budgetValid = bands.some((b) => b.id === bud) ? bud : "";

  const syncUrl = (o: string, r: string, b: string) => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    if (o) sp.set("occasion", o); else sp.delete("occasion");
    if (r) sp.set("recipient", r); else sp.delete("recipient");
    if (b) sp.set("budget", b); else sp.delete("budget");
    const qs = sp.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? "?" + qs : ""}`);
  };

  const pickOcc = (id: string) => { setOcc(id); syncUrl(id, rec, budgetValid); trackEvent("gift_occasion_selected", { occasion: id }); };
  const pickRec = (id: string) => { setRec(id); syncUrl(occ, id, budgetValid); trackEvent("gift_recipient_selected", { recipient: id }); };
  const pickBud = (id: string) => { setBud(id); syncUrl(occ, rec, id); trackEvent("gift_budget_selected", { budget: id }); };
  const reset = () => { setOcc(""); setRec(""); setBud(""); syncUrl("", "", ""); };

  const { primary, alternatives, filtered } = useMemo(
    () => recommendGifts(gifts, { occasion: occ || undefined, recipient: rec || undefined, budget: budgetValid || undefined }),
    [gifts, occ, rec, budgetValid],
  );

  const chip = (active: boolean) =>
    `h-10 shrink-0 rounded-full px-4 text-[11.5px] font-bold transition-colors ${
      active ? "bg-brand-700 text-inverse shadow-soft" : "border border-line bg-surface text-body hover:border-brand-300"
    }`;

  return (
    <div id="finder" className="scroll-mt-24">
      {/* ——— §9 مناسبت ——— */}
      <h2 className="text-lg font-black text-heading md:text-xl">برای چه مناسبتی هدیه می‌خواهید؟</h2>
      <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8" role="group" aria-label="انتخاب مناسبت">
        {GIFT_OCCASIONS.map((o) => (
          <li key={o.id}>
            <button
              type="button"
              onClick={() => pickOcc(occ === o.id ? "" : o.id)}
              aria-pressed={occ === o.id}
              className={`flex h-full w-full flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all ${
                occ === o.id ? "border-brand-600 bg-brand-50 shadow-soft" : "border-line/70 bg-surface hover:border-brand-300 hover:shadow-soft"
              }`}
            >
              <span className="text-2xl" aria-hidden>{o.icon}</span>
              <span className={`text-[11.5px] font-black ${occ === o.id ? "text-brand-700" : "text-heading"}`}>{o.label}</span>
            </button>
          </li>
        ))}
      </ul>

      {/* ——— §10 گیرنده ——— */}
      <div className="mt-8">
        <h3 className="text-[15px] font-black text-heading">هدیه برای چه کسی است؟</h3>
        <div className="mt-3.5 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1" role="group" aria-label="انتخاب گیرنده">
          <button type="button" onClick={() => pickRec("")} aria-pressed={!rec} className={chip(!rec)}>همه</button>
          {GIFT_RECIPIENTS.map((r) => (
            <button key={r.id} type="button" onClick={() => pickRec(r.id)} aria-pressed={rec === r.id} className={chip(rec === r.id)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* ——— §11 بودجه (داینامیک از قیمت واقعی) ——— */}
      {bands.length > 0 && (
        <div className="mt-6">
          <h3 className="text-[15px] font-black text-heading">بودجه شما چقدر است؟</h3>
          <div className="mt-3.5 flex flex-wrap items-center gap-2" role="group" aria-label="انتخاب بودجه">
            <button type="button" onClick={() => pickBud("")} aria-pressed={!budgetValid} className={chip(!budgetValid)}>همه بودجه‌ها</button>
            {bands.map((b) => (
              <button key={b.id} type="button" onClick={() => pickBud(b.id)} aria-pressed={budgetValid === b.id} className={chip(budgetValid === b.id)}>
                {b.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ——— §12 پیشنهاد هلسا برای شما ——— */}
      {primary && (
        <div className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-[15px] font-black text-heading">
              <Sparkles className="size-4 text-gold-700" aria-hidden />
              {filtered ? "پیشنهاد هلسا برای شما" : "پیشنهاد هلسا"}
            </h3>
            {filtered && (
              <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted transition-colors hover:text-brand-700">
                <RotateCcw className="size-3.5" aria-hidden /> شروع دوباره
              </button>
            )}
          </div>
          <p className="mt-1 text-[11px] text-muted">
            {filtered ? "بر اساس مناسبت، گیرنده و بودجهٔ شما — از میان بسته‌های واقعی هلسا." : "انتخاب‌های ویژهٔ تیم هلسا از میان بسته‌های فعال."}
          </p>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {/* گزینهٔ اصلی */}
            <Reveal className="lg:col-span-1">
              <GiftCardLite gift={primary} primary />
            </Reveal>
            {/* جایگزین‌ها */}
            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
              {alternatives.map((a) => (
                <GiftCardLite key={a.id} gift={a} compact />
              ))}
              {alternatives.length === 0 && (
                <Link
                  href="/gifts/customize"
                  className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-brand-300 bg-brand-50/50 p-5 text-center transition-colors hover:bg-brand-50"
                >
                  <PenLine className="size-5 text-brand-600" aria-hidden />
                  <span className="text-[12.5px] font-black text-brand-800">ساخت هدیه اختصاصی</span>
                  <span className="text-[11px] leading-5 text-muted">چیزی شبیه سلیقهٔ خودتان؟ چند سؤال کوتاه، تا پیشنهاد دقیق.</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
      {!primary && (
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-surface p-8 text-center">
          <p className="text-sm font-bold text-body">با این ترکیب، بستهٔ فعالی پیدا نشد.</p>
          <p className="mt-2 text-xs leading-6 text-muted">بازهٔ بودجه یا گیرنده را تغییر دهید — یا درخواست هدیه اختصاصی ثبت کنید.</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={reset} className="inline-flex h-11 items-center rounded-full border border-line px-6 text-[12.5px] font-bold text-body hover:border-brand-400">شروع دوباره</button>
            <Link href="/gifts/corporate/inquiry" className="inline-flex h-11 items-center rounded-full bg-brand-700 px-6 text-[12.5px] font-bold text-inverse hover:bg-brand-800">درخواست هدیه اختصاصی</Link>
          </div>
        </div>
      )}
    </div>
  );
}

/** کارت سبک هدیه — همهٔ مقادیر از دادهٔ واقعی بسته */
export function GiftCardLite({ gift, primary = false, compact = false }: { gift: GiftPackage; primary?: boolean; compact?: boolean }) {
  const discount = gift.oldPrice && gift.oldPrice > gift.basePrice
    ? Math.round((1 - (gift.basePrice / gift.oldPrice)) * 100) : 0;
  const href = gift.kind === "corporate" ? `/gifts/corporate/${gift.slug}` : `/gifts/personal/${gift.slug}`;
  const personalizable = gift.allowsMessage || gift.allowsRecipient;
  return (
    <article
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border bg-surface shadow-soft transition-shadow hover:shadow-lift ${
        primary ? "border-brand-300 ring-1 ring-brand-300/50" : "border-line/70"
      }`}
    >
      <Link href={href} className={`relative block overflow-hidden ${compact ? "aspect-[16/9]" : "aspect-[4/3]"}`} aria-label={gift.name}>
        <SmartImage
          src={gift.image}
          alt={gift.imageAlt || gift.name}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 92vw"
          className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute top-3 start-3 flex flex-col items-start gap-1.5">
          {gift.isFeatured && (
            <span className="rounded-full bg-brand-700 px-2.5 py-1 text-[10px] font-black text-inverse">پیشنهاد هلسا</span>
          )}
          {discount > 0 && (
            <span className="rounded-full bg-accent-600 px-2.5 py-1 text-[10px] font-black text-inverse">{faDigits(discount)}٪ تخفیف</span>
          )}
        </div>
        <span className="absolute bottom-3 end-3 rounded-full border border-white/30 bg-ink-950/40 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md">
          {gift.kind === "corporate" ? "سازمانی" : "شخصی"}
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link href={href} className="text-[13.5px] font-black leading-6 text-heading hover:text-brand-700">{gift.name}</Link>
        <p className="mt-1.5 text-[11px] leading-5 text-muted line-clamp-2-fa">{gift.shortDescription}</p>
        {!compact && (
          <p className="mt-2 text-[10.5px] font-bold text-muted">
            مناسب برای: {gift.occasions.slice(0, 3).join("، ")}
            {gift.occasions.length > 3 ? ` و ${faDigits(gift.occasions.length - 3)} مورد دیگر` : ""}
          </p>
        )}
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <span className="rounded-full border border-line bg-surface2 px-2.5 py-1 text-[10px] font-bold text-muted">{faDigits(gift.contents.length)} قلم محتوا</span>
          {personalizable && (
            <span className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[10px] font-bold text-brand-700">
              <PenLine className="size-3" aria-hidden /> قابل شخصی‌سازی
            </span>
          )}
        </div>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-2.5 pt-4">
          <Price price={gift.basePrice} oldPrice={gift.oldPrice} size="sm" />
          <Link
            href={href}
            className="inline-flex h-10 items-center rounded-full bg-brand-700 px-5 text-[11.5px] font-bold text-inverse transition-colors hover:bg-brand-800"
          >
            انتخاب این هدیه
          </Link>
        </div>
      </div>
    </article>
  );
}

/** نوار چسبان موبایل هدایا (§37) */
export function GiftsStickyBar() {
  return (
    <div
      className="fixed bottom-16 inset-x-0 z-40 border-t border-line/80 bg-surface/95 backdrop-blur-xl lg:hidden"
      role="region"
      aria-label="اقدام سریع هدیه"
    >
      <div className="container-x flex gap-2 py-2">
        <a href="#finder" className="flex h-11 flex-1 items-center justify-center rounded-full border border-line bg-surface text-[12px] font-bold text-body transition-colors hover:border-brand-400">
          انتخاب هدیه
        </a>
        <Link href="/gifts/corporate/inquiry" className="flex h-11 flex-1 items-center justify-center rounded-full bg-brand-700 text-[12px] font-bold text-inverse shadow-soft transition-colors hover:bg-brand-800">
          سفارش سازمانی
        </Link>
      </div>
    </div>
  );
}
