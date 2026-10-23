"use client";
import { useState } from "react";
import { Copy, Check, Gift, Send, Sparkles } from "lucide-react";
import { Reveal } from "@/components/ui/primitives";

/**
 * خبرنامهٔ هلسا (CRO) — ثبت ایمیل + صدور کوپنِ واقعیِ اولین خرید از /api/newsletter
 * (۲۰۰٬۰۰۰ تومان، حداقل خرید ۱ میلیون، ۳۰ روز، یک‌بار مصرف — رکورد واقعی در جدول coupons).
 * هیچ کد جعلی نمایش داده نمی‌شود؛ کد فقط پس از ثبت‌نام موفق صادر و نشان داده می‌شود.
 */
export function NewsletterSection() {
  const [mode, setMode] = useState<"email" | "mobile">("email");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = mode === "email" ? email.trim() : mobile.trim();
    const valid = mode === "email" ? val.includes("@") : /^09\d{9}$/.test(val);
    if (!valid) {
      setState("error");
      setMessage(mode === "email" ? "لطفاً یک ایمیل معتبر وارد کنید." : "شماره موبایل را به شکل 09xxxxxxxxx وارد کنید.");
      return;
    }
    setState("sending");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "email" ? { email: val } : { mobile: val }),
      });
      const data = (await res.json()) as { ok: boolean; code?: string | null; message?: string };
      if (data.ok) {
        setState("done");
        setCode(data.code ?? null);
        setMessage(data.message ?? "عضویت شما ثبت شد.");
        setEmail("");
        setMobile("");
      } else {
        setState("error");
        setMessage(data.message ?? "ثبت عضویت ممکن نشد؛ بعداً تلاش کنید.");
      }
    } catch {
      setState("error");
      setMessage("خطای شبکه؛ لطفاً دوباره تلاش کنید.");
    }
  };

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <section id="newsletter" className="container-x scroll-mt-28 py-16 md:py-20" aria-label="خبرنامهٔ هلسا">
      <Reveal>
        <div className="relative overflow-hidden rounded-[1.75rem] border border-gold-300/70 bg-gradient-to-l from-gold-50 via-surface to-brand-50/50 p-8 shadow-lift md:p-12">
          <div className="relative mx-auto max-w-2xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-surface px-3.5 py-1.5 text-[11px] font-bold text-brand-700 shadow-soft">
              <Gift className="size-3.5 text-gold-700" aria-hidden /> هدیهٔ اولین خرید
            </p>
            <h2 className="mt-5 text-xl font-black leading-[1.7] text-heading md:text-[26px]">
              ۲۰۰ هزار تومان هدیهٔ اولین خرید
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[13px] leading-7 text-muted">
              عضو خبرنامهٔ هلسا شوید و کد تخفیف اختصاصی اولین خریدتان (۲۰۰ هزار تومان، برای خریدهای از ۱ میلیون تومان) را همین حالا دریافت کنید — به‌علاوهٔ خبر برداشت تازه و پیشنهادهای ویژهٔ اعضا.
            </p>

            {state === "done" ? (
              <div className="mx-auto mt-7 max-w-lg">
                <p className="inline-flex items-center gap-2 rounded-full border border-brand-300 bg-brand-50 px-5 py-2.5 text-[12.5px] font-bold text-brand-800">
                  <Check className="size-4" aria-hidden /> {message}
                </p>
                {code && (
                  <div className="mt-4 rounded-2xl border border-dashed border-brand-400 bg-surface p-4 shadow-soft">
                    <p className="text-[11px] font-bold text-muted">کد تخفیف اولین خرید شما:</p>
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <code className="rounded-xl bg-brand-50 px-5 py-2.5 text-base font-black tracking-widest text-brand-800" dir="ltr">{code}</code>
                      <button
                        type="button"
                        onClick={copy}
                        aria-label="کپی کد تخفیف"
                        className="grid size-11 place-items-center rounded-full bg-brand-700 text-inverse transition-colors hover:bg-brand-800"
                      >
                        {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                      </button>
                    </div>
                    <p className="mt-2.5 text-[10.5px] leading-5 text-faint">
                      ۲۰۰٬۰۰۰ تومان تخفیف · حداقل خرید ۱٬۰۰۰٬۰۰۰ تومان · اعتبار ۳۰ روز · یک‌بار مصرف — در سبد خرید وارد کنید.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={subscribe} className="mx-auto mt-7 max-w-lg" aria-label="فرم عضویت در خبرنامه">
                <div className="mb-3 flex justify-center gap-1.5" role="group" aria-label="روش دریافت کد تخفیف">
                  {([["email", "ایمیل"], ["mobile", "شماره موبایل"]] as const).map(([m, label]) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => { setMode(m); setState("idle"); }}
                      aria-pressed={mode === m}
                      className={`h-10 rounded-full px-5 text-[12px] font-bold transition-colors ${mode === m ? "bg-brand-700 text-inverse shadow-soft" : "border border-line bg-surface text-muted hover:border-brand-300"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col gap-2.5 sm:flex-row">
                <label htmlFor="newsletter-email" className="sr-only">ایمیل شما</label>
                <label htmlFor="newsletter-mobile" className="sr-only">شماره موبایل شما</label>
                {mode === "email" ? (
                <input
                  id="newsletter-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  dir="ltr"
                  className="h-12 flex-1 rounded-full border border-line bg-surface px-5 text-sm text-heading outline-none shadow-soft transition-colors placeholder:text-faint focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-left"
                />
                ) : (
                <input
                  id="newsletter-mobile"
                  type="tel"
                  inputMode="numeric"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/[^0-9]/g, "").slice(0, 11))}
                  placeholder="09123456789"
                  dir="ltr"
                  className="h-12 flex-1 rounded-full border border-line bg-surface px-5 text-sm text-heading outline-none shadow-soft transition-colors placeholder:text-faint focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-left tracking-widest"
                />
                )}
                <button
                  type="submit"
                  disabled={state === "sending"}
                  className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-brand-700 px-7 text-[13px] font-bold text-inverse shadow-soft transition-colors hover:bg-brand-800 disabled:opacity-50"
                >
                  <Send className="size-4" aria-hidden />
                  {state === "sending" ? "در حال ثبت..." : "دریافت کد تخفیف"}
                </button>
                </div>
              </form>
            )}
            {state === "error" && <p className="mt-3 text-[11.5px] font-bold text-accent-600">{message}</p>}
            <p className="mt-4 flex items-center justify-center gap-1.5 text-[10.5px] text-faint">
              <Sparkles className="size-3 text-gold-500" aria-hidden /> بدون اسپم — هر زمان که بخواهید می‌توانید لغو کنید.
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
