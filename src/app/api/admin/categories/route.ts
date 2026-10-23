import { adminErrorResponse, requireAdminApi } from "@/lib/admin";
import { assertSameOrigin, clientKey, csrfRejectedResponse, rateLimit, rateLimitedResponse } from "@/lib/security";
import { categoryAdminSchema } from "@/lib/admin-validation";
import { createCategory, listAdminCategories } from "@/services/admin";

export async function GET(req: Request) {
  if (req.method !== "GET" && req.method !== "HEAD" && !assertSameOrigin(req)) return csrfRejectedResponse();
  const _rl = rateLimit(clientKey(req, "admin-api"), 60, 60_000);
  if (!_rl.ok) return rateLimitedResponse(_rl.retryAfterSec);

  try { await requireAdminApi(); return Response.json({ ok: true, categories: await listAdminCategories() }); }
  catch (error) { return adminErrorResponse(error); }
}
export async function POST(req: Request) {
  if (req.method !== "GET" && req.method !== "HEAD" && !assertSameOrigin(req)) return csrfRejectedResponse();
  const _rl = rateLimit(clientKey(req, "admin-api"), 60, 60_000);
  if (!_rl.ok) return rateLimitedResponse(_rl.retryAfterSec);

  try {
    const admin = await requireAdminApi();
    const parsed = categoryAdminSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return Response.json({ ok: false, message: parsed.error.issues[0]?.message ?? "اطلاعات دسته‌بندی نامعتبر است" }, { status: 400 });
    return Response.json({ ok: true, category: await createCategory(parsed.data, admin) }, { status: 201 });
  } catch (error) { return adminErrorResponse(error); }
}
