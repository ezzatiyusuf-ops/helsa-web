import "server-only";
/**
 * HELSA — صدور فاکتور (Part I).
 * دقیقاً یک فاکتور برای هر سفارش (unique orderId + ON CONFLICT DO NOTHING)
 * → دوباره‌صدور غیرممکن است؛ هم‌خوانی مبلغ با سفارش تضمینی است.
 */
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { invoices, orders } from "@/db/schema";

export async function ensureInvoiceForOrder(orderId: number): Promise<{ number: string; id: number } | null> {
  const order = (await db.select().from(orders).where(eq(orders.id, orderId)).limit(1))[0];
  if (!order) return null;
  const number = `INV-${order.code.replace(/^HLA-/, "")}`;
  await db
    .insert(invoices)
    .values({
      number,
      orderId: order.id,
      customerId: order.customerId,
      subtotal: order.subtotal,
      discount: order.discount,
      shipping: order.shipping,
      total: order.total,
      supportAmount: Math.max(0, order.supportContribution ?? 0),
      paymentMethod: order.paymentMethod,
      provider: "order",
      status: "issued",
      paidAt: order.paidAt,
    })
    .onConflictDoNothing({ target: invoices.orderId });
  const row = (await db.select({ id: invoices.id, number: invoices.number }).from(invoices).where(eq(invoices.orderId, orderId)).limit(1))[0];
  return row ?? null;
}
