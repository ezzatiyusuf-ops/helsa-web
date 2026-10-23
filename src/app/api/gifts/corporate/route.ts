import { NextResponse } from "next/server";
import { z } from "zod";
import { createCorporateGiftRequest } from "@/services/gifts";
import { assertSameOrigin, clientKey, csrfRejectedResponse, rateLimit, rateLimitedResponse } from "@/lib/security";
import { isDatabaseConfigured } from "@/db";

const schema = z.object({
  companyName: z.string().trim().min(2).max(200),
  contactName: z.string().trim().min(2).max(160),
  mobile: z.string().regex(/^09\d{9}$/),
  email: z.string().email().max(180).optional().or(z.literal("")),
  packageSlug: z.string().max(200).optional(),
  quantity: z.number().int().positive().max(5000),
  occasion: z.string().max(120).optional(),
  desiredDeliveryDate: z.string().max(40).optional(),
  brandingRequirements: z.string().max(1000).optional(),
  packagingNotes: z.string().max(1000).optional(),
  recipientNotes: z.string().max(1000).optional(),
  additionalNotes: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return csrfRejectedResponse();
  const limited = rateLimit(clientKey(req, "corporate-gift"), 8, 15 * 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);
  if (!isDatabaseConfigured) return NextResponse.json({ ok: false, message: "سرویس درخواست سازمانی در دسترس نیست." }, { status: 503 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "اطلاعات درخواست نامعتبر است." }, { status: 400 });

  try {
    const row = await createCorporateGiftRequest(parsed.data);
    return NextResponse.json({
      ok: true,
      code: row.code,
      status: row.status,
      indicativeTotal: row.indicativeTotal,
      message: "درخواست هدیه سازمانی شما ثبت شد. کارشناسان هلسا برای اعلام قیمت نهایی با شما تماس می‌گیرند.",
    });
  } catch {
    return NextResponse.json({ ok: false, message: "ثبت درخواست سازمانی ممکن نشد." }, { status: 500 });
  }
}
