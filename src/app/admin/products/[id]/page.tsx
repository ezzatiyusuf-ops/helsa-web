import { ProductFormAdmin } from "@/components/admin/AdminPages";
export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) { return <ProductFormAdmin id={Number((await params).id)} />; }
