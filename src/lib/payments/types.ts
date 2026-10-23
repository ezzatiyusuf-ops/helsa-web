import "server-only";
/**
 * HELSA — قرارداد مشترک درگاه‌های پرداخت (Part D/E/F).
 * هر درگاه: initiate (ساخت تراکنش) + verify (تأیید سرور-به-سرور) + refund (آماده).
 * موفقیت «فقط» از پاسخ verify درگاه استخراج می‌شود — هرگز از کلاینت/URL.
 */

export interface GatewayOrder {
  id: number;
  code: string;
  amount: number;
  method: "online" | "snappay" | "digipay" | "card" | "cod" | "wallet";
  mobile?: string;
}

export type InitiateResult =
  | { ok: true; url: string; authority: string; provider: string; expiresAt?: Date }
  | { ok: false; error: string; status?: number };

export type VerifyResult = { state: "pending" | "success" | "failed" | "cancelled" | "unconfigured"; ref?: string };

export interface PaymentProviderDriver {
  id: string;
  label: string;
  /** ساخت تراکنش و URL پرداخت؛ authority باید ذخیره شود تا در callback تطبیق داده شود */
  initiate(order: GatewayOrder, callbackUrl: string): Promise<InitiateResult>;
  /** تأیید سرور-به-سرور — مبلغ همیشه از سفارشِ DB خوانده می‌شود */
  verify(order: GatewayOrder, authority: string): Promise<VerifyResult>;
  /** آمادهٔ بازگشت وجه (در صورت پشتیبانی PSP) */
  refund?(order: GatewayOrder, authority: string, amount: number): Promise<{ supported: boolean; message: string }>;
}
