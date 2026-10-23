"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { faDigits } from "@/lib/format";
import { SmartImage } from "@/components/ui/SmartImage";

/**
 * Premium product gallery:
 * - cursor-tracking zoom on hover (desktop)
 * - thumbnail rail with active state
 * - full-screen lightbox with keyboard + swipe navigation
 * - elegant layered shadows, glass accents
 * All motion is transform/opacity only — no layout thrash.
 */
export function ProductGallery({
  images,
  alt,
  badgeSlot,
}: {
  images: string[];
  alt: string;
  badgeSlot?: React.ReactNode;
}) {
  const [active, setActive] = useState(0);
  const [full, setFull] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const frameRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const gallery = images.length ? images : [""];

  const next = useCallback(() => setActive((i) => (i + 1) % gallery.length), [gallery.length]);
  const prev = useCallback(() => setActive((i) => (i - 1 + gallery.length) % gallery.length), [gallery.length]);

  // lightbox keyboard navigation + scroll lock + focus return
  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFull(false);
      else if (e.key === "ArrowLeft") next();
      else if (e.key === "ArrowRight") prev();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [full, next, prev]);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
  };

  return (
    <div>
      {/* main frame */}
      <div
        ref={frameRef}
        onMouseEnter={() => setZoom(true)}
        onMouseLeave={() => setZoom(false)}
        onMouseMove={onMouseMove}
        className="group/gallery relative aspect-[4/5] sm:aspect-square overflow-hidden rounded-[1.75rem] border border-line/70 bg-surface2
                   shadow-[0_1px_2px_rgb(6_51_35/0.06),0_24px_60px_-24px_rgb(6_51_35/0.28)]"
      >
        {/* soft studio backdrop */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,rgb(255_255_255/0.55),transparent_55%)] opacity-80" aria-hidden />
        {/* loading placeholder — تا آماده‌شدن تصویر فعال دیده می‌شود (فاز ۶) */}
        <div className="pointer-events-none absolute inset-0 animate-pulse bg-[linear-gradient(110deg,rgb(6_51_35/0.04),rgb(6_51_35/0.08),rgb(6_51_35/0.04))]" aria-hidden />
        {gallery.map((g, i) => (
          <span
            key={g + i}
            className="absolute inset-0 block"
            style={{
              opacity: i === active ? 1 : 0,
              transform: i === active && zoom ? "scale(1.7)" : "scale(1)",
              transformOrigin: origin,
              transition: "opacity .5s cubic-bezier(.22,1,.36,1), transform .5s cubic-bezier(.22,1,.36,1)",
              willChange: "transform",
            }}
          >
            <SmartImage
              src={g}
              alt={`${alt} — تصویر ${faDigits(i + 1)}`}
              sizes="(min-width: 1024px) 55vw, 92vw"
              priority={i === 0}
              className="size-full object-cover"
            />
          </span>
        ))}

        {badgeSlot && <div className="absolute top-4 start-4 z-10">{badgeSlot}</div>}

        {/* glass counter + expand */}
        <div className="absolute bottom-4 inset-x-4 z-10 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-ink-950/35 px-3 py-1.5 text-[10.5px] font-bold text-white backdrop-blur-md">
            {faDigits(active + 1)} / {faDigits(gallery.length)}
          </span>
          <button
            type="button"
            onClick={() => setFull(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-ink-950/35 px-3.5 py-1.5 text-[10.5px] font-bold text-white backdrop-blur-md transition-colors hover:bg-ink-950/55"
            aria-label="نمایش تمام‌صفحه تصاویر"
          >
            <Expand className="size-3.5" aria-hidden /> تمام‌صفحه
          </button>
        </div>
      </div>

      {/* thumbnails */}
      {gallery.length > 1 && (
        <div className="mt-4 flex gap-3 overflow-x-auto no-scrollbar" role="tablist" aria-label="تصاویر محصول">
          {gallery.map((g, i) => (
            <button
              key={g + i}
              role="tab"
              aria-selected={i === active}
              aria-label={`تصویر ${faDigits(i + 1)} از ${alt}`}
              onClick={() => setActive(i)}
              className={`relative size-[4.5rem] shrink-0 overflow-hidden rounded-2xl border-2 transition-all duration-300 ${
                i === active
                  ? "border-brand-600 shadow-soft"
                  : "border-line/60 opacity-70 hover:opacity-100 hover:border-brand-300"
              }`}
            >
              <SmartImage src={g} alt={`${alt} — تصویر ${i + 1}`} sizes="4.5rem" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* full-screen lightbox */}
      <AnimatePresence>
        {full && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[95] flex flex-col bg-ink-950/96 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
            aria-label={`گالری تصاویر ${alt}`}
            onClick={() => setFull(false)}
          >
            {/* top bar */}
            <div className="flex items-center justify-between px-5 py-4 text-white" onClick={(e) => e.stopPropagation()}>
              <span className="text-xs font-bold text-white/80">
                {alt} · {faDigits(active + 1)} از {faDigits(gallery.length)}
              </span>
              <button
                ref={closeRef}
                onClick={() => setFull(false)}
                className="grid size-11 place-items-center rounded-full border border-white/20 text-white transition-colors hover:bg-white/10"
                aria-label="بستن گالری"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            {/* stage */}
            <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 pb-4" onClick={(e) => e.stopPropagation()}>
              {gallery.length > 1 && (
                <button
                  onClick={prev}
                  className="absolute start-4 z-10 grid size-12 place-items-center rounded-full border border-white/20 bg-ink-950/40 text-white backdrop-blur-md transition-colors hover:bg-ink-950/70"
                  aria-label="تصویر قبلی"
                >
                  <ChevronRight className="size-5" aria-hidden />
                </button>
              )}
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={active}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -70) next();
                    else if (info.offset.x > 70) prev();
                  }}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="max-h-full max-w-5xl cursor-grab active:cursor-grabbing"
                >
                  <SmartImage
                    src={gallery[active]}
                    alt={`${alt} — تصویر ${faDigits(active + 1)}`}
                    sizes="(min-width:1536px) 1024px, 92vw"
                    className="max-h-[72svh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
                  />
                </motion.div>
              </AnimatePresence>
              {gallery.length > 1 && (
                <button
                  onClick={next}
                  className="absolute end-4 z-10 grid size-12 place-items-center rounded-full border border-white/20 bg-ink-950/40 text-white backdrop-blur-md transition-colors hover:bg-ink-950/70"
                  aria-label="تصویر بعدی"
                >
                  <ChevronLeft className="size-5" aria-hidden />
                </button>
              )}
            </div>

            {/* thumbnail strip */}
            {gallery.length > 1 && (
              <div className="flex justify-center gap-2.5 overflow-x-auto no-scrollbar px-4 pb-6" onClick={(e) => e.stopPropagation()}>
                {gallery.map((g, i) => (
                  <button
                    key={g + i}
                    onClick={() => setActive(i)}
                    aria-label={`تصویر ${faDigits(i + 1)} از ${alt}`}
                    className={`size-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${i === active ? "border-white" : "border-white/20 opacity-50 hover:opacity-90"}`}
                  >
                    <SmartImage src={g} alt={`${alt} — تصویر کوچک ${i + 1}`} sizes="4rem" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
