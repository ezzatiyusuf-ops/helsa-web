import { TrayFormAdmin } from "@/components/admin/AdminPages";
export default async function EditTrayPage({ params }: { params: Promise<{ id: string }> }) { return <TrayFormAdmin id={Number((await params).id)} />; }
