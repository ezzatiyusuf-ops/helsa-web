/**
 * HELSA — state machine پرداخت کارت‌به‌کارت.
 * قاعدهٔ سخت: «ارسال رسید ≠ واریز». تنها راه رسیدن به verified از
 * pending_verification است و تنها مصرف‌کنندهٔ آن finalizePaidOrder با تصمیم ادمین.
 */
export const CARD_RECEIPT_STATES = [
  "awaiting_payment", "receipt_submitted", "pending_verification",
  "verified", "rejected", "requires_more_information", "refunded",
] as const;
export type CardReceiptState = (typeof CARD_RECEIPT_STATES)[number];

const TRANSITIONS: Record<CardReceiptState, readonly CardReceiptState[]> = {
  awaiting_payment: ["receipt_submitted"],
  receipt_submitted: ["pending_verification"],
  pending_verification: ["verified", "rejected", "requires_more_information"],
  verified: ["refunded"],
  rejected: [],
  requires_more_information: ["receipt_submitted"],
  refunded: [],
};

export function canTransition(from: CardReceiptState, to: CardReceiptState): boolean {
  return (TRANSITIONS[from] ?? []).includes(to);
}
export function allowedTransitions(from: CardReceiptState): readonly CardReceiptState[] {
  return TRANSITIONS[from] ?? [];
}
export function isTerminal(state: CardReceiptState): boolean {
  return (TRANSITIONS[state] ?? []).length === 0;
}
export const CARD_RECEIPT_LABELS: Record<CardReceiptState, string> = {
  awaiting_payment: "در انتظار واریز",
  receipt_submitted: "رسید ارسال شد — در انتظار شروع بازبینی",
  pending_verification: "در حال بررسی توسط هلسا",
  verified: "واریز تأیید شد",
  rejected: "رسید رد شد",
  requires_more_information: "نیازمند اطلاعات بیشتر",
  refunded: "وجه بازگردانده شد",
};
export function canSubmitReceipt(state: CardReceiptState): boolean {
  return canTransition(state, "receipt_submitted");
}
/** rejected بن‌بست نیست: رسید جدید (ردیف جدید) مجاز است تا سابقه شفاف بماند */
export function canStartNewReceipt(state: CardReceiptState): boolean {
  return state === "awaiting_payment" || state === "requires_more_information" || state === "rejected";
}
export const ADMIN_ACTIONS = {
  claim: "pending_verification", verify: "verified", reject: "rejected",
  request_info: "requires_more_information", refund: "refunded",
} as const satisfies Record<string, CardReceiptState>;
export type AdminAction = keyof typeof ADMIN_ACTIONS;
export function actionRequiresReason(action: AdminAction): boolean {
  return action !== "claim" && action !== "verify";
}
export function targetStateFor(action: AdminAction): CardReceiptState {
  return ADMIN_ACTIONS[action];
}
export function checkAdminTransition(
  from: CardReceiptState, action: AdminAction, reason?: string,
): { ok: true; to: CardReceiptState } | { ok: false; message: string } {
  const to = ADMIN_ACTIONS[action];
  if (!canTransition(from, to)) {
    return { ok: false, message: `گذار از «${CARD_RECEIPT_LABELS[from]}» به «${CARD_RECEIPT_LABELS[to]}» مجاز نیست.` };
  }
  if (actionRequiresReason(action) && !(reason ?? "").trim()) {
    return { ok: false, message: "برای این تصمیم، ثبت دلیل الزامی است." };
  }
  return { ok: true, to };
}
/** قرارداد ورودی: جدیدترین رسید اول (ORDER BY id DESC) */
export function displayStateForReceipts(states: readonly CardReceiptState[]): CardReceiptState {
  if (!states.length) return "awaiting_payment";
  return states[0]!;
}
export function mayMarkOrderPaid(state: CardReceiptState): boolean {
  return state === "verified";
}
