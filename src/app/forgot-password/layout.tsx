import type { Metadata } from "next";

/** صفحه کلاینت است (useSearchParams)؛ متادیتا و noindex را از layout سروری می‌دهیم. */
export const metadata: Metadata = {
  title: "بازیابی رمز عبور | هلسا",
  description: "بازیابی رمز عبور حساب هلسا با کد یک‌بارمصرف پیامکی.",
  robots: { index: false, follow: true },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
