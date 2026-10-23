import { NextResponse } from "next/server";
import { getGiftPackageBySlug } from "@/services/gifts";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pack = await getGiftPackageBySlug(slug);
  if (!pack) return NextResponse.json({ ok: false, message: "بسته هدیه یافت نشد" }, { status: 404 });
  return NextResponse.json({ ok: true, package: pack });
}
