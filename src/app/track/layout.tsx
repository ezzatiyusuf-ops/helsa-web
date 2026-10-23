import type { Metadata } from "next";
import type { ReactNode } from "react";

/** صفحهٔ پیگیری کلاینتی است؛ متادیتا از layout سروری: پیگیری سفارش دادهٔ شخصی است ⇒ noindex */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "پیگیری سفارش",
  description: "وضعیت سفارش هلسا را با شمارهٔ سفارش یا شمارهٔ موبایل پیگیری کنید؛ اطلاعات فقط به خود شما نمایش داده می‌شود.",
};

export default function TrackLayout({ children }: { children: ReactNode }) {
  return children;
}
