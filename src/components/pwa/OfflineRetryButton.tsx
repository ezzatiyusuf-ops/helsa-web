"use client";
import { RotateCcw } from "lucide-react";

export function OfflineRetryButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand-700 px-6 text-sm font-bold text-inverse transition-colors hover:bg-brand-800"
    >
      <RotateCcw className="size-4" aria-hidden /> تلاش مجدد
    </button>
  );
}
