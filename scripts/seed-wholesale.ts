/**
 * Seed wholesale B2B demo data:
 *  - one APPROVED business (discount 15%) with a linked demo customer account
 *  - one PENDING business
 * Demo login for the approved portal: 09121112233 / Wholesale123
 */
import { db } from "../src/db";
import { customers, wholesaleBusinesses } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { scryptSync, randomBytes } from "crypto";

// same format as src/lib/auth-service.ts hashPassword() — kept in sync intentionally
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64);
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

async function upsertBusiness(values: {
  code: string; businessName: string; businessType: string; contactName: string; mobile: string;
  email: string; city: string; discountPercent: number; status: string; customerId?: number; monthlyVolume: string;
}) {
  const existing = await db.select({ id: wholesaleBusinesses.id }).from(wholesaleBusinesses).where(eq(wholesaleBusinesses.mobile, values.mobile)).limit(1);
  if (existing[0]) {
    await db.update(wholesaleBusinesses).set({ ...values, updatedAt: new Date() }).where(eq(wholesaleBusinesses.id, existing[0].id));
  } else {
    await db.insert(wholesaleBusinesses).values({ ...values, createdAt: new Date(), updatedAt: new Date() });
  }
}

async function main() {
  console.log("seeding HELSA wholesale businesses…");

  // demo customer for the approved business (password: Wholesale123)
  const demoMobile = "09121112233";
  const existingCustomer = await db.select({ id: customers.id }).from(customers).where(eq(customers.phone, demoMobile)).limit(1);
  let customerId: number;
  if (existingCustomer[0]) {
    customerId = existingCustomer[0].id;
  } else {
    const [row] = await db.insert(customers).values({
      name: "مرتضی کریمی",
      phone: demoMobile,
      email: "b2b@helsa-demo.ir",
      passwordHash: hashPassword("Wholesale123"),
      passwordUpdatedAt: new Date(),
      isActive: true,
      updatedAt: new Date(),
    }).returning({ id: customers.id });
    customerId = row.id;
  }

  await upsertBusiness({
    code: "WSB-DEMO01", businessName: "سوپرمارکت های‌پر نمونه", businessType: "supermarket",
    contactName: "مرتضی کریمی", mobile: demoMobile, email: "b2b@helsa-demo.ir", city: "تهران",
    discountPercent: 15, status: "approved", customerId, monthlyVolume: "۵۰ تا ۲۰۰ میلیون",
  });

  await upsertBusiness({
    code: "WSB-DEMO02", businessName: "کافه ترنج", businessType: "cafe",
    contactName: "نگار رستمی", mobile: "09121114455", email: "info@toranj-demo.ir", city: "شیراز",
    discountPercent: 0, status: "pending", monthlyVolume: "کمتر از ۵۰ میلیون",
  });

  console.log("wholesale seed complete: 1 approved (demo login 09121112233 / Wholesale123) + 1 pending");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
