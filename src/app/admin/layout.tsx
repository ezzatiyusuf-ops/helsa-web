import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = { title: "مدیریت هلسا", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();
  return <AdminShell adminName={admin.name}>{children}</AdminShell>;
}
