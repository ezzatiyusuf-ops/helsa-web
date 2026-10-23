import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { CorporateInquiryClient } from "@/components/gifts/CorporateInquiryClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "استعلام هدیه سازمانی | هلسا",
  description: "فرم استعلام هدایای سازمانی هلسا: تعداد، مناسبت، برندینگ و بسته‌بندی سفارشی را اعلام کنید تا پیش‌فاکتور رسمی برای شما صادر شود.",
  alternates: { canonical: "/gifts/corporate/inquiry" },
  robots: { index: false, follow: true },
};

export default function CorporateInquiryPage() {
  return (
    <>
      <PageHeader
        compact
        title="استعلام هدیه سازمانی"
        desc="برای تیراژ سازمانی، قیمت نهایی پس از بررسی کارشناسی اعلام می‌شود. این صفحه قیمت ساختگی به‌عنوان پرداخت قطعی ارائه نمی‌کند."
        crumbs={[
          { label: "خانه", href: "/" },
          { label: "هدایا", href: "/gifts" },
          { label: "هدایای سازمانی", href: "/gifts/corporate" },
          { label: "استعلام", href: "/gifts/corporate/inquiry" },
        ]}
      />
      <Suspense fallback={<div className="container-x py-16 text-center text-sm text-muted">در حال بارگذاری فرم…</div>}>
        <CorporateInquiryClient />
      </Suspense>
    </>
  );
}
