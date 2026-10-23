"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  Sparkles, Soup, Droplet, CircleDot, Wheat, Drumstick, Nut, Apple, Coffee, Leaf, Cake, Cherry,
  Gift, Save, RotateCcw, Plus, Minus, Trash2, Users, Check, Loader2, ShoppingBag,
  ChevronLeft, ChevronRight, Info, GripVertical, ArrowUp, ArrowDown, Copy, Star, Clock3,
} from "lucide-react";
import {
  BUILDER_SIZES, BUILDER_BASES, BUILDER_CATEGORIES, BUILDER_DECOR, BUILDER_GIFT_WRAP,
  BUILDER_MIN_ITEMS, BUILDER_MAX_PORTIONS, BUILDER_GUEST_MIN, BUILDER_GUEST_MAX,
  BUILDER_DELIVERY_ESTIMATE,
  estimateBuilderPrice, findBuilderItem,
} from "@/config/tray-builder";
import { trackEvent } from "@/lib/analytics";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { Button, Price } from "@/components/ui/primitives";
import { FieldLabel, Input } from "@/components/ui/controls";
import { faDigits, formatToman } from "@/lib/format";
import type { QuoteLine } from "@/types";

const CATEGORY_ICONS: Record<string, typeof Sparkles> = {
  Sparkles, Soup, Droplet, CircleDot, Wheat, Drumstick, Nut, Apple, Coffee, Honey: Leaf, Cake, Cherry,
};

const STEPS = [
  { n: 1, title: "سینی و مهمان", desc: "اندازه، جنس و تعداد نفرات" },
  { n: 2, title: "مزه‌ها و اقلام", desc: "دوازده دسته، انتخاب آزاد" },
  { n: 3, title: "تزئین و هدیه", desc: "افزونه‌ها و بسته‌بندی" },
  { n: 4, title: "بازبینی و ثبت", desc: "پیش‌نمایش و قیمت نهایی" },
] as const;

const DRAFTS_KEY = "helsa-tray-drafts-v1";

interface BuilderDraft {
  name: string;
  savedAt: string;
  favorite?: boolean;
  config: {
    sizeId: string;
    baseId: string;
    guests: number;
    qty: Record<string, number>;
    decor: string[];
    giftWrap: string;
    message: boolean;
  };
}

/* ——— visual tray rendering ——— */
const CAT_COLORS: Record<string, string> = {
  dates: "#8b5e34", dips: "#c46a2b", sauces: "#a34a2e", cheese: "#c9972b",
  bread: "#c99e5f", protein: "#9c4a4a", nuts: "#7a8b3a", fruits: "#c05a7a",
  drinks: "#3e7c8f", extras: "#b3922f",
};
const BASE_FILL: Record<string, { from: string; to: string; stroke: string }> = {
  wood: { from: "#9a6b45", to: "#6f4629", stroke: "#5a3920" },
  stone: { from: "#3a3b41", to: "#232428", stroke: "#17181b" },
  ceramic: { from: "#efe8d8", to: "#d9cfb8", stroke: "#b8ab8d" },
  acrylic: { from: "#d8ece4", to: "#b9d6cb", stroke: "#b3922f" },
};
const SIZE_SCALE: Record<string, number> = {
  small: 0.78, medium: 0.86, large: 0.93, xl: 0.96, vip: 1, corporate: 1.04, event: 1.1, custom: 0.84,
};

function shortLabel(label: string): string {
  const w = label.replace(/[(（].*?[)）]/g, "").trim().split(/\s+/)[0] ?? label;
  return w.length > 7 ? w.slice(0, 7) : w;
}

