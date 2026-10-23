import { desc } from "drizzle-orm";
import { adminErrorResponse, requireAdminApi } from "@/lib/admin";
import { assertSameOrigin, clientKey, csrfRejectedResponse, rateLimit, rateLimitedResponse } from "@/lib/security";
import { db } from "@/db";
import { corporateGiftRequests, wholesaleInquiries } from "@/db/schema";

export async function GET(req: Request) {
  if (req.method !== "GET" && req.method !== "HEAD" && !assertSameOrigin(req)) return csrfRejectedResponse();
  const _rl = rateLimit(clientKey(req, "admin-api"), 60, 60_000);
  if (!_rl.ok) return rateLimitedResponse(_rl.retryAfterSec);
  try {
    await requireAdminApi();
    const [corporate, wholesale] = await Promise.all([
      db.select().from(corporateGiftRequests).orderBy(desc(corporateGiftRequests.createdAt)).limit(200),
      db.select().from(wholesaleInquiries).orderBy(desc(wholesaleInquiries.createdAt)).limit(200),
    ]);
    return Response.json({ ok: true, corporate, wholesale });
  } catch (error) { return adminErrorResponse(error); }
}
