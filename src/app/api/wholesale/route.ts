import { NextResponse } from "next/server";
import { z } from "zod";
import { db, isDatabaseConfigured } from "@/db";
import { wholesaleInquiries } from "@/db/schema";
import { assertSameOrigin, clientKey, csrfRejectedResponse, rateLimit, rateLimitedResponse } from "@/lib/security";

const schema = z.object({
  businessType: z.enum(["restaurant", "cafe", "supermarket", "wholesaler", "other"]),
  companyName: z.string().trim().min(2).max(200),
  contactName: z.string().trim().min(2).max(160),
  mobile: z.string().regex(/^09\d{9}$/),
  email: z.string().email().max(180).optional().or(z.literal("")),
  city: z.string().trim().min(2).max(80),
  estimatedMonthlyVolume: z.string().trim().max(80).optional().default(""),
  productInterests: z.string().trim().min(3).max(1000),
  notes: z.string().trim().max(2000).optional().default(""),
});

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return csrfRejectedResponse();
  const limited = rateLimit(clientKey(req, "wholesale"), 8, 15 * 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);
  if (!isDatabaseConfigured) return NextResponse.json({ ok: false, message: "سرویس خرید عمده در دسترس نیست." }, { status: 503 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "اطلاعات درخواست نامعتبر است." }, { status: 400 });

  const code = `WSL-${Date.now().toString().slice(-8)}`;
  try {
    const row = (await db.insert(wholesaleInquiries).values({
      code,
      ...parsed.data,
      email: parsed.data.email ?? "",
      status: "new",
      updatedAt: new Date(),
    }).returning())[0];
    return NextResponse.json({
      ok: true,
      code: row.code,
      message: "درخواست خرید عمده ثبت شد. کارشناس فروش هلسا برای اعلام شرایط همکاری با شما تماس می‌گیرد.",
    });
  } catch {
    return NextResponse.json({ ok: false, message: "ثبت درخواست ممکن نشد." }, { status: 500 });
  }
}
