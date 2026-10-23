"use client";
import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import type { InstagramStory } from "@/services/instagram";
import { faDigits } from "@/lib/format";
import { SmartImage } from "@/components/ui/SmartImage";

/**
 * استوری‌های هلسا — نوار دایره‌های استوری + ویوئر تمام‌صفحه.
 * دیتا سمت سرور خوانده می‌شود (بدون ریسک هیدریشن)؛ این کامپوننت فقط تعامل دارد.
 * پیشروی با انیمیشن CSS (۵ ثانیه)، تپ راست = بعدی، تپ چپ = قبلی، Esc/✕ = بستن.
 */
const STORY_MS = 5000;

export function Stories({ stories, className = "" }: { stories: InstagramStory[]; className?: string }) {
  const [openAt, setOpenAt] = useState<number | null>(null);
  if (!stories.length) return null;

  const open = (i: number) => setOpenAt(i);
  const close = () => setOpenAt(null);

  return (
    <div className={className}>
      <ul
        className="flex gap-3.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="استوری‌های هلسا"
      >
        {stories.map((s, i) => (
          <li key={s.id} className="shrink-0">
          <button
            onClick={() => open(i)}
            aria-label={`استوری ${faDigits(i + 1)}${s.title ? `: ${s.title}` : " هلسا"}`}
            className="group flex w-16 shrink-0 flex-col items-center gap-1.5 outline-none"
          >
            <span className="relative grid size-16 place-items-center rounded-full bg-gradient-to-tr from-gold-500 via-brand-600 to-gold-400 p-[2.5px] transition-transform group-hover:scale-105 group-focus-visible:ring-2 group-focus-visible:ring-brand-400">
              <span className="grid size-full place-items-center overflow-hidden rounded-full border-2 border-surface bg-surface">
                { }
                <SmartImage
                  src={s.imageUrl}
                  alt=""
                  sizes="96px"
                  className="size-full object-cover"
                />
              </span>
            </span>
            <span className="w-16 truncate text-center text-[10px] font-bold text-muted group-hover:text-heading">
              {s.title ?? "هلسا"}
            </span>
          </button>
          </li>
        ))}
      </ul>

      {openAt !== null && <StoryViewer stories={stories} startIndex={openAt} onClose={close} />}
    </div>
  );
}

function StoryViewer({
  stories,
  startIndex,
  onClose,
}: {
  stories: InstagramStory[];
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);

  const next = useCallback(() => {
    setIndex((i) => {
      if (i >= stories.length - 1) {
        onClose();
        return i;
      }
      return i + 1;
    });
  }, [stories.length, onClose]);

  const prev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  // پیشروی خودکار ۵ ثانیه‌ای + بستن با Esc + قفل اسکرول
  useEffect(() => {
    const t = setTimeout(next, STORY_MS);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") next();
      if (e.key === "ArrowRight") prev();
    };
    window.addEventListener("keydown", onKey);
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = oldOverflow;
    };
  }, [index, next, prev, onClose]);

  const story = stories[index];

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-brand-950/95 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`استوری ${faDigits(index + 1)} از ${faDigits(stories.length)}`}
    >
      {/* نوارهای پیشروی — استوری فعال با انیمیشن CSS پر می‌شود */}
      <div className="absolute inset-x-0 top-0 flex gap-1 p-3 sm:top-4 sm:px-[max(1.5rem,calc(50%-11rem))]">
        {stories.map((s, i) => (
          <span key={s.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-inverse/25">
            {i < index ? (
              <span className="block h-full w-full rounded-full bg-gold-400" />
            ) : i === index ? (
              <span className="story-progress block h-full rounded-full bg-gold-400" />
            ) : (
              <span className="block h-full w-0 rounded-full bg-gold-400" />
            )}
          </span>
        ))}
      </div>

      <button
        onClick={onClose}
        aria-label="بستن استوری"
        className="absolute left-3 top-8 grid size-10 place-items-center rounded-full bg-inverse/10 text-inverse backdrop-blur transition-colors hover:bg-inverse/20 sm:left-[max(1.5rem,calc(50%-12.5rem))] sm:top-14"
      >
        <X className="size-5" aria-hidden />
      </button>

      {/* قاب استوری — تپ راست = بعدی، تپ چپ = قبلی */}
      <div className="relative h-[min(82vh,42rem)] w-[min(92vw,23rem)] overflow-hidden rounded-2xl border border-inverse/10 bg-brand-900 shadow-lift">
        <SmartImage
          src={story.imageUrl}
          alt={story.title ?? "استوری هلسا"}
          sizes="(min-width: 640px) 23rem, 92vw"
          className="pointer-events-none size-full object-cover"
        />
        {story.title && (
          <p className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-950/85 to-transparent p-4 pt-10 text-sm font-black text-inverse">
            {story.title}
          </p>
        )}
        <button onClick={prev} aria-label="استوری قبلی" className="absolute inset-y-0 right-0 w-1/3 cursor-default" />
        <button onClick={next} aria-label="استوری بعدی" className="absolute inset-y-0 left-0 w-2/3 cursor-default" />
      </div>

      <p className="absolute bottom-3 text-[11px] font-bold text-inverse/70 sm:bottom-5">
        {faDigits(index + 1)} / {faDigits(stories.length)}
      </p>
    </div>
  );
}
