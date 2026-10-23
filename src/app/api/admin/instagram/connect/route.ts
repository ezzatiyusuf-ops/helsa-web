import { z } from "zod";
import { adminErrorResponse, requireAdminApi } from "@/lib/admin";
import { assertSameOrigin, clientKey, csrfRejectedResponse, rateLimit, rateLimitedResponse } from "@/lib/security";
import {
  getInstagramCredentialsMasked,
  instagramLiveEnabled,
  removeInstagramCredentials,
  saveInstagramCredentials,
  testInstagramConnection,
} from "@/services/instagram";

/**
 * اتصال فید زندهٔ اینستاگرام از پنل — بدون .env و بدون ری‌استارت.
 * GET  → وضعیت ماسک‌شدهٔ اعتبارنامه
 * POST → action: save | test | disconnect
 */
const bodySchema = z.object({
  action: z.enum(["save", "test", "disconnect"]),
  token: z.string().trim().min(20).max(1000).optional(),
  userId: z.string().trim().regex(/^\d{5,40}$/).optional(),
});

export async function GET(req: Request) {
  if (!assertSameOrigin(req)) return csrfRejectedResponse();
  const _rl = rateLimit(clientKey(req, "admin-api"), 60, 60_000);
  if (!_rl.ok) return rateLimitedResponse(_rl.retryAfterSec);
  try {
    await requireAdminApi();
    const credentials = await getInstagramCredentialsMasked();
    return Response.json({ ok: true, credentials, live: credentials.configured });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return csrfRejectedResponse();
  const _rl = rateLimit(clientKey(req, "admin-api"), 60, 60_000);
  if (!_rl.ok) return rateLimitedResponse(_rl.retryAfterSec);
  try {
    await requireAdminApi();
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return Response.json(
        { ok: false, message: parsed.error.issues[0]?.message ?? "داده نامعتبر است" },
        { status: 400 },
      );
    }
    const { action, token, userId } = parsed.data;

    if (action === "disconnect") {
      await removeInstagramCredentials();
      return Response.json({ ok: true, message: "اتصال قطع شد؛ سایت به پست‌های منتخب برمی‌گردد." });
    }

    if (action === "test") {
      // توکن داده‌شدهٔ جدید یا اعتبارنامهٔ ذخیره‌شده را واقعاً تست می‌کنیم
      const result = await testInstagramConnection(token, token ? userId : undefined);
      return Response.json({
        ok: true,
        result,
        message: result.ok
          ? `اتصال برقرار است — @${result.username} (${result.mediaCount ?? "؟"} پست)`
          : `اتصال تأیید نشد: ${result.error ?? "پاسخ نامعتبر از درگاه"}`,
      });
    }

    // action === "save" — ذخیره + تست واقعی؛ صادقانه گزارش می‌دهیم
    if (!token || !userId) {
      return Response.json({ ok: false, message: "توکن و User ID هر دو لازم است" }, { status: 400 });
    }
    await saveInstagramCredentials(token, userId);
    const result = await testInstagramConnection(token, userId);
    return Response.json({
      ok: true,
      result,
      message: result.ok
        ? `ذخیره شد و اتصال تأیید شد — @${result.username}`
        : "ذخیره شد اما اتصال تأیید نشد؛ توکن/User ID را بررسی کنید. سایت تا اصلاح، پست‌های منتخب را نشان می‌دهد.",
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
