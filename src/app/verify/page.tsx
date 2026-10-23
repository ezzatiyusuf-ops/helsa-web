"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/primitives";

export default function VerifyPage() {
  const router = useRouter();
  const toast = useToast();
  const login = useStore((s) => s.login);
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [mobile, setMobile] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const send = async () => {
    if (!/^09\d{9}$/.test(mobile)) return setErr("شماره موبایل معتبر وارد کنید");
    setErr("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: mobile }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErr(data.message || "ارسال کد ممکن نشد");
        return;
      }
      setDemo(Boolean(data.demo));
      toast.push(data.demo ? "ارسال پیامک پیکربندی نشده است." : "اگر شماره معتبر باشد، کد ارسال می‌شود.", "info");
      setTimeout(() => refs.current[0]?.focus(), 100);
    } catch {
      setErr("متأسفانه مشکلی پیش آمد. دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    const code = digits.join("");
    if (code.length < 6) return setErr("کد ۶ رقمی را کامل وارد کنید");
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: mobile, code }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErr(data.message || "کد تأیید صحیح نیست؛ دوباره تلاش کنید");
        return;
      }
      login({ name: data.name || "کاربر هلسا", mobile: data.phone || mobile });
      toast.push("ورود با موفقیت انجام شد");
      router.push("/account");
    } catch {
      setErr("متأسفانه مشکلی پیش آمد. دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="تأیید شماره موبایل" crumbs={[{ label: "خانه", href: "/" }, { label: "تأیید شماره", href: "/verify" }]} />
      <div className="container-x py-14 max-w-md">
        <div className="rounded-2xl border border-line bg-surface p-7 md:p-8">
          <h2 className="text-base font-black text-heading">کد تأیید را وارد کنید</h2>
          <p className="mt-2 text-xs text-muted leading-6">کد ۶ رقمی ارسال‌شده به موبایل شما.</p>
          <label className="block mt-5">
            <span className="text-xs font-bold text-heading mb-1.5 block">شماره موبایل</span>
            <input value={mobile} onChange={(e) => setMobile(e.target.value.replace(/[^\d]/g, ""))} className={cls} placeholder="۰۹۱۲۳۴۵۶۷۸۹" dir="ltr" inputMode="numeric" />
          </label>
          <Button variant="outline" size="sm" className="mt-3" onClick={send} disabled={busy}>ارسال کد</Button>
          <div className="mt-5 flex gap-2 justify-between" dir="ltr">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { refs.current[i] = el; }}
                value={d}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^\d]/g, "").slice(-1);
                  setDigits((prev) => { const nx = [...prev]; nx[i] = v; return nx; });
                  if (v && i < 5) refs.current[i + 1]?.focus();
                }}
                onKeyDown={(e) => { if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus(); }}
                inputMode="numeric" autoComplete="one-time-code" aria-label={`رقم ${i + 1}`}
                className="size-12 rounded-xl border border-line bg-surface2 text-center text-lg font-black outline-none focus:border-brand-500 transition-colors"
              />
            ))}
          </div>
          {err && <p className="mt-2 text-[11px] font-bold text-accent-600">{err}</p>}
          <Button className="mt-5 w-full" onClick={verify} disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : "تأیید و ورود"}</Button>
          <p className="mt-4 flex items-center gap-1.5 text-[10.5px] text-muted justify-center">
            <ShieldCheck className="size-3.5 text-brand-600" aria-hidden />
            {demo ? "ارسال پیامک پیکربندی نشده است؛ این مسیر برای تولید کامل نیست." : "کد فقط از مسیر پیامک معتبر است."}
          </p>
        </div>
      </div>
    </>
  );
}
const cls = "w-full h-11 rounded-xl border border-line bg-surface2 px-4 text-sm text-heading placeholder:text-muted outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 transition-[border-color,box-shadow,background-color]";
