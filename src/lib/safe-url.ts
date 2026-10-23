/** Edge-safe helpers shared by middleware and server code. */

export function safeNextPath(raw: string | null | undefined, fallback = "/account"): string {
  if (!raw) return fallback;
  const value = raw.trim();
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.includes("\\") || value.includes("://")) return fallback;
  if (/[\u0000-\u001f]/.test(value)) return fallback;
  return value;
}