/** Live visual tray — SVG, transform-only motion, instant item appearance. */
function TrayVisual({
  arrangement,
  qty,
  sizeId,
  baseId,
  compact = false,
}: {
  arrangement: string[];
  qty: Record<string, number>;
  sizeId: string;
  baseId: string;
  compact?: boolean;
}) {
  const W = 420, H = 300;
  const cx = W / 2, cy = H / 2;
  const scale = SIZE_SCALE[sizeId] ?? 0.9;
  const tw = 364 * scale, th = 252 * scale;
  const fill = BASE_FILL[baseId] ?? BASE_FILL.wood;

  const placed = arrangement.filter((id) => (qty[id] ?? 0) > 0).map((id) => {
    const item = findBuilderItem(id);
    const cat = BUILDER_CATEGORIES.find((c) => c.items.some((i) => i.id === id));
    return { id, label: item?.label ?? id, qty: qty[id], color: CAT_COLORS[cat?.id ?? "extras"] ?? "#7a8b3a" };
  });
  const visible = placed.slice(0, 18);
  const n = visible.length;
  const rx = tw / 2 - 34, ry = th / 2 - 30;
  const pos = (i: number) => {
    if (n === 1) return { x: cx, y: cy };
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
  };

  return (
    <div className={`relative overflow-hidden rounded-[24px] border border-line/70 bg-surface2 ${compact ? "p-3" : "p-5"}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,rgb(255_255_255/0.5),transparent_55%)]" aria-hidden />
      <svg viewBox={`0 0 ${W} ${H}`} className={`w-full ${compact ? "max-h-52" : ""}`} role="img" aria-label={`پیش‌نمایش سینی با ${faDigits(n)} قلم`}>
        <defs>
          <linearGradient id={`tray-${baseId}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={fill.from} />
            <stop offset="100%" stopColor={fill.to} />
          </linearGradient>
        </defs>
        {/* soft drop shadow */}
        <ellipse cx={cx} cy={cy + th / 2 + 8} rx={tw / 2} ry={12} fill="rgb(6 51 35 / 0.18)" />
        {/* tray body */}
        <rect x={cx - tw / 2} y={cy - th / 2} width={tw} height={th} rx={26} fill={`url(#tray-${baseId})`} stroke={fill.stroke} strokeWidth={2.5} />
        <rect x={cx - tw / 2 + 9} y={cy - th / 2 + 9} width={tw - 18} height={th - 18} rx={19} fill="none" stroke="rgb(255 255 255 / 0.22)" strokeWidth={1.5} />
        {/* empty state */}
        {n === 0 && (
          <text x={cx} y={cy} textAnchor="middle" fill="rgb(255 255 255 / 0.85)" fontSize={15} fontWeight={700}>
            اقلام را انتخاب کنید تا روی سینی بنشینند…
          </text>
        )}
        {/* bowls */}
        {visible.map((b, i) => {
          const p = pos(i);
          return (
            <g key={b.id}>
              <motion.circle
                cx={p.x} cy={p.y} r={compact ? 20 : 24}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 22, delay: Math.min(i * 0.02, 0.3) }}
                style={{ transformOrigin: `${p.x}px ${p.y}px` }}
                fill={b.color} fillOpacity={0.95} stroke="rgb(255 255 255 / 0.85)" strokeWidth={2}
              />
              <text x={p.x} y={p.y + 4} textAnchor="middle" fill="#fff" fontSize={compact ? 9 : 10.5} fontWeight={800}>
                {shortLabel(b.label)}
              </text>
              {b.qty > 1 && (
                <g>
                  <circle cx={p.x + (compact ? 15 : 18)} cy={p.y - (compact ? 15 : 18)} r={9} fill="#0b5f3b" stroke="#fff" strokeWidth={1.5} />
                  <text x={p.x + (compact ? 15 : 18)} y={p.y - (compact ? 14 : 17)} textAnchor="middle" fill="#fff" fontSize={10} fontWeight={800}>
                    {faDigits(b.qty)}
                  </text>
                </g>
              )}
            </g>
          );
        })}
        {placed.length > 18 && (
          <text x={cx} y={H - 12} textAnchor="middle" fill="rgb(32 31 27 / 0.55)" fontSize={11} fontWeight={700}>
            +{faDigits(placed.length - 18)} قلم دیگر
          </text>
        )}
      </svg>
    </div>
  );
}

