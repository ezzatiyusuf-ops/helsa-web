import { z } from "zod";
import { adminErrorResponse, requireAdminApi } from "@/lib/admin";
import { assertSameOrigin, clientKey, csrfRejectedResponse, rateLimit, rateLimitedResponse } from "@/lib/security";
import { deleteInstagramPost, updateInstagramPost } from "@/services/instagram";

const patchSchema = z.object({
  imageUrl: z.string().trim().min(3).max(500).refine((v) => v.startsWith("/") || v.startsWith("https://"), "مسیر تصویر باید با / یا https:// شروع شود").optional(),
  caption: z.string().trim().max(600).optional(),
  kind: z.enum(["post", "story"]).optional(),
  title: z.string().trim().max(120).nullable().optional().or(z.literal("")),
  permalink: z.string().trim().url().max(500).nullable().optional().or(z.literal("")),
  productSlug: z.string().trim().regex(/^[a-z0-9-]{2,120}$/).nullable().optional().or(z.literal("")),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!assertSameOrigin(req)) return csrfRejectedResponse();
  const _rl = rateLimit(clientKey(req, "admin-api"), 60, 60_000);
  if (!_rl.ok) return rateLimitedResponse(_rl.retryAfterSec);
  try {
    await requireAdminApi();
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id < 1) return Response.json({ ok: false, message: "شناسه نامعتبر است" }, { status: 400 });
    const parsed = patchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return Response.json({ ok: false, message: parsed.error.issues[0]?.message ?? "داده نامعتبر است" }, { status: 400 });
    const d = parsed.data;
    const patch: Record<string, unknown> = {};
    if (d.imageUrl !== undefined) patch.imageUrl = d.imageUrl;
    if (d.caption !== undefined) patch.caption = d.caption;
    if (d.kind !== undefined) patch.kind = d.kind;
    if (d.title !== undefined) patch.title = d.title || null;
    if (d.permalink !== undefined) patch.permalink = d.permalink || null;
    if (d.productSlug !== undefined) patch.productSlug = d.productSlug || null;
    if (d.sortOrder !== undefined) patch.sortOrder = d.sortOrder;
    if (d.isActive !== undefined) patch.isActive = d.isActive;
    const post = await updateInstagramPost(id, patch);
    if (!post) return Response.json({ ok: false, message: "پست یافت نشد" }, { status: 404 });
    return Response.json({ ok: true, post });
  } catch (error) { return adminErrorResponse(error); }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!assertSameOrigin(req)) return csrfRejectedResponse();
  const _rl = rateLimit(clientKey(req, "admin-api"), 60, 60_000);
  if (!_rl.ok) return rateLimitedResponse(_rl.retryAfterSec);
  try {
    await requireAdminApi();
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id < 1) return Response.json({ ok: false, message: "شناسه نامعتبر است" }, { status: 400 });
    const ok = await deleteInstagramPost(id);
    if (!ok) return Response.json({ ok: false, message: "پست یافت نشد" }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) { return adminErrorResponse(error); }
}
