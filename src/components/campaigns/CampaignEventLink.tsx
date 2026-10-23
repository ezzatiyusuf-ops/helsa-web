"use client";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics";

/**
 * لینک CTA جشنواره با رویداد آنالیتیکس (§34) — render سبک روی Link معمولی.
 * رویدادها: campaign_click · campaign_mazeh_click · campaign_gift_click · campaign_b2b_click
 */
export function CampaignEventLink({
  href,
  event,
  params,
  className,
  children,
  ariaLabel,
}: {
  href: string;
  event: string;
  params?: Record<string, string | number>;
  className: string;
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  return (
    <Link href={href} className={className} aria-label={ariaLabel} onClick={() => trackEvent(event, params)}>
      {children}
    </Link>
  );
}
