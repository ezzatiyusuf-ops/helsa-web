import { adminErrorResponse, requireAdminApi } from "@/lib/admin";
import { assertSameOrigin, clientKey, csrfRejectedResponse, rateLimit, rateLimitedResponse } from "@/lib/security";
import { campaignAdminSchema } from "@/lib/admin-validation";
import { createCampaign, listAdminCampaigns } from "@/services/admin";

export async function GET(req: Request) {
  if (req.method !== "GET" && req.method !== "HEAD" && !assertSameOrigin(req)) return csrfRejectedResponse();
  const _rl = rateLimit(clientKey(req, "admin-api"), 60, 60_000);
  if (!_rl.ok) return rateLimitedResponse(_rl.retryAfterSec);

  try {
    await requireAdminApi();
    return Response.json({ ok: true, campaigns: await listAdminCampaigns() });
  } catch (error) { return adminErrorResponse(error); }
}

export async function POST(req: Request) {
  if (req.method !== "GET" && req.method !== "HEAD" && !assertSameOrigin(req)) return csrfRejectedResponse();
  const _rl = rateLimit(clientKey(req, "admin-api"), 60, 60_000);
  if (!_rl.ok) return rateLimitedResponse(_rl.retryAfterSec);

  try {
    const admin = await requireAdminApi();
    const parsed = campaignAdminSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return Response.json({ ok: false, message: parsed.error.issues[0]?.message ?? "اطلاعات کمپین نامعتبر است" }, { status: 400 });
    try {
      return Response.json({ ok: true, campaign: await createCampaign(parsed.data, admin) });
    } catch (error) {
      if (error instanceof Error && error.message === "CAMPAIGN_SLUG_EXISTS")
        return Response.json({ ok: false, message: "کمپینی با این slug از قبل وجود دارد." }, { status: 409 });
      throw error;
    }
  } catch (error) { return adminErrorResponse(error); }
}
