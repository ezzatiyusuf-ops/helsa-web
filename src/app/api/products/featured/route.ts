import { NextResponse } from "next/server";
import { getProducts } from "@/services/catalog";

/**
 * GET /api/products/featured — پیشنهاد آپ‌سل سبد خرید (CRO)
 * فقط دادهٔ عمومی کاتالوگ (همان که در فروشگاه دیده می‌شود)؛ بدون قیمت پنهان یا موجودی حساس.
 * sort=popular (پیش‌فرض): امتیاز × تعداد نظر — همان مرتب‌سازی «محبوب» فروشگاه.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 4) || 4, 8);
    const products = await getProducts();
    const items = [...products]
      .sort((a, b) => b.rating * b.reviews - a.rating * a.reviews)
      .slice(0, limit)
      .map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        price: p.price,
        image: p.image,
        weight: p.weight,
        rating: p.rating,
        reviews: p.reviews,
      }));
    return NextResponse.json({ ok: true, items });
  } catch {
    return NextResponse.json({ ok: false, items: [] }, { status: 200 });
  }
}
