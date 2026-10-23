import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { WholesaleRegisterClient } from "@/components/wholesale/WholesaleRegisterClient";
import { readSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ثبت‌نام خرید عمده | هلسا",
  description: "فرم ثبت‌نام خرید عمده هلسا برای سوپرمارکت، رستوران، کافه، هتل، توزیع‌کننده و سازمان‌ها.",
  alternates: { canonical: "/wholesale/register" },
  robots: { index: false, follow: true },
};

export default async function WholesaleRegisterPage() {
  const session = await readSession();
  return (
    <>
      <PageHeader
        compact
        title="ثبت‌نام خرید عمده"
        desc="اطلاعات کسب‌وکار خود را ثبت کنید؛ پس از تأیید کارشناس B2B، پنل عمده با قیمت همکاری فعال می‌شود."
        crumbs={[
          { label: "خانه", href: "/" },
          { label: "خرید عمده", href: "/wholesale" },
          { label: "ثبت‌نام", href: "/wholesale/register" },
        ]}
      />
      <WholesaleRegisterClient authenticated={Boolean(session)} />
    </>
  );
}
