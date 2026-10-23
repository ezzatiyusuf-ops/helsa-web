"use client";
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, X } from "lucide-react";

const base =
  "w-full rounded-xl border border-line bg-surface2 px-4 text-sm text-heading placeholder:text-muted outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 transition-[border-color,box-shadow,background-color]";

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={`${base} h-11 ${className}`} />;
}

export function Select({ className = "", children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative block">
      <select {...rest} className={`${base} h-11 appearance-none pe-10 ${className}`}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
    </span>
  );
}

export function TextArea({ className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={`${base} py-3 ${className}`} />;
}

export function FieldLabel({
  text,
  error,
  hint,
  className = "",
  children,
}: {
  text: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 flex items-center justify-between text-xs font-bold text-heading">
        {text}
        {hint && <span className="font-normal text-muted">{hint}</span>}
      </span>
      {children}
      <AnimatePresence>
        {error && (
          <motion.span initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="alert" className="mt-1 block text-[11px] font-bold text-accent-600">
            {error}
          </motion.span>
        )}
      </AnimatePresence>
    </label>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} aria-hidden />;
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-surface overflow-hidden">
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  desc,
  ctaLabel,
  ctaHref,
  onAction,
}: {
  icon?: ReactNode;
  title: string;
  desc?: string;
  ctaLabel?: string;
  ctaHref?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-6 py-16 text-center">
      {icon && <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-surface2 border border-line text-muted">{icon}</span>}
      <h2 className="mt-5 text-lg font-black text-heading">{title}</h2>
      {desc && <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-muted">{desc}</p>}
      {ctaLabel && ctaHref && (
        <Link href={ctaHref} className="mt-6 inline-flex h-11 items-center rounded-full bg-brand-700 px-6 text-sm font-bold text-inverse transition-colors hover:bg-brand-800">
          {ctaLabel}
        </Link>
      )}
      {ctaLabel && onAction && (
        <button onClick={onAction} className="mt-6 inline-flex h-11 items-center rounded-full bg-brand-700 px-6 text-sm font-bold text-inverse transition-colors hover:bg-brand-800">
          {ctaLabel}
        </button>
      )}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  label,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[85] flex items-center justify-center bg-ink-900/60 p-4 backdrop-blur-sm"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={label}
        >
          <motion.div
            initial={{ scale: 0.96, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.97, y: 10 }}
            transition={{ duration: 0.3 }}
            className={`relative max-h-[88vh] w-[min(96vw,${wide ? "52rem" : "30rem"})] overflow-y-auto rounded-2xl bg-surface shadow-lift border border-line`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              aria-label="بستن"
              className="absolute end-4 top-4 z-10 rounded-full bg-surface p-2 text-muted shadow-soft transition-colors hover:text-heading"
            >
              <X className="size-5" aria-hidden />
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
