import { NextResponse } from "next/server";
import { getCategories } from "@/services/catalog";

export async function GET() {
  return NextResponse.json({ ok: true, categories: await getCategories() });
}
