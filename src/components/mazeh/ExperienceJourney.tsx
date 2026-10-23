"use client";
import { useEffect, useMemo, useState } from "react";
import { Price } from "@/components/ui/primitives";
import Link from "next/link";
import { Plus, ShoppingBag, Sparkles, Users } from "lucide-react";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { trackEvent } from "@/lib/analytics";
import { faDigits, formatToman } from "@/lib/format";
import { trayVisual } from "@/lib/trayVisuals";
import { TrayCard } from "@/components/mazeh/TrayCard";
import type { MazehTray } from "@/types";

/**
 * سفر تجربهٔ هلسا (صفحهٔ /experience): تعداد مهمان ← مناسبت ← پیشنهاد قطعی ← سینی‌ها.
 * منطق پیشنهاد قطعی (deterministic) روی دادهٔ واقعی سینی‌ها — بدون هوش مصنوعی نمایشی:
 * امتیاز = تطابق مناسبت (۳) + تناسب ظرفیت (۲) + featured واقعی (۱).
 */

type GuestId = "all" | "2" | "4-6" | "6-10" | "10-20" | "corp";

const GUESTS: { id: GuestId; label: string; min: number; max: number; corp?: boolean }[] = [
  { id: "all", label: "همه", min: 0, max: 999 },
  { id: "2", label: "۲ نفر", min: 1, max: 3 },
  { id: "4-6", label: "۴ تا ۶ نفر", min: 4, max: 6 },
  { id: "6-10", label: "۶ تا ۱۰ نفر", min: 6, max: 10 },
  { id: "10-20", label: "۱۰ تا ۲۰ نفر", min: 10, max: 20 },
  { id: "corp", label: "سازمانی", min: 0, max: 999, corp: true },
];

/** کارت مناسبت — عنوان/تگ واقعی جدول mazeh_trays (occasions) یا شرط ظرفیت صریح */
const OCCASIONS: { id: string; label: string; desc: string; emoji: string; tag?: string; small?: boolean }[] = [
  { id: "all", label: "همه مناسبت‌ها", desc: "کل مجموعه هلسا", emoji: "✨" },
  { id: "birthday", label: "تولد", desc: "شیرین‌تر از هر سال", emoji: "🎂", tag: "تولد" },
  { id: "family", label: "دورهمی خانوادگی", desc: "دور یک میز بزرگ", emoji: "👨‍👩‍👧‍👦", tag: "مهمانی خانوادگی" },
  { id: "corporate", label: "جلسه کاری", desc: "همایش و جلسات", emoji: "🏢", tag: "جلسه کاری" },
  { id: "yalda", label: "شب یلدا", desc: "گرم‌ترین سینی بلندترین شب", emoji: "🍉", tag: "یلدا" },
  { id: "nowruz", label: "نوروز", desc: "پذیرایی بهاری هفت‌سین", emoji: "🌱", tag: "نوروز" },
  { id: "romantic", label: "عصر دونفره", desc: "چای و دل‌نوشت", emoji: "🫖", small: true },
  { id: "gift", label: "هدیه", desc: "جعبه و سینی هدیه", emoji: "🎁", tag: "هدیه" },
  { id: "luxury", label: "پذیرایی لوکس", desc: "برای مهمان‌های ویژه", emoji: "👑", tag: "پذیرایی VIP" },
];

