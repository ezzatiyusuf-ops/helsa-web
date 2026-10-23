import Link from "next/link";
import { ShieldCheck } from "lucide-react";

/**
 * نشان‌های اعتماد — فقط و فقط با کد/لوگوی رسمی از متغیرهای محیطی.
 * هیچ کد تنظیم نشده باشد → هیچ چیزی رندر نمی‌شود (نشان ساختگی/جعلی ممنوع).
 *
 * متغیرها (در .env هر محیط):
 *   ENAMAD_ID            — شناسهٔ نماد اعتماد الکترونیکی از enamad.ir
 *   SAMANDEHI_ID + SAMANDEHI_P — شناسه‌های نشان ساماندهی از samandehi.ir
 *   GATEWAY_NAME         — نام درگاه (مثل «زرین‌پال»)؛ لوگو از GATEWAY_LOGO_URL
 *   GATEWAY_LOGO_URL     — لوگوی رسمی درگاه (فایل محلی در public/)
 *
 * بعد از ثبت درخواست در enamad.ir و samandehi.ir، کدها را در env بگذارید؛
 * نشان با لینک تأیید رسمی (trustseal.enamad.ir / logo.samandehi.ir) رندر می‌شود.
 */

export function TrustBadges({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const enamadId = (process.env.ENAMAD_ID ?? "").trim();
  const samandehiId = (process.env.SAMANDEHI_ID ?? "").trim();
  const samandehiP = (process.env.SAMANDEHI_P ?? "").trim();
  const gatewayName = (process.env.GATEWAY_NAME ?? "").trim();
  const gatewayLogo = (process.env.GATEWAY_LOGO_URL ?? "").trim();

  const hasEnamad = /^\d{3,}$/.test(enamadId);
  const hasSamandehi = /^\d{3,}$/.test(samandehiId) && /^\d{3,}$/.test(samandehiP);
  const hasGateway = Boolean(gatewayName && gatewayLogo);
  if (!hasEnamad && !hasSamandehi && !hasGateway) return null;

  const border = tone === "dark" ? "border-cream-50/15 bg-cream-50/5" : "border-line bg-surface";
  const textColor = tone === "dark" ? "text-inverse/70" : "text-muted";

  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-2xl border ${border} px-4 py-3`} aria-label="نشان‌های اعتماد">
      {hasEnamad && (
        <a
          href={`https://trustseal.enamad.ir/?id=${enamadId}`}
          target="_blank"
          rel="noreferrer"
          className="shrink-0"
          title="نماد اعتماد الکترونیکی — تأیید اعتبار"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- نشان الکترونیکی enamad خارجی است و next/image روی آن قابل اعمال نیست */}
          <img
            src={`https://trustseal.enamad.ir/logo.png?id=${enamadId}`}
            alt="نماد اعتماد الکترونیکی هلسا"
            width={72}
            height={72}
            style={{ height: 60, width: "auto" }}
            loading="lazy"
            referrerPolicy="origin"
          />
        </a>
      )}
      {hasSamandehi && (
        <a
          href={`https://logo.samandehi.ir/Verify.aspx?id=${samandehiId}&p=${samandehiP}`}
          target="_blank"
          rel="noreferrer"
          className="shrink-0"
          title="نشان ساماندهی"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- نشان ساماندهی خارجی است */}
          <img
            src={`https://logo.samandehi.ir/logo.aspx?id=${samandehiId}&p=${samandehiP}`}
            alt="نشان ساماندهی هلسا"
            height={60}
            style={{ height: 60, width: "auto" }}
            loading="lazy"
            referrerPolicy="origin"
          />
        </a>
      )}
      {hasGateway && (
        <Link href="/faq#payment" className={`flex shrink-0 flex-col items-center gap-1 ${textColor}`} title={`پرداخت امن از طریق ${gatewayName}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- لوگوی درگاه پرداخت خارجی است */}
          <img src={gatewayLogo} alt={`لوگوی درگاه ${gatewayName}`} height={40} style={{ height: 40, width: "auto" }} loading="lazy" />
          <span className="flex items-center gap-1 text-[9.5px] font-bold">
            <ShieldCheck className="size-3" aria-hidden /> درگاه رسمی {gatewayName}
          </span>
        </Link>
      )}
    </div>
  );
}
