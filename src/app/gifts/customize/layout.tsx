import type { Metadata } from "next";

/** عنوان یکتا (بریف 4.6) — پیش‌تر عنوان پیش‌فرض سایت تکرار می‌شد. */
export const metadata: Metadata = {
  title: "انتخاب هدیهٔ شخصی",
  description: "هدیه مناسب را با مناسبتی، بودجه و سلیقهٔ گیرنده انتخاب کنید؛ پیشنهاد هوشمند هلسا.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
