import { adminErrorResponse, requireAdminApi } from "@/lib/admin";
import { assertSameOrigin, clientKey, csrfRejectedResponse, rateLimit, rateLimitedResponse } from "@/lib/security";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { reviews, products, adminAuditLogs } from "@/db/schema";


/**
 * GET /api/admin/reviews — moderation queue (brief 4.4).
 * `?status=pending` (default) lists unapproved reviews; `?status=approved` the live ones.
 */
export async function GET(req: Request) {
  if (!assertSameOrigin(req)) return csrfRejectedResponse();
  const limited = rateLimit(clientKey(req, "admin-api"), 60, 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);
  try {
    await requireAdminApi();
    const url = new URL(req.url);
    const status = url.searchParams.get("status") === "approved" ? true : false;
    const rows = await db
      .select({
        id: reviews.id, productId: reviews.productId, productName: products.name, author: reviews.author,
        rating: reviews.rating, title: reviews.title, text: reviews.text, verifiedPurchase: reviews.verifiedPurchase,
        verifiedPhone: reviews.verifiedPhone, isApproved: reviews.isApproved, createdAt: reviews.createdAt,
      })
      .from(reviews)
      .leftJoin(products, eq(reviews.productId, products.id))
      .where(eq(reviews.isApproved, status))
      .orderBy(desc(reviews.createdAt))
      .limit(200);
    return Response.json({ ok: true, reviews: rows });
  } catch (error) { return adminErrorResponse(error); }
}

/**
 * PATCH /api/admin/reviews — approve or reject a review ({ id, approve: boolean }).
 * Approving flips isApproved; rejecting deletes the row (moderation decision is final + audited).
 */
export async function PATCH(req: Request) {
  if (!assertSameOrigin(req)) return csrfRejectedResponse();
  const limited = rateLimit(clientKey(req, "admin-api"), 60, 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);
  try {
    const admin = await requireAdminApi();
    const body = await req.json().catch(() => null);
    const id = Number(body?.id);
    const approve = Boolean(body?.approve);
    if (!Number.isInteger(id) || id <= 0) return Response.json({ ok: false, message: "شناسه نظر نامعتبر است." }, { status: 400 });
    const row = (await db.select().from(reviews).where(eq(reviews.id, id)).limit(1))[0];
    if (!row) return Response.json({ ok: false, message: "نظر یافت نشد." }, { status: 404 });
    if (approve) {
      await db.update(reviews).set({ isApproved: true }).where(eq(reviews.id, id));
    } else {
      await db.delete(reviews).where(eq(reviews.id, id));
    }
    await db.insert(adminAuditLogs).values({
      adminEmail: admin.email, action: approve ? "APPROVE" : "REJECT", entityType: "REVIEW",
      entityId: String(id), before: row as unknown as Record<string, unknown>,
    });
    return Response.json({ ok: true, message: approve ? "نظر تأیید و منتشر شد" : "نظر رد و حذف شد" });
  } catch (error) { return adminErrorResponse(error); }
}
