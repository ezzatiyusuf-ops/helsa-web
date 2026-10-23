import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { adminAuditLogs, producers } from "@/db/schema";
import { adminErrorResponse, requireAdminApi } from "@/lib/admin";
import { checkProducerAction, type ProducerAction, type ProducerState } from "@/lib/producer";
import { assertSameOrigin, clientKey, csrfRejectedResponse, rateLimit, rateLimitedResponse } from "@/lib/security";

/**
 * PATCH /api/admin/producers/[id] — تصمیم ادمین.
 * publish تنها راه دیده‌شدن عمومی است؛ سپس کش ISR محصولات فوراً باطل می‌شود.
 */
const schema = z.object({
  action: z.enum(["approve", "reject", "publish", "take_down", "restore", "resubmit"]),
  reason: z.string().trim().max(2000).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!assertSameOrigin(req)) return csrfRejectedResponse();
  const _rl = rateLimit(clientKey(req, "admin-api"), 60, 60_000);
  if (!_rl.ok) return rateLimitedResponse(_rl.retryAfterSec);
  try {
    const admin = await requireAdminApi();
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id < 1) return NextResponse.json({ ok: false, message: "شناسهٔ نامعتبر." }, { status: 400 });

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ ok: false, message: "درخواست نامعتبر است." }, { status: 400 });
    const action = parsed.data.action as ProducerAction;
    const reason = (parsed.data.reason ?? "").trim();

    const row = (await db.select().from(producers).where(eq(producers.id, id)).limit(1))[0];
    if (!row) return NextResponse.json({ ok: false, message: "تولیدکننده یافت نشد." }, { status: 404 });

    const from = row.status as ProducerState;
    const check = checkProducerAction(from, action, reason);
    if (!check.ok) return NextResponse.json({ ok: false, message: check.message }, { status: 409 });

    await db.update(producers).set({
      status: check.to, updatedAt: new Date(), reviewedBy: admin.email, reviewedAt: new Date(),
      decisionReason: reason, ...(check.to === "published" ? { publishedAt: row.publishedAt ?? new Date() } : {}),
    }).where(eq(producers.id, id));

    // بی‌اعتبارسازی فوری کش: صفحات محصول ISR هستند؛ بدون این، «تعلیق» تا ۶۰ ثانیه دیده نمی‌شد.
    try {
      revalidatePath("/products/[slug]", "page");
      revalidatePath("/products");
      revalidatePath("/rooziteh");
      revalidatePath(`/rooziteh/${row.slug}`);
    } catch { /* خارج از چرخهٔ درخواست */ }

    await db.insert(adminAuditLogs).values({
      adminEmail: admin.email, action: `producer_${action}`, entityType: "producer", entityId: String(id),
      before: { status: from }, after: { status: check.to, reason: reason || null },
    });

    const messages: Record<ProducerAction, string> = {
      approve: "تولیدکننده تأیید شد؛ برای نمایش عمومی باید «انتشار» را بزنید.",
      reject: "درخواست رد شد و دلیل برای تولیدکننده ثبت گردید.",
      publish: "پروفایل و محصولات تولیدکننده در روزیته منتشر شد.",
      take_down: "پروفایل موقتاً از دسترس خارج شد.",
      restore: "پروفایل دوباره منتشر شد.",
      resubmit: "درخواست به صف بررسی بازگردانده شد.",
    };
    return NextResponse.json({ ok: true, state: check.to, message: messages[action] });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
