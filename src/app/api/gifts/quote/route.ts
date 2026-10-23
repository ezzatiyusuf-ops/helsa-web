import { NextResponse } from "next/server";
import { z } from "zod";
import { createGiftQuote } from "@/services/gifts";
import { assertSameOrigin, clientKey, csrfRejectedResponse, rateLimit, rateLimitedResponse } from "@/lib/security";
import { isDatabaseConfigured } from "@/db";

const schema = z.object({
  packageSlug: z.string().min(2).max(200),
  quantity: z.number().int().positive().max(100),
  packagingId: z.string().min(1).max(40),
  occasion: z.string().max(80).optional(),
  recipientName: z.string().max(120).optional(),
  message: z.string().max(240).optional(),
});

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return csrfRejectedResponse();
  const limited = rateLimit(clientKey(req, "gift-quote"), 20, 15 * 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);
  if (!isDatabaseConfigured) return NextResponse.json({ ok: false, message: "برای قیمت‌گذاری هدیه اتصال پایگاه داده لازم است." }, { status: 503 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "اطلاعات هدیه نامعتبر است." }, { status: 400 });

  try {
    const quote = await createGiftQuote(parsed.data);
    return NextResponse.json({ ok: true, quote });
  } catch (error) {
    const code = error instanceof Error ? error.message : "ERROR";
    const map: Record<string, string> = {
      PACKAGE_NOT_FOUND: "بسته هدیه یافت نشد.",
      NOT_PERSONAL_PACKAGE: "این بسته برای خرید آنلاین شخصی نیست.",
      INVALID_QTY: "تعداد انتخاب‌شده مجاز نیست.",
      OUT_OF_STOCK: "موجودی این هدیه کافی نیست.",
      INVALID_PACKAGING: "نوع بسته‌بندی نامعتبر است.",
      MESSAGE_NOT_ALLOWED: "پیام هدیه برای این بسته فعال نیست.",
    };
    return NextResponse.json({ ok: false, message: map[code] ?? "قیمت‌گذاری هدیه انجام نشد." }, { status: 400 });
  }
}
