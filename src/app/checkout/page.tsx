"use client";
import { useEffect, useRef, useState } from "react";
import { SITE } from "@/config/site";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, User, MapPin, Truck, CreditCard, CheckCircle2, TicketPercent, ShieldCheck, BadgeCheck, CalendarClock, Smartphone, Banknote, Wallet, Loader2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { useStore, cartSubtotal, couponDiscount } from "@/lib/store";
import { SUPPORT_CONTRIBUTION, isValidContribution, supportContributionEnabled } from "@/config/support";
import { orderTotal } from "@/lib/money";
import { useToast } from "@/components/ui/Toast";
import { formatToman, faDigits } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, LinkButton } from "@/components/ui/primitives";
import { FieldLabel, Input, Select, TextArea } from "@/components/ui/controls";
import { AddressForm } from "@/components/account/shared";
import { useLang, IconForward, IconBack } from "@/lib/i18n";
import { SHIPPING_METHODS, SHIPPING_REGIONS } from "@/config/payments";
import type { PaymentMethodInfo, PaymentMethodId } from "@/config/payments";
import { isValidNationalId, toEnglishDigits, maskNationalId } from "@/lib/nid";
import type { Address } from "@/types/account";
import { TrustBadges } from "@/components/ui/TrustBadges";

const STEPS = [
  { id: 1, label: "سبد خرید", icon: ShoppingBag },
  { id: 2, label: "گیرنده", icon: User },
  { id: 3, label: "احراز هویت", icon: BadgeCheck },
  { id: 4, label: "آدرس", icon: MapPin },
  { id: 5, label: "ارسال", icon: Truck },
  { id: 6, label: "پرداخت", icon: CreditCard },
  { id: 7, label: "تأیید", icon: CheckCircle2 },
];

const METHOD_ICONS: Record<PaymentMethodId, typeof CreditCard> = {
  online: CreditCard,
  snappay: CalendarClock,
  digipay: Smartphone,
  card: CreditCard,
  cod: Banknote,
  wallet: Wallet,
};

