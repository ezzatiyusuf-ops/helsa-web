"use client";
import { useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";

const ORDER = ["system", "light", "dark"] as const;
const LABEL: Record<string, string> = { system: "مطابق سیستم", light: "حالت روشن", dark: "حالت شب" };

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { pref, setPref } = useTheme();
  const [tip, setTip] = useState(false);
  const next = ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length];

  const Icon = pref === "dark" ? Moon : pref === "light" ? Sun : Monitor;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setPref(next)}
        onMouseEnter={() => setTip(true)}
        onMouseLeave={() => setTip(false)}
        aria-label={`تغییر حالت نمایش (${LABEL[pref]})`}
        title="تغییر حالت نمایش"
        className={`inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface text-muted hover:text-heading hover:border-brand-500 transition-colors ${compact ? "w-9 justify-center px-0" : "px-3"}`}
      >
        <Icon className="size-4" aria-hidden />
        {!compact && <span className="text-[11px] font-bold">{LABEL[pref]}</span>}
      </button>
      {tip && (
        <span className="pointer-events-none absolute end-0 top-full mt-1 whitespace-nowrap rounded-lg border border-line bg-surface px-3 py-1.5 text-[10.5px] font-bold text-heading shadow-soft">
          تغییر حالت نمایش — {LABEL[next]}
        </span>
      )}
    </div>
  );
}
