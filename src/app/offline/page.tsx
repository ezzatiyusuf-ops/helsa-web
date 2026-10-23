import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff } from "lucide-react";
import { HelsaLogo } from "@/components/ui/primitives";
import { OfflineRetryButton } from "@/components/pwa/OfflineRetryButton";

export const metadata: Metadata = {
  title: "اتصال اینترنت برقرار نیست",
  description: "در حال حاضر اتصال شما به اینترنت قطع است.",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <div className="container-x flex min-h-[70svh] items-center justify-center py-16">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-10 text-center">
        <HelsaLogo className="mx-auto h-11" />
        <span className="mx-auto mt-7 grid size-14 place-items-center rounded-full border border-line bg-surface2 text-muted">
          <WifiOff className="size-6" aria-hidden />
        </span>
        <h1 className="mt-5 text-lg font-black text-heading">در حال حاضر اتصال شما به اینترنت قطع است.</h1>
        <p className="mt-3 text-sm leading-7 text-muted">
          برخی اطلاعات ذخیره‌شده همچنان در دسترس هستند. پس از برقراری اتصال، دوباره تلاش کنید.
        </p>
        <div className="mt-7 flex flex-col gap-2">
          <OfflineRetryButton />
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-full border border-line px-6 text-sm font-bold text-heading transition-colors hover:bg-surface2"
          >
            بازگشت به خانه
          </Link>
        </div>
        <p className="mt-7 text-[11px] text-muted">هلسا؛ طعم طبیعت، هنر پذیرایی ایرانی</p>
      </div>
    </div>
  );
}
