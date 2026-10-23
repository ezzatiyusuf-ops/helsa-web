import { NextResponse } from "next/server";
import { getGiftPackages } from "@/services/gifts";

export async function GET(req: Request) {
  const kind = new URL(req.url).searchParams.get("kind");
  const packages = await getGiftPackages(kind === "corporate" || kind === "personal" ? kind : undefined);
  return NextResponse.json({ ok: true, packages });
}
