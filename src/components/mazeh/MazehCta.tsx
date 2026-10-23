"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

/**
 * نوار چسبان پایین موبایل (§24) — دو اقدام اصلی: انتخاب سینی / ساخت سینی.
 * فقط موبایل؛ بالای ناوبری پایین سایت (BottomNav h-16) می‌نشیند تا محتوا را نپوشاند.
 */
export function MazehStickyBar() {
  return (
    <div
      className="fixed bottom-16 inset-x-0 z-40 border-t border-line/80 bg-surface/95 backdrop-blur-xl lg:hidden"
      role="region"
      aria-label="اقدام سریع سینی مزه"
    >
      <div className="container-x flex gap-2 py-2">
        <a
          href="#trays"
          className="flex h-11 flex-1 items-center justify-center rounded-full border border-line bg-surface text-[12px] font-bold text-body transition-colors hover:border-brand-400"
        >
          انتخاب سینی آماده
        </a>
        <Link
          href="/mazeh-trays/build"
          className="flex h-11 flex-1 items-center justify-center rounded-full bg-brand-700 text-[12px] font-bold text-inverse shadow-soft transition-colors hover:bg-brand-800"
        >
          ساخت سینی من
        </Link>
      </div>
    </div>
  );
}

/**
 * CTA سفارش سازمانی با رویداد آنالیتیکس (§19/§28) — به فرم واقعی پیش‌فاکتور موجود می‌رود.
 */
export function CorporateOrderCta({ className = "" }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        trackEvent("mazeh_corporate_request", { source: "mazeh-trays" });
        router.push("/gifts/corporate/inquiry");
      }}
      className={
        className ||
        "inline-flex h-12 items-center gap-2 rounded-full bg-gold-500 px-7 text-[13px] font-black text-brand-950 transition-colors hover:bg-gold-400"
      }
    >
      <Building2 className="size-4" aria-hidden /> درخواست سفارش سازمانی
    </button>
  );
}
