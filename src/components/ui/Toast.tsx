"use client";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, XCircle, X } from "lucide-react";

type ToastKind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: ToastKind;
  text: string;
}

const ToastCtx = createContext<{ push: (text: string, kind?: ToastKind) => void }>({ push: () => {} });

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const push = useCallback((text: string, kind: ToastKind = "success") => {
    seq.current += 1;
    const id = seq.current;
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-24 md:bottom-8 inset-x-0 mx-auto z-[90] flex flex-col gap-2 w-[min(92vw,26rem)] pointer-events-none"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className={`pointer-events-auto flex items-center gap-3 rounded-2xl px-4 py-3 shadow-lift backdrop-blur-md border text-sm ${
                t.kind === "success"
                  ? "bg-brand-800/95 text-inverse border-brand-600/40"
                  : t.kind === "error"
                    ? "bg-[#7a1f1f]/95 text-inverse border-[#a33]/40"
                    : "bg-ink-900/95 text-inverse border-ink-700/40"
              }`}
              role="status"
            >
              {t.kind === "success" ? (
                <CheckCircle2 className="size-5 shrink-0 text-gold-400" aria-hidden />
              ) : t.kind === "error" ? (
                <XCircle className="size-5 shrink-0 text-accent-400" aria-hidden />
              ) : (
                <Info className="size-5 shrink-0 text-gold-400" aria-hidden />
              )}
              <span className="flex-1 leading-6">{t.text}</span>
              <button
                onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
                aria-label="بستن اعلان"
                className="opacity-70 hover:opacity-100 transition-opacity"
              >
                <X className="size-4" aria-hidden />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}
