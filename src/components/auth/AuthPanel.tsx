"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ArrowRight, ArrowLeft, Eye, EyeOff, Check, ShieldCheck, Gift, RotateCcw, Timer, User, Users, Smartphone, Mail, Lock, AtSign, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { HelsaLogo } from "@/components/ui/primitives";
import { trackEvent } from "@/lib/analytics";
import { toEnglishDigits } from "@/lib/nid";
import { SmartImage } from "@/components/ui/SmartImage";

const OTP_LENGTH = 6;
const RESEND_AFTER_SEC = 60;
type AuthMode = "login" | "register";
type Method = "password" | "otp-verify";

function GoogleIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l3.7 2.9c2.2-2.1 3.7-5.1 3.7-8.6z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.2 0-5.9-2.1-6.9-5l-3.9 3C3.2 21.3 7.3 24 12 24z" />
      <path fill="#FBBC05" d="M5.1 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-3.9-3C.4 8.2 0 10 0 12s.4 3.8 1.2 5.4l3.9-3z" />
      <path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4l2.6-2.6C16.7 1.3 14.2 0 12 0 7.3 0 3.2 2.7 1.2 6.6l3.9 3c1-2.9 3.7-4.9 6.9-4.9z" />
    </svg>
  );
}
function AppleIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M16.7 12.9c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3.1 2.4 1.2 0 1.7-.8 3.2-.8s1.9.8 3.2.8c1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8-.1 0-2.6-1-2.7-3.9zM14.4 4.9c.7-.8 1.1-2 1-3.1-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.4z" />
    </svg>
  );
}


/**
 * فیلد با لیبل شناور (داخل باکس) + آیکون + فوکوس برند — برای فرم ورود/ثبت‌نام.
 * لیبل با پرشدن مقدار یا فوکوس به بالای باکس می‌رود تا ارتفاع فرم کوتاه بماند.
 */
function FloatField(props: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  error?: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  inputMode?: "text" | "tel" | "email" | "numeric";
  ltr?: boolean;
  onEnter?: () => void;
  end?: React.ReactNode;
}) {
  const Icon = props.icon;
  const floated = props.value.length > 0;
  return (
    <div>
      <div className="relative" dir={props.ltr ? "ltr" : undefined}>
        <Icon className="pointer-events-none absolute inset-y-0 start-3.5 my-auto size-4 text-muted" aria-hidden />
        <input
          id={props.id}
          type={props.type ?? "text"}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && props.onEnter) {
              e.preventDefault();
              props.onEnter();
            }
          }}
          placeholder=" "
          autoComplete={props.autoComplete}
          inputMode={props.inputMode}
          aria-invalid={props.error ? true : undefined}
          className={`peer h-[52px] w-full rounded-xl border bg-surface2 ps-10 ${props.end ? "pe-11" : ""} pt-5 pb-1 text-sm text-heading outline-none transition-[border-color,box-shadow] placeholder:text-transparent focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 ${props.error ? "border-accent-500" : "border-line"}`}
        />
        <label
          htmlFor={props.id}
          className={`pointer-events-none absolute start-10 transition-all duration-200 ${
            floated
              ? "top-[7px] translate-y-0 text-[10px] font-black text-muted"
              : "top-1/2 -translate-y-1/2 text-[12.5px] font-bold text-muted"
          } peer-focus:top-[7px] peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:font-black peer-focus:text-brand-700`}
        >
          {props.label}
        </label>
        {props.end}
      </div>
      {props.hint && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[10.5px] leading-4 text-muted">
          <ShieldCheck className="size-3.5 shrink-0 text-brand-600" aria-hidden />
          {props.hint}
        </p>
      )}
      {props.error && <p className="mt-1 text-[11px] font-bold text-accent-600" role="alert">{props.error}</p>}
    </div>
  );
}

