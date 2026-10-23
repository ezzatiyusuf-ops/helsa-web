import type { Metadata } from "next";
import { defaultOpenGraph } from "@/lib/metadata";
import { LegalPage } from "@/components/layout/LegalPage";

export const metadata: Metadata = {
  alternates: { canonical: "/terms" }, openGraph: { ...defaultOpenGraph, url: "/terms" }, title: "قوانین و مقررات", description: "قوانین و مقررات استفاده از فروشگاه هلسا مارکت." };
export default function TermsPage() {
  return <LegalPage slug="terms" />;
}
