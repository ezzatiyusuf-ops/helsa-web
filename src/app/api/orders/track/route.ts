import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db, isDatabaseConfigured } from "@/db";
import { orders } from "@/db/schema";
import { assertSameOrigin, clientKey, csrfRejectedResponse, rateLimit, rateLimitedResponse } from "@/lib/security";

const schema = z.object({
  code: z.string().trim().min(4).max(40),
  mobile: z.string().regex(/^09\d{9}$/),
});

/** Public tracking: requires both order code AND customer mobile from the snapshot. */
export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return csrfRejectedResponse();
  const limited = rateLimit(clientKey(req, "order-track"), 15, 15 * 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);
  if (!isDatabaseConfigured) return NextResponse.json({ ok: false, message: "سرویس پیگیری در دسترس نیست." }, { status: 503 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "شماره سفارش و موبایل را کامل وارد کنید." }, { status: 400 });

  try {
    const row = (await db.select().from(orders).where(eq(orders.code, parsed.data.code)).limit(1))[0];
    if (!row) return NextResponse.json({ ok: false, message: "سفارشی با این مشخصات پیدا نشد." }, { status: 404 });
    const snap = row.customer as Record<string, unknown>;
    const mobile = typeof snap.mobile === "string" ? snap.mobile : "";
    if (mobile !== parsed.data.mobile) return NextResponse.json({ ok: false, message: "سفارشی با این مشخصات پیدا نشد." }, { status: 404 });

    return NextResponse.json({
      ok: true,
      order: {
        code: row.code,
        status: row.status,
        paymentStatus: row.paymentStatus,
        total: row.total,
        createdAt: row.createdAt,
        items: (row.items ?? []).map((it) => {
          const rec = it as Record<string, unknown>;
          return {
            name: String(rec.name ?? rec.nameSnapshot ?? "قلم سفارش"),
            qty: Number(rec.quantity ?? rec.qty ?? 1),
            price: Number(rec.unitPrice ?? rec.price ?? 0),
            meta: rec.metadata ? JSON.stringify(rec.metadata) : String(rec.meta ?? ""),
          };
        }),
      },
    });
  } catch {
    return NextResponse.json({ ok: false, message: "پیگیری سفارش ممکن نشد." }, { status: 500 });
  }
}
