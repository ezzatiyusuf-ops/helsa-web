import { NextResponse } from "next/server";
import { getProducts } from "@/services/catalog";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cat = url.searchParams.get("cat");
  let products = await getProducts();
  if (cat) products = products.filter((p) => p.category === cat);
  return NextResponse.json({ ok: true, products });
}
