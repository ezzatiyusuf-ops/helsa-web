import Link from "next/link";
import { Mail, Phone, MapPin, MessageCircle, Leaf, ShieldCheck, Truck, BadgeCheck, MapPinned } from "lucide-react";
import { InstagramIcon, TelegramIcon } from "@/components/ui/icons";
import { TrustBadges } from "@/components/ui/TrustBadges";
import { CERTIFICATES, hasCertificates } from "@/config/certificates";
import { SOCIAL_CHANNELS } from "@/config/site";
import { SITE } from "@/config/site";
import { HelsaLogo } from "@/components/ui/primitives";

export function Footer() {
  const wa = SITE.whatsappUrl;
  type ColLink = { label: string; href: string };
  const cols: { title: string; links: ColLink[] }[] = [
    {
      title: "فروشگاه",
      links: [
        { label: "محصولات", href: "/products" },
        { label: "مزه هلسا", href: "/mazeh" },
        { label: "سینی مزه", href: "/mazeh-trays" },
        { label: "مهمانی", href: "/mehmani" },
        { label: "جشنواره‌ها", href: "/campaigns" },
        { label: "روزیته", href: "/rooziteh" },
        { label: "پیشنهاد ویژه", href: "/offers" },
      ],
    },
    {
      title: "هلسا",
      links: [
        { label: "درباره ما", href: "/about" },
        { label: "تماس با ما", href: "/contact" },
        { label: "مجله هلسا", href: "/blog" },
        { label: "سوالات متداول", href: "/faq" },
        { label: "حساب کاربری", href: "/account" },
      ],
    },
    {
      title: "خدمات مشتریان",
      links: [
        { label: "پیگیری سفارش", href: "/account" },
        { label: "شرایط ارسال", href: "/shipping" },
        { label: "شرایط بازگشت", href: "/refund" },
        { label: "قوانین و مقررات", href: "/terms" },
        { label: "حریم خصوصی", href: "/privacy" },
      ],
    },
  ];

  return (
    <footer className="relative bg-brand-950 text-inverse mt-24 overflow-hidden pb-16 lg:pb-0">
      <div className="pattern-persian-light absolute inset-0 opacity-50" aria-hidden />

      {/* slogan hairline */}
      <div className="relative border-b border-cream-50/10">
        <div className="container-x py-8 text-center">
          <p className="text-base md:text-lg font-black text-inverse">{SITE.slogan}</p>
          <p className="mt-2 text-[11px] tracking-[0.18em] text-gold-400">{SITE.coreMessage}</p>
        </div>
      </div>

      {/* trust strip (فاز ۱۳) — hairline، ظریف و پرمیوم؛ نه بنر رنگی */}
      <div className="relative border-b border-cream-50/10">
        <div className="container-x flex flex-wrap items-center justify-center gap-x-7 gap-y-2.5 py-3.5 text-[10.5px] text-inverse/65">
          <span className="inline-flex items-center gap-1.5"><Leaf className="size-3.5 text-gold-400/80" aria-hidden /> طبیعی و بدون افزودنی غیرضروری</span>
          <span className="inline-flex items-center gap-1.5"><MapPinned className="size-3.5 text-gold-400/80" aria-hidden /> تولید و بسته‌بندی در ایران</span>
          <span className="inline-flex items-center gap-1.5"><BadgeCheck className="size-3.5 text-gold-400/80" aria-hidden /> تأمین‌کننده‌های منتخب هلسا</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-gold-400/80" aria-hidden /> پرداخت امن درگاه بانکی</span>
          <span className="inline-flex items-center gap-1.5"><Truck className="size-3.5 text-gold-400/80" aria-hidden /> ارسال سریع با ضمانت تازگی</span>
        </div>
      </div>

      <div className="relative container-x py-16 grid grid-cols-2 md:grid-cols-5 gap-10">
        <div className="col-span-2">
          <HelsaLogo light className="h-11" />
          <p className="mt-5 text-xs leading-7 text-inverse/70 max-w-xs">
            {SITE.businessName}؛ خرما، شکلات دست‌ساز خرما، آجیل، خشکبار و محصولات طبیعی با استانداردی در شأن سفره ایرانی.
          </p>
          <div className="mt-6 flex items-center gap-2">
            {SOCIAL_CHANNELS.filter((c) => c.href).map((c) => (
              <a key={c.id} href={c.href} target="_blank" rel="noreferrer" aria-label={`${c.label} هلسا`} className="size-9 rounded-full border border-cream-50/15 flex items-center justify-center hover:border-gold-400 hover:text-gold-400 transition-colors">
                <c.Icon className="size-4" aria-hidden />
              </a>
            ))}
            <a href={`mailto:${SITE.email}`} aria-label="ایمیل هلسا" className="size-9 rounded-full border border-cream-50/15 flex items-center justify-center hover:border-gold-400 hover:text-gold-400 transition-colors">
              <Mail className="size-4" aria-hidden />
            </a>
          </div>
        </div>

        {cols.map((c) => (
          <div key={c.title}>
            <h2 className="text-xs font-black tracking-[0.15em] text-gold-400 mb-5">{c.title}</h2>
            <ul className="space-y-3">
              {c.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-xs text-inverse/75 hover:text-inverse transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {hasCertificates && (
          <div className="col-span-2 md:col-span-5">
            <h2 className="text-xs font-black tracking-[0.15em] text-gold-400 mb-4">مجوزها و گواهی‌ها</h2>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-inverse/75">
              {CERTIFICATES.healthLicenseNo && <span className="rounded-lg border border-cream-50/15 px-3 py-2">پروانهٔ بهداشت: {CERTIFICATES.healthLicenseNo}</span>}
              {CERTIFICATES.enamadUrl && <a href={CERTIFICATES.enamadUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-cream-50/15 px-3 py-2 hover:border-gold-400 hover:text-gold-400 transition-colors">نشان اینماد</a>}
              {CERTIFICATES.samandehiUrl && <a href={CERTIFICATES.samandehiUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-cream-50/15 px-3 py-2 hover:border-gold-400 hover:text-gold-400 transition-colors">نشان ساماندهی</a>}
              {CERTIFICATES.labReportUrl && <a href={CERTIFICATES.labReportUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-cream-50/15 px-3 py-2 hover:border-gold-400 hover:text-gold-400 transition-colors">{CERTIFICATES.labReportLabel || "گزارش آزمایشگاه"}</a>}
            </div>
          </div>
        )}

        <div className="col-span-2 md:col-span-1">
          <h2 className="text-xs font-black tracking-[0.15em] text-gold-400 mb-5">تماس با ما</h2>
          <ul className="space-y-3.5 text-xs text-inverse/75">
            <li className="flex items-start gap-2.5">
              <MapPin className="size-4 mt-0.5 text-gold-500 shrink-0" aria-hidden />
              <span>{SITE.address}</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="size-4 text-gold-500 shrink-0" aria-hidden />
              <span dir="ltr">{SITE.landline}</span>
            </li>
            <li className="flex items-center gap-2.5">
              <MessageCircle className="size-4 text-gold-500 shrink-0" aria-hidden />
              <a href={wa} target="_blank" rel="noreferrer" dir="ltr" className="hover:text-inverse">{SITE.mobile}</a>
            </li>
          </ul>
        </div>
      </div>

      {/* نشان‌های اعتماد — فقط با کد رسمی از env (ENAMAD_ID/SAMANDEHI_ID/…)؛ بدون کد چیزی رندر نمی‌شود */}
      <div className="relative container-x pb-2 pt-6">
        <TrustBadges tone="dark" />
      </div>

      <div className="relative border-t border-cream-50/10">
        <div className="container-x py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-[11px] text-inverse/55">
          <p>© {SITE.copyrightYear} — {SITE.businessName} — همه حقوق محفوظ است.</p>
          <p dir="ltr">{SITE.url.replace("https://", "")}</p>
        </div>
      </div>
    </footer>
  );
}
