"use client";
import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ShoppingBag, Eye, X, Users, Check } from "lucide-react";
import type { MazehTray } from "@/types";
import { useStore } from "@/lib/store";
import { trackEvent } from "@/lib/analytics";
import { useToast } from "@/components/ui/Toast";
import { useLang, IconForward } from "@/lib/i18n";
import { Badge, Price, QtyPicker } from "@/components/ui/primitives";
import { faDigits } from "@/lib/format";
import { trayVisual } from "@/lib/trayVisuals";
import { SmartImage } from "@/components/ui/SmartImage";

/**
 * Tray card — identical visual system to ProductCard:
 * same radius, borders, typography scale, button pair, hover behaviour.
 */
export function TrayCard({ tray }: { tray: MazehTray }) {
  const { addItem, toggleWishlist, wishlist, user } = useStore();
  const toast = useToast();
  const { t } = useLang();
  // Single source of truth for availability — same rule as GoldenTrayCard & tray detail
  const available = tray.active !== false && (tray.stock ?? 0) > 0;
  const name = tray.name;
  const image = trayVisual(tray.slug, tray.image);
  const [quick, setQuick] = useState(false);
  const [added, setAdded] = useState(false);
  const inWish = wishlist.includes(tray.id + 1000);

  const onWish = () => {
    if (!user) {
      toast.push(t("toast.wishLogin"), "info");
      return;
    }
    const added = toggleWishlist(tray.id + 1000);
    toast.push(added ? t("toast.wishAdded") : t("toast.wishRemoved"), added ? "success" : "info");
  };

  const onAdd = (qty = 1) => {
    addItem(
      {
        key: `t-${tray.id}`,
        kind: "tray",
        id: tray.id,
        name: tray.name,
        slug: tray.slug,
        image,
        price: tray.basePrice,
        meta: `برای ${faDigits(tray.servesMin)} تا ${faDigits(tray.servesMax)} نفر`,
      },
      qty,
    );
    toast.push(t("toast.trayAdded"));
    trackEvent("mazeh_ready_tray_add", { tray: tray.slug, value: tray.basePrice });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  };

  const contentsPreview = tray.contents.slice(0, 3).map((c) => c.title);

  return (
    <>
      <article className="group card-framed card-lift flex h-full flex-col p-3 shadow-soft">
        <div className="relative overflow-hidden rounded-card-inner border border-line-soft bg-surface2 aspect-[4/5] shadow-soft">
          <Link href={`/mazeh-trays/${tray.slug}`} aria-label={name} className="block size-full">
            { }
            <SmartImage src={image} alt={name} sizes="(min-width:1024px) 25vw, 50vw" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
          </Link>

          <div className="absolute top-3 start-3 flex flex-col items-start gap-1.5">
            {tray.featured && <Badge tone="brand">پیشنهاد هلسا</Badge>}
            {tray.oldPrice && (
              <Badge tone="accent">{faDigits(Math.round(((tray.oldPrice - tray.basePrice) / tray.oldPrice) * 100))}٪ تخفیف</Badge>
            )}
          </div>

          <button
            onClick={onWish}
            aria-label={inWish ? t("card.wishRemove") : t("card.wishAdd")}
            aria-pressed={inWish}
            className={`absolute top-3 end-3 size-11 sm:size-9 rounded-full flex items-center justify-center transition-colors duration-300 ${
              inWish ? "bg-brand-700 text-inverse" : "bg-surface/90 text-body hover:bg-brand-700 hover:text-inverse"
            }`}
          >
            <motion.span key={inWish ? "on" : "off"} initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 18 }} className="flex">
              <Heart className={`size-4 ${inWish ? "fill-current" : ""}`} aria-hidden />
            </motion.span>
          </button>

          <span className="absolute bottom-3 start-3 inline-flex items-center gap-1.5 rounded-full bg-surface/90 px-3 py-1.5 text-[10.5px] font-bold text-body">
            <Users className="size-3.5 text-gold-700" aria-hidden />
            برای {faDigits(tray.servesMin)} تا {faDigits(tray.servesMax)} نفر
          </span>
        </div>

        <div className="flex flex-1 flex-col px-0.5 pt-4">
          <span className="text-[10.5px] font-bold text-gold-700">سینی مزه هلسا · {tray.size}</span>
          <Link href={`/mazeh-trays/${tray.slug}`} className="mt-1.5">
            <h3 className="text-[13.5px] font-extrabold leading-6 text-heading line-clamp-2-fa transition-colors hover:text-brand-600">
              {name}
            </h3>
          </Link>
          <p className="mt-1 text-[11px] leading-5 text-muted line-clamp-2-fa">{tray.shortDescription}</p>

          <p className="mt-2.5 text-[10.5px] leading-5 text-muted line-clamp-2-fa">
            شامل: {contentsPreview.join("، ")}{tray.contents.length > 3 ? ` و ${faDigits(tray.contents.length - 3)} قلم دیگر` : ""}
          </p>

          <div className="mt-3 flex items-end justify-between gap-2">
            <Price price={tray.basePrice} oldPrice={tray.oldPrice} size="sm" />
            <span className={`inline-flex items-center gap-1.5 text-[10.5px] font-bold ${available ? "text-muted" : "text-accent-600"}`}>
              <span className={`size-1.5 rounded-full ${available ? "bg-brand-500" : "bg-accent-500"}`} aria-hidden />
              {available ? "موجود برای سفارش" : "ناموجود"}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 lg:grid-cols-2">
            <button
              onClick={() => setQuick(true)}
              className="inline-flex h-11 lg:h-10 items-center justify-center gap-1.5 rounded-full border border-line px-2 text-[11.5px] font-bold text-body transition-colors hover:border-brand-500 hover:text-brand-600"
            >
              <Eye className="size-3.5 shrink-0" aria-hidden />
              {t("card.preview")}
            </button>
            <button
              onClick={() => onAdd()}
              disabled={!available}
              className="inline-flex h-11 lg:h-10 items-center justify-center gap-1.5 rounded-full bg-brand-700 px-2 text-[11.5px] font-bold text-inverse transition-colors hover:bg-brand-800 disabled:opacity-40"
            >
              {added ? <Check className="size-3.5 shrink-0" aria-hidden /> : <ShoppingBag className="size-3.5 shrink-0" aria-hidden />}
              {added ? "افزوده شد" : t("card.add")}
            </button>
          </div>
        </div>
      </article>

      <AnimatePresence>
        {quick && <TrayQuickView tray={tray} image={image} onClose={() => setQuick(false)} onAdd={onAdd} />}
      </AnimatePresence>
    </>
  );
}

