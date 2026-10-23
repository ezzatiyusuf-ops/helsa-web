import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { giftPackages, giftQuotes, corporateGiftRequests } from "@/db/schema";
import { GIFT_PACKAGES } from "@/data/gifts";
import type { GiftPackage } from "@/types";

function mapGift(r: typeof giftPackages.$inferSelect): GiftPackage {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    kind: r.kind === "corporate" ? "corporate" : "personal",
    shortDescription: r.shortDescription,
    description: r.description,
    image: r.image,
    imageAlt: r.imageAlt,
    basePrice: r.basePrice,
    oldPrice: r.oldPrice,
    stock: r.stock,
    minQty: r.minQty,
    maxQty: r.maxQty,
    contents: r.contents,
    occasions: r.occasions,
    packagingOptions: r.packagingOptions,
    allowsMessage: r.allowsMessage,
    allowsRecipient: r.allowsRecipient,
    isActive: r.isActive,
    isFeatured: r.isFeatured,
  };
}

export async function getGiftPackages(kind?: "personal" | "corporate"): Promise<GiftPackage[]> {
  try {
    const rows = await db
      .select()
      .from(giftPackages)
      .where(kind ? and(eq(giftPackages.isActive, true), eq(giftPackages.kind, kind)) : eq(giftPackages.isActive, true))
      .orderBy(asc(giftPackages.id));
    if (rows.length) return rows.map(mapGift);
  } catch {
    /* development fallback */
  }
  return GIFT_PACKAGES.filter((g) => g.isActive && (!kind || g.kind === kind));
}

export async function getGiftPackageBySlug(slug: string): Promise<GiftPackage | undefined> {
  try {
    const rows = await db.select().from(giftPackages).where(and(eq(giftPackages.slug, slug), eq(giftPackages.isActive, true))).limit(1);
    if (rows[0]) return mapGift(rows[0]);
  } catch {
    /* fallback */
  }
  return GIFT_PACKAGES.find((g) => g.slug === slug && g.isActive);
}

export async function createGiftQuote(input: {
  packageSlug: string;
  quantity: number;
  packagingId: string;
  occasion?: string;
  recipientName?: string;
  message?: string;
}) {
  const pack = await getGiftPackageBySlug(input.packageSlug);
  if (!pack) throw new Error("PACKAGE_NOT_FOUND");
  if (pack.kind !== "personal") throw new Error("NOT_PERSONAL_PACKAGE");
  if (input.quantity < pack.minQty || input.quantity > pack.maxQty) throw new Error("INVALID_QTY");
  if (pack.stock < input.quantity) throw new Error("OUT_OF_STOCK");
  const packaging = pack.packagingOptions.find((p) => p.id === input.packagingId) ?? pack.packagingOptions[0];
  if (!packaging) throw new Error("INVALID_PACKAGING");
  if (pack.allowsMessage === false && input.message) throw new Error("MESSAGE_NOT_ALLOWED");

  const unitPrice = pack.basePrice + packaging.price;
  const total = unitPrice * input.quantity;
  const config = {
    packageSlug: pack.slug,
    packageName: pack.name,
    packagingId: packaging.id,
    packagingLabel: packaging.label,
    occasion: input.occasion ?? "",
    recipientName: input.recipientName ?? "",
    message: (input.message ?? "").slice(0, 240),
    image: pack.image,
  };

  const inserted = await db.insert(giftQuotes).values({
    packageId: pack.id,
    config,
    unitPrice,
    quantity: input.quantity,
    total,
  }).returning({ id: giftQuotes.id });

  return {
    id: inserted[0].id,
    unitPrice,
    quantity: input.quantity,
    total,
    packageName: pack.name,
    packagingLabel: packaging.label,
    image: pack.image,
    config,
  };
}

export async function getGiftQuoteById(id: number) {
  const rows = await db.select().from(giftQuotes).where(eq(giftQuotes.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createCorporateGiftRequest(input: {
  companyName: string;
  contactName: string;
  mobile: string;
  email?: string;
  packageSlug?: string;
  quantity: number;
  occasion?: string;
  desiredDeliveryDate?: string;
  brandingRequirements?: string;
  packagingNotes?: string;
  recipientNotes?: string;
  additionalNotes?: string;
}) {
  let indicativeTotal: number | null = null;
  if (input.packageSlug) {
    const pack = await getGiftPackageBySlug(input.packageSlug);
    if (pack && pack.kind === "corporate") {
      const qty = Math.max(pack.minQty, input.quantity);
      indicativeTotal = pack.basePrice * qty;
    }
  }
  const code = `CGR-${Date.now().toString().slice(-8)}`;
  const row = (await db.insert(corporateGiftRequests).values({
    code,
    companyName: input.companyName,
    contactName: input.contactName,
    mobile: input.mobile,
    email: input.email ?? "",
    packageSlug: input.packageSlug ?? null,
    quantity: input.quantity,
    occasion: input.occasion ?? "",
    desiredDeliveryDate: input.desiredDeliveryDate ?? "",
    brandingRequirements: input.brandingRequirements ?? "",
    packagingNotes: input.packagingNotes ?? "",
    recipientNotes: input.recipientNotes ?? "",
    additionalNotes: input.additionalNotes ?? "",
    indicativeTotal,
    status: "new",
    updatedAt: new Date(),
  }).returning())[0];
  return row;
}
