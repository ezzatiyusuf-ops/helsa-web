/**
 * مالکیت سفارش — منطق خالص و واحد (server-side truth).
 * یافتهٔ S-01: نسخهٔ قبلی در payments/verify با نشستِ بدون `customer:N` بررسی را
 * کاملاً رد می‌کرد. قاعدهٔ سخت: هر مقایسه دو طرفِ غیرخالی لازم دارد (fail-closed).
 */
export interface OwnershipSession { sub: string; email?: string | null; phone?: string | null }
export interface OwnershipInput {
  session: OwnershipSession | null;
  orderCustomerId?: number | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  snapshot?: Record<string, unknown> | null;
}
const normEmail = (v: unknown): string => (typeof v === "string" ? v.trim().toLowerCase() : "");
const normPhone = (v: unknown): string =>
  typeof v === "string" ? v.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/\D/g, "").replace(/^98/, "0") : "";

export function orderOwnedBySession(input: OwnershipInput): boolean {
  const { session } = input;
  if (!session || !session.sub) return false;
  const sessionEmail = normEmail(session.email);
  const sessionPhone = normPhone(session.phone);
  const customerEmail = normEmail(input.customerEmail);
  const customerPhone = normPhone(input.customerPhone);
  const subjectMatch = (id: number) => session.sub === `customer:${id}`;
  const emailMatch = Boolean(sessionEmail && customerEmail && sessionEmail === customerEmail);
  const phoneMatch = Boolean(sessionPhone && customerPhone && sessionPhone === customerPhone);
  if (input.orderCustomerId != null) return subjectMatch(input.orderCustomerId) || emailMatch || phoneMatch;
  const snap = input.snapshot ?? {};
  const snapEmail = normEmail(snap.email);
  const snapPhone = normPhone(snap.mobile ?? snap.phone);
  return Boolean((sessionEmail && snapEmail && sessionEmail === snapEmail) || (sessionPhone && snapPhone && sessionPhone === snapPhone));
}
