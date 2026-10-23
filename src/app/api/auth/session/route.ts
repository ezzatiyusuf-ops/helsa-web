import { NextResponse } from "next/server";
import { readSession } from "@/lib/session";

export async function GET() {
  const session = await readSession();
  if (!session) return NextResponse.json({ ok: false });
  return NextResponse.json({
    ok: true,
    name: session.name,
    email: session.email || null,
    phone: session.phone || null,
    provider: session.provider,
    role: session.role,
  });
}
