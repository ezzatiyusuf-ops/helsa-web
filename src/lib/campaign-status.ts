/**
 * وضعیت جشنواره — محاسبهٔ داینامیک از تاریخ واقعی (نه هاردکد).
 * منطق: قبل از شروع = آینده · بین شروع و پایان = فعال · بعد از پایان = پایان‌یافته.
 * کمپین غیرفعال (active=false) نیز «پایان‌یافته» در نظر گرفته می‌شود تا هرگز
 * به‌عنوان تخفیف جاری نمایش داده نشود.
 */
export type CampaignStatus = "upcoming" | "active" | "ended";

export interface CampaignDates {
  startDate: string;
  endDate: string;
  active?: boolean;
}

/** ساعت «الان» از دید سرور — اولویت با هدر date است (قطعی در SSR)؛ فالبک ساعت سیستم. */
export function campaignNow(dateHeader: string | null): Date {
  if (dateHeader) {
    const d = new Date(dateHeader);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

export function getCampaignStatus(campaign: CampaignDates, now: Date = new Date()): CampaignStatus {
  if (campaign.active === false) return "ended";
  const start = new Date(campaign.startDate).getTime();
  const end = new Date(`${campaign.endDate}T23:59:59`).getTime();
  const t = now.getTime();
  if (t < start) return "upcoming";
  if (t <= end) return "active";
  return "ended";
}

/** برچسب فارسی وضعیت — منبع واحد برای همهٔ نماها */
export function campaignStatusLabel(status: CampaignStatus): string {
  switch (status) {
    case "active":
      return "در حال برگزاری";
    case "upcoming":
      return "به‌زودی";
    default:
      return "پایان یافته";
  }
}

/** روزهای باقی‌مانده تا پایان (فقط برای کمپین فعال معنا دارد) */
export function campaignDaysRemaining(campaign: CampaignDates, now: Date = new Date()): number {
  const end = new Date(`${campaign.endDate}T23:59:59`).getTime();
  return Math.max(0, Math.ceil((end - now.getTime()) / 86_400_000));
}

/** پایان ISO برای کامپوننت Countdown (تا آخرِ روزِ پایان) */
export function campaignEndIso(campaign: CampaignDates): string {
  return `${campaign.endDate}T23:59:59`;
}
