import type { Locale } from "@/config/i18n/dict";
import { dict, type DictKey } from "@/config/i18n/dict";

/** Persian-only phase: server components always render fa-IR content. */
export async function getLocale(): Promise<Locale> {
  return "fa";
}

export function makeT(_locale: Locale = "fa") {
  return (key: DictKey) => dict.fa[key];
}
