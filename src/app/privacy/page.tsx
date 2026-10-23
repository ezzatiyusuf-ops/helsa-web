import type { Metadata } from "next";
import { defaultOpenGraph } from "@/lib/metadata";
import { LegalPage } from "@/components/layout/LegalPage";

export const metadata: Metadata = {
  alternates: { canonical: "/privacy" }, openGraph: { ...defaultOpenGraph, url: "/privacy" }, title: "حریم خصوصی", description: "سیاست حریم خصوصی هلسا مارکت؛ نحوه نگهداری و حفاظت از داده‌های شما." };
export default function PrivacyPage() {
  return <LegalPage slug="privacy" />;
}
