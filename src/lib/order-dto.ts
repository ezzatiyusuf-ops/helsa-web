/**
 * HELSA — DTO سفارش برای پاسخ API (رفع S-04)
 * فهرست سفید فیلدهای عمومی؛ هر ستون تازه‌ای که صریحاً اضافه نشود بیرون نمی‌رود.
 */
const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
const num = (v: unknown, fallback = 0) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

function safeItems(items: unknown): Record<string, unknown>[] {
  if (!Array.isArray(items)) return [];
  return items.map((raw) => {
    const it = (raw ?? {}) as Record<string, unknown>;
    const meta = (it.metadata ?? {}) as Record<string, unknown>;
    return {
      key: str(it.key), name: str(it.name),
      unitPrice: num(it.unitPrice), quantity: num(it.quantity, 1),
      subtotal: num(it.subtotal, num(it.unitPrice) * num(it.quantity, 1)),
      image: str(it.image) || "/images/hero-light.jpg",
      weight: meta.weight != null ? String(meta.weight) : undefined,
    };
  });
}
function safeAddress(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;
  return {
    recipient: str(a.recipient), phone: str(a.phone), province: str(a.province),
    city: str(a.city), full: str(a.full), postal: str(a.postal),
    plate: str(a.plate), unit: str(a.unit),
  };
}
function safeCustomer(raw: unknown): Record<string, string> {
  const c = (raw ?? {}) as Record<string, unknown>;
  return { firstName: str(c.firstName), lastName: str(c.lastName), mobile: str(c.mobile), email: str(c.email) };
}

const PUBLIC_FIELDS = [
  "code", "createdAt", "status", "paymentStatus", "paymentMethod", "paymentReference",
  "shippingMethod", "subtotal", "discount", "shipping", "supportContribution", "total",
  "couponCode", "note", "isGift", "giftRecipient", "giftMessage", "giftPackaging",
] as const;

export type OwnerOrderDto = {
  ok: true;
  order: Record<string, unknown> & {
    customer: Record<string, string>;
    address: Record<string, string> | null;
    items: Record<string, unknown>[];
  };
};

export function toOwnerOrderDto(row: Record<string, unknown>): OwnerOrderDto {
  const order: Record<string, unknown> = {};
  for (const key of PUBLIC_FIELDS) if (row[key] !== undefined) order[key] = row[key];
  order.customer = safeCustomer(row.customer);
  order.address = safeAddress(row.address);
  order.items = safeItems(row.items);
  return { ok: true, order: order as OwnerOrderDto["order"] };
}
