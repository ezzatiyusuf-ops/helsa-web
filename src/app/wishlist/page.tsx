import type { Metadata } from "next";
import { getProducts } from "@/services/catalog";
import { WishlistClient } from "@/components/account/WishlistClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  // صفحهٔ خصوصی: فهرست علاقه‌مندی هر کاربر دادهٔ شخصی است ⇒ noindex (نه canonical)
  robots: { index: false, follow: true },
  title: "علاقه‌مندی‌ها",
  description: "فهرست محصولات مورد علاقهٔ شما در هلسا مارکت؛ فقط برای خودتان نمایش داده می‌شود." };

export default async function WishlistPage() {
  const products = await getProducts();
  return <WishlistClient products={products} />;
}
