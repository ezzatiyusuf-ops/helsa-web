import { NextResponse } from "next/server";
import { readSession, customerIdFromSession } from "@/lib/session";
import { getBusinessForCustomer } from "@/services/wholesale";

export async function GET() {
  const session = await readSession();
  const customerId = customerIdFromSession(session);
  if (!session) return NextResponse.json({ ok: true, business: null, authenticated: false });
  const business = await getBusinessForCustomer(customerId, session.phone);
  return NextResponse.json({ ok: true, authenticated: true, business });
}
