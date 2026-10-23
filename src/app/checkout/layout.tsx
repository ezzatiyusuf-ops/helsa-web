import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * صفحهٔ checkout کلاینتی است (وضعیت سبد/فرم چندمرحله‌ای) و نمی‌تواند metadata صادر کند؛
 * متادیتای تراکنشی از این layout سروری می‌آید:
 *   · noindex — صفحهٔ پرداخت هرگز نباید ایندکس شود
 *   · توضیح اختصاصی — پیش‌تر توضیح صفحهٔ خانه را ارث می‌برد و در SERP تکراری می‌شد
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  title: "تکمیل خرید",
  description: "ثبت سفارش هلسا با انتخاب آدرس، روش ارسال و پرداخت امن؛ قیمت‌ها و موجودی سمت سرور اعتبارسنجی می‌شوند.",
};

export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return children;
}
