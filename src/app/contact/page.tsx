import type { Metadata } from "next";
import { defaultOpenGraph } from "@/lib/metadata";
import ContactClient from "./ContactClient";

export const metadata: Metadata = {
  title: "تماس با هلسا | تلفن، واتس‌اپ و آدرس فروشگاه",
  description: "راه‌های ارتباط با هلسا مارکت: تماس تلفنی، واتس‌اپ، ایمیل و آدرس دفتر تهران — به‌علاوهٔ فرم پیام مستقیم به تیم.",
  alternates: { canonical: "/contact" },
  openGraph: { ...defaultOpenGraph,
    title: "تماس با هلسا | تلفن، واتس‌اپ و آدرس فروشگاه",
    description: "راه‌های ارتباط با هلسا مارکت: تماس تلفنی، واتس‌اپ، ایمیل و آدرس دفتر تهران — به‌علاوهٔ فرم پیام مستقیم به تیم.",
    url: "/contact",
    type: "website" },
};

export default function Page() {
  return <ContactClient />;
}
