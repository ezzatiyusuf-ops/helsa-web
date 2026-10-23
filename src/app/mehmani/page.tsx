import type { Metadata } from "next";
import { defaultOpenGraph } from "@/lib/metadata";
import MehmaniClient from "./MehmaniClient";

export const metadata: Metadata = {
  title: "مهمانی با هلسا | پذیرایی و سینی مزه برای میهمانی",
  description: "هنر پذیرایی با سینی‌های مزه هلسا؛ چیدمان، تعداد نفرات و ترکیب‌های پیشنهادی برای میهمانی‌های خانه و محل کار.",
  alternates: { canonical: "/mehmani" },
  openGraph: { ...defaultOpenGraph,
    title: "مهمانی با هلسا | پذیرایی و سینی مزه برای میهمانی",
    description: "هنر پذیرایی با سینی‌های مزه هلسا؛ چیدمان، تعداد نفرات و ترکیب‌های پیشنهادی برای میهمانی‌های خانه و محل کار.",
    url: "/mehmani",
    type: "website" },
};

export default function Page() {
  return <MehmaniClient />;
}
