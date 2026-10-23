"use client";
import { useEffect } from "react";

/**
 * Global broken-image guard.
 *
 * Listens (capture phase) for <img> error events anywhere in the tree and
 * swaps the failed source with the branded local placeholder — at most once
 * per element, so a missing placeholder can never cause a loop.
 *
 * This keeps the storefront free of broken-image icons even when a data
 * entry points to a wrong path or an external host is unreachable
 * (offline development included).
 */
const PLACEHOLDER = "/images/placeholder.svg";
const FLAG = "data-helsa-fallback";

export function ImageFallbackGuard() {
  useEffect(() => {
    const onError = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!(target instanceof HTMLImageElement)) return;
      if (target.hasAttribute(FLAG)) return; // already replaced once
      if (target.src.endsWith(PLACEHOLDER)) return;
      target.setAttribute(FLAG, "1");
      target.src = PLACEHOLDER;
    };
    // capture=true: img error events do not bubble, but they do capture
    document.addEventListener("error", onError, true);
    return () => document.removeEventListener("error", onError, true);
  }, []);

  return null;
}
