import type { Metadata } from "next";
import { AccountDashboard } from "@/components/account/AccountDashboard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "حساب کاربری من", description: "سلام، به حساب کاربری هلسا خوش آمدید." };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  return <AccountDashboard tab={(tab as never) ?? "overview"} />;
}
