import { SHIPPING } from "./shipping";
/**
 * HELSA — shipping & payment configuration (Iran).
 * تمام مقادیر REAL هستند: یک درگاه فقط وقتی ارائه می‌شود که متغیرهایش
 * تنظیم شده باشد (یا حالت sandbox صریح برای توسعه).
 *
 * حالت امن توسعه: PAYMENTS_SANDBOX=1
 *   → درگاه «شبیه‌ساز» جای زرین‌پال/اسنپ‌پی/دیجی‌پی می‌نشیند؛
 *     کل خط لوله (callback، verify، دفتر فاکتور، جلوگیری از دوباره‌پرداخت)
 *     واقعی است و فقط «درگاه بیرونی» شبیه‌سازی می‌شود.
 *   ⚠️ هرگز روی سرور واقعی تنظیم نشود.
 * سوییچ به درگاه واقعی = فقط env (بدون تغییر کد):
 *   GATEWAY_PROVIDER=zarinpal + GATEWAY_API_KEY={merchant_id}
 *   SNAP_PAY_API_KEY=… / DIGIPAY_API_KEY=…
 */

export type PaymentMethodId = "online" | "snappay" | "digipay" | "card" | "cod" | "wallet";
export type PayState = "pending" | "success" | "failed" | "cancelled" | "unconfigured";

export interface PaymentMethodInfo {
  id: PaymentMethodId;
  label: string;
  short: string;
  /** auto = تأیید آنلاین سرور-به-سرور | manual = تأیید کارمند | future = معماری آماده */
  mode: "auto" | "manual" | "future";
  note: string;
  /** فقط وقتی true است در UI فعال است */
  enabled: boolean;
  /** دلیل غیرفعالی — برای نمایش صادقانه در UI */
  disabledReason?: string;
}

/* ————————————— وضعیت درگاه‌ها (فقط از env، هرگز جعل نمی‌شود) ————————————— */

export function paymentsSandbox(): boolean {
  return process.env.PAYMENTS_SANDBOX === "1";
}

export function onlineGatewayEnabled(): boolean {
  if (process.env.GATEWAY_PROVIDER && process.env.GATEWAY_API_KEY) return true;
  return paymentsSandbox();
}

export function snapPayEnabled(): boolean {
  if (process.env.SNAP_PAY_API_KEY) return true;
  return paymentsSandbox();
}

export function digiPayEnabled(): boolean {
  if (process.env.DIGIPAY_API_KEY) return true;
  return paymentsSandbox();
}

/* ————————————— قواعد COD ————————————— */

export function codEnabled(): boolean {
  return (process.env.COD_ENABLED ?? "1") === "1";
}

