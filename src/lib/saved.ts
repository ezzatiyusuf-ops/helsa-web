"use client";
/** Saved-for-later ("بعداً می‌خرم") — a local, per-browser list of product stubs. */
export const SAVED_KEY = "helsa-saved-v1";
export type SavedItem = { slug: string; name: string; image: string; price: number };

export function readSaved(): SavedItem[] {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]") as SavedItem[];
  } catch {
    return [];
  }
}

/** Returns true when the item was added, false when it was removed. */
export function toggleSaved(item: SavedItem): boolean {
  const list = readSaved();
  const exists = list.some((s) => s.slug === item.slug);
  const next = exists ? list.filter((s) => s.slug !== item.slug) : [item, ...list].slice(0, 24);
  localStorage.setItem(SAVED_KEY, JSON.stringify(next));
  return !exists;
}

export function isSaved(slug: string): boolean {
  return readSaved().some((s) => s.slug === slug);
}
