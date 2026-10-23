import { asc, desc, eq, type SQL } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { producers } from "@/db/schema";
import { adminErrorResponse, requireAdminApi } from "@/lib/admin";
import { PRODUCER_STATES, type ProducerState } from "@/lib/producer";
import { clientKey, rateLimit, rateLimitedResponse } from "@/lib/security";

/** GET /api/admin/producers?status= — صف بررسی روزیته. */
export async function GET(req: Request) {
  const _rl = rateLimit(clientKey(req, "admin-api"), 60, 60_000);
  if (!_rl.ok) return rateLimitedResponse(_rl.retryAfterSec);
  try {
    await requireAdminApi();
    const status = new URL(req.url).searchParams.get("status") ?? "";
    const where: SQL | undefined = status && (PRODUCER_STATES as readonly string[]).includes(status)
      ? eq(producers.status, status as ProducerState) : undefined;
    const rows = await db.select().from(producers).where(where)
      .orderBy(status ? asc(producers.submittedAt) : desc(producers.submittedAt)).limit(200);
    return NextResponse.json({ ok: true, producers: rows });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
