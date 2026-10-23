"use client";
import { useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, ShieldCheck, Check, PencilLine, RotateCcw, Timer, Phone, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/primitives";
import { HelsaLogo } from "@/components/ui/primitives";
import { SITE } from "@/config/site";
import { faDigits } from "@/lib/format";
import { trackEvent } from "@/lib/analytics";
import { toEnglishDigits } from "@/lib/nid";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;
const NETWORK_ERROR = "ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.";

const cls = "w-full h-11 rounded-xl border border-line bg-surface2 px-4 text-sm text-heading placeholder:text-muted outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 transition-[border-color,box-shadow]";
const inputCls = (err?: string) => `${cls} ${err ? "border-accent-500" : ""}`;

function strength(p: string): { score: number; label: string; color: string } {
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[A-Za-z]/.test(p) && /\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  const map = [
    { label: "—", color: "bg-line" },
    { label: "ضعیف", color: "bg-accent-500" },
    { label: "متوسط", color: "bg-gold-500" },
    { label: "قوی", color: "bg-brand-600" },
    { label: "قوی", color: "bg-brand-600" },
  ];
  return { score: s, ...map[Math.min(s, 4)] };
}

/** 09121234567 → ۰۹۱۲•••••۶۷ · ali@mail.com → al•••@mail.com (never the full contact) */
function maskIdentifier(raw: string): string {
  const v = toEnglishDigits(raw).trim();
  if (/^09\d{9}$/.test(v)) return faDigits(`${v.slice(0, 4)}•••••${v.slice(-2)}`);
  const at = v.indexOf("@");
  if (at > 1) {
    const local = v.slice(0, at);
    return `${local.slice(0, 2)}${"•".repeat(Math.max(3, Math.min(6, local.length - 2)))}@${v.slice(at + 1)}`;
  }
  return v;
}

const isValidIdentifier = (v: string) => /^09\d{9}$/.test(v) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/** Persian error mapping — technical details never reach the customer. */
function apiErrorMessage(status: number, fallback: string): string {
  if (status === 429) return "تعداد تلاش‌ها بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.";
  if (status === 503) return "سرویس حساب کاربری در دسترس نیست؛ لطفاً بعداً تلاش کنید.";
  if (status >= 500) return "در بازیابی رمز عبور مشکلی پیش آمد. لطفاً دوباره تلاش کنید.";
  return fallback;
}

function ForgotPasswordPageInner() {
  const router = useRouter();
  const search = useSearchParams();
  const toast = useToast();
  const nextParam = search.get("next");
  // Safe internal return URL only — never an open redirect.
  const safeNext = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : null;
  const nextQuery = safeNext ? `?next=${encodeURIComponent(safeNext)}` : "";
  const loginHref = `/login${nextQuery}`;
  const registerHref = `/register${nextQuery}`;

  const [stage, setStage] = useState<1 | 2 | 3 | 4 | 5>(1); // 5 = delivery unavailable (production-safe)
  const [identifier, setIdentifier] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0); // code validity countdown
  const [resendIn, setResendIn] = useState(0); // resend gate
  const [devCode, setDevCode] = useState<string | null>(null);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const st = strength(password);

  useEffect(() => { trackEvent("forgot_password_view", {}); }, []);

  // best-effort abandonment signal (no PII)
  useEffect(() => {
    const handler = () => { if (stage === 2 || stage === 3) trackEvent("recovery_abandoned", { step: stage === 2 ? "otp" : "password" }); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [stage]);

  useEffect(() => {
    if (seconds > 0) { const t = setTimeout(() => setSeconds((s) => s - 1), 1000); return () => clearTimeout(t); }
  }, [seconds]);
  useEffect(() => {
    if (resendIn > 0) { const t = setTimeout(() => setResendIn((s) => s - 1), 1000); return () => clearTimeout(t); }
  }, [resendIn]);

  const faClock = (s: number) => `${faDigits(String(Math.floor(s / 60)).padStart(2, "0"))}:${faDigits(String(s % 60).padStart(2, "0"))}`;

  const requestCode = async (resend = false) => {
    setErr({});
    const id = toEnglishDigits(identifier).trim();
    if (!isValidIdentifier(id)) return setErr({ identifier: "شماره موبایل (09xxxxxxxxx) یا ایمیل معتبر وارد کنید." });
    setBusy(true);
    if (!resend) trackEvent("recovery_started", { channel: /^09/.test(id) ? "sms" : "email" });
    trackEvent("otp_requested", { flow: "password_reset", resend: resend ? "1" : "0" });
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "request", identifier: id }),
      });
      const data = (await res.json()) as { ok?: boolean; demo?: boolean; devCode?: string; expiresAt?: string; message?: string };
      if (!res.ok || !data.ok) {
        trackEvent("password_reset_failed", { reason: res.status === 429 ? "rate_limited" : res.status >= 500 ? "server" : "request_rejected" });
        setErr({ identifier: apiErrorMessage(res.status, data.message || "در بازیابی رمز عبور مشکلی پیش آمد. لطفاً دوباره تلاش کنید.") });
        return;
      }
      if (data.devCode) {
        // Development environment only (server never returns this in production).
        setDevCode(data.devCode);
        setStage(2);
      } else if (data.demo) {
        // Delivery provider is not wired in this environment — honest, customer-safe notice.
        // Never enter a fake OTP step; never expose infrastructure details.
        trackEvent("password_reset_failed", { reason: "delivery_unavailable" });
        setStage(5);
        return;
      } else {
        setDevCode(null);
        setStage(2);
      }
      const ttl = data.expiresAt ? Math.max(1, Math.round((new Date(data.expiresAt).getTime() - Date.now()) / 1000)) : 600;
      setSeconds(ttl);
      setResendIn(RESEND_SECONDS);
      setDigits(Array(OTP_LENGTH).fill(""));
      setTimeout(() => refs.current[0]?.focus(), 120);
    } catch {
      trackEvent("password_reset_failed", { reason: "network" });
      setErr({ identifier: NETWORK_ERROR });
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async () => {
    setErr({});
    const id = toEnglishDigits(identifier).trim();
    const code = digits.join("");
    if (password.length < 8) return setErr({ password: "رمز عبور باید حداقل ۸ کاراکتر باشد." });
    if (password !== confirm) return setErr({ confirm: "رمزهای عبور یکسان نیستند." });
    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "reset", identifier: id, code, password }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        const msg = data.message || "در بازیابی رمز عبور مشکلی پیش آمد. لطفاً دوباره تلاش کنید.";
        trackEvent("password_reset_failed", { reason: res.status === 429 ? "rate_limited" : res.status === 401 ? "invalid_code" : "server" });
        if (res.status === 401) {
          // back to the OTP step with the precise server verdict (wrong vs expired)
          setStage(2);
          setErr({ otp: msg });
          if (msg.includes("منقضی")) setSeconds(0);
          else setDigits(Array(OTP_LENGTH).fill(""));
          setTimeout(() => refs.current[0]?.focus(), 120);
        } else {
          setErr({ password: apiErrorMessage(res.status, msg) });
        }
        return;
      }
      trackEvent("otp_verified", { flow: "password_reset" });
      trackEvent("password_reset_completed", {});
      setStage(4);
    } catch {
      trackEvent("password_reset_failed", { reason: "network" });
      setErr({ password: NETWORK_ERROR });
    } finally {
      setBusy(false);
    }
  };

  const setDigit = (i: number, v: string) => {
    const d = toEnglishDigits(v).replace(/[^0-9]/g, "").slice(-1);
    setDigits((prev) => { const nx = [...prev]; nx[i] = d; return nx; });
    if (d && i < OTP_LENGTH - 1) refs.current[i + 1]?.focus();
  };
  const pasteDigits = (e: React.ClipboardEvent<HTMLInputElement>, from: number) => {
    const text = toEnglishDigits(e.clipboardData.getData("text")).replace(/[^0-9]/g, "");
    if (!text) return;
    e.preventDefault();
    setDigits((prev) => { const nx = [...prev]; for (let k = 0; k < text.length && from + k < OTP_LENGTH; k++) nx[from + k] = text[k]; return nx; });
    refs.current[Math.min(from + text.length - 1, OTP_LENGTH - 1)]?.focus();
  };

  // auto-advance to the password step once all six digits are in (server still verifies)
  useEffect(() => {
    if (stage === 2 && !busy && seconds > 0 && digits.every((d) => d !== "")) {
      const t = setTimeout(() => { setStage(3); setTimeout(() => document.getElementById("new-password-input")?.focus(), 150); }, 350);
      return () => clearTimeout(t);
    }
  }, [digits, stage, busy, seconds]);

  const goBackToIdentifier = () => {
    trackEvent("recovery_abandoned", { step: "otp" });
    setErr({});
    setStage(1);
  };

  return (
    <div className="container-x py-14 md:py-20">
      <div className="grid lg:grid-cols-2 gap-0 rounded-2xl overflow-hidden border border-line bg-surface shadow-soft">
        {/* lifestyle image side */}
        <div className="relative hidden lg:block min-h-[36rem]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/opt/hero-nuts-dried-fruits.jpg" alt="چیدمان خرما و محصولات طبیعی هلسا در نور طبیعی" className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-950/70 via-transparent to-transparent" aria-hidden />
          <div className="absolute bottom-0 p-10">
            <p className="text-2xl font-black text-inverse leading-snug">نگران نباشید؛</p>
            <p className="mt-1 text-2xl font-black text-inverse leading-snug">می‌توانید رمز عبور خود را بازیابی کنید.</p>
            <p className="mt-3 text-xs text-inverse/80">{SITE.coreMessage}</p>
          </div>
        </div>

        {/* recovery card side */}
        <div className="p-7 md:p-10">
          <HelsaLogo className="h-10" />
          <h2 className="mt-6 text-2xl font-black text-heading">بازیابی رمز عبور</h2>
          <p className="mt-2 text-xs text-muted leading-6">برای بازیابی رمز عبور، شماره موبایل یا ایمیل حساب خود را وارد کنید.</p>

          <div className="mt-7">
            <AnimatePresence mode="wait">
              {stage === 1 && (
                <motion.div key="s1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                  <label className="block">
                    <span className="text-xs font-bold text-heading mb-1.5 block">شماره موبایل یا ایمیل</span>
                    <input
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") void requestCode(); }}
                      className={inputCls(err.identifier)}
                      placeholder="09123456789 یا you@mail.com"
                      autoComplete="username"
                      inputMode="text"
                      dir="ltr"
                      aria-invalid={Boolean(err.identifier) || undefined}
                      aria-describedby={err.identifier ? "identifier-error" : undefined}
                    />
                    <span id="identifier-error" className="mt-1 block text-[11px] font-bold text-accent-600" role="alert">{err.identifier}</span>
                  </label>
                  <Button className="mt-5 w-full" onClick={() => void requestCode()} disabled={busy}>
                    {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                    {busy ? "در حال بررسی…" : "ارسال کد تأیید"}
                  </Button>
                  <p className="mt-4 text-center text-[11px] text-muted leading-6">
                    حساب دارید؟ <Link href={loginHref} className="font-bold text-brand-600 hover:text-brand-700">ورود به حساب هلسا</Link>
                  </p>
                  <p className="mt-1.5 text-center text-[11px] text-muted leading-6">
                    حساب کاربری ندارید؟ <Link href={registerHref} className="font-bold text-brand-600 hover:text-brand-700">ثبت‌نام کنید</Link>
                  </p>
                </motion.div>
              )}

              {stage === 5 && (
                <motion.div key="s5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                  <div className="rounded-2xl border border-gold-500/30 bg-gold-500/10 p-5">
                    <p className="text-sm font-black text-heading">ارسال کد بازیابی در حال حاضر امکان‌پذیر نیست.</p>
                    <p className="mt-2 text-xs text-muted leading-6">
                      اگر حسابی با این مشخصات وجود داشته باشد، کد تأیید برای شما ارسال خواهد شد؛ اما ارسال پیامک/ایمیل در این لحظه انجام نمی‌شود.
                      برای بازیابی رمز عبور با پشتیبانی هلسا تماس بگیرید — با چند سؤال امنیتی حساب شما را بازیابی می‌کنیم.
                    </p>
                    <a href={`tel:${SITE.landline}`} className="mt-3 inline-flex items-center gap-1.5 text-sm font-black text-brand-700 hover:text-brand-800" dir="ltr">
                      <Phone className="size-4" aria-hidden /> {SITE.phones[0]}
                    </a>
                    <p className="mt-1 text-[10.5px] text-muted">ساعات پاسخگویی: {SITE.supportHours}</p>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <Link href={loginHref} className="h-11 rounded-full border border-line bg-surface text-[12.5px] font-bold text-body flex items-center justify-center hover:border-brand-400 hover:text-heading transition-colors">ورود به حساب</Link>
                    <Link href={registerHref} className="h-11 rounded-full border border-line bg-surface text-[12.5px] font-bold text-body flex items-center justify-center hover:border-brand-400 hover:text-heading transition-colors">ثبت‌نام</Link>
                  </div>
                  <button onClick={() => { setStage(1); setErr({}); }} className="mt-4 w-full inline-flex items-center justify-center gap-1.5 text-[11px] font-bold text-muted hover:text-heading">
                    <ArrowRight className="size-3.5" aria-hidden /> بازگشت و اصلاح مشخصات
                  </button>
                </motion.div>
              )}

              {stage === 2 && (
                <motion.div key="s2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                  <h2 className="text-base font-black text-heading flex items-center gap-2">
                    <KeyRound className="size-4 text-brand-600" aria-hidden /> کد تأیید را وارد کنید
                  </h2>
                  <p className="mt-2 text-xs text-muted leading-6">
                    کد تأیید ۶ رقمی ارسال‌شده به <span dir="auto" className="font-bold text-heading">{maskIdentifier(identifier)}</span> را وارد کنید.
                  </p>
                  <p className="mt-1 text-[10.5px] text-muted">اگر حسابی با این اطلاعات وجود داشته باشد، کد تأیید برای شما ارسال خواهد شد.</p>

                  <div className="mt-5 flex gap-2 justify-between" dir="ltr">
                    {digits.map((d, i) => (
                      <input
                        key={i}
                        ref={(el) => { refs.current[i] = el; }}
                        value={d}
                        onChange={(e) => setDigit(i, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
                          if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
                          if (e.key === "ArrowRight" && i < OTP_LENGTH - 1) refs.current[i + 1]?.focus();
                        }}
                        onPaste={(e) => pasteDigits(e, i)}
                        inputMode="numeric"
                        maxLength={1}
                        autoComplete={i === 0 ? "one-time-code" : "off"}
                        disabled={seconds === 0}
                        aria-label={`رقم ${faDigits(i + 1)}`}
                        aria-invalid={Boolean(err.otp) || undefined}
                        className={`size-12 rounded-xl border bg-surface2 text-center text-lg font-black text-heading outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 transition-[border-color,box-shadow] disabled:opacity-60 ${err.otp ? "border-accent-500" : "border-line"}`}
                      />
                    ))}
                  </div>
                  <div aria-live="polite">
                    {err.otp && <p className="mt-2 text-[11px] font-bold text-accent-600" role="alert">{err.otp}</p>}
                  </div>

                  {devCode && (
                    <p className="mt-3 rounded-xl border border-dashed border-gold-400/60 bg-gold-50 px-3 py-2 text-[11px] font-bold leading-5 text-gold-700">
                      محیط تست (بدون پیامک واقعی) — کد تأیید: <span dir="ltr">{devCode}</span>
                    </p>
                  )}

                  <div className="mt-4 flex items-center justify-between text-[11px]">
                    <span className="inline-flex items-center gap-1.5 font-bold text-muted" aria-live="polite">
                      <Timer className="size-3.5" aria-hidden />
                      {seconds > 0 ? <>اعتبار کد: <span dir="ltr">{faClock(seconds)}</span></> : "کد منقضی شده است"}
                    </span>
                    {seconds === 0 ? (
                      // expired code → fresh code immediately (server-side limits still apply)
                      <button onClick={() => void requestCode(true)} disabled={busy} className="inline-flex items-center gap-1 font-bold text-brand-600 hover:text-brand-700 disabled:opacity-50">
                        <RotateCcw className="size-3" aria-hidden /> دریافت کد جدید
                      </button>
                    ) : resendIn > 0 ? (
                      <span className="text-muted">ارسال مجدد تا <span dir="ltr">{faClock(resendIn)}</span></span>
                    ) : (
                      <button onClick={() => void requestCode(true)} disabled={busy} className="inline-flex items-center gap-1 font-bold text-brand-600 hover:text-brand-700 disabled:opacity-50">
                        <RotateCcw className="size-3" aria-hidden /> ارسال مجدد کد
                      </button>
                    )}
                  </div>

                  <Button className="mt-5 w-full" onClick={() => { setStage(3); setTimeout(() => document.getElementById("new-password-input")?.focus(), 150); }} disabled={busy || seconds === 0 || digits.some((d) => !d)}>
                    ادامه
                  </Button>
                  <button onClick={goBackToIdentifier} className="mt-3 w-full inline-flex items-center justify-center gap-1.5 text-[11px] font-bold text-muted hover:text-heading">
                    <PencilLine className="size-3.5" aria-hidden /> تغییر شماره موبایل / ایمیل
                  </button>
                </motion.div>
              )}

              {stage === 3 && (
                <motion.div key="s3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                  <h2 className="text-base font-black text-heading">رمز عبور جدید</h2>
                  <p className="mt-2 text-xs text-muted leading-6">رمز عبور جدید خود را وارد کنید.</p>
                  <div className="mt-4 space-y-4">
                    <label className="block">
                      <span className="text-xs font-bold text-heading mb-1.5 block">رمز عبور جدید</span>
                      <span className="relative block">
                        <input
                          id="new-password-input"
                          type={show ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={`${inputCls(err.password)} pe-11`}
                          placeholder="حداقل ۸ کاراکتر"
                          autoComplete="new-password"
                          dir="ltr"
                          aria-invalid={Boolean(err.password) || undefined}
                        />
                        <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "پنهان کردن رمز" : "نمایش رمز"} aria-pressed={show} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted hover:text-heading">
                          {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                        </button>
                      </span>
                      {password.length > 0 && (
                        <span className="mt-2 flex items-center gap-1.5" aria-live="polite">
                          <span className="flex h-1.5 flex-1 gap-1" aria-hidden>
                            {[1, 2, 3, 4].map((i) => (<span key={i} className={`h-full flex-1 rounded-full ${i <= st.score ? st.color : "bg-line"}`} />))}
                          </span>
                          <span className="text-[10.5px] font-bold text-muted">{password.length >= 8 ? `قدرت رمز: ${st.label}` : "حداقل ۸ کاراکتر"}</span>
                        </span>
                      )}
                      <span className="mt-1 block text-[11px] font-bold text-accent-600" role="alert">{err.password}</span>
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold text-heading mb-1.5 block">تکرار رمز عبور</span>
                      <input
                        type={show ? "text" : "password"}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        className={inputCls(err.confirm)}
                        placeholder="تکرار رمز عبور"
                        autoComplete="new-password"
                        dir="ltr"
                        aria-invalid={Boolean(err.confirm) || undefined}
                      />
                      <span className="mt-1 block text-[11px] font-bold text-accent-600" role="alert">{err.confirm}</span>
                    </label>
                  </div>
                  <Button className="mt-5 w-full" onClick={() => void submitReset()} disabled={busy}>
                    {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                    {busy ? "در حال تغییر…" : "تغییر رمز عبور"}
                  </Button>
                  <button onClick={() => { setErr({}); setStage(2); setTimeout(() => refs.current[0]?.focus(), 120); }} className="mt-3 w-full inline-flex items-center justify-center gap-1.5 text-[11px] font-bold text-muted hover:text-heading">
                    <ArrowRight className="size-3.5" aria-hidden /> بازگشت به کد تأیید
                  </button>
                </motion.div>
              )}

              {stage === 4 && (
                <motion.div key="s4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="text-center py-6">
                  <span className="inline-flex size-14 rounded-full bg-brand-700 text-inverse items-center justify-center">
                    <Check className="size-6" aria-hidden />
                  </span>
                  <h2 className="mt-4 text-lg font-black text-heading">رمز عبور شما با موفقیت تغییر کرد.</h2>
                  <p className="mt-2 text-sm text-muted leading-7">اکنون می‌توانید با رمز عبور جدید وارد حساب خود شوید.</p>
                  <p className="mt-1 text-[10.5px] text-muted leading-5">برای امنیت بیشتر، همهٔ نشست‌های ورود قبلی شما باطل شده‌اند.</p>
                  <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link href={loginHref} className="inline-flex h-11 items-center gap-2 rounded-full bg-brand-700 px-6 text-sm font-bold text-inverse hover:bg-brand-800 transition-colors">
                      ورود به حساب هلسا
                      <ArrowLeft className="size-4" aria-hidden />
                    </Link>
                    <Link href={safeNext || "/products"} className="inline-flex h-11 items-center rounded-full border border-line px-6 text-sm font-bold text-heading hover:border-brand-400 transition-colors">
                      ادامه خرید
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <p className="mt-8 flex items-center justify-center gap-1.5 text-[10.5px] text-muted">
            <ShieldCheck className="size-3.5 text-brand-600" aria-hidden />
            اطلاعات بازیابی حساب شما به‌صورت امن و در سرور پردازش می‌شود؛ رمز عبور شما هرگز ذخیره یا افشا نمی‌شود.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <>
      {/* h1 سروری — پنل بازیابی داخل Suspense (useSearchParams) کلاینت‌رندر است */}
      <h1 className="sr-only">بازیابی رمز عبور حساب هلسا</h1>
      <Suspense fallback={<div className="container-x py-14 min-h-[50svh] grid place-items-center text-sm font-bold text-muted">در حال بارگذاری…</div>}>
        <ForgotPasswordPageInner />
      </Suspense>
    </>
  );
}
