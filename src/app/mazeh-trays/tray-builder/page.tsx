import type { Metadata } from "next";
import { defaultOpenGraph } from "@/lib/metadata";
import { PageHeader } from "@/components/layout/PageHeader";
import { TrayBuilderClient } from "@/components/mazeh/TrayBuilderClient";

export const metadata: Metadata = {
  title: "ساخت سینی مزه اختصاصی",
  description:
    "سینی مزه هلسا را مرحله‌به‌مرحله خودتان بسازید: اندازه و پایه، مزه‌ها و اقلام، تزئین و پیام اختصاصی — قیمت زنده از سرور.",
  alternates: { canonical: "/mazeh-trays/build" },
  openGraph: { ...defaultOpenGraph,
    title: "ساخت سینی مزه اختصاصی | هلسا مارکت",
    description: "سینی مزه هلسا را مرحله‌به‌مرحله خودتان بسازید؛ قیمت زنده از سرور." },
};

export default function BuildTrayPage() {
  return (
    <>
      <PageHeader
        title="ساخت سینی مزه اختصاصی"
        desc="سینی پذیرایی خود را مرحله‌به‌مرحله بچینید؛ قیمت را سرور به‌صورت زنده و شفاف محاسبه می‌کند."
        crumbs={[{ label: "خانه", href: "/" }, { label: "سینی‌های مزه", href: "/mazeh-trays" }, { label: "ساخت سینی", href: "/mazeh-trays/build" }]}
      />
      <TrayBuilderClient />
    </>
  );
}
