"use client";
import { useState } from "react";
import { Check, Copy, Gift, Send } from "lucide-react";

/**
 * بنر فشردهٔ هدیهٔ اولین خرید (CRO) — بالای گرید محصولات.
 * کوپن واقعی از همان بک‌اند خبرنامه (/api/newsletter) صادر و اعتبارسنجی می‌شود؛
 * هیچ کد از پیش‌نمایش‌شده یا غیرفعال نمایش داده نمی‌شود.
 * ورودی واحد: ایمیل یا شمارهٔ موبایل (تشخیص خودکار).
 */
export function FirstPurchaseBanner() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = value.trim();
    const isMobile = /^09\d{9}$/.test(val);
    const isEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val);
    if (!isMobile && !isEmail) {
      setState("error");
      setMessage("ایمیل معتبر یا شمارهٔ موبایل (09xxxxxxxxx) وارد کنید.");
      return;
    }
    setState("sending");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isMobile ? { mobile: val } : { email: val }),
      });
      const data = (await res.json()) as { ok: boolean; code?: string | null; message?: string };
      if (data.ok) {
        setState("done");
        setCode(data.code ?? null);
        setMessage(data.message ?? "عضویت شما ثبت شد.");
      } else {
        setState("error");
        setMessage(data.message ?? "ثبت ممکن نشد؛ بعداً تلاش کنید.");
      }
    } catch {
      setState("error");
      setMessage("خطای شبکه؛ دوباره تلاش کنید.");
    }
  };

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* noop */
    }
  };

  return (
    <div className="mt-5" aria-label="هدیه اولین خرید">
      {/* نوار پروموی لاغر (۴۰px) — طبق بریف صفحهٔ محصولات: بدون بنر بزرگ */}
      <div className="flex min-h-10 flex-wrap items-center justify-between gap-x-4 gap-y-1.5 rounded-full border border-gold-300/60 bg-gradient-to-l from-gold-50 via-surface to-brand-50/60 px-4 py-1.5 shadow-soft">
        <div className="flex items-center gap-2.5">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gold-500/15 text-gold-700">
            <Gift className="size-3.5" aria-hidden />
          </span>
          <p className="text-[12px] font-black text-heading">
            اولین خرید هلسا؟ <span className="font-bold text-muted">۲۰۰ هزار تومان هدیه خرید دریافت کنید (خرید بالای ۱ میلیون تومان)</span>
          </p>
        </div>
        {state !== "done" && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-8 items-center rounded-full bg-brand-700 px-5 text-[11.5px] font-black text-inverse transition-colors hover:bg-brand-800"
            aria-expanded={open}
          >
            دریافت هدیه
          </button>
        )}
      </div>

      {(open || state === "done" || state === "error") && (
        <div className="mt-2.5 rounded-2xl border border-gold-200/70 bg-surface p-4">
          {state === "done" ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-[12px] font-bold text-brand-800">
                <Check className="size-4" aria-hidden /> {message}
              </p>
              {code && (
                <div className="flex items-center gap-2">
                  <code className="rounded-xl bg-brand-50 px-4 py-2 text-sm font-black tracking-widest text-brand-800" dir="ltr">{code}</code>
                  <button type="button" onClick={copy} aria-label="کپی کد تخفیف" className="grid size-10 place-items-center rounded-full bg-brand-700 text-inverse transition-colors hover:bg-brand-800">
                    {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                  </button>
                </div>
              )}
              <p className="w-full text-[10.5px] leading-5 text-faint">۲۰۰٬۰۰۰ تومان تخفیف · حداقل خرید ۱٬۰۰۰٬۰۰۰ تومان · اعتبار ۳۰ روز · یک‌بار مصرف — در سبد خرید وارد کنید.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="flex max-w-xl flex-col gap-2.5 sm:flex-row" aria-label="دریافت کد هدیه اولین خرید">
              <label htmlFor="first-gift-input" className="sr-only">ایمیل یا شمارهٔ موبایل</label>
              <input
                id="first-gift-input"
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="ایمیل یا شمارهٔ موبایل (09xxxxxxxxx)"
                dir="ltr"
                className="h-12 flex-1 rounded-full border border-line bg-surface px-5 text-sm text-heading outline-none shadow-soft transition-colors placeholder:text-faint focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-left"
              />
              <button
                type="submit"
                disabled={state === "sending"}
                className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-brand-700 px-6 text-[12.5px] font-bold text-inverse shadow-soft transition-colors hover:bg-brand-800 disabled:opacity-50"
              >
                <Send className="size-4" aria-hidden />
                {state === "sending" ? "در حال صدور..." : "دریافت کد"}
              </button>
            </form>
          )}
          {state === "error" && <p className="mt-2 text-[11.5px] font-bold text-accent-600">{message}</p>}
        </div>
      )}
    </div>
  );
}
