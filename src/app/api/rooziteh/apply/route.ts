import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db, isDatabaseConfigured } from "@/db";
import { adminNotifications, producers } from "@/db/schema";
import { PRODUCER_LIMITS, slugifyProducer, validateApplication } from "@/lib/producer";
import { assertSameOrigin, clientKey, csrfRejectedResponse, rateLimit, rateLimitedResponse } from "@/lib/security";
import { readSession } from "@/lib/session";

/**
 * POST /api/rooziteh/apply — درخواست عضویت تولیدکننده.
 * هیچ فیلدی توسط سرور «پر» نمی‌شود؛ ردیف با status=submitted ساخته می‌شود.
 */
const clean = (s: string) => s.replace(/[<>\u0000-\u001f]/g, "").trim();

const schema = z.object({
  displayName: z.string().max(200).optional().default(""),
  region: z.string().max(120).optional().default(""),
  craft: z.string().max(160).optional().default(""),
  bio: z.string().max(1200).optional().default(""),
  story: z.string().max(4000).optional().default(""),
  socialImpact: z.string().max(2000).optional().default(""),
  certifications: z.array(z.string().max(160)).max(10).optional().default([]),
  contactName: z.string().max(160).optional().default(""),
  contactPhone: z.string().max(20).optional().default(""),
  contactEmail: z.string().max(160).optional().default(""),
});

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return csrfRejectedResponse();
  const limited = rateLimit(clientKey(req, "rooziteh-apply"), 3, 60 * 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfterSec);
  if (!isDatabaseConfigured) return NextResponse.json({ ok: false, message: "ثبت درخواست در حال حاضر ممکن نیست." }, { status: 503 });

  const session = await readSession();
  if (!session) return NextResponse.json({ ok: false, message: "برای ثبت درخواست ابتدا وارد حساب شوید." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "اطلاعات ارسالی نامعتبر است." }, { status: 400 });

  const input = {
    displayName: clean(parsed.data.displayName), region: clean(parsed.data.region), craft: clean(parsed.data.craft),
    bio: clean(parsed.data.bio), story: clean(parsed.data.story), socialImpact: clean(parsed.data.socialImpact),
    certifications: parsed.data.certifications.map(clean).filter(Boolean).slice(0, PRODUCER_LIMITS.certifications.max),
    contactName: clean(parsed.data.contactName), contactPhone: clean(parsed.data.contactPhone),
    contactEmail: clean(parsed.data.contactEmail),
  };

  const validation = validateApplication(input);
  if (!validation.ok) return NextResponse.json({ ok: false, message: validation.message }, { status: 400 });

  const base = slugifyProducer(input.displayName) || `producer-${Date.now().toString(36)}`;
  let slug = base;
  for (let i = 2; i < 50; i += 1) {
    const exists = (await db.select({ id: producers.id }).from(producers).where(eq(producers.slug, slug)).limit(1))[0];
    if (!exists) break;
    slug = `${base}-${i}`;
  }

  const created = (await db.insert(producers).values({
    slug, displayName: input.displayName, region: input.region, craft: input.craft,
    bio: input.bio, story: input.story, socialImpact: input.socialImpact,
    certifications: input.certifications, contactName: input.contactName,
    contactPhone: input.contactPhone.slice(-11), contactEmail: input.contactEmail,
    status: "submitted", submittedBySub: session.sub.slice(0, 80), updatedAt: new Date(),
  }).returning({ id: producers.id, slug: producers.slug }))[0];

  await db.insert(adminNotifications).values({
    kind: "producer_application",
    title: `درخواست عضویت روزیته: ${input.displayName}`,
    body: `${input.region} · ${input.craft} — در انتظار بررسی`,
    href: "/admin/rooziteh",
  });

  return NextResponse.json({
    ok: true, slug: created.slug, state: "submitted",
    message: "درخواست شما ثبت شد و پس از بررسی تیم هلسا نتیجه اعلام می‌شود. تا آن زمان در صفحات عمومی نمایش داده نمی‌شوید.",
  });
}