export function TrayBuilderClient() {
  const toast = useToast();
  const addItem = useStore((s) => s.addItem);

  const [step, setStep] = useState(1);
  const [sizeId, setSizeId] = useState("medium");
  const [baseId, setBaseId] = useState("wood");
  const [guests, setGuests] = useState(6);
  const [qty, setQty] = useState<Record<string, number>>({});
  /** explicit order after user reorders; null = insertion order of qty keys */
  const [order, setOrder] = useState<string[] | null>(null);
  const [decor, setDecor] = useState<string[]>([]);
  const [giftWrap, setGiftWrap] = useState("none");
  const [message, setMessage] = useState(false);

  const [serverQuote, setServerQuote] = useState<{ id: number; lines: QuoteLine[]; total: number } | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [adding, setAdding] = useState(false);
  const quoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragId = useRef<string | null>(null);

  const [drafts, setDrafts] = useState<BuilderDraft[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(DRAFTS_KEY) ?? "[]") as BuilderDraft[];
    } catch {
      return [];
    }
  });
  const [draftName, setDraftName] = useState("");

  const persistDrafts = (next: BuilderDraft[]) => {
    setDrafts(next);
    try {
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(next));
    } catch { /* storage full/blocked */ }
  };

  const items = useMemo(() => {
    const active = Object.keys(qty).filter((id) => (qty[id] ?? 0) > 0);
    const arranged = order
      ? [...order.filter((id) => (qty[id] ?? 0) > 0), ...active.filter((id) => !order.includes(id))]
      : active;
    return arranged.map((id) => ({ id, qty: qty[id] }));
  }, [order, qty]);
  const arrangement = items.map((i) => i.id);
  const distinctItems = items.length;
  const portions = items.reduce((sum, i) => sum + i.qty, 0);
  const enoughItems = distinctItems >= BUILDER_MIN_ITEMS;
  const withinPortions = portions <= BUILDER_MAX_PORTIONS;

  const estimate = useMemo(
    () => estimateBuilderPrice({ sizeId, baseId, guests, items, decor, giftWrap, message }),
    [sizeId, baseId, guests, items, decor, giftWrap, message],
  );

  const payload = useCallback(() => ({
    size: sizeId, base: baseId, guests, items, decor, giftWrap, message,
  }), [sizeId, baseId, guests, items, decor, giftWrap, message]);

  // شروع ساخت سینی (بریف G5) — یک‌بار در هر بازدید
  useEffect(() => { trackEvent("tray_builder_started", {}); }, []);

  // debounced server-side quote — the only trusted price
  useEffect(() => {
    if (quoteTimer.current) clearTimeout(quoteTimer.current);
    quoteTimer.current = setTimeout(async () => {
      if (!enoughItems || !withinPortions) {
        setServerQuote(null);
        return;
      }
      setQuoting(true);
      try {
        const res = await fetch("/api/tray-builder/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload()),
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          setServerQuote({ id: data.quote.id, lines: data.quote.lines, total: data.quote.total });
        } else {
          setServerQuote(null);
        }
      } catch {
        setServerQuote(null);
      } finally {
        setQuoting(false);
      }
    }, 700);
    return () => { if (quoteTimer.current) clearTimeout(quoteTimer.current); };
  }, [payload, enoughItems, withinPortions]);

  const inc = (id: string, delta: number) =>
    setQty((q) => ({ ...q, [id]: Math.min(5, Math.max(0, (q[id] ?? 0) + delta)) }));

  const removeItem = (id: string) => setQty((q) => ({ ...q, [id]: 0 }));

  /** reorder: move `id` by ±1 (buttons/keyboard) — pure order update */
  const move = (id: string, dir: 1 | -1) =>
    setOrder((prev) => {
      const a = prev ?? arrangement;
      const i = a.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= a.length) return a;
      const next = [...a];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  /** drag-and-drop: move dragged id before the drop target */
  const dropBefore = (id: string) => {
    const from = dragId.current;
    dragId.current = null;
    if (!from || from === id) return;
    setOrder((prev) => {
      const a = prev ?? arrangement;
      const next = a.filter((x) => x !== from);
      const j = next.indexOf(id);
      next.splice(j < 0 ? next.length : j, 0, from);
      return next;
    });
  };

  const reset = () => {
    setQty({}); setOrder(null); setDecor([]); setGiftWrap("none"); setMessage(false); setServerQuote(null);
    toast.push("سینی جدید خالی شد");
  };

  const saveDraft = () => {
    if (!enoughItems) { toast.push("برای ذخیره، حداقل ۴ قلم انتخاب کنید", "error"); return; }
    const name = draftName.trim() || `سینی ${faDigits(drafts.length + 1)}`;
    const draft: BuilderDraft = {
      name,
      savedAt: new Date().toISOString(),
      config: { sizeId, baseId, guests, qty, decor, giftWrap, message },
    };
    persistDrafts([draft, ...drafts].slice(0, 12));
    setDraftName("");
    toast.push("پیکربندی سینی ذخیره شد");
  };

  const loadDraft = (d: BuilderDraft) => {
    setSizeId(d.config.sizeId); setBaseId(d.config.baseId); setGuests(d.config.guests);
    setQty(d.config.qty); setOrder(Object.keys(d.config.qty).filter((id) => (d.config.qty[id] ?? 0) > 0));
    setDecor(d.config.decor); setGiftWrap(d.config.giftWrap); setMessage(d.config.message);
    setStep(4);
    toast.push(`«${d.name}» بارگذاری شد`);
  };

  const duplicateDraft = (d: BuilderDraft, idx: number) => {
    const copy: BuilderDraft = { ...d, name: `${d.name} (کپی)`, savedAt: new Date().toISOString(), favorite: false };
    persistDrafts([...drafts.slice(0, idx + 1), copy, ...drafts.slice(idx + 1)].slice(0, 12));
    toast.push(`کپی «${d.name}» ساخته شد`);
  };

  const toggleFavDraft = (idx: number) => {
    persistDrafts(drafts.map((d, i) => (i === idx ? { ...d, favorite: !d.favorite } : d)));
  };

  const sortedDrafts = useMemo(
    () => drafts.map((d, i) => ({ d, i })).sort((a, b) => Number(b.d.favorite ?? false) - Number(a.d.favorite ?? false)),
    [drafts],
  );

  const addToCart = async () => {
    if (!enoughItems || !withinPortions) {
      toast.push(distinctItems < BUILDER_MIN_ITEMS ? `حداقل ${BUILDER_MIN_ITEMS} قلم متفاوت انتخاب کنید` : `حداکثر ${BUILDER_MAX_PORTIONS} پورشن مجاز است`, "error");
      return;
    }
    setAdding(true);
    try {
      // authoritative price: fetch a fresh quote at add-time
      const res = await fetch("/api/tray-builder/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload()),
      });
      const data = await res.json();
      if (!res.ok || !data.ok || !data.quote?.id) {
        toast.push(data.message || "قیمت‌گذاری سینی انجام نشد", "error");
        return;
      }
      const q = data.quote as { id: number; lines: QuoteLine[]; total: number; sizeLabel: string };
      setServerQuote({ id: q.id, lines: q.lines, total: q.total });

      const summary = items
        .map((i) => `${findBuilderItem(i.id)?.label ?? i.id}${i.qty > 1 ? ` ×${faDigits(i.qty)}` : ""}`)
        .join(" · ");
      const wrap = BUILDER_GIFT_WRAP.find((w) => w.id === giftWrap);
      addItem({
        key: `custom-quote-${q.id}`,
        kind: "custom-tray",
        id: `tray-quote-${q.id}`,
        name: "سینی مزه سفارشی هلسا",
        image: "/images/mazeh-board.jpg",
        price: q.total,
        meta: [q.sizeLabel, `برای ${faDigits(guests)} نفر`, summary, wrap && wrap.id !== "none" ? `کادو: ${wrap.label}` : ""].filter(Boolean).join(" — ").slice(0, 180),
      }, 1);
      toast.push("سینی سفارشی با قیمت تأییدشده سرور به سبد اضافه شد");
      trackEvent("tray_builder_completed", { guests, value: q.total });
    } catch {
      toast.push("متأسفانه مشکلی پیش آمد. دوباره تلاش کنید.", "error");
    } finally {
      setAdding(false);
    }
  };

  const size = BUILDER_SIZES.find((s) => s.id === sizeId)!;
  const base = BUILDER_BASES.find((b) => b.id === baseId)!;

  return (
    <div className="container-x py-10 md:py-14">
      {/* steps header */}
      <ol className="grid grid-cols-2 md:grid-cols-4 gap-2" aria-label="مراحل ساخت سینی">
        {STEPS.map((s) => {
          const active = step === s.n;
          const done = step > s.n;
          return (
            <li key={s.n}>
              <button
                type="button"
                onClick={() => setStep(s.n)}
                aria-current={active ? "step" : undefined}
                className={`w-full text-start rounded-2xl border p-3.5 transition-colors ${active ? "border-brand-600 bg-brand-50" : done ? "border-brand-200 bg-surface" : "border-line/70 bg-surface"}`}
              >
                <span className="flex items-center gap-2">
                  <span className={`grid size-7 place-items-center rounded-full text-xs font-black ${active || done ? "bg-brand-700 text-inverse" : "bg-surface2 text-muted"}`}>
                    {done ? <Check className="size-3.5" aria-hidden /> : faDigits(s.n)}
                  </span>
                  <span className="text-[13px] font-black text-heading">{s.title}</span>
                </span>
                <span className="mt-1.5 block ps-9 text-[10.5px] text-muted">{s.desc}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">
        <div>
          {/* ————— STEP 1: size, base, guests ————— */}
          {step === 1 && (
            <section aria-label="اندازه و پایه سینی" className="space-y-8">
              <div>
                <h2 className="text-sm font-black text-heading">اندازه سینی</h2>
                <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {BUILDER_SIZES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSizeId(s.id)}
                      aria-pressed={sizeId === s.id}
                      className={`rounded-2xl border p-4 text-start transition-all ${sizeId === s.id ? "border-brand-600 bg-brand-50 shadow-soft" : "border-line/70 bg-surface hover:border-brand-300 hover:-translate-y-0.5"}`}
                    >
                      <span className="block text-sm font-black text-heading">{s.label}</span>
                      <span className="mt-1 block text-[11px] text-muted">{s.guests}</span>
                      <span className="mt-2 block text-[11px] font-bold text-body">{formatToman(s.base)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-sm font-black text-heading">جنس پایه</h2>
                <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {BUILDER_BASES.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBaseId(b.id)}
                      aria-pressed={baseId === b.id}
                      className={`rounded-2xl border p-4 text-start transition-all ${baseId === b.id ? "border-brand-600 bg-brand-50 shadow-soft" : "border-line/70 bg-surface hover:border-brand-300 hover:-translate-y-0.5"}`}
                    >
                      <span className="block text-sm font-black text-heading">{b.label}</span>
                      <span className="mt-1 block text-[11px] text-muted">{b.note}</span>
                      <span className="mt-2 block text-[11px] font-bold text-body">{b.price ? `+ ${formatToman(b.price)}` : "شامل پایه"}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-line/70 bg-surface p-5">
                <h2 className="flex items-center gap-2 text-sm font-black text-heading"><Users className="size-4 text-brand-700" aria-hidden /> برای چند نفر؟</h2>
                <p className="mt-1.5 text-[11px] text-muted">حجم اقلام با تعداد مهمان تنظیم می‌شود؛ قیمت نهایی را سرور محاسبه می‌کند.</p>
                <div className="mt-4 flex items-center gap-4">
                  <button type="button" onClick={() => setGuests((g) => Math.max(BUILDER_GUEST_MIN, g - 2))} aria-label="کاهش مهمان" className="grid size-10 place-items-center rounded-full border border-line bg-surface2 hover:border-brand-400"><Minus className="size-4" aria-hidden /></button>
                  <p className="min-w-16 text-center text-xl font-black text-heading">{faDigits(guests)} <span className="text-xs font-bold text-muted">نفر</span></p>
                  <button type="button" onClick={() => setGuests((g) => Math.min(BUILDER_GUEST_MAX, g + 2))} aria-label="افزایش مهمان" className="grid size-10 place-items-center rounded-full border border-line bg-surface2 hover:border-brand-400"><Plus className="size-4" aria-hidden /></button>
                </div>
              </div>
            </section>
          )}

          {/* ————— STEP 2: items + live preview ————— */}
          {step === 2 && (
            <section aria-label="انتخاب مزه‌ها و اقلام" className="space-y-8">
              <TrayVisual arrangement={arrangement} qty={qty} sizeId={sizeId} baseId={baseId} compact />

              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-black text-heading">مزه‌ها و اقلام سینی</h2>
                <p className={`text-[11px] font-bold ${enoughItems ? "text-brand-700" : "text-accent-600"}`}>
                  {faDigits(distinctItems)} قلم از {faDigits(BUILDER_MIN_ITEMS)} لازم
                </p>
              </div>

              {BUILDER_CATEGORIES.map((cat) => {
                const Icon = CATEGORY_ICONS[cat.icon] ?? Sparkles;
                const chosenInCat = cat.items.filter((i) => (qty[i.id] ?? 0) > 0).length;
                return (
                  <div key={cat.id}>
                    <h3 className="flex items-center gap-2 text-[13px] font-black text-heading">
                      <Icon className="size-4 text-gold-700" aria-hidden />
                      {cat.label}
                      {chosenInCat > 0 && <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-black text-brand-800">{faDigits(chosenInCat)} انتخاب</span>}
                    </h3>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {cat.items.map((item) => {
                        const q = qty[item.id] ?? 0;
                        return (
                          <div
                            key={item.id}
                            className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 transition-all ${q > 0 ? "border-brand-500 bg-brand-50 shadow-soft" : "border-line/70 bg-surface hover:border-brand-300"}`}
                          >
                            <div className="min-w-0">
                              <p className="text-[13px] font-bold text-heading truncate">{item.label}</p>
                              <p className="mt-0.5 text-[10.5px] text-muted">{item.note ? `${item.note} · ` : ""}{formatToman(item.price)} / پورشن</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0" role="group" aria-label={`تعداد ${item.label}`}>
                              <button type="button" onClick={() => inc(item.id, -1)} disabled={q === 0} aria-label={`کاهش ${item.label}`} className="grid size-8 place-items-center rounded-full border border-line bg-surface2 disabled:opacity-40 hover:border-brand-400"><Minus className="size-3.5" aria-hidden /></button>
                              <span className={`w-6 text-center text-sm font-black ${q > 0 ? "text-heading" : "text-faint"}`}>{faDigits(q)}</span>
                              <button type="button" onClick={() => inc(item.id, 1)} disabled={q >= 5} aria-label={`افزایش ${item.label}`} className="grid size-8 place-items-center rounded-full border border-line bg-surface2 disabled:opacity-40 hover:border-brand-400"><Plus className="size-3.5" aria-hidden /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          {/* ————— STEP 3: decor + gift wrap ————— */}
          {step === 3 && (
            <section aria-label="تزئین و بسته‌بندی هدیه" className="space-y-8">
              <TrayVisual arrangement={arrangement} qty={qty} sizeId={sizeId} baseId={baseId} compact />

              <div>
                <h2 className="text-sm font-black text-heading">افزونه‌های تزئین</h2>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {BUILDER_DECOR.map((d) => {
                    const on = decor.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setDecor((prev) => (on ? prev.filter((x) => x !== d.id) : [...prev, d.id]))}
                        className={`rounded-2xl border p-4 text-start transition-all ${on ? "border-brand-600 bg-brand-50 shadow-soft" : "border-line/70 bg-surface hover:border-brand-300"}`}
                      >
                        <span className="flex items-center justify-between">
                          <span className="text-[13px] font-black text-heading">{d.label}</span>
                          {on && <Check className="size-4 text-brand-700" aria-hidden />}
                        </span>
                        <span className="mt-1.5 block text-[11px] font-bold text-body">+ {formatToman(d.price)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h2 className="text-sm font-black text-heading">بسته‌بندی هدیه</h2>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {BUILDER_GIFT_WRAP.map((w) => {
                    const on = giftWrap === w.id;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setGiftWrap(w.id)}
                        className={`rounded-2xl border p-4 text-start transition-all ${on ? "border-brand-600 bg-brand-50 shadow-soft" : "border-line/70 bg-surface hover:border-brand-300"}`}
                      >
                        <span className="flex items-center gap-2 text-[13px] font-black text-heading">
                          {w.id !== "none" && <Gift className="size-3.5 text-gold-700" aria-hidden />}
                          {w.label}
                        </span>
                        <span className="mt-1.5 block text-[11px] text-muted">{w.note}</span>
                        <span className="mt-1.5 block text-[11px] font-bold text-body">{w.price ? `+ ${formatToman(w.price)}` : "بدون هزینه"}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                aria-pressed={message}
                onClick={() => setMessage((m) => !m)}
                className={`w-full flex items-center justify-between rounded-2xl border p-4 transition-colors ${message ? "border-brand-600 bg-brand-50" : "border-line/70 bg-surface"}`}
              >
                <span className="text-start">
                  <span className="block text-[13px] font-black text-heading">کارت پیام اختصاصی</span>
                  <span className="mt-1 block text-[11px] text-muted">پیام کوتاه شما روی کارت هلسا چاپ می‌شود (+ {formatToman(30_000)})</span>
                </span>
                <span className={`grid size-8 place-items-center rounded-full border ${message ? "border-brand-600 bg-brand-700 text-inverse" : "border-line bg-surface2"}`}>
                  {message && <Check className="size-4" aria-hidden />}
                </span>
              </button>
            </section>
          )}

          {/* ————— STEP 4: review + arrangement ————— */}
          {step === 4 && (
            <section aria-label="بازبینی سینی" className="space-y-8">
              <div>
                <h2 className="text-sm font-black text-heading">پیش‌نمایش زنده سینی شما</h2>
                <p className="mt-1.5 text-[11px] text-muted">کاشی‌ها را با کشیدن (درگ) یا دکمه‌های ↑↓ جابه‌جا کنید؛ چیدمان همان لحظه عوض می‌شود.</p>
                <div className="mt-4">
                  <TrayVisual arrangement={arrangement} qty={qty} sizeId={sizeId} baseId={baseId} />
                </div>
              </div>

              {/* drag-to-reorder arrangement */}
              {items.length > 0 && (
                <div>
                  <h3 className="text-[13px] font-black text-heading">ترتیب چیدمان اقلام</h3>
                  <ul className="mt-3 space-y-2" aria-label="ترتیب اقلام روی سینی">
                    {items.map((i, idx) => {
                      const item = findBuilderItem(i.id);
                      return (
                        <li
                          key={i.id}
                          draggable
                          onDragStart={() => { dragId.current = i.id; }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => dropBefore(i.id)}
                          className="flex items-center justify-between gap-2 rounded-xl border border-line/70 bg-surface px-3 py-2.5 shadow-soft"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <GripVertical className="size-4 shrink-0 cursor-grab text-faint" aria-hidden />
                            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface2 text-[10px] font-black text-muted">{faDigits(idx + 1)}</span>
                            <span className="truncate text-[12.5px] font-bold text-heading">{item?.label ?? i.id}</span>
                            {i.qty > 1 && <span className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-black text-brand-800">×{faDigits(i.qty)}</span>}
                          </span>
                          <span className="flex shrink-0 items-center gap-1">
                            <button type="button" onClick={() => move(i.id, -1)} disabled={idx === 0} aria-label={`جابه‌جایی ${item?.label} به قبل`} className="grid size-8 place-items-center rounded-full border border-line bg-surface2 disabled:opacity-40 hover:border-brand-400"><ArrowUp className="size-3.5" aria-hidden /></button>
                            <button type="button" onClick={() => move(i.id, 1)} disabled={idx === items.length - 1} aria-label={`جابه‌جایی ${item?.label} به بعد`} className="grid size-8 place-items-center rounded-full border border-line bg-surface2 disabled:opacity-40 hover:border-brand-400"><ArrowDown className="size-3.5" aria-hidden /></button>
                            <button type="button" onClick={() => removeItem(i.id)} aria-label={`حذف ${item?.label} از سینی`} className="grid size-8 place-items-center rounded-full border border-line bg-surface2 text-accent-600 hover:border-accent-400"><Trash2 className="size-3.5" aria-hidden /></button>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* server quote lines */}
              {serverQuote ? (
                <div className="rounded-2xl border border-line/70 bg-surface p-5">
                  <h3 className="flex items-center gap-2 text-sm font-black text-heading">
                    قیمت تأییدشده سرور
                    {!quoting && <Check className="size-4 text-brand-600" aria-hidden />}
                    {quoting && <Loader2 className="size-4 animate-spin text-brand-600" aria-hidden />}
                  </h3>
                  <ul className="mt-3 divide-y divide-line/60">
                    {serverQuote.lines.map((l, idx) => (
                      <li key={idx} className="flex items-center justify-between gap-3 py-2.5">
                        <span className="text-xs text-body">{l.label}</span>
                        <span className="text-xs font-bold text-heading">{formatToman(l.amount)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                    <span className="text-sm font-black text-heading">جمع کل</span>
                    <Price price={serverQuote.total} size="lg" />
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-line bg-surface p-5 text-center">
                  <p className="text-xs text-muted">
                    {enoughItems && withinPortions ? "در حال دریافت قیمت از سرور…" : `برای دریافت قیمت، حداقل ${faDigits(BUILDER_MIN_ITEMS)} قلم متفاوت انتخاب کنید.`}
                  </p>
                </div>
              )}

              {/* save configuration */}
              <div className="rounded-2xl border border-line/70 bg-surface p-5">
                <h3 className="flex items-center gap-2 text-sm font-black text-heading"><Save className="size-4 text-brand-700" aria-hidden /> ذخیره پیکربندی</h3>
                <p className="mt-1.5 text-[11px] text-muted">ترکیب سینی را با نام دلخواه ذخیره کنید تا دفعه بعد با یک کلیک بارگذاری شود (ذخیره در این مرورگر).</p>
                <div className="mt-4 flex flex-wrap items-end gap-2">
                  <div className="flex-1 min-w-40">
                    <FieldLabel text="نام پیکربندی">
                      <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="مثلاً سینی دورهمی پاییز" />
                    </FieldLabel>
                  </div>
                  <Button variant="outline" onClick={saveDraft}><Save className="size-4" aria-hidden /> ذخیره</Button>
                  <Button variant="ghost" onClick={reset}><RotateCcw className="size-4" aria-hidden /> سینی جدید</Button>
                </div>
                {sortedDrafts.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    <AnimatePresence initial={false}>
                      {sortedDrafts.map(({ d, i }) => (
                        <motion.li
                          key={d.name + d.savedAt}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center justify-between gap-3 rounded-xl border border-line/70 bg-surface2 px-4 py-2.5"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleFavDraft(i)}
                              aria-label={d.favorite ? `حذف ${d.name} از علاقه‌مندی‌ها` : `علاقه‌مندی: ${d.name}`}
                              aria-pressed={Boolean(d.favorite)}
                              className={`grid size-8 shrink-0 place-items-center rounded-full border transition-colors ${d.favorite ? "border-gold-500 bg-gold-500 text-brand-950" : "border-line bg-surface text-muted hover:border-gold-400 hover:text-gold-700"}`}
                            >
                              <Star className={`size-3.5 ${d.favorite ? "fill-current" : ""}`} aria-hidden />
                            </button>
                            <span className="min-w-0">
                              <span className="block truncate text-[12.5px] font-bold text-heading">{d.name}</span>
                              <span className="block text-[10px] text-muted">{faDigits(Object.values(d.config.qty).reduce((a, b) => a + b, 0))} پورشن · {faDigits(d.config.guests)} نفر</span>
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-1">
                            <button type="button" onClick={() => loadDraft(d)} className="rounded-full border border-line bg-surface px-3 py-1.5 text-[10.5px] font-bold text-brand-700 hover:border-brand-400">بارگذاری</button>
                            <button type="button" onClick={() => duplicateDraft(d, i)} aria-label={`کپی ${d.name}`} className="grid size-8 place-items-center rounded-full border border-line bg-surface text-brand-700 hover:border-brand-400"><Copy className="size-3.5" aria-hidden /></button>
                            <button type="button" onClick={() => persistDrafts(drafts.filter((_, i2) => i2 !== i))} aria-label={`حذف ${d.name}`} className="grid size-8 place-items-center rounded-full border border-line bg-surface text-accent-600 hover:border-accent-400"><Trash2 className="size-3.5" aria-hidden /></button>
                          </span>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                )}
              </div>
            </section>
          )}

          {/* nav */}
          <div className="mt-10 flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1} aria-label="مرحله قبل">
              <ChevronRight className="size-4" aria-hidden /> مرحله قبل
            </Button>
            {step < 4 ? (
              <Button onClick={() => setStep((s) => Math.min(4, s + 1))} disabled={step === 1 && false}>
                مرحله بعد <ChevronLeft className="size-4" aria-hidden />
              </Button>
            ) : (
              <Button onClick={addToCart} disabled={adding || !enoughItems || !withinPortions}>
                {adding ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ShoppingBag className="size-4" aria-hidden />}
                افزودن سینی به سبد
              </Button>
            )}
          </div>
        </div>

        {/* ————— sticky live summary ————— */}
        <aside className="lg:sticky lg:top-24" aria-label="خلاصه و قیمت زنده">
          <div className="rounded-2xl border border-line/70 bg-surface p-5 shadow-soft">
            <p className="text-[11px] font-bold tracking-[0.18em] text-gold-700">خلاصه سینی</p>
            <p className="mt-2 text-sm font-black text-heading">{size.label} · {base.label}</p>
            <p className="mt-1 text-[11px] text-muted">برای {faDigits(guests)} نفر · {faDigits(distinctItems)} قلم · {faDigits(portions)} پورشن</p>

            <div className="mt-4 border-t border-line/70 pt-4">
              <p className="text-[10.5px] text-muted">برآورد اولیه</p>
              <p className="mt-1 text-lg font-black text-price">{estimate ? formatToman(estimate.total) : "—"}</p>
              <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-5 text-muted">
                <Info className="mt-0.5 size-3 shrink-0" aria-hidden />
                برآورد کلاینت است؛ قیمت معتبر فقط از سرور دریافت می‌شود و مبنای سفارش است.
              </p>
              {serverQuote && (
                <p className="mt-3 rounded-xl bg-brand-50 px-3 py-2 text-[11px] font-bold text-brand-800">
                  قیمت سرور: {formatToman(serverQuote.total)} {quoting && "· در حال به‌روزرسانی…"}
                </p>
              )}
              <p className="mt-3 flex items-start gap-1.5 rounded-xl border border-line/60 bg-surface2/60 px-3 py-2 text-[10px] leading-5 text-muted">
                <Clock3 className="mt-0.5 size-3 shrink-0 text-brand-600" aria-hidden />
                {BUILDER_DELIVERY_ESTIMATE}
              </p>
              <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-5 text-muted">
                <ShieldAlert className="mt-0.5 size-3 shrink-0 text-accent-600" aria-hidden />
                آلرژن‌ها: سینی‌های مزه ممکن است حاوی مغزها، لبنیات و گلوتن باشند؛ ترکیب دقیق هر سینی پیش از تحویل اعلام می‌شود.
              </p>
            </div>

            {!withinPortions && (
              <p className="mt-3 rounded-xl bg-accent-50 px-3 py-2 text-[10.5px] font-bold text-accent-700">
                حداکثر {faDigits(BUILDER_MAX_PORTIONS)} پورشن مجاز است — تعداد را کم کنید.
              </p>
            )}

            <ul className="mt-4 space-y-1.5 border-t border-line/70 pt-4" aria-label="اقلام انتخابی به ترتیب چیدمان">
              {items.length === 0 && <li className="text-[11px] text-muted">هنوز قلمی انتخاب نشده است</li>}
              {items.slice(0, 6).map((i, idx) => (
                <li key={i.id} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="truncate text-body"><span className="me-1 text-faint">{faDigits(idx + 1)}.</span>{findBuilderItem(i.id)?.label ?? i.id}</span>
                  <span className="shrink-0 font-bold text-heading">×{faDigits(i.qty)}</span>
                </li>
              ))}
              {items.length > 6 && <li className="text-[10.5px] text-muted">+{faDigits(items.length - 6)} قلم دیگر</li>}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