function TrayQuickView({ tray, image, onClose, onAdd }: { tray: MazehTray; image: string; onClose: () => void; onAdd: (q: number) => void }) {
  const { t } = useLang();
  const name = tray.name;
  const [qty, setQty] = useState(1);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[85] flex items-end justify-center bg-ink-900/60 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${t("card.preview")} — ${name}`}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[92svh] w-full overflow-y-auto rounded-t-2xl border border-line bg-surface shadow-lift sm:max-w-3xl sm:rounded-2xl"
      >
        <button onClick={onClose} aria-label={t("common.close")} className="absolute end-3 top-3 z-10 size-11 sm:end-4 sm:top-4 sm:size-9 rounded-full border border-line bg-surface text-body transition-colors hover:text-heading">
          <X className="mx-auto size-4" aria-hidden />
        </button>
        <div className="grid sm:grid-cols-2">
          <div className="relative aspect-[4/3] sm:aspect-auto">
            { }
            <SmartImage src={image} alt={tray.name} sizes="(min-width:640px) 45vw, 100vw" className="size-full object-cover sm:rounded-s-2xl" />
          </div>
          <div className="p-6 sm:p-7">
            <span className="text-[11px] font-bold text-gold-700">سینی مزه هلسا · {tray.size}</span>
            <h2 className="mt-1.5 text-lg font-black leading-8 text-heading">{name}</h2>
            <p className="mt-2 text-xs leading-6 text-body line-clamp-3">{tray.shortDescription}</p>
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-surface2 border border-line px-3 py-1.5 text-[10.5px] font-bold text-body">
              <Users className="size-3.5 text-gold-700" aria-hidden /> برای {faDigits(tray.servesMin)} تا {faDigits(tray.servesMax)} نفر
            </p>
            <div className="mt-4">
              <p className="text-[11px] font-bold text-heading">داخل این سینی</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {tray.contents.slice(0, 6).map((c) => (
                  <li key={c.title} className="rounded-full border border-line bg-surface2 px-2.5 py-1 text-[10px] font-bold text-muted">{c.title}</li>
                ))}
                {tray.contents.length > 6 && (
                  <li className="rounded-full border border-line bg-surface2 px-2.5 py-1 text-[10px] font-bold text-muted">+{faDigits(tray.contents.length - 6)}</li>
                )}
              </ul>
            </div>
            <div className="mt-4"><Price price={tray.basePrice} oldPrice={tray.oldPrice} /></div>
            <div className="mt-5 flex items-center gap-3">
              <QtyPicker value={qty} onChange={setQty} />
              <button onClick={() => { onAdd(qty); onClose(); }} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-brand-700 px-4 text-xs font-bold text-inverse transition-colors hover:bg-brand-800">
                <ShoppingBag className="size-4" aria-hidden /> افزودن به سبد خرید
              </button>
            </div>
            <Link href={`/mazeh-trays/${tray.slug}`} onClick={onClose} className="mt-4 inline-flex items-center gap-1.5 text-[11.5px] font-bold text-brand-600 transition-colors hover:text-brand-700">
              {t("card.viewFull")}
              <IconForward className="size-3.5" />
            </Link>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
