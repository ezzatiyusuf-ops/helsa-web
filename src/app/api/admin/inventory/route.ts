import { adminErrorResponse, requireAdminApi } from "@/lib/admin";
import { assertSameOrigin, clientKey, csrfRejectedResponse, rateLimit, rateLimitedResponse } from "@/lib/security";
import { listInventory, listInventoryMovements } from "@/services/admin";

export async function GET(req: Request) {
  if (req.method !== "GET" && req.method !== "HEAD" && !assertSameOrigin(req)) return csrfRejectedResponse();
  const _rl = rateLimit(clientKey(req, "admin-api"), 60, 60_000);
  if (!_rl.ok) return rateLimitedResponse(_rl.retryAfterSec);

  try {
    await requireAdminApi();
    const p = new URL(req.url).searchParams;
    const [inventory, movements] = await Promise.all([listInventory({ status: p.get("status") ?? undefined, q: p.get("q") ?? undefined }), listInventoryMovements()]);
    return Response.json({ ok: true, inventory, movements });
  } catch (error) { return adminErrorResponse(error); }
}
