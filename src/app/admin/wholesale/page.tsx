import type { Metadata } from "next";
import { WholesaleAdminClient } from "@/components/admin/WholesaleAdminClient";

export const metadata: Metadata = { title: "کسب‌وکارهای عمده | مدیریت هلسا" };

export default function AdminWholesalePage() {
  return <WholesaleAdminClient />;
}
