import { adminErrorResponse, requireAdminApi } from "@/lib/admin";
import { assertSameOrigin, clientKey, csrfRejectedResponse, rateLimit, rateLimitedResponse } from "@/lib/security";
import { adminSearch } from "@/services/admin";
export async function GET(req: Request) {
  if (req.method !== "GET" && req.method !== "HEAD" && !assertSameOrigin(req)) return csrfRejectedResponse();
  const _rl = rateLimit(clientKey(req, "admin-api"), 60, 60_000);
  if (!_rl.ok) return rateLimitedResponse(_rl.retryAfterSec);

  try { await requireAdminApi(); const q = new URL(req.url).searchParams.get("q")?.trim() ?? ""; return Response.json({ ok: true, results: q.length >= 2 ? await adminSearch(q) : {} }); }
  catch (error) { return adminErrorResponse(error); }
}
