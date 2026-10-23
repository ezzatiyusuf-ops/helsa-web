/**
 * HELSA — روزیته: state machine تولیدکننده.
 * تنها منبع حقیقت برای «انتشار محصول بدون moderation ممنوع».
 */
export const PRODUCER_STATES = ["submitted", "approved", "published", "unavailable", "rejected"] as const;
export type ProducerState = (typeof PRODUCER_STATES)[number];

const TRANSITIONS: Record<ProducerState, readonly ProducerState[]> = {
  submitted: ["approved", "rejected"],
  approved: ["published", "rejected"],
  published: ["unavailable"],
  unavailable: ["published"],
  rejected: ["submitted"],
};

export function canTransitionProducer(from: ProducerState, to: ProducerState): boolean {
  return (TRANSITIONS[from] ?? []).includes(to);
}

export const PRODUCER_ACTIONS = {
  approve: "approved", reject: "rejected", publish: "published",
  take_down: "unavailable", restore: "published", resubmit: "submitted",
} as const satisfies Record<string, ProducerState>;
export type ProducerAction = keyof typeof PRODUCER_ACTIONS;

export function producerActionRequiresReason(action: ProducerAction): boolean {
  return action === "reject" || action === "take_down";
}

export const PRODUCER_LABELS: Record<ProducerState, string> = {
  submitted: "درخواست ثبت شد — در انتظار بررسی",
  approved: "تأیید شد — در انتظار انتشار",
  published: "منتشر شده",
  unavailable: "موقتاً غیرفعال (تعلیق)",
  rejected: "رد شده",
};

export function checkProducerAction(
  from: ProducerState, action: ProducerAction, reason?: string,
): { ok: true; to: ProducerState } | { ok: false; message: string } {
  const to = PRODUCER_ACTIONS[action];
  if (!canTransitionProducer(from, to)) {
    return { ok: false, message: `گذار از «${PRODUCER_LABELS[from]}» با این عملیات مجاز نیست.` };
  }
  if (producerActionRequiresReason(action) && !(reason ?? "").trim()) {
    return { ok: false, message: "برای این تصمیم، ثبت دلیل الزامی است." };
  }
  return { ok: true, to };
}

export function isPubliclyVisible(state: ProducerState): boolean {
  return state === "published";
}

export function productVisibleForProducer(producerState: ProducerState | null | undefined): boolean {
  if (!producerState) return true;
  return isPubliclyVisible(producerState);
}

export function slugifyProducer(input: string): string {
  const base = (input || "").trim().toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 90);
  return base || "";
}

export interface ProducerApplication {
  displayName: string; region: string; craft: string; bio: string; story: string;
  socialImpact: string; certifications: string[];
  contactName: string; contactPhone: string; contactEmail: string;
}

export const PRODUCER_LIMITS = {
  displayName: { min: 3, max: 160 },
  region: { min: 2, max: 120 },
  craft: { min: 2, max: 160 },
  bio: { min: 30, max: 600 },
  story: { max: 3000 },
  socialImpact: { max: 1500 },
  certifications: { max: 10, itemMax: 120 },
} as const;

export function validateApplication(input: Partial<ProducerApplication>): { ok: true } | { ok: false; message: string } {
  const name = (input.displayName ?? "").trim();
  if (name.length < PRODUCER_LIMITS.displayName.min) return { ok: false, message: "نام تولیدکننده/کارگاه باید حداقل ۳ نویسه باشد." };
  if (name.length > PRODUCER_LIMITS.displayName.max) return { ok: false, message: "نام تولیدکننده بیش از حد بلند است." };
  if ((input.region ?? "").trim().length < PRODUCER_LIMITS.region.min) return { ok: false, message: "منطقهٔ تولید الزامی است." };
  if ((input.craft ?? "").trim().length < PRODUCER_LIMITS.craft.min) return { ok: false, message: "حوزهٔ تولید (مثلاً خرمای پیارم) الزامی است." };
  const bio = (input.bio ?? "").trim();
  if (bio.length < PRODUCER_LIMITS.bio.min) return { ok: false, message: "معرفی کوتاه باید حداقل ۳۰ نویسه باشد (از زبان خودتان بنویسید)." };
  if (bio.length > PRODUCER_LIMITS.bio.max) return { ok: false, message: "معرفی کوتاه بیش از حد بلند است." };
  if ((input.story ?? "").trim().length > PRODUCER_LIMITS.story.max) return { ok: false, message: "داستان کارگاه بیش از حد بلند است." };
  if ((input.socialImpact ?? "").trim().length > PRODUCER_LIMITS.socialImpact.max) return { ok: false, message: "متن تأثیر اجتماعی بیش از حد بلند است." };
  if ((input.certifications ?? []).length > PRODUCER_LIMITS.certifications.max) return { ok: false, message: "تعداد گواهی‌ها بیش از حد مجاز است." };
  const phone = (input.contactPhone ?? "").replace(/\D/g, "");
  if (!/^09\d{9}$/.test(phone)) return { ok: false, message: "شمارهٔ همراه تماس باید ۱۱ رقم و با ۰۹ شروع شود." };
  const email = (input.contactEmail ?? "").trim();
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, message: "ایمیل تماس معتبر نیست." };
  if ((input.contactName ?? "").trim().length < 2) return { ok: false, message: "نام مسئول تماس الزامی است." };
  return { ok: true };
}