/** استان‌های مجاز COD — خالی یعنی همهٔ استان‌ها */
export function codProvinces(): string[] {
  return (process.env.COD_PROVINCES ?? "تهران")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function codMaxAmount(): number {
  return Number(process.env.COD_MAX_AMOUNT ?? 10_000_000) || 10_000_000;
}

/* ————————————— سقف‌های اقساط/دیجی‌پی ————————————— */

export function snapPayLimits(): { min: number; max: number } {
  return {
    min: Number(process.env.SNAP_PAY_MIN ?? 500_000) || 500_000,
    max: Number(process.env.SNAP_PAY_MAX ?? 50_000_000) || 50_000_000,
  };
}

export function digiPayMaxAmount(): number {
  return Number(process.env.DIGIPAY_MAX ?? 20_000_000) || 20_000_000;
}

/* ————————————— واجدین بودن (سرور مرجع است؛ این تابع برای UI و API) ————————————— */

export interface EligibilityCtx {
  total: number;
  province?: string | null;
  nidVerified?: boolean;
}

export function methodEligibility(method: PaymentMethodId, ctx: EligibilityCtx): { ok: boolean; reason?: string } {
  switch (method) {
    case "online":
      return onlineGatewayEnabled()
        ? { ok: true }
        : { ok: false, reason: "درگاه آنلاین (شاپرک) پیکربندی نشده است." };
    case "snappay": {
      if (!snapPayEnabled()) return { ok: false, reason: "اسنپ‌پی فعال نیست." };
      const { min, max } = snapPayLimits();
      if (ctx.total < min) return { ok: false, reason: `خرید اقساطی از ${min.toLocaleString("fa-IR")} تومان ممکن است.` };
      if (ctx.total > max) return { ok: false, reason: `سقف خرید اقساطی ${max.toLocaleString("fa-IR")} تومان است.` };
      if (!ctx.nidVerified) return { ok: false, reason: "برای پرداخت اقساطی، احراز هویت کد ملی الزامی است." };
      return { ok: true };
    }
    case "digipay": {
      if (!digiPayEnabled()) return { ok: false, reason: "دیجی‌پی فعال نیست." };
      if (ctx.total > digiPayMaxAmount()) return { ok: false, reason: `سقف پرداخت دیجی‌پی ${digiPayMaxAmount().toLocaleString("fa-IR")} تومان است.` };
      return { ok: true };
    }
    case "cod": {
      if (!codEnabled()) return { ok: false, reason: "پرداخت در محل موقتاً غیرفعال است." };
      const provs = codProvinces();
      if (provs.length && ctx.province && !provs.includes(ctx.province.trim())) {
        return { ok: false, reason: `پرداخت در محل فقط برای ${provs.join(" و ")} فعال است.` };
      }
      if (ctx.total > codMaxAmount()) return { ok: false, reason: `سقف پرداخت در محل ${codMaxAmount().toLocaleString("fa-IR")} تومان است.` };
      return { ok: true };
    }
    case "card":
      return { ok: true };
    case "wallet":
      return { ok: false, reason: "کیف پول هلسا به‌زودی؛ معماری آماده است." };
  }
}

/** لیست روش‌ها برای UI (وضعیت enabled با ctx محاسبه می‌شود) */
export function paymentMethodsFor(ctx: EligibilityCtx): PaymentMethodInfo[] {
  const base: Omit<PaymentMethodInfo, "enabled" | "disabledReason">[] = [
    {
      id: "online",
      label: "پرداخت آنلاین (شاپرک)",
      short: "درگاه بانکی",
      mode: "auto",
      note: "انتقال امن به درگاه شاپرکی؛ تأیید تراکنش سرور-به-سرور انجام می‌شود.",
    },
    {
      id: "snappay",
      label: "اسنپ‌پی — خرید اقساطی",
      short: "اقساطی",
      mode: "auto",
      note: "پرداخت اقساطی اسنپ‌پی؛ نیازمند احراز هویت کد ملی و تأیید اعتبار.",
    },
    {
      id: "digipay",
      label: "دیجی‌پی",
      short: "درگاه دیجی‌پی",
      mode: "auto",
      note: "پرداخت امن با دیجی‌پی؛ پیگیری و بازگشت وجه از پنل دیجی‌پی.",
    },
    {
      id: "card",
      label: "کارت به کارت",
      short: "انتقال وجه",
      mode: "manual",
      note: "پس از ثبت سفارش، شماره کارت هلسا ارسال می‌شود؛ پرداخت با بررسی دستی تأیید می‌گردد.",
    },
    {
      id: "cod",
      label: "پرداخت در محل",
      short: "وجه هنگام تحویل",
      mode: "manual",
      note: "پرداخت هنگام تحویل؛ پس از تأیید کارشناس هلسا فعال می‌شود.",
    },
    {
      id: "wallet",
      label: "کیف پول هلسا",
      short: "به‌زودی",
      mode: "future",
      note: "کیف پول هلسا در راه است؛ معماری پرداخت برای آن آماده است.",
    },
  ];
  return base.map((m) => {
    const el = methodEligibility(m.id, ctx);
    return { ...m, enabled: el.ok, disabledReason: el.reason };
  });
}

/* ————————————— ارسال ————————————— */

export interface ShippingMethod {
  id: string;
  label: string;
  eta: string;
  fee: number;
  enabled: boolean;
}

export const SHIPPING_METHODS: ShippingMethod[] = [
  { id: "standard", label: "ارسال عادی", eta: "۲ تا ۴ روز کاری", fee: 85_000, enabled: true },
  { id: "express", label: "ارسال سریع", eta: "طبق هماهنگی سفارش", fee: 120_000, enabled: true },
  { id: "pickup", label: "تحویل حضوری", eta: "هماهنگی تلفنی", fee: 0, enabled: true },
];

export const SHIPPING_FREE_THRESHOLD = SHIPPING.freeThreshold; // single source (brief 2.2)
export const SHIPPING_REGIONS = ["تهران", "البرز", "اصفهان", "فارس", "خراسان رضوی", "گیلان", "مازندران", "کرمان", "خوزستان", "هرمزگان", "بوشهر", "یزد", "قم", "سایر"];

export const ORDER_STATUSES = [
  { key: "pending", label: "در انتظار پرداخت" },
  { key: "paid", label: "پرداخت شده" },
  { key: "preparing", label: "در حال آماده‌سازی" },
  { key: "shipped", label: "تحویل به پست" },
  { key: "transit", label: "در مسیر" },
  { key: "delivered", label: "تحویل شده" },
  { key: "cancelled", label: "لغو شده" },
  { key: "refunded", label: "مرجوع شده" },
] as const;

export const PAY_STATES: Record<PayState, string> = {
  pending: "در انتظار پرداخت",
  success: "پرداخت موفق",
  failed: "پرداخت ناموفق",
  cancelled: "پرداخت لغو شده",
  unconfigured: "پرداخت نامشخص",
};
