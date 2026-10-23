/**
 * مشارکت حمایتی داوطلبانه — پیش‌فرض خاموش، حسابداری جدا، بدون ادعای معافیت مالیاتی.
 */
export const SUPPORT_CONTRIBUTION = { min: 5_000, max: 2_000_000, presets: [10_000, 25_000, 50_000] as const };
export function supportContributionEnabled(): boolean {
  return (process.env.SUPPORT_CONTRIBUTION_ENABLED ?? "1") !== "0";
}
export function isValidContribution(amount: number): boolean {
  if (!Number.isInteger(amount)) return false;
  if (amount === 0) return true;
  return amount >= SUPPORT_CONTRIBUTION.min && amount <= SUPPORT_CONTRIBUTION.max;
}
