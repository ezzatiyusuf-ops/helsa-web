"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type ThemePref = "light" | "dark" | "system";
export type Theme = "light" | "dark";

const KEY = "helsa-theme";
const STORAGE_EVENT = "helsa:theme";

const ThemeCtx = createContext<{ theme: Theme; pref: ThemePref; setPref: (p: ThemePref) => void }>({
  theme: "light",
  pref: "system",
  setPref: () => undefined,
});

export function useTheme() {
  return useContext(ThemeCtx);
}

/** theme تابع خالصِ (pref, systemDark) است — هیچ API مرورگری در طول رندر خوانده نمی‌شود. */
function resolve(pref: ThemePref, systemDark: boolean): Theme {
  if (pref !== "system") return pref;
  return systemDark ? "dark" : "light";
}

/** خواندن ترجیح ذخیره‌شده (getSnapshot) — فقط روی کلاینت و خارج از رندر اولیه صدا زده می‌شود. */
function readStoredPref(): ThemePref {
  try {
    const s = localStorage.getItem(KEY) as ThemePref | null;
    if (s === "light" || s === "dark" || s === "system") return s;
  } catch {
    /* storage unavailable */
  }
  return "system";
}

/** localStorage به‌عنوان external store: هیدریشن با server snapshot («system») انجام می‌شود،
 *  مقدار واقعی فقط بعد از mount جایگزین می‌شود — پس SSR و رندر اول کلاینت همیشه یکسان‌اند. */
function subscribeTheme(notify: () => void) {
  window.addEventListener("storage", notify); // تغییر از تب‌های دیگر
  window.addEventListener(STORAGE_EVENT, notify); // تغییر از همین تب (setPref)
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(STORAGE_EVENT, notify);
  };
}

function subscribeSystemDark(notify: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", notify);
  return () => mq.removeEventListener("change", notify);
}

let themeTimer: ReturnType<typeof setTimeout> | null = null;

function apply(theme: Theme) {
  const root = document.documentElement;
  // brief, flash-free colour transition while switching themes
  root.classList.add("theming");
  if (themeTimer) clearTimeout(themeTimer);
  themeTimer = setTimeout(() => root.classList.remove("theming"), 380);
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // SSR و رندرِ هیدریشن: server snapshot ⇒ pref=«system» و systemDark=false (خروجی قطعی و همسان).
  const pref = useSyncExternalStore(subscribeTheme, readStoredPref, () => "system" as ThemePref);
  const systemDark = useSyncExternalStore(
    subscribeSystemDark,
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
    () => false,
  );

  const theme = resolve(pref, systemDark);
  useEffect(() => {
    apply(theme);
  }, [theme]);

  const setPref = useCallback((p: ThemePref) => {
    try {
      localStorage.setItem(KEY, p);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(STORAGE_EVENT));
  }, []);

  const value = useMemo(() => ({ theme, pref, setPref }), [theme, pref, setPref]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}
