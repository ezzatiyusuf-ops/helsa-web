import { adminErrorResponse, requireAdminApi } from "@/lib/admin";
import { assertSameOrigin, clientKey, csrfRejectedResponse, rateLimit, rateLimitedResponse } from "@/lib/security";
import { accountingSchema } from "@/lib/admin-validation";
import { createAccounting, getAccounting } from "@/services/admin";

export async function GET(req: Request) {
  if (req.method !== "GET" && req.method !== "HEAD" && !assertSameOrigin(req)) return csrfRejectedResponse();
  const _rl = rateLimit(clientKey(req, "admin-api"), 60, 60_000);
  if (!_rl.ok) return rateLimitedResponse(_rl.retryAfterSec);

  try {
    await requireAdminApi(); const p = new URL(req.url).searchParams;
    return Response.json({ ok: true, accounting: await getAccounting(p.get("from") ? new Date(p.get("from")!) : undefined, p.get("to") ? new Date(p.get("to")!) : undefined) });
  } catch (error) { return adminErrorResponse(error); }
}
export async function POST(req: Request) {
  if (req.method !== "GET" && req.method !== "HEAD" && !assertSameOrigin(req)) return csrfRejectedResponse();
  const _rl = rateLimit(clientKey(req, "admin-api"), 60, 60_000);
  if (!_rl.ok) return rateLimitedResponse(_rl.retryAfterSec);

  try {
    const admin = await requireAdminApi(); const parsed = accountingSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return Response.json({ ok: false, message: parsed.error.issues[0]?.message ?? "تراکنش نامعتبر است" }, { status: 400 });
    return Response.json({ ok: true, transaction: await createAccounting(parsed.data, admin) }, { status: 201 });
  } catch (error) { return adminErrorResponse(error); }
}
