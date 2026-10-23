import Link from "next/link";
import { Sprout } from "lucide-react";

export default function NotFound() {
  return (
    <section className="relative min-h-[70svh] flex items-center justify-center overflow-hidden bg-brand-950">
      <div className="pattern-persian-light absolute inset-0 opacity-40" aria-hidden />
      <div className="absolute -bottom-24 inset-x-0 mx-auto size-96 rounded-full bg-brand-600/20 blur-3xl" aria-hidden />
      <div className="relative text-center px-6">
        <span className="inline-flex size-20 rounded-2xl bg-gold-500/15 border border-gold-500/30 items-center justify-center animate-float">
          <Sprout className="size-10 text-gold-400" aria-hidden />
        </span>
        <p className="mt-6 text-6xl md:text-8xl font-black text-gradient-gold">۴۰۴</p>
        <h1 className="mt-4 text-2xl md:text-3xl font-black text-inverse">این مسیر به مقصد نرسید!</h1>
        <p className="mt-4 max-w-md mx-auto text-sm leading-7 text-inverse/75">
          مثل نهالی که هنوز جوانه نزده؛ صفحه‌ای که دنبالش بودید این‌جا نیست. اما ویترین هلسا پر از طعم‌های اصیل است.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex h-12 px-8 items-center rounded-2xl bg-gold-500 text-heading text-sm font-black hover:bg-gold-400 transition-colors"
        >
          بازگشت به هلسا
        </Link>
      </div>
    </section>
  );
}
