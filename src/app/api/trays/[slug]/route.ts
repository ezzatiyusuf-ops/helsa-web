import { NextResponse } from "next/server";
import { getTrayBySlug, getTrays } from "@/services/catalog";

/** GET /api/trays/[slug] — single mazeh tray + related trays */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tray = await getTrayBySlug(decodeURIComponent(slug));
  if (!tray) {
    return NextResponse.json({ ok: false, message: "سینی مزه یافت نشد" }, { status: 404 });
  }
  const all = await getTrays();
  const related = all.filter((t) => t.slug !== tray.slug).slice(0, 3);
  return NextResponse.json({ ok: true, tray, related });
}
