import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi, adminErrorResponse } from "@/lib/admin";
import { reviewBusiness } from "@/services/wholesale";
import { assertSameOrigin, clientKey, csrfRejectedResponse, rateLimit, rateLimitedResponse } from "@/lib/security";

const schema = z.object({
  status: z.enum(["pending", "approved", "rejected", "suspended"]),
  discountPercent: z.number().int().min(0).max(60).optional(),
  adminNote: z.string().trim().max(1000).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!assertSameOrigin(req)) return csrfRejectedResponse();
  const _rl = rateLimit(clientKey(req, "admin-api"), 60, 60_000);
  if (!_rl.ok) return rateLimitedResponse(_rl.retryAfterSec);
  try {
    await requireAdminApi();
    const { id } = await params;
    const businessId = Number(id);
    if (!Number.isInteger(businessId) || businessId <= 0)
      return NextResponse.json({ ok: false, message: "شناسه نامعتبر است." }, { status: 400 });

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success)
      return NextResponse.json({ ok: false, message: "اطلاعات بازبینی نامعتبر است." }, { status: 400 });

    const business = await reviewBusiness(businessId, parsed.data);
    if (!business) return NextResponse.json({ ok: false, message: "کسب‌وکار یافت نشد." }, { status: 404 });
    return NextResponse.json({ ok: true, business });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
