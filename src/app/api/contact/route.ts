import { NextResponse } from "next/server";
import { z } from "zod";
import { db, isDatabaseConfigured } from "@/db";
import { contactMessages } from "@/db/schema";
import { assertSameOrigin, clientKey, csrfRejectedResponse, rateLimit, rateLimitedResponse } from "@/lib/security";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  mobile: z.string().regex(/^09\d{9}$/),
  email: z.string().email().max(180).optional().or(z.literal("")),
  subject: z.string().trim().min(2).max(200),
  message: z.string().trim().min(10).max(2000),
});

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return csrfRejectedResponse();
  const limited = rateLimit(clientKey(req, "contact"), 8, 15 * 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);
  if (!isDatabaseConfigured) return NextResponse.json({ ok: false, message: "سرویس پیام در دسترس نیست." }, { status: 503 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "داده نامعتبر" }, { status: 400 });
  }
  try {
    await db.insert(contactMessages).values({
      name: parsed.data.name,
      mobile: parsed.data.mobile,
      email: parsed.data.email ?? "",
      subject: parsed.data.subject,
      message: parsed.data.message,
    });
  } catch {
    return NextResponse.json({ ok: false, message: "ثبت پیام ممکن نشد." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, message: "پیام شما ثبت شد؛ کارشناسان هلسا به‌زودی پاسخ می‌دهند." });
}
