import { NextResponse } from "next/server";
import { requireAdminApi, adminErrorResponse } from "@/lib/admin";
import { listBusinesses } from "@/services/wholesale";
import { clientKey, rateLimit, rateLimitedResponse } from "@/lib/security";

export async function GET(req: Request) {
  const _rl = rateLimit(clientKey(req, "admin-api"), 60, 60_000);
  if (!_rl.ok) return rateLimitedResponse(_rl.retryAfterSec);
  try {
    await requireAdminApi();
    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? undefined;
    const businesses = await listBusinesses(status ?? undefined);
    return NextResponse.json({ ok: true, businesses });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
