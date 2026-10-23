import { db } from "../src/db";
import { giftPackages } from "../src/db/schema";
import { GIFT_PACKAGES } from "../src/data/gifts";

async function main() {
  console.log("seeding HELSA gift packages…");
  for (const g of GIFT_PACKAGES) {
    await db.insert(giftPackages).values({
      name: g.name,
      slug: g.slug,
      kind: g.kind,
      shortDescription: g.shortDescription,
      description: g.description,
      image: g.image,
      imageAlt: g.imageAlt ?? g.name,
      basePrice: g.basePrice,
      oldPrice: g.oldPrice,
      stock: g.stock,
      minQty: g.minQty,
      maxQty: g.maxQty,
      contents: g.contents,
      occasions: g.occasions,
      packagingOptions: g.packagingOptions,
      allowsMessage: g.allowsMessage,
      allowsRecipient: g.allowsRecipient,
      isActive: g.isActive,
      isFeatured: g.isFeatured,
      seoTitle: g.name,
      seoDescription: g.shortDescription,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: giftPackages.slug,
      set: {
        name: g.name,
        kind: g.kind,
        shortDescription: g.shortDescription,
        description: g.description,
        image: g.image,
        imageAlt: g.imageAlt ?? g.name,
        basePrice: g.basePrice,
        oldPrice: g.oldPrice,
        stock: g.stock,
        minQty: g.minQty,
        maxQty: g.maxQty,
        contents: g.contents,
        occasions: g.occasions,
        packagingOptions: g.packagingOptions,
        allowsMessage: g.allowsMessage,
        allowsRecipient: g.allowsRecipient,
        isActive: g.isActive,
        isFeatured: g.isFeatured,
        updatedAt: new Date(),
      },
    });
  }
  console.log(`gift seed complete: ${GIFT_PACKAGES.length} packages`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
