"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Calculator } from "lucide-react";
import { formatToman, faDigits } from "@/lib/format";
import { trackEvent } from "@/lib/analytics";

/**
 * برآورد اولیهٔ بودجهٔ سازمانی (§27) — فقط ضرب سادهٔ تعداد × بودجهٔ هر پک.
 * این یک برآورد است، نه پیش‌فاکتور؛ پیش‌فاکتور پس از بررسی کارشناسان صادر می‌شود.
 */
export function CorporateCalculator() {
  const [qty, setQty] = useState(50);
  const [perPack, setPerPack] = useState(500_000);

  const total = useMemo(() => Math.max(0, Math.round(qty)) * Math.max(0, perPack), [qty, perPack]);

  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 p-5 md:p-6" aria-label="برآورد اولیه بودجه سازمانی">
      <h3 className="flex items-center gap-2 text-[13.5px] font-black text-inverse">
        <Calculator className="size-4 text-gold-400" aria-hidden /> برآورد اولیهٔ بودجه
      </h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="corp-qty" className="text-[11px] font-bold text-inverse/70">تعداد پک (دستی)</label>
          <input
            id="corp-qty"
            type="number"
            inputMode="numeric"
            min={1}
            max={5000}
            value={qty}
            onChange={(e) => setQty(parseInt(e.target.value || "1", 10))}
            dir="ltr"
            className="mt-2 h-11 w-full rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-bold text-inverse outline-none focus:border-gold-400"
          />
        </div>
        <div>
          <label htmlFor="corp-per" className="text-[11px] font-bold text-inverse/70">بودجهٔ هر پک (تومان)</label>
          <select
            id="corp-per"
            value={perPack}
            onChange={(e) => setPerPack(parseInt(e.target.value, 10))}
            className="mt-2 h-11 w-full rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-bold text-inverse outline-none focus:border-gold-400 [&>option]:text-heading"
          >
            <option value={400000}>حدود ۴۰۰ هزار تومان</option>
            <option value={500000}>حدود ۵۰۰ هزار تومان</option>
            <option value={800000}>حدود ۸۰۰ هزار تومان</option>
            <option value={1000000}>حدود ۱ میلیون تومان</option>
            <option value={1500000}>حدود ۱٫۵ میلیون تومان</option>
            <option value={2000000}>حدود ۲ میلیون تومان</option>
          </select>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gold-500/10 px-4 py-3.5">
        <p className="text-[12px] font-bold text-gold-300">برآورد اولیه: {qty > 0 ? formatToman(total) : "—"}</p>
        <p className="text-[10.5px] leading-5 text-inverse/60">
          {faDigits(qty)} پک × {formatToman(perPack)} — برآورد اولیه است؛ پیش‌فاکتور نهایی پس از بررسی کارشناسی صادر می‌شود.
        </p>
      </div>
      <Link
        href="/gifts/corporate/inquiry"
        onClick={() => trackEvent("corporate_gift_form_started", { source: "calculator", qty, per_pack: perPack })}
        className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-full bg-gold-500 px-6 text-[12.5px] font-black text-brand-950 transition-colors hover:bg-gold-400 sm:w-auto"
      >
        دریافت پیشنهاد هلسا
      </Link>
    </div>
  );
}
