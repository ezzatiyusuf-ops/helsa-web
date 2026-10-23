"use client";
import { createContext, useContext, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { dict, type DictKey, type Locale } from "@/config/i18n/dict";

/**
 * Persian-only runtime for this phase.
 * The public UI is fixed to fa-IR + RTL. Existing callers can keep using useLang()
 * but they always receive Persian strings and Persian semantic arrow directions.
 */
type Ctx = {
  locale: Locale;
  dir: "rtl";
  t: (key: DictKey) => string;
  setLocale: (_l: Locale) => void;
};

const value: Ctx = {
  locale: "fa",
  dir: "rtl",
  t: (key) => dict.fa[key],
  setLocale: () => undefined,
};

const I18nCtx = createContext<Ctx>(value);

export function useLang() {
  return useContext(I18nCtx);
}

export function LangProvider({ children }: { children: ReactNode }) {
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

type IconProps = { className?: string };

/** Forward/continue/view-more in Persian RTL points visually left. */
export function IconForward({ className = "size-4" }: IconProps) {
  return <ArrowLeft className={className} aria-hidden />;
}

/** Back/previous context in Persian RTL points visually right. */
export function IconBack({ className = "size-4" }: IconProps) {
  return <ArrowRight className={className} aria-hidden />;
}

/** Next page/item in Persian reading flow. */
export function IconNext({ className = "size-4" }: IconProps) {
  return <ChevronLeft className={className} aria-hidden />;
}

/** Previous page/item in Persian reading flow. */
export function IconPrev({ className = "size-4" }: IconProps) {
  return <ChevronRight className={className} aria-hidden />;
}
