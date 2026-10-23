import { NextResponse } from "next/server";
import { getProductBySlug, getProducts } from "@/services/catalog";

/** GET /api/products/[slug] — single product + related items */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(decodeURIComponent(slug));
  if (!product) {
    return NextResponse.json({ ok: false, message: "محصول یافت نشد" }, { status: 404 });
  }
  const all = await getProducts();
  const related = all.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);
  return NextResponse.json({ ok: true, product, related });
}
