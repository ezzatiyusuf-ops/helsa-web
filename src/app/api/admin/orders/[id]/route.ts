import { adminErrorResponse, requireAdminApi } from "@/lib/admin";
import { assertSameOrigin, clientKey, csrfRejectedResponse, rateLimit, rateLimitedResponse } from "@/lib/security";
import { orderStatusSchema } from "@/lib/admin-validation";
import { updateOrderStatus } from "@/services/admin";
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (req.method !== "GET" && req.method !== "HEAD" && !assertSameOrigin(req)) return csrfRejectedResponse();
  const _rl = rateLimit(clientKey(req, "admin-api"), 60, 60_000);
  if (!_rl.ok) return rateLimitedResponse(_rl.retryAfterSec);

  try {
    const admin = await requireAdminApi();
        const { id } = await params;
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0)
      return Response.json({ ok: false, message: "شناسه نامعتبر است." }, { status: 400 });

    const parsed = orderStatusSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return Response.json({ ok: false, message: parsed.error.issues[0]?.message ?? "وضعیت نامعتبر است" }, { status: 400 });
    return Response.json({ ok: true, order: await updateOrderStatus(numericId, parsed.data, admin) });
  } catch (error) { return adminErrorResponse(error); }
}