export default function CheckoutPage() {
  useEffect(() => { trackEvent("begin_checkout"); }, []);
  const router = useRouter();
  const toast = useToast();
  const { t } = useLang();
  const { items, coupon, setCoupon, user, clearCart, addOrder, guest, setGuest, addresses, setAuthRedirect } = useStore();

  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customer, setCustomer] = useState({
    firstName: user?.name?.split(" ")[0] ?? "",
    lastName: user?.name?.split(" ")[1] ?? "",
    mobile: user?.mobile ?? "",
    email: "",
  });
  const [savedId, setSavedId] = useState(addresses.find((a) => a.default)?.id ?? addresses[0]?.id ?? "");
  const [newAddress, setNewAddress] = useState(false);
  const [manual, setManual] = useState<Omit<Address, "id"> | null>(null);
  const [shipMethod, setShipMethod] = useState(SHIPPING_METHODS.find((s) => s.enabled)?.id ?? "standard");
  const [payMethod, setPayMethod] = useState<PaymentMethodId>("online");
  // ── احراز هویت (Part A/B) ──
  const [nid, setNid] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState("");
  const [identityToken, setIdentityToken] = useState("");
  const [nidMasked, setNidMasked] = useState("");
  // §۲۰ یادداشت سفارش — داوطلبانه، حداکثر ۵۰۰ کاراکتر، به سرور می‌رسد و در orders.note ذخیره می‌شود
  const [orderNote, setOrderNote] = useState("");
  // §۲۱ گزینهٔ هدیه — داوطلبانه؛ همهٔ فیلدها واقعاً به orders می‌رسند (بدون ادعای قیمتی)
  const [isGift, setIsGift] = useState(false);
  const [giftRecipient, setGiftRecipient] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [giftPackaging, setGiftPackaging] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  // ── روش‌های پرداخت (سرور مرجع واجدین بودن است) ──
  const [methods, setMethods] = useState<PaymentMethodInfo[]>([]);
  const [placing, setPlacing] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  // مشارکت حمایتی — پیش‌فرض همیشه خاموش (قاعدهٔ سخت)
  const supportAvailable = supportContributionEnabled();
  const [supportOn, setSupportOn] = useState(false);
  const [supportAmount, setSupportAmount] = useState(0);
  const [checking, setChecking] = useState(false);

  const subtotal = cartSubtotal(items);
  const discount = couponDiscount(subtotal, coupon);
  const ship = SHIPPING_METHODS.find((s) => s.id === shipMethod)!;
  // سبد خالی = هیچ هزینه‌ای نباید نمایش یا محاسبه شود (F-01: قبلاً ۸۵٬۰۰۰ ارسال + جمع ناصفر نشان داده می‌شد)
  const shipping = items.length === 0 ? 0 : subtotal - discount >= SITE.freeShippingThreshold ? 0 : ship.fee; // منبع واحد: SITE.freeShippingThreshold
  const supportValid = !supportOn || isValidContribution(supportAmount);
  const support = supportAvailable && supportOn && isValidContribution(supportAmount) ? supportAmount : 0;
  const total = orderTotal({ subtotal, discount, shipping, support });
  const selectedAddress = manual ?? addresses.find((a) => a.id === savedId) ?? null;
  // اگر روش انتخابی واجد شرط نبود، اولین روشِ مجاز مؤثر است (state مشتق‌شده — بدون effect)
  const activePayMethod = methods.find((m) => m.id === payMethod)?.enabled
    ? payMethod
    : (methods.find((m) => m.enabled)?.id ?? payMethod);
  const payProvider = methods.find((p) => p.id === activePayMethod) ?? methods.find((p) => p.enabled);

  const setStepSafe = (n: number) => { setErrors({}); setStep((s) => Math.max(1, Math.min(7, n))); };

  // روش‌های پرداخت از سرور (وضعیت واقعی درگاه‌ها + قواعد واجدین بودن)
  useEffect(() => {
    const prov = (manual ?? addresses.find((a) => a.id === savedId))?.province ?? "";
    fetch(`/api/payments/methods?total=${total}&province=${encodeURIComponent(prov)}`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) setMethods(d.methods ?? []); })
      .catch(() => undefined);
  }, [total, savedId, manual, addresses]);

  const sendOtp = async () => {
    if (!/^09\d{9}$/.test(customer.mobile)) { toast.push("ابتدا شمارهٔ موبایل معتبر را در مرحلهٔ گیرنده وارد کنید", "error"); return; }
    setSendingOtp(true);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: customer.mobile }),
      });
      const d = (await res.json()) as { ok?: boolean; devCode?: string };
      if (d.ok) {
        setOtpSent(true);
        setDevOtpHint(d.devCode ?? "");
        toast.push("کد تأیید ارسال شد");
      } else toast.push("ارسال کد ناموفق بود", "error");
    } catch { toast.push("خطای شبکه", "error"); }
    setSendingOtp(false);
  };

  const verifyIdentity = async () => {
    setVerifying(true);
    try {
      const res = await fetch("/api/identity/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nid, mobile: customer.mobile, ...(otpSent ? { otpCode } : {}) }),
      });
      const d = (await res.json()) as { ok?: boolean; identityToken?: string; nidMasked?: string; message?: string; needOtp?: boolean };
      if (d.ok && d.identityToken) {
        setIdentityToken(d.identityToken);
        setNidMasked(d.nidMasked ?? maskNationalId(nid));
        toast.push("احراز هویت انجام شد");
      } else {
        if (d.needOtp && !otpSent) await sendOtp();
        toast.push(d.message ?? "احراز هویت ناموفق بود", "error");
      }
    } catch { toast.push("خطای شبکه", "error"); }
    setVerifying(false);
  };

  const validateStep = (n: number): boolean => {
    const e: Record<string, string> = {};
    if (n === 2) {
      if (customer.firstName.trim().length < 2) e.firstName = "نام را کامل وارد کنید";
      if (customer.lastName.trim().length < 2) e.lastName = "نام خانوادگی را کامل وارد کنید";
      if (!/^09\d{9}$/.test(customer.mobile)) e.mobile = "شماره موبایل معتبر نیست (مثال: ۰۹۱۲۳۴۵۶۷۸۹)";
      if (customer.email && !/.+@.+\..+/.test(customer.email)) e.email = "ایمیل معتبر نیست";
    }
    if (n === 3) {
      if (!identityToken) e.nid = "ابتدا احراز هویت (کد ملی و شمارهٔ تأییدشده) را کامل کنید";
      else if (!isValidNationalId(nid)) e.nid = "کد ملی معتبر نیست";
    }
    if (n === 4) {
      if (!selectedAddress || !selectedAddress.full) e.full = "آدرس ارسال را انتخاب یا وارد کنید";
      if (selectedAddress && !/^\d{10}$/.test(selectedAddress.postal ?? "")) e.postal = "کد پستی باید ۱۰ رقم باشد";
      if (selectedAddress && selectedAddress.phone && !/^09\d{9}$/.test(selectedAddress.phone)) e.phone = "شماره تماس معتبر نیست";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const applyCoupon = async () => {
    if (!codeInput.trim()) return;
    setChecking(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codeInput.trim(), subtotal }),
      });
      const data = (await res.json()) as { ok: boolean; message: string; coupon?: typeof coupon };
      if (data.ok && data.coupon) { setCoupon(data.coupon); toast.push("کد تخفیف با موفقیت اعمال شد"); }
      else {
        if (!data.ok && /حداقل|اعتبار|معتبر/.test(data.message)) toast.push(data.message, "error");
        else toast.push("کد تخفیف معتبر نیست", "error");
      }
    } catch {
      toast.push("متأسفانه مشکلی پیش آمده است؛ دوباره تلاش کنید", "error");
    }
    setChecking(false);
  };

  /** stable per-attempt idempotency key — makes double-click / network retry safe */
  const idemKey = useRef<string | null>(null);

  const placeOrder = async () => {
    if (!validateStep(4)) return;
    if (!identityToken) { toast.push("ابتدا احراز هویت را کامل کنید", "error"); setStepSafe(3); return; }
    if (!payProvider?.enabled) { toast.push("روش پرداخت انتخاب‌شده در دسترس نیست", "error"); setStepSafe(6); return; }
    if (!idemKey.current) idemKey.current = crypto.randomUUID();
    setPlacing(true);
    const addressPayload: Address = (manual ?? addresses.find((a) => a.id === savedId)) as Address;
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer,
          address: addressPayload,
          items: items.map((i) => ({ key: i.key, qty: i.qty, name: i.name, price: i.price, image: i.image, weight: i.weight, meta: i.meta })),
          subtotal, discount, shipping, total, supportContribution: support, couponCode: coupon?.code ?? null,
          shippingMethod: shipMethod, paymentMethod: payProvider.id,
          note: orderNote.trim() || null,
          isGift,
          giftRecipient: isGift ? giftRecipient.trim() || null : null,
          giftMessage: isGift ? giftMessage.trim() || null : null,
          giftPackaging: isGift && giftPackaging,
          identityToken,
          idempotencyKey: idemKey.current,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean; code?: string; payState?: string; message?: string;
        subtotal?: number; discount?: number; shipping?: number; total?: number; supportContribution?: number;
        items?: Array<{ key: string; name: string; unitPrice: number; quantity: number; metadata: Record<string, unknown> }>;
      };
      if (data.ok && data.code) {
        addOrder({
          code: data.code,
          total: data.total ?? total,
          date: new Date().toISOString(),
          items: (data.items ?? []).map((serverItem) => {
            const local = items.find((item) => item.key === serverItem.key);
            return { key: serverItem.key, name: serverItem.name, price: serverItem.unitPrice, qty: serverItem.quantity, image: local?.image ?? "/images/opt/hero-nuts-dried-fruits.jpg", weight: String(serverItem.metadata.weight ?? local?.weight ?? ""), meta: local?.meta };
          }),
          customer,
          address: addressPayload,
          note: orderNote.trim() || undefined,
          isGift,
          giftRecipient: isGift ? giftRecipient.trim() || undefined : undefined,
          giftMessage: isGift ? giftMessage.trim() || undefined : undefined,
          giftPackaging: isGift && giftPackaging,
          subtotal: data.subtotal ?? subtotal,
          supportContribution: data.supportContribution ?? support,
          discount: data.discount ?? discount,
          shipping: data.shipping ?? shipping,
          couponCode: coupon?.code ?? null,
          shippingMethod: ship.label,
          paymentMethod: payProvider.id,
          payState: data.payState === "pend" ? "pending" : (data.payState as never) ?? "pending",
          status: "pending",
        });
        clearCart();
        idemKey.current = null; // next checkout = genuinely new order
        toast.push("سفارش شما ثبت شد");
        // route based on honest pay state (never faked)
        if (payProvider.id === "online" || payProvider.id === "snappay" || payProvider.id === "digipay") {
          router.push(`/payment?code=${encodeURIComponent(data.code)}&amount=${total}`);
        } else if (payProvider.id === "card") {
          router.push(`/payment/card?code=${encodeURIComponent(data.code)}`);
        } else {
          router.push(`/payment/success?code=${encodeURIComponent(data.code)}&state=pending`);
        }
      } else {
        trackEvent("checkout_error", { reason: "server" });
        toast.push(data.message ?? "متأسفانه مشکلی پیش آمده است؛ دوباره تلاش کنید", "error");
      }
    } catch {
      trackEvent("checkout_error", { reason: "network" });
      toast.push("متأسفانه مشکلی پیش آمده است؛ دوباره تلاش کنید", "error");
    }
    setPlacing(false);
  };

  const renderStepper = () => (
    <ol className="flex items-center gap-1 md:gap-2 overflow-x-auto no-scrollbar pb-2" aria-label="مراحل ثبت سفارش">
      {STEPS.map((s, i) => {
        const state = step === s.id ? "current" : step > s.id ? "done" : "todo";
        return (
          <li key={s.id} className="flex items-center gap-1 md:gap-2 shrink-0">
            <button
              onClick={() => state === "done" && setStepSafe(s.id)}
              className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-[11px] md:text-xs font-bold transition-colors ${state === "current" ? "bg-brand-700 text-inverse shadow-soft" : state === "done" ? "bg-brand-50 text-brand-700" : "bg-surface2 text-muted"}`}
              aria-current={state === "current" ? "step" : undefined}
            >
              <s.icon className="size-3.5" aria-hidden />
              <span className="hidden sm:inline">{faDigits(s.id)}. {t(("checkout.s" + s.id) as never)}</span>
              <span className="sm:hidden">{faDigits(s.id)}</span>
            </button>
            {i < STEPS.length - 1 && <span className="w-3 md:w-6 h-px bg-line" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );

  const panel = "rounded-2xl border border-line bg-surface p-6 md:p-8";

  // ═══ حالت سبد خالی (F-01) — بدون آیتم، صفحهٔ ثبت سفارش معنا ندارد:
  // جمع صفر، ارسال صفر، هیچ مسیری به پرداخت. سرور هم از قبل items>=1 را اجباری می‌کند (zod min(1)).
  if (items.length === 0) {
    return (
      <>
        <PageHeader title="ثبت سفارش" desc="سبد خرید شما خالی است" crumbs={[{ label: "خانه", href: "/" }, { label: "ثبت سفارش", href: "/checkout" }]} />
        <div className="container-x py-20 flex flex-col items-center gap-5 text-center">
          <div className="grid size-16 place-items-center rounded-full bg-surface2">
            <ShoppingBag className="size-7 text-muted" aria-hidden />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-black text-heading">سبد خرید شما خالی است</h2>
            <p className="max-w-sm text-sm leading-6 text-muted">برای ثبت سفارش، ابتدا محصولی به سبد خرید اضافه کنید. هزینهٔ ارسال فقط برای سبدهای دارای کالا محاسبه می‌شود.</p>
          </div>
          <LinkButton href="/products">رفتن به فروشگاه</LinkButton>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="ثبت سفارش" desc="شش گام ساده تا رسیدن طعم طبیعت به خانه شما" crumbs={[{ label: "خانه", href: "/" }, { label: "ثبت سفارش", href: "/checkout" }]} />
      <div className="container-x py-12 grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
        <div className="lg:col-span-2 min-w-0">
          {renderStepper()}
          <div className={`mt-6 ${panel}`}>
            {/* guest toggle */}
            {step === 1 && (
              <>
                <div className="mb-6 rounded-2xl border border-brand-200 bg-brand-50 p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-heading">خرید بدون ثبت‌نام</p>
                    <p className="text-[11px] text-muted mt-0.5">می‌توانید بدون ساخت حساب خرید کنید؛ در پایان می‌توانید حساب بسازید.</p>
                  </div>
                  <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${guest ? "bg-brand-700" : "bg-line"}`}>
                    <button aria-label="خرید بدون ثبت‌نام" aria-pressed={guest} onClick={() => setGuest(!guest)} className={`absolute size-5 rounded-full bg-surface shadow transition-transform ${guest ? "start-1.5" : "start-[22px]"}`} />
                  </span>
                </div>
                <h2 className="text-base font-black text-heading mb-4">مرور سبد خرید</h2>
                <ul className="divide-y divide-line-soft">
                  {items.map((i) => (
                    <li key={i.key} className="flex items-center gap-4 py-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={i.image} alt={i.name} className="size-16 rounded-xl object-cover border border-line/70" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate text-heading">{i.name}</p>
                        <p className="text-[11px] text-muted mt-0.5">{i.weight ?? i.meta}</p>
                      </div>
                      <span className="text-sm font-extrabold text-heading shrink-0">{formatToman(i.price * i.qty)}</span>
                    </li>
                  ))}
                </ul>
                {coupon && <p className="mt-4 rounded-xl bg-brand-50 border border-brand-200 p-3 text-[11px] font-bold text-brand-700">کد تخفیف {coupon.code} اعمال شد — {coupon.label}</p>}
                {!user && (
                  <p className="mt-4 flex flex-wrap items-center gap-1 text-[11px] text-muted">
                    حساب کاربری دارید؟
                    <button onClick={() => { setAuthRedirect("/checkout"); toast.push("برای ادامه، وارد شوید؛ پس از ورود به خرید بازمی‌گردید", "info"); router.push("/login"); }} className="font-bold text-brand-700 hover:text-brand-800">وارد شوید</button>
                    یا
                    <button onClick={() => { setAuthRedirect("/checkout"); router.push("/register"); }} className="font-bold text-brand-700 hover:text-brand-800">ثبت‌نام کنید</button>.
                  </p>
                )}
              </>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-base font-black text-heading">اطلاعات گیرنده</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <FieldLabel text="نام" error={errors.firstName}><Input value={customer.firstName} onChange={(e) => setCustomer({ ...customer, firstName: e.target.value })} placeholder="سارا" /></FieldLabel>
                  <FieldLabel text="نام خانوادگی" error={errors.lastName}><Input value={customer.lastName} onChange={(e) => setCustomer({ ...customer, lastName: e.target.value })} placeholder="محمدی" /></FieldLabel>
                  <FieldLabel text="شماره موبایل" error={errors.mobile}><Input value={customer.mobile} onChange={(e) => setCustomer({ ...customer, mobile: e.target.value.replace(/[^\d]/g, "") })} placeholder="۰۹۱۲۳۴۵۶۷۸۹" dir="ltr" inputMode="numeric" /></FieldLabel>
                  <FieldLabel text="ایمیل (اختیاری)" error={errors.email}><Input value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} placeholder="you@example.com" dir="ltr" /></FieldLabel>
                </div>
                {/* invoice info — optional */}
                <div className="rounded-2xl border border-line-soft bg-surface2 p-4">
                  <p className="text-xs font-bold text-heading mb-2">اطلاعات فاکتور (اختیاری)</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <FieldLabel text="کد ملی" hint="اختیاری"><Input placeholder="۱۰ رقم" dir="ltr" inputMode="numeric" /></FieldLabel>
                    <FieldLabel text="شناسه / اطلاعات حقوقی" hint="حقوقی"><Input placeholder="در صورت خرید سازمانی" /></FieldLabel>
                  </div>
                </div>
              </div>
            )}

                        {step === 3 && (
              <div>
                <h2 className="text-base font-black text-heading mb-1">احراز هویت</h2>
                <p className="mb-4 text-[11px] text-muted leading-5">برای ثبت سفارش، کد ملی و مالکیت شمارهٔ موبایل شما بررسی می‌شود. اطلاعات هویتی فقط در سفارش شما ذخیره می‌شود و هرگز در لاگ‌ها ثبت نمی‌گردد.</p>

                {identityToken ? (
                  <div className="rounded-2xl border border-brand-300 bg-brand-50 p-5">
                    <p className="flex items-center gap-2 text-sm font-black text-brand-800">
                      <BadgeCheck className="size-5" aria-hidden />
                      احراز هویت انجام شد
                    </p>
                    <p className="mt-2 text-xs text-brand-700 leading-6">
                      کد ملی <span dir="ltr">{nidMasked}</span> — موبایل تأییدشده <span dir="ltr">{faDigits(customer.mobile)}</span>
                    </p>
                    <button onClick={() => { setIdentityToken(""); setOtpSent(false); setOtpCode(""); }} className="mt-3 text-[11px] font-bold text-brand-700 underline underline-offset-4">
                      ویرایش اطلاعات احراز
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <FieldLabel text="کد ملی (۱۰ رقم)" error={errors.nid}>
                        <Input
                          value={nid}
                          onChange={(e) => setNid(toEnglishDigits(e.target.value).replace(/\D/g, "").slice(0, 10))}
                          placeholder="۱۲۳۴۵۶۷۸۹۰"
                          dir="ltr"
                          inputMode="numeric"
                        />
                      </FieldLabel>
                      {nid.length === 10 && !isValidNationalId(nid) && (
                        <p className="mt-1.5 text-[11px] font-bold text-accent-600">رقم کنترل کد ملی معتبر نیست؛ ورودی را بازبینی کنید.</p>
                      )}
                    </div>
                    <div className="rounded-xl bg-surface2 border border-line-soft p-3.5 text-[11px] text-muted leading-5">
                      شمارهٔ موبایلِ احراز: <span dir="ltr" className="font-bold text-heading">{faDigits(customer.mobile) || "—"}</span>
                      {user?.mobile
                        ? " (شمارهٔ حساب کاربری شما — طبق قواعد امنیتی، تغییر آن در پرداخت ممکن نیست)"
                        : " (مهمان: مالکیت شماره با کد یک‌بارمصرف تأیید می‌شود)"}
                    </div>
                    {!user?.mobile && (
                      <div className="space-y-3">
                        {!otpSent ? (
                          <Button variant="outline" onClick={sendOtp} disabled={sendingOtp || !/^09\d{9}$/.test(customer.mobile)}>
                            {sendingOtp ? "..." : "ارسال کد تأیید به موبایل"}
                          </Button>
                        ) : (
                          <>
                            <FieldLabel text="کد تأیید (۶ رقم)">
                              <Input value={otpCode} onChange={(e) => setOtpCode(toEnglishDigits(e.target.value).replace(/\D/g, "").slice(0, 6))} placeholder="------" dir="ltr" inputMode="numeric" />
                            </FieldLabel>
                            {devOtpHint && <p className="rounded-xl border border-dashed border-gold-400/60 bg-gold-50 p-2.5 text-[11px] font-bold text-gold-700">محیط تست (بدون پیامک واقعی) — کد تأیید: <span dir="ltr">{devOtpHint}</span></p>}
                            <button onClick={sendOtp} disabled={sendingOtp} className="text-[11px] font-bold text-brand-700 underline underline-offset-4">ارسال دوبارهٔ کد</button>
                          </>
                        )}
                      </div>
                    )}
                    <Button onClick={verifyIdentity} disabled={verifying || nid.length !== 10 || (!user?.mobile && !otpSent)}>
                      {verifying ? "..." : "تأیید و ادامه"}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {step === 4 && (
              <div>
                <h2 className="text-base font-black text-heading mb-4">آدرس ارسال</h2>
                {addresses.length > 0 && !newAddress && (
                  <div className="space-y-2 mb-4">
                    {addresses.map((a) => (
                      <label key={a.id} className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition-colors ${savedId === a.id && !manual ? "border-brand-600 bg-brand-50" : "border-line"}`}>
                        <input type="radio" name="addr" checked={savedId === a.id && !manual} onChange={() => { setSavedId(a.id); setManual(null); }} className="mt-1 size-4 accent-brand-600" />
                        <span className="flex-1">
                          <span className="text-sm font-bold text-heading">{a.recipient} {a.default && <span className="text-[10px] text-brand-600 font-bold">(پیش‌فرض)</span>}</span>
                          <span className="block text-xs text-muted mt-0.5">{a.province}، {a.city}، {a.full} · {a.postal}</span>
                        </span>
                      </label>
                    ))}
                    <Button size="sm" variant="outline" onClick={() => setNewAddress(true)}>+ افزودن آدرس جدید</Button>
                  </div>
                )}
                {(newAddress || addresses.length === 0) && (
                  <div className="rounded-2xl border border-line-soft p-4">
                    <AddressForm
                      onCancel={() => setNewAddress(false)}
                      onSave={(a) => {
                        setManual(a);
                        setNewAddress(false);
                        toast.push("آدرس انتخاب شد");
                      }}
                    />
                  </div>
                )}
                {errors.full && <p className="mt-2 text-[11px] font-bold text-accent-600">{errors.full}</p>}
                {errors.postal && <p className="mt-1 text-[11px] font-bold text-accent-600">{errors.postal}</p>}
              </div>
            )}

            {step === 5 && (
              <div>
                <h2 className="text-base font-black text-heading mb-4">روش ارسال</h2>
                <div className="space-y-3">
                  {SHIPPING_METHODS.filter((m) => m.enabled).map((m) => (
                    <label key={m.id} className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition-colors ${shipMethod === m.id ? "border-brand-600 bg-brand-50" : "border-line hover:border-brand-300"}`}>
                      <input type="radio" name="ship" checked={shipMethod === m.id} onChange={() => setShipMethod(m.id)} className="mt-1 size-4 accent-brand-600" />
                      <span className="flex-1">
                        <span className="flex items-center justify-between text-sm font-bold text-heading">
                          {m.label}
                          <span className="text-xs text-muted">{m.fee ? formatToman(m.fee) : "رایگان"}</span>
                        </span>
                        <span className="block mt-1 text-[11px] text-muted">زمان تقریبی: {m.eta}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {step === 6 && (
              <div>
                <h2 className="text-base font-black text-heading mb-4">روش پرداخت</h2>
                {!methods.length ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface p-5 text-xs text-muted">
                    <Loader2 className="size-4 animate-spin" aria-hidden /> در حال دریافت روش‌های پرداخت…
                  </div>
                ) : (
                  <div className="space-y-3">
                    {methods.map((p) => {
                      const Icon = METHOD_ICONS[p.id] ?? CreditCard;
                      const disabled = !p.enabled;
                      return (
                        <label
                          key={p.id}
                          className={`flex items-start gap-3 rounded-2xl border p-4 transition-colors ${disabled ? "border-line-soft bg-surface2/50 cursor-not-allowed opacity-70" : payMethod === p.id ? "border-brand-600 bg-brand-50 cursor-pointer" : "border-line cursor-pointer hover:border-brand-300"}`}
                        >
                          <input
                            type="radio"
                            name="pay"
                            checked={activePayMethod === p.id}
                            onChange={() => !disabled && setPayMethod(p.id)}
                            disabled={disabled}
                            className="mt-1 size-4 accent-brand-600"
                          />
                          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-700/10 text-brand-700"><Icon className="size-5" aria-hidden /></span>
                          <span className="flex-1">
                            <span className="flex items-center justify-between gap-2 text-sm font-bold text-heading">
                              {p.label}
                              <span className="text-[10.5px] font-bold text-muted">{p.mode === "future" ? "به‌زودی" : p.short}</span>
                            </span>
                            <span className="mt-1 block text-[11px] leading-5 text-muted">{p.note}</span>
                            {disabled && p.disabledReason && (
                              <span className="mt-1.5 inline-block rounded-full bg-surface3/70 px-2.5 py-1 text-[10px] font-bold text-muted">{p.disabledReason}</span>
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
                <p className="mt-4 rounded-xl bg-surface2 border border-line-soft p-4 text-[11px] text-muted leading-6 flex gap-2">
                  <ShieldCheck className="size-4 shrink-0 mt-0.5 text-brand-600" aria-hidden />
                  تأیید پرداخت به‌صورت امن در سرور هلسا انجام می‌شود؛ هیچ تراکنشی بدون بررسی سروری موفق تلقی نمی‌شود.
                </p>
              </div>
            )}

            {step === 7 && (
              <div>
                <h2 className="text-base font-black text-heading mb-4">خلاصه و تأیید سفارش</h2>
                <ul className="divide-y divide-line-soft">
                  {items.map((i) => (
                    <li key={i.key} className="flex items-center gap-4 py-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={i.image} alt={i.name} className="size-14 rounded-xl object-cover border border-line/70" />
                      <span className="flex-1 text-sm font-bold text-heading">{i.name} <span className="text-muted font-normal">× {faDigits(i.qty)}</span></span>
                      <span className="text-sm font-bold text-heading">{formatToman(i.price * i.qty)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 rounded-2xl bg-surface2 border border-line-soft p-4 text-xs text-muted space-y-1.5">
                  <p><span className="font-bold text-heading">گیرنده:</span> {customer.firstName} {customer.lastName} — <span dir="ltr">{customer.mobile}</span></p>
                  {selectedAddress && <p><span className="font-bold text-heading">آدرس:</span> {selectedAddress.province}، {selectedAddress.city}، {selectedAddress.full}</p>}
                  <p><span className="font-bold text-heading">ارسال:</span> {SHIPPING_METHODS.find((s) => s.id === shipMethod)?.label}</p>
                  <p><span className="font-bold text-heading">پرداخت:</span> {payProvider?.label ?? "—"}</p>
                </div>
              </div>
            )}

            {/* نشان‌های اعتماد (فقط با کد رسمی از env) */}
            <div className="mt-6">
              <TrustBadges tone="light" />
            </div>

            {/* coupon field kept visible on summary steps */}
            {(step === 1 || step === 6) && (
              <div className="mt-6 pt-6 border-t border-line-soft">
                <p className="text-xs font-bold text-heading flex items-center gap-1.5 mb-2"><TicketPercent className="size-4 text-gold-700" aria-hidden /> کد تخفیف دارید؟</p>
                <div className="flex gap-2">
                  <Input value={codeInput} onChange={(e) => setCodeInput(e.target.value.toUpperCase())} placeholder="HELSA10" dir="ltr" className="font-bold tracking-widest" />
                  <Button variant="outline" size="md" onClick={applyCoupon} disabled={checking}>{checking ? "..." : "اعمال"}</Button>
                </div>
                {coupon && <p className="mt-2 text-[11px] font-bold text-brand-700 flex items-center justify-between"><span>کد {coupon.code} اعمال شد — {coupon.label}</span><button className="text-muted hover:text-accent-600" onClick={() => setCoupon(null)}>حذف</button></p>}
              </div>
            )}

            {step < 7 && (
              <div className="mt-8 flex items-center justify-between">
                <button onClick={() => setStepSafe(step - 1)} disabled={step === 1} className="h-11 px-5 rounded-full border border-line text-sm font-bold text-heading inline-flex items-center gap-2 hover:bg-surface2 disabled:opacity-40 transition-colors">
                  <IconBack className="size-4" /> {t("checkout.back")}
                </button>
                <button
                  onClick={() => { if (!validateStep(step)) return; setStepSafe(step + 1); }}
                  disabled={step === 1 && items.length === 0}
                  className="h-11 px-7 rounded-full bg-brand-700 text-inverse text-sm font-bold inline-flex items-center gap-2 hover:bg-brand-800 disabled:opacity-40 transition-colors"
                >
                  {t("checkout.next")} <IconForward className="size-4" />
                </button>
              </div>
            )}
            {step === 7 && (
              <div className="mt-8">
                <FieldLabel text="یادداشت سفارش (اختیاری)" hint="مثلاً: لطفاً برای هدیه ارسال شود.">
                  <TextArea
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value.slice(0, 500))}
                    placeholder="مثلاً: لطفاً برای هدیه ارسال شود."
                    rows={3}
                    aria-label="یادداشت سفارش"
                  />
                </FieldLabel>
                <p className="mt-1.5 text-[10.5px] text-muted">یادداشت شما همراه سفارش برای تیم هلسا ذخیره می‌شود.</p>
                {/* §۲۱ گزینهٔ هدیه — فیلدها واقعاً به سیستم سفارش می‌رسند؛ بدون ادعای قیمتی */}
                <label className="mt-4 flex items-center gap-2 text-sm font-bold text-heading cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isGift}
                    onChange={(e) => setIsGift(e.target.checked)}
                    className="size-4 accent-brand-600"
                    aria-label="این سفارش هدیه است"
                  />
                  این سفارش هدیه است
                </label>
                {isGift && (
                  <div className="mt-3 grid sm:grid-cols-2 gap-4 rounded-2xl border border-line-soft bg-surface2/60 p-4">
                    <FieldLabel text="نام گیرندهٔ هدیه (اختیاری)">
                      <Input
                        value={giftRecipient}
                        onChange={(e) => setGiftRecipient(e.target.value.slice(0, 120))}
                        placeholder="مثلاً: خانم محمدی"
                        aria-label="نام گیرندهٔ هدیه"
                      />
                    </FieldLabel>
                    <FieldLabel text="پیام هدیه (اختیاری)">
                      <Input
                        value={giftMessage}
                        onChange={(e) => setGiftMessage(e.target.value.slice(0, 300))}
                        placeholder="مثلاً: تبریک سالگرد از طرف ما"
                        aria-label="پیام هدیه"
                      />
                    </FieldLabel>
                    <label className="flex items-center gap-2 text-xs font-bold text-heading cursor-pointer sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={giftPackaging}
                        onChange={(e) => setGiftPackaging(e.target.checked)}
                        className="size-4 accent-brand-600"
                        aria-label="درخواست بسته‌بندی هدیه"
                      />
                      درخواست بسته‌بندی هدیه
                    </label>
                    <p className="text-[10.5px] text-muted leading-5 sm:col-span-2">
                      اطلاعات هدیه همراه سفارش برای تیم هلسا ذخیره می‌شود و در آماده‌سازی لحاظ می‌گردد.
                    </p>
                  </div>
                )}
                <button
                  onClick={placeOrder}
                  disabled={placing || !payProvider?.enabled}
                  className="w-full h-12 rounded-full bg-brand-700 text-inverse text-sm font-bold hover:bg-brand-800 disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2"
                >
                  {placing ? "..." : payProvider && ["online", "snappay", "digipay"].includes(payProvider.id) ? t("checkout.pay") : t("checkout.place")}
                </button>
                <p className="mt-3 text-center text-[10.5px] text-muted">با کلیک روی این دکمه، فرآیند پرداخت (در صورت پرداخت آنلاین) آغاز می‌شود.</p>
              </div>
            )}
          </div>
        </div>

        {/* summary */}
        <aside className="min-w-0 rounded-2xl border border-line bg-surface p-7 lg:sticky lg:top-28">
          <h2 className="text-base font-black text-heading">{t("checkout.summary")}</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-muted">{t("cart.subtotal")}</dt><dd className="font-bold">{formatToman(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">تخفیف {coupon ? `(${coupon.code})` : ""}</dt><dd className="font-bold text-accent-600">{discount ? formatToman(discount) : "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">{t("cart.shipping")}</dt><dd className="font-bold">{shipping === 0 ? "رایگان" : formatToman(shipping)}</dd></div>
          </dl>

          {/* مشارکت حمایتی داوطلبانه — پیش‌فرض خاموش؛ حذفش سبد را دست نمی‌زند */}
          {supportAvailable && items.length > 0 && (
            <div className="mt-5 rounded-xl border border-line-soft bg-surface2 p-3.5">
              <label className="flex cursor-pointer items-start gap-2.5 text-[11px] leading-6">
                <input type="checkbox" checked={supportOn}
                  onChange={(e) => { setSupportOn(e.target.checked); if (e.target.checked && supportAmount === 0) setSupportAmount(SUPPORT_CONTRIBUTION.presets[0]); }}
                  className="mt-1 size-4 shrink-0 accent-brand-600" />
                <span>
                  <span className="block font-black text-heading">مشارکت داوطلبانه در حمایت از تولیدکنندگان</span>
                  <span className="block text-muted">اختیاری و پیش‌فرض خاموش. مبلغ مشارکت جدا از قیمت کالاها ثبت می‌شود و با برداشتن تیک، سبد شما دست‌نخورده می‌ماند.</span>
                </span>
              </label>
              {supportOn && (
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {SUPPORT_CONTRIBUTION.presets.map((preset) => (
                      <button key={preset} type="button" onClick={() => setSupportAmount(preset)}
                        className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold ${supportAmount === preset ? "border-brand-600 bg-brand-50 text-brand-800" : "border-line bg-surface text-muted hover:border-brand-300"}`}>
                        {formatToman(preset)}
                      </button>
                    ))}
                    <button type="button" onClick={() => { setSupportOn(false); setSupportAmount(0); }} className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11px] font-bold text-muted">حذف مشارکت</button>
                  </div>
                  <label className="block text-[10.5px]">
                    <span className="mb-1 block font-bold text-heading">یا مبلغ دلخواه (تومان)</span>
                    <input inputMode="numeric" value={supportAmount || ""}
                      onChange={(e) => setSupportAmount(Number(e.target.value.replace(/[^\d۰-۹]/g, "").replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))) || 0)}
                      className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-heading outline-none focus:border-brand-500"
                      placeholder={`حداقل ${formatToman(SUPPORT_CONTRIBUTION.min)}`} />
                  </label>
                  {!supportValid && (
                    <p className="text-[10.5px] font-bold text-accent-600">
                      مبلغ مشارکت باید بین {formatToman(SUPPORT_CONTRIBUTION.min)} و {formatToman(SUPPORT_CONTRIBUTION.max)} باشد؛ تا اصلاح آن در جمع سفارش لحاظ نمی‌شود.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between border-t border-line-soft pt-3 text-base"><dt className="font-black text-heading">{t("checkout.payable")}</dt><dd className="font-black text-brand-700">{formatToman(total)}</dd></div>
          </dl>
          <div className="mt-6">
            <LinkButton href="/cart" variant="outline" size="sm" className="w-full">مشاهده سبد</LinkButton>
          </div>
        </aside>
      </div>
    </>
  );
}