/** Persian error mapping — technical details never leak to the customer. */
function authErrorMessage(status: number, fallback: string): string {
  if (status === 429) return "تعداد تلاش‌ها بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.";
  if (status === 503) return "سرویس حساب کاربری در دسترس نیست؛ لطفاً بعداً تلاش کنید.";
  if (status >= 500) return "خطایی در ورود به حساب رخ داد. لطفاً دوباره تلاش کنید.";
  return fallback;
}
const NETWORK_ERROR = "ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.";

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

export interface SocialProviders {
  google: boolean;
  apple: boolean;
}

export function AuthPanel({ mode, socialEnabled = { google: false, apple: false } }: { mode: AuthMode; socialEnabled?: SocialProviders }) {
  const router = useRouter();
  const search = useSearchParams();
  const toast = useToast();
  const login = useStore((s) => s.login);
  const authRedirect = useStore((s) => s.authRedirect);
  const nextParam = search.get("next");

  const [method, setMethod] = useState<Method>("password");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [family, setFamily] = useState("");
  /** ثبت‌نام دومرحله‌ای: ۱=اطلاعات هویتی، ۲=امنیت حساب (فقط نحوهٔ نمایش؛ همهٔ فیلدهای الزامی قانونی حفظ شده‌اند) */
  const [step, setStep] = useState<1 | 2>(1);
  const uid = useId();
  const [accept, setAccept] = useState(false);
  // پیش‌فرض خاموش — انتخاب آگاهانهٔ کاربر روی دستگاه‌های اشتراکی/عمومی
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const [otpMeta, setOtpMeta] = useState<{ demo?: boolean; devCode?: string }>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [resendIn, setResendIn] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const sessionChecked = useRef(false);
  const pwStrength = strength(password);

  const destination = useCallback(() => {
    const cand = nextParam || authRedirect;
    if (cand && cand.startsWith("/") && !cand.startsWith("//") && cand !== "/login" && cand !== "/register") return cand;
    return "/account";
  }, [nextParam, authRedirect]);

  // login_view — fired once per panel mount (no PII).
  useEffect(() => {
    trackEvent("login_view", { mode });
  }, [mode]);

  useEffect(() => {
    const social = search.get("social");
    if (social === "unconfigured") toast.push("ورود اجتماعی در این محیط پیکربندی نشده است.", "info");
    if (social === "error") toast.push("متأسفانه ورود اجتماعی انجام نشد؛ لطفاً دوباره تلاش کنید.", "error");
  }, [search, toast]);

  // Already signed in? Go straight to the destination — login must never be a dead end.
  useEffect(() => {
    if (sessionChecked.current) return;
    sessionChecked.current = true;
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d: { ok?: boolean; name?: string; phone?: string | null; email?: string | null }) => {
        if (d.ok && d.name) {
          useStore.getState().login({ name: d.name, mobile: d.phone || d.email || "" });
          router.replace(destination());
        }
      })
      .catch(() => undefined);
  }, [router, destination]);

  // countdown ticks: OTP validity + resend gate
  useEffect(() => {
    if (secondsLeft > 0) {
      const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [secondsLeft]);
  useEffect(() => {
    if (resendIn > 0) {
      const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendIn]);

  const afterAuth = (user: { name: string; mobile?: string | null; email?: string | null }, method_: string) => {
    login({ name: user.name, mobile: user.mobile || user.email || "" });
    trackEvent(mode === "register" ? "signup_completed" : "login_success", { method: method_ });
    toast.push(mode === "register" ? "حساب هلسا شما ساخته شد؛ خوش آمدید" : "ورود با موفقیت انجام شد");
    router.push(destination());
  };

  const startOtp = async (resend = false) => {
    setErrors({});
    const phone = toEnglishDigits(identifier).trim();
    if (!/^09\d{9}$/.test(phone)) return setErrors({ identifier: "برای کد یک‌بارمصرف، شماره موبایل (09xxxxxxxxx) وارد کنید" });
    setBusy(true);
    trackEvent("otp_requested", { resend: resend ? "1" : "0" });
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrors({ identifier: authErrorMessage(res.status, data.message || "ارسال کد ممکن نشد") });
        return;
      }
      setOtpMeta({ demo: data.demo, devCode: data.devCode });
      setMethod("otp-verify");
      setDigits(Array(OTP_LENGTH).fill(""));
      const ttl = data.expiresAt ? Math.max(1, Math.round((new Date(data.expiresAt).getTime() - Date.now()) / 1000)) : 300;
      setSecondsLeft(ttl);
      setResendIn(RESEND_AFTER_SEC);
      if (!resend) toast.push(data.demo ? "ارسال پیامک پیکربندی نشده است." : "کد تأیید ارسال شد.", "info");
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch {
      setErrors({ identifier: NETWORK_ERROR });
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = useCallback(async () => {
    setErrors({});
    const code = digits.join("");
    if (code.length < OTP_LENGTH) return setErrors({ otp: "کد ۶ رقمی را کامل وارد کنید" });
    setBusy(true);
    trackEvent("login_attempt", { method: "otp" });
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: toEnglishDigits(identifier).trim(), code }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        trackEvent("login_failure", { method: "otp", reason: res.status === 429 ? "rate_limited" : res.status >= 500 ? "server" : "invalid" });
        setErrors({ otp: authErrorMessage(res.status, data.message || "کد تأیید صحیح نیست") });
        return;
      }
      setVerified(true);
      trackEvent("otp_verified", { method: "otp" });
      setTimeout(() => afterAuth({ name: data.name, mobile: data.phone, email: data.email }, "otp"), 650);
    } catch {
      trackEvent("login_failure", { method: "otp", reason: "network" });
      setErrors({ otp: NETWORK_ERROR });
    } finally {
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits, identifier]);

  // auto-submit once all six digits are in
  useEffect(() => {
    if (method === "otp-verify" && !busy && !verified && digits.every((d) => d !== "")) {
      const t = window.setTimeout(() => void verifyOtp(), 0);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  /** مرحلهٔ ۱ → ۲: اعتبارسنجی اطلاعات هویتی و رفتن به امنیت حساب */
  const goStep2 = () => {
    setErrors({});
    if (name.trim().length < 2) return setErrors({ name: "نام را کامل وارد کنید" });
    if (family.trim().length < 2) return setErrors({ family: "نام خانوادگی را کامل وارد کنید" });
    if (!/^09\d{9}$/.test(toEnglishDigits(identifier).trim())) return setErrors({ identifier: "شماره موبایل معتبر وارد کنید (09xxxxxxxxx)" });
    trackEvent("signup_step1_complete", {});
    setStep(2);
  };

  const submitPassword = async () => {
    setErrors({});
    if (mode === "login") {
      const id = toEnglishDigits(identifier).trim();
      if (!id) return setErrors({ identifier: "شماره موبایل یا ایمیل را وارد کنید" });
      // اعتبارسنجی فرمت — خطا دقیقاً زیر همان فیلد
      if (id.includes("@") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id)) return setErrors({ identifier: "ایمیل معتبر وارد کنید" });
      if (!id.includes("@") && /^0\d+$/.test(id) && !/^09\d{9}$/.test(id)) return setErrors({ identifier: "شماره موبایل معتبر نیست (09xxxxxxxxx)" });
      if (password.length < 1) return setErrors({ password: "رمز عبور را وارد کنید" });
    } else {
      if (name.trim().length < 2) { setStep(1); return setErrors({ name: "نام را کامل وارد کنید" }); }
      if (family.trim().length < 2) { setStep(1); return setErrors({ family: "نام خانوادگی را کامل وارد کنید" }); }
      if (!/^09\d{9}$/.test(toEnglishDigits(identifier).trim())) { setStep(1); return setErrors({ identifier: "شماره موبایل معتبر وارد کنید (09xxxxxxxxx)" }); }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErrors({ email: "ایمیل معتبر وارد کنید" });
      if (password.length < 8) return setErrors({ password: "رمز عبور باید حداقل ۸ کاراکتر باشد" });
      if (!accept) return setErrors({ accept: "پذیرش قوانین الزامی است" });
      trackEvent("signup_started", { method: "password" });
    }
    trackEvent("login_attempt", { method: "password" });

    setBusy(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login"
        ? { identifier: toEnglishDigits(identifier).trim(), password, remember }
        : { name: name.trim(), family: family.trim(), phone: toEnglishDigits(identifier).trim(), email: email.trim(), password };
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        trackEvent(mode === "register" ? "signup_failure" : "login_failure", { method: "password", reason: res.status === 429 ? "rate_limited" : res.status >= 500 ? "server" : res.status === 409 ? "duplicate" : "invalid" });
        const msg = authErrorMessage(res.status, data.message || "اطلاعات ورود صحیح نیست.");
        if (mode === "login") setErrors({ password: msg });
        else if (res.status === 409) { setStep(1); setErrors({ identifier: "با این شماره موبایل یا ایمیل قبلاً حساب ساخته شده است. وارد شوید یا حساب دیگری بسازید." }); }
        else { setStep(1); setErrors({ identifier: msg }); }
        return;
      }
      afterAuth({ name: data.name, mobile: data.phone, email: data.email }, "password");
    } catch {
      trackEvent(mode === "register" ? "signup_failure" : "login_failure", { method: "password", reason: "network" });
      setErrors({ password: NETWORK_ERROR });
    } finally {
      setBusy(false);
    }
  };

  const setDigit = (i: number, v: string) => {
    const d = toEnglishDigits(v).replace(/[^0-9]/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[i] = d;
      return next;
    });
    if (d && i < OTP_LENGTH - 1) otpRefs.current[i + 1]?.focus();
  };

  const pasteDigits = (e: React.ClipboardEvent<HTMLInputElement>, from: number) => {
    const text = toEnglishDigits(e.clipboardData.getData("text")).replace(/[^0-9]/g, "");
    if (!text) return;
    e.preventDefault();
    setDigits((prev) => {
      const next = [...prev];
      for (let k = 0; k < text.length && from + k < OTP_LENGTH; k++) next[from + k] = text[k];
      return next;
    });
    const last = Math.min(from + text.length - 1, OTP_LENGTH - 1);
    otpRefs.current[last]?.focus();
  };

  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const socialHref = (provider: "google" | "apple") => `/api/auth/${provider}${nextParam ? `?next=${encodeURIComponent(nextParam)}` : ""}`;
  const nextQuery = nextParam ? `?next=${encodeURIComponent(nextParam)}` : "";
  const eyeToggle = (
    <button
      type="button"
      onClick={() => setShowPassword((v) => !v)}
      aria-label={showPassword ? "پنهان‌کردن رمز عبور" : "نمایش رمز عبور"}
      aria-pressed={showPassword}
      className="absolute inset-y-0 end-0 z-10 px-3 text-muted hover:text-heading transition-colors"
    >
      {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
    </button>
  );

  return (
    <div className="grid lg:grid-cols-2 rounded-2xl overflow-hidden border border-line/70 bg-surface shadow-soft">
      <div className="relative hidden lg:block">
        { }
        <SmartImage src="/images/opt/hero-date-chocolate.jpg" alt="" sizes="(min-width:1024px) 40vw, 100vw" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-950/80 via-brand-950/25 to-transparent" aria-hidden />
        <div className="absolute bottom-0 p-10">
          <p className="text-2xl font-black text-inverse leading-snug">{mode === "login" ? "پذیرایی هلسا، از خانهٔ شما آغاز می‌شود" : "به خانواده هلسا بپیوندید"}</p>
          <p className="mt-3 text-xs text-inverse/80 leading-6 max-w-xs">
            {mode === "login" ? "سفارش‌ها، پیگیری خرید و سینی‌های مزهٔ شما همیشه در دسترس است." : "حساب هلسا، پیگیری سفارش و تجربهٔ خرید سریع‌تر را برای شما نگه می‌دارد."}
          </p>
        </div>
      </div>

      <div className="p-8 md:p-12">
        <HelsaLogo className="h-10" />
        <h2 id="auth-heading" className="mt-7 text-2xl font-black text-heading">{mode === "login" ? "ورود به حساب هلسا" : "ساخت حساب جدید"}</h2>
        <p className="mt-2 text-xs text-muted leading-6">
          {mode === "login"
            ? "برای مشاهده سفارش‌ها، پیگیری خریدها و استفاده از مزایای حساب هلسا وارد شوید."
            : "در کمتر از یک دقیقه حساب بسازید؛ سفارش‌هایتان همیشه قابل پیگیری می‌ماند."}
        </p>

        <AnimatePresence mode="wait">
          {method !== "otp-verify" ? (
            <motion.div key="form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="mt-8 space-y-4">
              {(socialEnabled.google || socialEnabled.apple) && (
                <>
                  <div className={`grid gap-3 ${socialEnabled.google && socialEnabled.apple ? "grid-cols-2" : "grid-cols-1"}`}>
                    {socialEnabled.google && (
                      <a href={socialHref("google")} className="h-11 rounded-full border border-line bg-surface text-[12.5px] font-bold text-body flex items-center justify-center gap-2 hover:border-brand-400 hover:text-heading transition-colors">
                        <GoogleIcon />
                        {mode === "login" ? "ادامه با Google" : "ثبت‌نام با Google"}
                      </a>
                    )}
                    {socialEnabled.apple && (
                      <a href={socialHref("apple")} className="h-11 rounded-full border border-line bg-surface text-[12.5px] font-bold text-body flex items-center justify-center gap-2 hover:border-brand-400 hover:text-heading transition-colors">
                        <AppleIcon />
                        {mode === "login" ? "ادامه با Apple" : "ثبت‌نام با Apple"}
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="h-px flex-1 bg-line" aria-hidden />
                    <span className="text-[11px] text-muted">یا</span>
                    <span className="h-px flex-1 bg-line" aria-hidden />
                  </div>
                </>
              )}

              {mode === "register" && (
                <div className="rounded-2xl border border-line/70 bg-surface2/60 p-4" aria-label="پیشرفت ثبت‌نام">
                  <div className="flex items-center justify-between gap-2 text-[10.5px] font-black">
                    <span className={step === 1 ? "text-brand-700" : "text-muted"}>مرحلهٔ ۱ از ۲ — اطلاعات هویتی</span>
                    <span className={step === 2 ? "text-brand-700" : "text-muted"}>مرحلهٔ ۲ از ۲ — امنیت حساب</span>
                  </div>
                  <div className="mt-2 flex gap-1.5" role="progressbar" aria-label="مرحلهٔ ثبت‌نام" aria-valuemin={1} aria-valuemax={2} aria-valuenow={step}>
                    <span className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 1 ? "bg-brand-600" : "bg-line"}`} />
                    <span className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 2 ? "bg-brand-600" : "bg-line"}`} />
                  </div>
                </div>
              )}

              {mode === "register" && step === 1 && (
                <motion.div key="reg-step-1" initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 14 }} transition={{ duration: 0.25 }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <FloatField id={`${uid}-name`} label="نام" icon={User} value={name} onChange={setName} error={errors.name} autoComplete="given-name" onEnter={goStep2} />
                    <FloatField id={`${uid}-family`} label="نام خانوادگی" icon={Users} value={family} onChange={setFamily} error={errors.family} autoComplete="family-name" onEnter={goStep2} />
                  </div>
                  <FloatField
                    id={`${uid}-phone`}
                    label="شماره موبایل"
                    icon={Smartphone}
                    value={identifier}
                    onChange={setIdentifier}
                    error={errors.identifier}
                    autoComplete="tel"
                    inputMode="tel"
                    ltr
                    onEnter={goStep2}
                    hint="شمارهٔ موبایل شما فقط برای اطلاع‌رسانی سفارش استفاده می‌شود."
                  />
                  <button onClick={goStep2} className="w-full h-12 rounded-full bg-brand-700 text-inverse text-sm font-bold hover:bg-brand-800 transition-colors flex items-center justify-center gap-2">
                    ادامه
                    <ArrowLeft className="size-4" aria-hidden />
                  </button>
                </motion.div>
              )}

              {mode === "register" && step === 2 && (
                <motion.div key="reg-step-2" initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 14 }} transition={{ duration: 0.25 }} className="space-y-4">
                  <button onClick={() => { setStep(1); setErrors({}); }} className="text-[11px] font-bold text-muted flex items-center gap-1 hover:text-brand-700 transition-colors">
                    <ArrowRight className="size-3.5" aria-hidden /> بازگشت و ویرایش اطلاعات هویتی
                  </button>
                  <FloatField id={`${uid}-email`} label="ایمیل" icon={Mail} value={email} onChange={setEmail} error={errors.email} autoComplete="email" inputMode="email" ltr onEnter={() => void submitPassword()} />
                  <div>
                    <FloatField
                      id={`${uid}-pass`}
                      label="رمز عبور"
                      icon={Lock}
                      value={password}
                      onChange={setPassword}
                      error={errors.password}
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      ltr
                      end={eyeToggle}
                      onEnter={() => void submitPassword()}
                    />
                    {password.length > 0 && (
                      <div className="mt-2 flex items-center gap-2" aria-live="polite">
                        <div className="flex gap-1 flex-1" aria-hidden>
                          {[0, 1, 2, 3].map((i) => <span key={i} className={`h-1 flex-1 rounded-full ${i < pwStrength.score ? pwStrength.color : "bg-line"}`} />)}
                        </div>
                        <span className="text-[10.5px] font-bold text-muted">{password.length >= 8 ? `قدرت رمز: ${pwStrength.label}` : "حداقل ۸ کاراکتر"}</span>
                      </div>
                    )}
                  </div>
                  <button onClick={submitPassword} disabled={busy} className="w-full h-12 rounded-full bg-brand-700 text-inverse text-sm font-bold hover:bg-brand-800 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                    {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                    ایجاد حساب هلسا
                  </button>
                  <label className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-muted leading-5 cursor-pointer">
                    <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="size-4 accent-brand-700" />
                    <span>
                      <Link href="/terms" className="text-brand-link font-bold">قوانین و مقررات</Link> و <Link href="/privacy" className="text-brand-link font-bold">حریم خصوصی</Link> هلسا را می‌پذیرم.
                    </span>
                  </label>
                  {errors.accept && <p className="text-center text-[11px] font-bold text-accent-600" role="alert">{errors.accept}</p>}
                </motion.div>
              )}

              {mode === "login" && (
                <motion.div key="login-fields" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-4">
                  <FloatField id={`${uid}-ident`} label="شماره موبایل یا ایمیل" icon={AtSign} value={identifier} onChange={setIdentifier} error={errors.identifier} autoComplete="username" ltr onEnter={() => void submitPassword()} />
                  <FloatField
                    id={`${uid}-login-pass`}
                    label="رمز عبور"
                    icon={Lock}
                    value={password}
                    onChange={setPassword}
                    error={errors.password}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    ltr
                    end={eyeToggle}
                    onEnter={() => void submitPassword()}
                  />
                  <label className="flex items-center gap-2.5 text-[11.5px] text-body cursor-pointer select-none">
                    <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-4 accent-brand-700" />
                    مرا به خاطر بسپار (ورود ۳۰ روزه)
                  </label>
                  <button onClick={submitPassword} disabled={busy} className="w-full h-12 rounded-full bg-brand-700 text-inverse text-sm font-bold hover:bg-brand-800 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                    {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                    ورود به حساب هلسا
                  </button>
                </motion.div>
              )}

              {mode === "login" && (
                <>
                  {/* ثانویه — کد یک‌بارمصرف و فراموشی رمز: هم‌سطح، متن کوچک، یک ردیف */}
                  <div className="flex items-center justify-between gap-3 border-t border-line/60 pt-3 text-[11px]">
                    <button onClick={() => { setErrors({}); void startOtp(); }} disabled={busy} className="font-bold text-muted transition-colors hover:text-brand-700 disabled:opacity-50">ورود با کد یک‌بارمصرف</button>
                    <Link href={`/forgot-password${nextQuery}`} className="font-bold text-muted transition-colors hover:text-brand-700">رمز عبور را فراموش کرده‌اید؟</Link>
                  </div>

                  {/* ثالث — ساخت حساب: فضای بصری مستقل (کارت جدا زیر فرم) */}
                  <div className="rounded-2xl border border-line/70 bg-surface2/60 p-4 text-center">
                    <p className="text-[12.5px] font-black text-heading">حساب هلسا ندارید؟</p>
                    <p className="mt-1 text-[11px] leading-5 text-muted">در کمتر از یک دقیقه حساب بسازید؛ سفارش‌هایتان همیشه قابل پیگیری می‌ماند.</p>
                    <Link href={`/register${nextQuery}`} className="mt-3 inline-flex h-11 items-center justify-center rounded-full border border-brand-600 px-6 text-[12.5px] font-bold text-brand-700 transition-colors hover:bg-brand-50">
                      ساخت حساب جدید
                    </Link>
                  </div>

                  {/* خرید مهمان — شفاف‌سازی صادقانه: بدون حساب می‌خرید؛ هویت در پرداخت تأیید می‌شود */}
                  <p className="flex items-start gap-2 text-[10.5px] leading-5 text-muted">
                    <Info className="mt-0.5 size-3.5 shrink-0 text-brand-600" aria-hidden />
                    <span>
                      <Link href={nextParam || "/checkout"} className="font-bold text-brand-link hover:text-heading">ادامه بدون ورود</Link> — خرید مهمان فعال است: نام و موبایل شما در مرحلهٔ پرداخت با کد یک‌بارمصرف تأیید می‌شود؛ به حساب نیاز نیست.
                    </span>
                  </p>
                </>
              )}
              {mode === "register" && (
                <>
                  <p className="text-[11px] text-muted">
                    حساب دارید؟ <Link href={`/login${nextQuery}`} className="font-bold text-brand-link hover:text-heading">وارد شوید</Link>
                  </p>
                  <div className="flex items-start gap-2 rounded-xl border border-gold-500/30 bg-gold-500/10 px-3 py-2.5 text-[11px] leading-5 text-heading">
                    <Gift className="size-4 shrink-0 mt-0.5 text-gold-700" aria-hidden />
                    <span>
                      هدیهٔ اولین خرید: با عضویت در <Link href="/products" className="font-bold text-brand-link">خبرنامهٔ هلسا</Link>، کد تخفیف ۲۰۰ هزار تومانی دریافت می‌کنید (کد واقعی و یک‌بارمصرف، با حداقل خرید ۱ میلیون تومان).
                    </span>
                  </div>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div key="otp" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="mt-8">
              <button onClick={() => { setMethod("password"); setErrors({}); setVerified(false); }} className="text-[11px] font-bold text-muted flex items-center gap-1 hover:text-brand-700">
                <ArrowRight className="size-3" aria-hidden /> بازگشت
              </button>
              <h2 className="mt-4 text-lg font-black text-heading">{verified ? "تأیید شد" : "کد تأیید ارسال شد"}</h2>
              <p className="mt-2 text-xs text-muted leading-6">
                {verified
                  ? "کد تأیید شد؛ در حال انتقال به حساب شما…"
                  : <>کد ۶ رقمی ارسال‌شده به <span dir="ltr" className="font-bold">{toEnglishDigits(identifier).trim()}</span> را وارد کنید.</>}
              </p>

              {!verified && (
                <>
                  <div className="mt-6 flex gap-2 justify-between" dir="ltr">
                    {digits.map((d, i) => (
                      <input
                        key={i}
                        ref={(el) => { otpRefs.current[i] = el; }}
                        value={d}
                        onChange={(e) => setDigit(i, e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Backspace" && !digits[i] && i > 0) otpRefs.current[i - 1]?.focus(); }}
                        onPaste={(e) => pasteDigits(e, i)}
                        inputMode="numeric"
                        maxLength={1}
                        disabled={secondsLeft === 0}
                        autoComplete={i === 0 ? "one-time-code" : "off"}
                        aria-label={`رقم ${i + 1}`}
                        aria-invalid={Boolean(errors.otp) || undefined}
                        className={`size-11 rounded-xl border bg-surface2 text-center text-lg font-black outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 transition-[border-color,box-shadow] ${errors.otp ? "border-accent-500" : "border-line"} ${secondsLeft === 0 ? "opacity-60" : ""}`}
                      />
                    ))}
                  </div>

                  <div aria-live="polite">
                    {errors.otp && <p className="mt-2 text-[11px] font-bold text-accent-600" role="alert">{errors.otp}</p>}
                  </div>

                  {otpMeta.demo && (
                    <p className="mt-3 rounded-xl border border-gold-500/30 bg-gold-500/10 px-3 py-2 text-[11px] leading-5 text-heading">
                      ارسال پیامک پیکربندی نشده است (SMS_PROVIDER تنظیم نیست). تا زمان اتصال سرویس پیامک، این مسیر در محیط عملیاتی قابل استفاده نیست.
                      {otpMeta.devCode ? <> محیط تست (بدون پیامک واقعی) — کد تأیید: <span dir="ltr" className="font-bold">{otpMeta.devCode}</span></> : null}
                    </p>
                  )}

                  <div className="mt-4 flex items-center justify-between text-[11px] text-muted">
                    <span className="flex items-center gap-1.5" aria-live="polite">
                      <Timer className="size-3.5" aria-hidden />
                      {secondsLeft > 0 ? <>اعتبار کد: <span dir="ltr" className="font-bold">{mmss(secondsLeft)}</span></> : "کد منقضی شده است"}
                    </span>
                    {secondsLeft === 0 ? (
                      <button onClick={() => void startOtp(true)} disabled={busy} className="font-bold text-brand-link hover:text-heading disabled:opacity-50">
                        دریافت کد جدید
                      </button>
                    ) : (
                      <span>
                        {resendIn > 0 ? <>ارسال مجدد تا <span dir="ltr" className="font-bold">{resendIn}</span> ثانیه دیگر</> : (
                          <button onClick={() => void startOtp(true)} disabled={busy} className="font-bold text-brand-link hover:text-heading disabled:opacity-50 inline-flex items-center gap-1">
                            <RotateCcw className="size-3" aria-hidden /> ارسال مجدد کد
                          </button>
                        )}
                      </span>
                    )}
                  </div>

                  <button onClick={() => void verifyOtp()} disabled={busy || verified} className="mt-6 w-full h-12 rounded-full bg-brand-700 text-inverse text-sm font-bold hover:bg-brand-800 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                    {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                    تأیید و ورود
                  </button>
                </>
              )}

              {verified && (
                <div className="mt-6 flex items-center justify-center gap-2 rounded-full border border-brand-300 bg-brand-50 px-4 py-3 text-sm font-black text-brand-800">
                  <Check className="size-4" aria-hidden /> کد تأیید شد — در حال انتقال…
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mt-6 flex items-start gap-2 text-[10.5px] leading-5 text-muted" aria-label="نکتهٔ امنیتی">
          <ShieldCheck className="size-3.5 shrink-0 mt-0.5 text-brand-600" aria-hidden />
          <span>اطلاعات ورود شما محافظت می‌شود: رمز عبور به‌صورت هش‌شده (scrypt) ذخیره می‌شود و جلسهٔ ورود در کوکی امن (HttpOnly) نگهداری می‌شود.</span>
        </p>
      </div>
    </div>
  );
}
