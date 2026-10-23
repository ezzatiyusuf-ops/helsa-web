"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Users, Check } from "lucide-react";
import type { MazehTray } from "@/types";
import { TrayCard } from "@/components/mazeh/TrayCard";
import { faDigits } from "@/lib/format";
import { trackEvent } from "@/lib/analytics";
import { SmartImage } from "@/components/ui/SmartImage";

type TrayCat = {
  id: string;
  label: string;
  desc: string;
  image: string;
  match: (t: MazehTray) => boolean;
};

/** Tray categories — presented as premium product-style cards (spec §8) */
const TRAY_CATEGORIES: TrayCat[] = [
  {
    id: "all",
    label: "همه سینی‌ها",
    desc: "کل مجموعه امضای هلسا",
    image: "/images/mazeh-light.jpg",
    match: () => true,
  },
  {
    id: "two",
    label: "سینی دو نفره",
    desc: "پذیرایی دونفره و خلوت",
    image: "/images/opt/doromi.jpg",
    match: (t) => t.servesMin <= 4,
  },
  {
    id: "family",
    label: "سینی خانوادگی",
    desc: "دورهمی‌های خانوادگی ۴ تا ۸ نفر",
    image: "/images/opt/classic.jpg",
    match: (t) => t.size === "متوسط" || t.occasions.includes("مهمانی خانوادگی"),
  },
  {
    id: "party",
    label: "سینی مهمانی",
    desc: "میزهای مهمانی ۸ تا ۱۲ نفر",
    image: "/images/opt/party.jpg",
    match: (t) => t.size === "بزرگ",
  },
  {
    id: "vip",
    label: "سینی VIP",
    desc: "پذیرایی ویژه ۱۲ تا ۲۰ نفر",
    image: "/images/tray-vip.jpg",
    match: (t) => t.size === "VIP" || t.occasions.includes("پذیرایی VIP"),
  },
  {
    id: "yalda",
    label: "سینی یلدا",
    desc: "چیدمان شب چله با انار و شیرینی",
    image: "/images/tray-yalda.jpg",
    match: (t) => t.occasions.includes("یلدا"),
  },
  {
    id: "norooz",
    label: "سینی نوروز",
    desc: "پذیرایی بهاری سفره هفت‌سین",
    image: "/images/tray-norooz.jpg",
    match: (t) => t.occasions.includes("نوروز"),
  },
  {
    id: "corp",
    label: "سینی سازمانی",
    desc: "جلسات، همایش‌ها و رویدادها",
    image: "/images/opt/tray-corporate.jpg",
    match: (t) => t.servesMax >= 12 || t.occasions.includes("جلسه کاری"),
  },
  {
    id: "birthday",
    label: "سینی تولد",
    desc: "چیدمان شیرین برای جشن تولد",
    image: "/images/opt/dessert-tray.jpg",
    match: (t) => t.occasions.includes("تولد"),
  },
  {
    id: "gift",
    label: "سینی هدیه",
    desc: "هدیه‌ای شیک با بسته‌بندی ویژه",
    image: "/images/opt/golden.jpg",
    match: (t) => t.occasions.includes("هدیه") || t.occasions.includes("عروسی"),
  },
];

/** بازهٔ نفرات (§7 — کمک به انتخاب) — تطبیق با بازهٔ واقعی سرو سینی هر سینی */
// فیلتر بودجه — بازه‌های واقعی از قیمت سینی‌های فعال (۱٫۴۵ تا ۵٫۴۵ میلیون)
const BUDGET_RANGES: { id: string; label: string; min: number; max: number }[] = [
  { id: "all", label: "هر بودجه", min: 0, max: Infinity },
  { id: "eco", label: "تا ۲ میلیون", min: 0, max: 2_000_000 },
  { id: "mid", label: "۲ تا ۴ میلیون", min: 2_000_000, max: 4_000_000 },
  { id: "pro", label: "بالای ۴ میلیون", min: 4_000_000, max: Infinity },
];

const GUEST_RANGES: { id: string; label: string; min: number; max: number }[] = [
  { id: "all", label: "همه", min: 0, max: 999 },
  { id: "2", label: "۲ نفر", min: 2, max: 3 },
  { id: "4-6", label: "۴ تا ۶ نفر", min: 4, max: 6 },
  { id: "6-10", label: "۶ تا ۱۰ نفر", min: 6, max: 10 },
  { id: "8-12", label: "۸ تا ۱۲ نفر", min: 8, max: 12 },
  { id: "12-20", label: "۱۲ تا ۲۰ نفر", min: 12, max: 99 },
];