export function ExperienceJourney({ trays }: { trays: MazehTray[] }) {
  const [guests, setGuests] = useState<GuestId>("all");
  const [occ, setOcc] = useState("all");
  const addItem = useStore((s) => s.addItem);
  const toast = useToast();

  // بازیابی انتخاب از URL (?guests=&occ=) در اولین رندر — رفرش، سفر را حفظ می‌کند
  useEffect(() => {
    const t = window.setTimeout(() => {
      const sp = new URLSearchParams(window.location.search);
      const g = sp.get("guests") as GuestId | null;
      const o = sp.get("occ");
      if (g && GUESTS.some((x) => x.id === g)) setGuests(g);
      if (o && OCCASIONS.some((x) => x.id === o)) setOcc(o);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  const syncUrl = (g: GuestId, o: string) => {
    const sp = new URLSearchParams(window.location.search);
    if (g !== "all") sp.set("guests", g); else sp.delete("guests");
    if (o !== "all") sp.set("occ", o); else sp.delete("occ");
    const qs = sp.toString();
    window.history.replaceState(null, "", `/experience${qs ? "?" + qs : ""}`);
  };
  const pickGuests = (g: GuestId) => { setGuests(g); syncUrl(g, occ); trackEvent("experience_guest_select", { value: g }); };
  const pickOcc = (o: string) => { setOcc(o); syncUrl(guests, o); trackEvent("experience_occasion_select", { value: o }); };

  const gRange = GUESTS.find((g) => g.id === guests)!;
  const occDef = OCCASIONS.find((o) => o.id === occ)!;

  /** فیلتر ظرفیت: هم‌پوشانی بازهٔ سینی با انتخاب مهمان (سازمانی = ظرفیت ≥۱۲ یا جلسه کاری) */
  const fitsGuests = (t: MazehTray) => {
    if (guests === "all") return true;
    if (gRange.corp) return t.servesMax >= 12 || t.occasions.includes("جلسه کاری");
    return t.servesMax >= gRange.min && t.servesMin <= gRange.max;
  };
  const fitsOcc = (t: MazehTray) => {
    if (occ === "all") return true;
    if (occDef.tag) return t.occasions.includes(occDef.tag);
    if (occDef.small) return t.servesMax <= 4; // عصر دونفره
    return true;
  };

  const list = useMemo(
    () => trays.filter((t) => t.active && fitsGuests(t) && fitsOcc(t)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trays, guests, occ],
  );

  /**
   * پیشنهاد قطعی — بالاترین امتیاز از منطق شفاف روی دادهٔ واقعی.
   * اگر هیچ سینی ظرفیت انتخابی را نپوشاند (مثل جمع‌های ۲ نفره — کوچک‌ترین سینی واقعی ۴ نفره است)،
   * نزدیک‌ترین ظرفیت از بالا پیشنهاد می‌شود با توضیح صادقانه (near).
   */
  const pick = useMemo(() => {
    const score = (t: MazehTray) =>
      (occDef.tag && t.occasions.includes(occDef.tag) ? 3 : 0) +
      (occDef.small && t.servesMax <= 4 ? 3 : 0) +
      (gRange.corp && (t.servesMax >= 12 || t.occasions.includes("جلسه کاری")) ? 3 : 0) +
      (guests !== "all" && t.servesMax >= gRange.min && t.servesMin <= gRange.max ? 2 : 0) +
      (t.featured ? 1 : 0) +
      (t.stock && t.stock > 0 ? 1 : 0);
    const exact = [...list].sort((a, b) => score(b) - score(a))[0];
    if (exact) return { tray: exact, near: false };
    // نزدیک‌ترین از بالا: ابتدا هم‌مناسبت‌ها، بعد کل مجموعه — کوچک‌ترین ظرفیت
    const pool = trays.filter((t) => t.active && fitsOcc(t));
    const from = pool.length ? pool : trays.filter((t) => t.active);
    const nearest = [...from].sort((a, b) => a.servesMin - b.servesMin || a.basePrice - b.basePrice)[0];
    return nearest ? { tray: nearest, near: true } : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, guests, occ]);

  const why = (t: MazehTray, near = false) => {
    const parts: string[] = [];
    if (near) parts.push("نزدیک‌ترین ظرفیت به انتخاب شما — سخاوتمندانه برای جمع کوچک‌تر");
    if (occDef.tag && t.occasions.includes(occDef.tag)) parts.push(occDef.label);
    else if (occDef.small && !near) parts.push("مناسب دو نفر");
    else if (gRange.corp) parts.push("مناسب جلسات و رویدادها");
    parts.push(`برای ${faDigits(t.servesMin)} تا ${faDigits(t.servesMax)} نفر`);
    if (t.featured) parts.push("پیشنهاد ویژهٔ هلسا");
    return parts.join(" · ");
  };

  const quickAdd = (t: MazehTray) => {
    addItem(
      {
        key: `t-${t.id}`,
        kind: "tray",
        id: t.id,
        name: t.name,
        slug: t.slug,
        image: trayVisual(t.slug, t.image),
        price: t.basePrice,
        meta: `برای ${faDigits(t.servesMin)} تا ${faDigits(t.servesMax)} نفر`,
      },
      1,
    );
    trackEvent("experience_recommend_add", { tray: t.slug, guests, occasion: occ });
    toast.push("سینی پیشنهادی به سبد خرید اضافه شد");
  };

  return (
    <div className="space-y-10">
      {/* ——— §2: تعداد مهمان ——— */}
      <div>
        <h2 className="flex items-center gap-2 text-[15px] font-black text-heading">
          <Users className="size-4 text-brand-700" aria-hidden /> چند نفر هستید؟
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="تعداد مهمان‌ها">
          {GUESTS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => pickGuests(g.id)}
              aria-pressed={guests === g.id}
              className={`h-10 rounded-full px-4 text-[11.5px] font-bold transition-colors ${
                guests === g.id ? "bg-brand-700 text-inverse shadow-soft" : "border border-line bg-surface text-body hover:border-brand-300"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* ——— §3: مناسبت ——— */}
      <div>
        <h2 className="text-[15px] font-black text-heading">بهانهٔ جمع‌شدن‌تان چیست؟</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4" role="group" aria-label="مناسبت‌ها">
          {OCCASIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => pickOcc(o.id)}
              aria-pressed={occ === o.id}
              className={`rounded-2xl border p-3.5 text-start transition-all ${
                occ === o.id ? "border-brand-600 bg-brand-50 shadow-soft" : "border-line bg-surface hover:border-brand-300"
              }`}
            >
              <span className="text-xl" aria-hidden>{o.emoji}</span>
              <p className="mt-1.5 text-[12.5px] font-extrabold text-heading">{o.label}</p>
              <p className="mt-0.5 text-[10.5px] leading-4 text-muted">{o.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ——— §4: پیشنهاد قطعی هلسا ——— */}
      {pick && (
        <div className="overflow-hidden rounded-[1.75rem] border border-gold-300/70 bg-gradient-to-l from-gold-50 via-surface to-surface shadow-soft">
          <div className="grid md:grid-cols-12">
            <div className="relative md:col-span-5 aspect-[4/3] md:aspect-auto md:min-h-[240px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={trayVisual(pick.tray.slug, pick.tray.image)} alt={pick.tray.imageAlt || pick.tray.name} loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
            </div>
            <div className="md:col-span-7 p-5 md:p-7">
              <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-widest text-gold-700">
                <Sparkles className="size-3.5" aria-hidden /> پیشنهاد هلسا برای شما
              </p>
              <h3 className="mt-2 text-lg md:text-xl font-black text-heading">{pick.tray.name}</h3>
              <p className="mt-1.5 text-[12px] font-bold text-brand-700">{why(pick.tray, pick.near)}</p>
              <p className="mt-2 text-[12.5px] leading-6 text-muted line-clamp-2-fa">{pick.tray.shortDescription}</p>
              <div className="mt-3">
                <Price price={pick.tray.basePrice} oldPrice={pick.tray.oldPrice} size="lg" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => quickAdd(pick.tray)}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-brand-700 px-6 text-[13px] font-bold text-inverse transition-colors hover:bg-brand-800"
                >
                  <ShoppingBag className="size-4" aria-hidden /> این سینی را انتخاب می‌کنم
                </button>
                <Link
                  href={`/mazeh-trays/${pick.tray.slug}`}
                  className="inline-flex h-11 items-center gap-1.5 rounded-full border border-brand-700/40 px-6 text-[13px] font-bold text-heading transition-colors hover:border-brand-700 hover:bg-brand-50"
                >
                  <Plus className="size-4" aria-hidden /> مشاهده جزئیات
                </Link>
              </div>
              <p className="mt-3 text-[10.5px] text-muted">پیشنهاد بر اساس انتخاب شما از سینی‌های واقعی هلسا — نه تبلیغ پرداختی.</p>
            </div>
          </div>
        </div>
      )}

      {/* ——— §5: سینی‌های هم‌خوان ——— */}
      <div>
        <h2 className="text-[15px] font-black text-heading">
          سینی‌های هم‌خوان با انتخاب شما
          <span className="ms-2 text-[11.5px] font-bold text-muted">({faDigits(list.length)} سینی از دادهٔ واقعی)</span>
        </h2>
        {list.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-[12.5px] text-muted">
            با این ترکیب فعلاً سینی ثبت‌شده‌ای نداریم — <Link href="/mazeh-trays/build" className="font-bold text-brand-700">سینی اختصاصی خودتان را بسازید</Link>.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {list.map((t) => (
              <TrayCard key={t.slug} tray={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
