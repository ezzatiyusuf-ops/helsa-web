import { adminErrorResponse, requireAdminApi } from "@/lib/admin";
import { assertSameOrigin, clientKey, csrfRejectedResponse, rateLimit, rateLimitedResponse } from "@/lib/security";
import { productAdminSchema } from "@/lib/admin-validation";
import { createProduct, listAdminProducts } from "@/services/admin";

export async function GET(req: Request) {
  if (req.method !== "GET" && req.method !== "HEAD" && !assertSameOrigin(req)) return csrfRejectedResponse();
  const _rl = rateLimit(clientKey(req, "admin-api"), 60, 60_000);
  if (!_rl.ok) return rateLimitedResponse(_rl.retryAfterSec);

  try {
    await requireAdminApi();
    const p = new URL(req.url).searchParams;
    const rows = await listAdminProducts({ q: p.get("q") ?? undefined, category: p.get("category") ?? undefined, stock: p.get("stock") ?? undefined, active: p.get("active") ?? undefined });
    return Response.json({ ok: true, products: rows });
  } catch (error) { return adminErrorResponse(error); }
}

export async function POST(req: Request) {
  if (req.method !== "GET" && req.method !== "HEAD" && !assertSameOrigin(req)) return csrfRejectedResponse();
  const _rl = rateLimit(clientKey(req, "admin-api"), 60, 60_000);
  if (!_rl.ok) return rateLimitedResponse(_rl.retryAfterSec);

  try {
    const admin = await requireAdminApi();
    const parsed = productAdminSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return Response.json({ ok: false, message: parsed.error.issues[0]?.message ?? "اطلاعات محصول نامعتبر است" }, { status: 400 });
    try {
      return Response.json({ ok: true, product: await createProduct(parsed.data, admin) }, { status: 201 });
    } catch (error) {
      if (error instanceof Error && error.message === "PRODUCT_SLUG_EXISTS")
        return Response.json({ ok: false, message: "محصولی با این slug از قبل وجود دارد." }, { status: 409 });
      throw error;
    }
  } catch (error) { return adminErrorResponse(error); }
}
