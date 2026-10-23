import "server-only";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { authSecretRaw } from "@/lib/secrets";
import { safeNextPath } from "@/lib/safe-url";

export type AdminPrincipal = { email: string; name: string; sub: string };

function allowlist(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminConfigured(): boolean {
  return Boolean(authSecretRaw() && allowlist().length > 0);
}

export function isAdminEmail(email: string): boolean {
  if (!email) return false;
  return allowlist().includes(email.trim().toLowerCase());
}

export async function getAdminPrincipal(): Promise<AdminPrincipal | null> {
  if (!isAdminConfigured()) return null;
  const session = await readSession();
  if (!session?.email) return null;
  // Defense in depth: allowlist + signed role claim.
  if (!isAdminEmail(session.email) || session.role !== "admin") return null;
  return { email: session.email, name: session.name, sub: session.sub };
}

export async function requireAdminPage(): Promise<AdminPrincipal> {
  const admin = await getAdminPrincipal();
  if (!admin) redirect(`/login?next=${encodeURIComponent(safeNextPath("/admin", "/admin"))}`);
  return admin;
}

export class AdminAuthError extends Error {
  constructor(public readonly status: 401 | 403, message: string) {
    super(message);
  }
}

/** خطای قاعدهٔ کسب‌وکار ادمین — با پیام فارسی و کد ۴۰۰ به کلاینت برمی‌گردد */
export class AdminRuleError extends Error {}

export async function requireAdminApi(): Promise<AdminPrincipal> {
  if (!isAdminConfigured()) throw new AdminAuthError(403, "دسترسی مدیریت پیکربندی نشده است.");
  const admin = await getAdminPrincipal();
  if (!admin) throw new AdminAuthError(401, "برای دسترسی مدیریت وارد حساب مجاز شوید.");
  return admin;
}

export function adminErrorResponse(error: unknown): Response {
  if (error instanceof AdminAuthError) {
    return Response.json({ ok: false, message: error.message }, { status: error.status });
  }
  // خطای قاعدهٔ کسب‌وکار (مثل گذار وضعیت نامعتبر سفارش) — پیام فارسی برای ادمین امن و مفید است
  if (error instanceof AdminRuleError) {
    return Response.json({ ok: false, message: error.message }, { status: 400 });
  }
  console.error("[HELSA admin]", error instanceof Error ? error.message : "unknown error");
  return Response.json({ ok: false, message: "خطایی رخ داد. دوباره تلاش کنید." }, { status: 500 });
}
