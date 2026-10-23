import { z } from "zod";
import { adminErrorResponse, requireAdminApi } from "@/lib/admin";
import { assertSameOrigin, clientKey, csrfRejectedResponse, rateLimit, rateLimitedResponse } from "@/lib/security";
import { createInstagramPost, instagramLiveEnabled, listInstagramPostsAdmin } from "@/services/instagram";

const postSchema = z.object({
  imageUrl: z.string().trim().min(3).max(500)
    .refine((v) => v.startsWith("/") || v.startsWith("https://"), "مسیر تصویر باید با / یا https:// شروع شود"),
  caption: z.string().trim().max(600).default(""),
  kind: z.enum(["post", "story"]).default("post"),
  title: z.string().trim().max(120).nullable().optional().or(z.literal("")),
  permalink: z.string().trim().url().max(500).nullable().optional().or(z.literal("")),
  productSlug: z.string().trim().regex(/^[a-z0-9-]{2,120}$/).nullable().optional().or(z.literal("")),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true),
});

export async function GET(req: Request) {
  if (!assertSameOrigin(req)) return csrfRejectedResponse();
  const _rl = rateLimit(clientKey(req, "admin-api"), 60, 60_000);
  if (!_rl.ok) return rateLimitedResponse(_rl.retryAfterSec);
  try {
    await requireAdminApi();
    return Response.json({ ok: true, live: await instagramLiveEnabled(), posts: await listInstagramPostsAdmin() });
  } catch (error) { return adminErrorResponse(error); }
}

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return csrfRejectedResponse();
  const _rl = rateLimit(clientKey(req, "admin-api"), 60, 60_000);
  if (!_rl.ok) return rateLimitedResponse(_rl.retryAfterSec);
  try {
    await requireAdminApi();
    const parsed = postSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return Response.json({ ok: false, message: parsed.error.issues[0]?.message ?? "داده نامعتبر است" }, { status: 400 });
    const d = parsed.data;
    const post = await createInstagramPost({
      imageUrl: d.imageUrl,
      caption: d.caption,
      kind: d.kind,
      title: d.title || null,
      permalink: d.permalink || null,
      productSlug: d.productSlug || null,
      sortOrder: d.sortOrder,
      isActive: d.isActive,
    });
    return Response.json({ ok: true, post }, { status: 201 });
  } catch (error) { return adminErrorResponse(error); }
}
