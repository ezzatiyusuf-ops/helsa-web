import { NextResponse } from "next/server";
import { getTrays } from "@/services/catalog";

export async function GET() {
  return NextResponse.json({ ok: true, trays: await getTrays() });
}
