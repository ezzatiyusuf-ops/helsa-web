import type { Metadata } from "next";

/** عنوان یکتا (بریف 4.6) — صفحهٔ سبد پیش‌تر عنوان پیش‌فرض را تکرار می‌کرد. */
export const metadata: Metadata = {
  title: "سبد خرید",
  description: "سبد خرید شما در هلسا مارکت؛ بازبینی سفارش، اعمال کوپن و ادامهٔ ثبت سفارش.",
  robots: { index: false, follow: true },
};
export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
