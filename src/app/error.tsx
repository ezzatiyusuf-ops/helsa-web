"use client";
import { useState } from "react";
import Link from "next/link";
import { CloudOff } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [shown] = useState(() => !!error.digest);
  return (
    <section className="min-h-[60svh] flex items-center justify-center bg-surface2 px-6">
      <div className="text-center max-w-md">
        <span className="inline-flex size-16 rounded-2xl bg-brand-50 text-brand-600 items-center justify-center">
          <CloudOff className="size-8" aria-hidden />
        </span>
        <h1 className="mt-5 text-xl md:text-2xl font-black text-heading">متأسفانه مشکلی پیش آمده است.</h1>
        <p className="mt-3 text-sm leading-7 text-muted">
          نگران نباشید؛ این خطا یک‌سویه است. لطفاً دوباره تلاش کنید یا به صفحه اصلی هلسا بازگردید.
          {shown && <span className="sr-only">کد خطا: {error.digest}</span>}
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <button
            onClick={reset}
            className="h-11 px-6 rounded-2xl bg-brand-600 text-inverse text-sm font-bold hover:bg-brand-700 transition-colors"
          >
            تلاش دوباره
          </button>
          <Link href="/" className="h-11 px-6 rounded-2xl border-2 border-brand-600 text-brand-700 text-sm font-bold inline-flex items-center hover:bg-brand-50 transition-colors">
            بازگشت به هلسا
          </Link>
        </div>
      </div>
    </section>
  );
}
