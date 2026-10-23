import { adminErrorResponse, requireAdminApi } from "@/lib/admin";
import { assertSameOrigin, clientKey, csrfRejectedResponse, rateLimit, rateLimitedResponse } from "@/lib/security";
import { campaignAdminSchema } from "@/lib/admin-validation";
import { updateCampaign } from "@/services/admin";

const parseId = async (params: Promise<{ id: string }>) => {
  const { id } = await params;
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (req.method !== "GET" && req.method !== "HEAD" && !assertSameOrigin(req)) return csrfRejectedResponse();
  const _rl = rateLimit(clientKey(req, "admin-api"), 60, 60_000);
  if (!_rl.ok) return rateLimitedResponse(_rl.retryAfterSec);

  try {
    const admin = await requireAdminApi();
    const id = await parseId(params);
    if (!id) return Response.json({ ok: false, message: "شناسه نامعتبر است." }, { status: 400 });
    const parsed = campaignAdminSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return Response.json({ ok: false, message: parsed.error.issues[0]?.message ?? "اطلاعات کمپین نامعتبر است" }, { status: 400 });
    try {
      return Response.json({ ok: true, campaign: await updateCampaign(id, parsed.data, admin) });
    } catch (error) {
      if (error instanceof Error && error.message === "CAMPAIGN_SLUG_EXISTS")
        return Response.json({ ok: false, message: "کمپینی با این slug از قبل وجود دارد." }, { status: 409 });
      throw error;
    }
  } catch (error) { return adminErrorResponse(error); }
}
