import { adminErrorResponse, requireAdminApi } from "@/lib/admin";
import { assertSameOrigin, clientKey, csrfRejectedResponse, rateLimit, rateLimitedResponse } from "@/lib/security";
import { listCustomers } from "@/services/admin";
export async function GET(req: Request) {
  if (req.method !== "GET" && req.method !== "HEAD" && !assertSameOrigin(req)) return csrfRejectedResponse();
  const _rl = rateLimit(clientKey(req, "admin-api"), 60, 60_000);
  if (!_rl.ok) return rateLimitedResponse(_rl.retryAfterSec);

  try { await requireAdminApi(); return Response.json({ ok: true, customers: await listCustomers(new URL(req.url).searchParams.get("q") ?? undefined) }); }
  catch (error) { return adminErrorResponse(error); }
}
