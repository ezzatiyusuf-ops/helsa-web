import { Sparkles } from "lucide-react";
import type { GiftPackage, MazehTray, Product } from "@/types";
import { getTrays, getCampaigns } from "@/services/catalog";
import { getGiftPackages } from "@/services/gifts";
import { ProductCard } from "@/components/product/ProductCard";
import { GoldenTrayCard } from "@/components/home/GoldenTrayCard";
import { GiftBoxCard } from "@/components/home/GiftBoxCard";
import { CarouselRow } from "@/components/ui/CarouselRow";
import { Countdown, Reveal, SectionHead } from "@/components/ui/primitives";

/**
 * نوار پیشنهاد ویژه (CRO) — چهار محصول هیروی هلسا با قیمت واقعی:
 * شکلات خرمایی · قند خرما · سینی مزه طلایی (mazeh_trays) · جعبهٔ هدیه (gift_packages).
 * تخفیف/قیمت قدیمی فقط جایی نمایش داده می‌شود که در دادهٔ واقعی وجود دارد.
 *
 * §بریف شمارش‌معکوس (حداکثر ۲۴ ساعت):
 * — پایان پیشنهاد از کمپین‌های «در حال برگزاری»ٔ واقعی دیتابیس محاسبه می‌شود (نه هاردکد).
 * — شمارش‌معکوس فقط وقتی رندر می‌شود که کمپینِ جاری حداکثر تا ۲۴ ساعت آینده تمام شود
 *   (سقف نمایش ۲۳:59:59 — هرگز چندروزه نیست).
 * — کمپینی در ۲۴ ساعت پایانی نباشد → هیچ شمارش‌معکوسی نشان داده نمی‌شود (بدون جعل).
 * — زمان پایان سمت سرور تولید می‌شود (ISR ۶۰ ثانیه‌ای)؛ کلاینت فقط شمارش می‌کند و
 *   نمی‌تواند پیشنهاد را طولانی کند.
 */
const DEAL_SLUGS = ["date-sugar", "handmade-date-chocolate"];
const GIFT_SLUG = "classic-personal-gift";
const COUNTDOWN_WINDOW_MS = 24 * 60 * 60 * 1000; // حداکثر پنجرهٔ نمایش شمارش‌معکوس

/** زودترین پایانِ کمپینِ در حال برگزاری — منبع: campaigns جدول (تاریخ‌ها YYYY-MM-DD) */
function activeCampaignEnd(campaigns: { startDate: string; endDate: string; active?: boolean }[], now: Date): Date | null {
  let soonest: Date | null = null;
  for (const c of campaigns) {
    if (c.active === false) continue;
    const start = new Date(c.startDate).getTime();
    const end = new Date(`${c.endDate}T23:59:59`).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    if (now.getTime() < start || now.getTime() > end) continue; // فقط در حال برگزاری
    if (!soonest || end < soonest.getTime()) soonest = new Date(end);
  }
  return soonest;
}

export async function FlashOfferStrip({ products }: { products: Product[] }) {
  // §بریف پرفورمنس: هر سه منبع داده به‌صورت موازی (قبلاً متوالی بود — waterfall)
  const [trays, giftPackages, campaigns] = await Promise.all([getTrays(), getGiftPackages(), getCampaigns()]);
  const golden = trays.find((t: MazehTray) => t.slug === "golden" && t.active);
  const gift = giftPackages.find((g: GiftPackage) => g.slug === GIFT_SLUG && g.stock > 0);
  const deals = DEAL_SLUGS.map((slug) => products.find((p) => p.slug === slug)).filter(
    (p): p is Product => Boolean(p),
  );
  if (deals.length < 2) return null;

  const now = new Date();
  const campaignEnd = activeCampaignEnd(campaigns, now);
  const remaining = campaignEnd ? campaignEnd.getTime() - now.getTime() : 0;
  const showCountdown = Boolean(campaignEnd) && remaining > 0 && remaining <= COUNTDOWN_WINDOW_MS;

  return (
    <section className="border-y border-gold-300/60 bg-gradient-to-l from-gold-50 via-surface to-surface py-10 md:py-12" aria-label="پیشنهاد ویژه امروز">
      <div className="container-x">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHead
              eyebrow="جشنوارهٔ هدیهٔ هلسا"
              title="پیشنهاد ویژه امروز"
              desc={showCountdown ? "چهار انتخاب ممتاز با قیمت واقعی — تا پایان جشنواره:" : "چهار انتخاب ممتاز با قیمت واقعی هلسا"}
            />
            {showCountdown && campaignEnd && (
              <div className="shrink-0 pb-1" aria-label="شمارش معکوس پایان جشنواره (حداکثر ۲۴ ساعت)">
                <Countdown until={campaignEnd.toISOString()} />
              </div>
            )}
          </div>
        </Reveal>
        <CarouselRow ariaLabel="پیشنهاد ویژه امروز — نوار کشویی" className="mt-7">
          {deals.map((p) => (
            <div key={p.slug} className="w-[62vw] min-[400px]:w-[54vw] sm:w-[252px] lg:w-[232px] shrink-0 snap-start">
              <ProductCard product={p} />
            </div>
          ))}
          {golden && (
            <div className="w-[62vw] min-[400px]:w-[54vw] sm:w-[252px] lg:w-[232px] shrink-0 snap-start">
              <GoldenTrayCard tray={golden} />
            </div>
          )}
          {gift && (
            <div className="w-[62vw] min-[400px]:w-[54vw] sm:w-[252px] lg:w-[232px] shrink-0 snap-start">
              <GiftBoxCard gift={gift} />
            </div>
          )}
        </CarouselRow>
        <Reveal delay={100}>
          <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] font-bold text-muted">
            <Sparkles className="size-3.5 text-gold-700" aria-hidden />
            تخفیف‌ها روی قیمت واقعی محصولات اعمال شده‌اند — سبد خرید، قیمت نهایی را نشان می‌دهد.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
