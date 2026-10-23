import { AccountDashboard } from "@/components/account/AccountDashboard";

export const dynamic = "force-dynamic";
export default async function AccountOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AccountDashboard tab="orders" orderId={decodeURIComponent(id)} />;
}