export function TrayExplorer({
  trays,
  initialCat = "all",
  initialGuests = "all",
}: {
  trays: MazehTray[];
  initialCat?: string;
  initialGuests?: string;
}) {
  const [cat, setCat] = useState(TRAY_CATEGORIES.some((c) => c.id === initialCat) ? initialCat : "all");
  const [guests, setGuests] = useState(GUEST_RANGES.some((g) => g.id === initialGuests) ? initialGuests : "all");
  const [budget, setBudget] = useState("all");
  const active = TRAY_CATEGORIES.find((c) => c.id === cat)!;
  const range = GUEST_RANGES.find((g) => g.id === guests) ?? GUEST_RANGES[0];
  const budgetRange = BUDGET_RANGES.find((b) => b.id === budget) ?? BUDGET_RANGES[0];

  // همگام‌سازی وضعیت فیلتر با URL (بدون رفرش؛ رفرش مرورگر انتخاب را حفظ می‌کند)
  const syncUrl = (nextCat: string, nextGuests: string) => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    if (nextCat && nextCat !== "all") sp.set("cat", nextCat); else sp.delete("cat");
    if (nextGuests && nextGuests !== "all") sp.set("guests", nextGuests); else sp.delete("guests");
    const qs = sp.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? "?" + qs : ""}`);
  };
  const pickCat = (id: string) => { setCat(id); syncUrl(id, guests); trackEvent("mazeh_filter_used", { filter: "category", value: id }); };
  const pickGuests = (id: string) => { setGuests(id); syncUrl(cat, id); trackEvent("mazeh_filter_used", { filter: "guests", value: id }); };
  const pickBudget = (id: string) => { setBudget(id); trackEvent("mazeh_filter_used", { filter: "budget", value: id }); };

  const list = useMemo(() => {
    // پیشنهاد هلسا (featured واقعی دیتابیس) همیشه بالای فهرست
    return trays
      .filter(
        (t) =>
          active.match(t) &&
          t.servesMax >= range.min &&
          t.servesMin <= range.max &&
          t.basePrice >= budgetRange.min &&
          t.basePrice < budgetRange.max,
      )
      .sort((a, b) => Number(b.featured) - Number(a.featured) || a.basePrice - b.basePrice);
  }, [trays, active, range, budgetRange]);
  const countFor = (c: TrayCat) =>
    trays.filter(
      (t) =>
        c.match(t) &&
        t.servesMax >= range.min &&
        t.servesMin <= range.max &&
        t.basePrice >= budgetRange.min &&
        t.basePrice < budgetRange.max,
    ).length;

  return (
    <div>
      {/* انتخاب تعداد مهمان (§7) — فیلتر سریع بر پایهٔ ظرفیت واقعی سینی‌ها */}
      <div className="mb-5 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1" role="group" aria-label="تعداد مهمان‌ها">
        {GUEST_RANGES.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => pickGuests(g.id)}
            aria-pressed={guests === g.id}
            className={`h-10 shrink-0 rounded-full px-4 text-[11.5px] font-bold transition-colors ${
              guests === g.id ? "bg-brand-700 text-inverse shadow-soft" : "border border-line bg-surface text-body hover:border-brand-300"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* انتخاب بودجه (CRO) — بازه‌های واقعی قیمت سینی‌ها */}
      <div className="mb-5 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1" role="group" aria-label="بودجه">
        {BUDGET_RANGES.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => pickBudget(b.id)}
            aria-pressed={budget === b.id}
            className={`h-10 shrink-0 rounded-full px-4 text-[11.5px] font-bold transition-colors ${
              budget === b.id ? "bg-gold-500 text-brand-950 shadow-soft" : "border border-line bg-surface text-body hover:border-gold-400"
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* category cards — same visual language as product cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" role="tablist" aria-label="دسته‌بندی سینی‌ها">
        {TRAY_CATEGORIES.map((c) => {
          const selected = cat === c.id;
          const n = countFor(c);
          return (
            <button
              key={c.id}
              role="tab"
              aria-selected={selected}
              onClick={() => pickCat(c.id)}
              className={`group relative flex flex-col overflow-hidden rounded-2xl border text-start transition-all duration-300 ${
                selected ? "border-brand-600 ring-2 ring-brand-600/25 shadow-soft" : "border-line/60 hover:border-brand-400 hover:shadow-soft"
              } bg-surface`}
            >
              <span className="relative block aspect-[16/10] overflow-hidden bg-surface2">
                <SmartImage
                  src={c.image}
                  alt={`تصویر ${c.label} — ${c.desc}`}
                  sizes="(min-width:1024px) 20vw, 50vw"
                  className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
                {selected && (
                  <span className="absolute top-2 end-2 size-6 rounded-full bg-brand-700 text-inverse grid place-items-center">
                    <Check className="size-3.5" aria-hidden />
                  </span>
                )}
                <span className="absolute bottom-2 start-2 inline-flex items-center gap-1 rounded-full bg-surface/90 px-2.5 py-1 text-[10px] font-bold text-body">
                  <Users className="size-3 text-gold-700" aria-hidden />
                  {faDigits(n)} سینی
                </span>
              </span>
              <span className="flex flex-1 flex-col px-3.5 py-3">
                <span className={`text-[12.5px] font-extrabold transition-colors ${selected ? "text-brand-600" : "text-heading group-hover:text-brand-600"}`}>
                  {c.label}
                </span>
                <span className="mt-1 text-[10.5px] leading-5 text-muted line-clamp-2-fa">{c.desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-muted" role="status">
        {faDigits(list.length)} سینی
        {guests !== "all" ? ` برای ${range.label}` : ""}
        {cat !== "all" ? ` در دسته «${active.label}»` : ""}
      </p>

      {list.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-line p-10 text-center">
          <p className="text-sm font-bold text-body">سینی‌ای با این مشخصات آماده ثبت نشده است.</p>
          <p className="mt-2 text-xs leading-6 text-muted">
            می‌توانید سینی اختصاصی خود را با تعداد مهمان و بودجه دلخواه بسازید — دقیقاً همان‌طور که می‌خواهید.
          </p>
          <Link
            href="/mazeh-trays/build"
            className="mt-5 inline-flex h-11 items-center rounded-full bg-brand-700 px-6 text-[12.5px] font-bold text-inverse transition-colors hover:bg-brand-800"
          >
            ساخت سینی من
          </Link>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((t) => (
            <TrayCard key={t.id} tray={t} />
          ))}
        </div>
      )}
    </div>
  );
}
