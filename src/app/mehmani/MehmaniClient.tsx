"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Users, Sparkles, Building2, Gift, Wand2, ArrowLeft, Cake, Snowflake, Flower2, Briefcase, Crown, Home, GlassWater } from "lucide-react";
import { motion } from "framer-motion";
import { recommendForGuests, GUEST_OPTIONS } from "@/config/mazeh";
import { TRAYS } from "@/data/trays";
import { PageHeader } from "@/components/layout/PageHeader";
import { Reveal, SectionHead, LinkButton } from "@/components/ui/primitives";
import { faDigits, formatToman } from "@/lib/format";
import { trayVisual } from "@/lib/trayVisuals";

const OCCASIONS = [
  { icon: GlassWater, t: "دورهمی", d: "عصرهای کوچک و صمیمی" },
  { icon: Home, t: "مهمانی خانوادگی", d: "دور یک میز بزرگ" },
  { icon: Cake, t: "تولد", d: "شیرین‌تر از هر سال" },
  { icon: Snowflake, t: "یلدا", d: "بلندترین شب، گرم‌ترین سینی" },
  { icon: Flower2, t: "نوروز", d: "پذیرایی بهاری" },
  { icon: Briefcase, t: "پذیرایی رسمی", d: "جلسه‌ها و مراسم رسمی" },
  { icon: Crown, t: "پذیرایی VIP", d: "برای مهمان‌های ویژه" },
  { icon: Building2, t: "پذیرایی سازمانی", d: "رویدادها و همایش‌ها" },
];

export default function MehmaniClient() {
  const [guests, setGuests] = useState(8);
  const rec = useMemo(() => recommendForGuests(guests), [guests]);
  const tray = TRAYS.find((t) => t.slug === rec.traySlug);
  const estimate = tray ? tray.basePrice * rec.qty : 0;

  return (
    <>
      <PageHeader
        title="مهمانی را با هلسا زیباتر کنید"
        desc="پذیرایی یک هنر است؛ هلسا قاب، رنگ و طعم این هنر را برای شما می‌چیند."
        crumbs={[{ label: "خانه", href: "/" }, { label: "مهمانی هلسا", href: "/mehmani" }]}
      />

      {/* lifestyle hero image */}
      <section className="container-x pt-16 md:pt-20" aria-label="تجربه مهمانی">
        <Reveal>
          <div className="rounded-2xl overflow-hidden border border-line/70 relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
             <img src="/images/tray-vip.jpg" alt="میز پذیرایی هلسا با سینی مزه شامل پنیر، زیتون، آجیل، خرما و شکلات دست‌ساز" className="w-full aspect-[21/9] object-cover" fetchPriority="high" />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-950/70 to-transparent" aria-hidden />
            <p className="absolute bottom-6 start-7 text-lg md:text-2xl font-black text-inverse">مهمانی، به روایت هلسا</p>
          </div>
        </Reveal>
      </section>

      {/* the three faces of one HELSA experience */}
      <section className="container-x py-12 md:py-16" aria-label="تجربه مهمانی و مزه هلسا">
        <div className="grid md:grid-cols-3 gap-3 border-y border-line/70 py-6">
          {[
            { t: "مزه هلسا", d: "ترکیب‌های دست‌چین شور و شیرین", href: "/mazeh", icon: Sparkles },
            { t: "سینی‌های مزه", d: "سینی آماده برای پذیرایی شما", href: "/mazeh-trays", icon: Gift },
            { t: "مهمانی هلسا", d: "پذیرایی از دورهمی تا سازمانی", href: "/mehmani#occasions", icon: Users },
          ].map((item) => (
            <Link key={item.t} href={item.href} className="group flex items-center gap-4 rounded-2xl p-4 transition-colors hover:bg-surface2">
              <span className="grid size-10 shrink-0 place-items-center rounded-full border border-brand-200 text-brand-700 group-hover:bg-brand-700 group-hover:text-inverse transition-colors">
                <item.icon className="size-4.5" aria-hidden />
              </span>
              <span>
                <span className="block text-sm font-black text-heading group-hover:text-brand-600">{item.t}</span>
                <span className="mt-1 block text-[11px] text-muted">{item.d}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* occasions */}
      <section id="occasions" className="container-x py-16 md:py-24" aria-label="مناسبت‌ها">
        <Reveal>
          <SectionHead eyebrow="مناسبت‌ها" title="برای هر بهانه‌ای، یک سینی" />
        </Reveal>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {OCCASIONS.map((o, i) => (
            <Reveal key={o.t} delay={(i % 4) * 0.06}>
              <Link href="/mazeh-trays" className="group block rounded-2xl border border-line/70 bg-surface p-6 text-center h-full card-hover">
                <span className="inline-flex size-11 rounded-full border border-brand-200 text-brand-700 items-center justify-center group-hover:bg-brand-700 group-hover:text-inverse transition-colors duration-300">
                  <o.icon className="size-4.5" aria-hidden />
                </span>
                <h3 className="mt-4 text-[13px] font-black text-heading">{o.t}</h3>
                <p className="mt-1.5 text-[11px] text-muted leading-5">{o.d}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* services */}
      <section className="bg-surface2/70 border-y border-line/60 py-20 md:py-28" aria-label="خدمات مهمانی">
        <div className="container-x">
          <Reveal>
            <SectionHead eyebrow="خدمات مهمانی" title="چهار راه برای درخشش میزبان" />
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Sparkles, t: "سینی مزه", d: "۸ سینی امضا، چیدمان روز", href: "/mazeh-trays" },
              { icon: Gift, t: "پک مهمانی و خانوادگی", d: "ست کامل پذیرایی در یک جعبه", href: "/products?cat=date-products" },
              { icon: Crown, t: "پذیرایی VIP", d: "چیدمان چندلایه با مدالیون طلا", href: "/mazeh-trays/vip" },
              { icon: Building2, t: "پذیرایی سازمانی", d: "چیدمان در محل، فاکتور رسمی", href: "/contact" },
            ].map((s, i) => (
              <Reveal key={s.t} delay={i * 0.07}>
                <Link href={s.href} className="group block rounded-2xl bg-surface border border-line/70 p-7 h-full card-hover">
                  <s.icon className="size-5 text-gold-700" aria-hidden />
                  <h3 className="mt-4 text-sm font-black text-heading">{s.t}</h3>
                  <p className="mt-2 text-[11.5px] leading-6 text-muted">{s.d}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold text-brand-700">
                    مشاهده
                    <ArrowLeft className="size-3 transition-transform duration-300 group-hover:-translate-x-1" aria-hidden />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* party calculator */}
      <section className="container-x py-20 md:py-28 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center" aria-label="ماشین‌حساب پذیرایی">
        <Reveal>
          <span className="text-[11px] font-bold tracking-[0.2em] text-gold-700">ماشین‌حساب پذیرایی</span>
          <h2 className="mt-4 text-3xl md:text-[36px] font-black leading-[1.4] text-heading">برای چند نفر پذیرایی دارید؟</h2>
          <p className="mt-5 text-sm leading-8 text-muted max-w-md">
            تعداد مهمان‌ها را انتخاب کنید؛ هلسا اندازه سینی، تعداد و برآورد هزینه را پیشنهاد می‌دهد.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            {[...new Set([...GUEST_OPTIONS, 12])].sort((a, b) => a - b).map((g) => (
              <button
                key={g}
                onClick={() => setGuests(g)}
                className={`rounded-full px-4 py-2 text-xs font-bold border transition-all duration-300 ${guests === g ? "bg-brand-700 border-brand-700 text-inverse" : "border-line bg-surface text-body hover:border-brand-400"}`}
              >
                {faDigits(g)} نفر
              </button>
            ))}
          </div>
          <label className="mt-6 block text-[11px] text-muted" htmlFor="guests-range">
            یا با لغزنده: {faDigits(guests)} نفر
          </label>
          <input id="guests-range" type="range" min={2} max={40} value={guests} onChange={(e) => setGuests(+e.target.value)} className="mt-2 w-full accent-brand-700" />
        </Reveal>

        <Reveal delay={0.1}>
          <motion.div
            key={rec.traySlug + rec.qty}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-2xl bg-surface border border-line/70 overflow-hidden shadow-soft"
          >
            {tray && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={trayVisual(tray.slug, tray.image)} alt={tray.name} className="w-full aspect-[16/8] object-cover" loading="lazy" />
            )}
            <div className="p-7">
              <p className="text-[11px] font-bold text-gold-700">پیشنهاد هلسا برای {faDigits(guests)} مهمان</p>
              <h3 className="mt-2 text-lg font-black text-heading">{rec.title}</h3>
              <p className="mt-1.5 text-xs text-muted">{rec.note}</p>
              <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-surface2 border border-line-soft p-3">
                  <dt className="text-[10px] text-muted">تعداد سینی</dt>
                  <dd className="text-base font-black text-heading">{faDigits(rec.qty)}</dd>
                </div>
                <div className="rounded-xl bg-surface2 border border-line-soft p-3">
                  <dt className="text-[10px] text-muted">اندازه</dt>
                  <dd className="text-base font-black text-heading">{tray?.size ?? "—"}</dd>
                </div>
                <div className="rounded-xl bg-surface2 border border-line-soft p-3">
                  <dt className="text-[10px] text-muted">برآورد</dt>
                  <dd className="text-[13px] font-black text-heading">{formatToman(estimate)}</dd>
                </div>
              </dl>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <LinkButton href={`/mazeh-trays/${rec.traySlug}`} size="sm" variant="primary">مشاهده سینی</LinkButton>
                <LinkButton href="/mazeh-trays/build" size="sm" variant="outline">شخصی‌سازی</LinkButton>
              </div>
              {guests >= 30 && (
                <p className="mt-4 rounded-xl bg-surface2 border border-line-soft p-3 text-[11px] font-bold text-brand-700 leading-5">
                  برای بیش از ۳۰ نفر، «پذیرایی سازمانی هلسا» با تیم چیدمان در محل پیشنهاد می‌شود.
                </p>
              )}
            </div>
          </motion.div>
        </Reveal>
      </section>

      <div className="container-x pb-20 text-center">
        <Reveal>
          <LinkButton href="/mazeh-trays" size="lg" variant="primary">
            مشاهده همه سینی‌های مزه
            <ArrowLeft className="size-4" aria-hidden />
          </LinkButton>
        </Reveal>
      </div>
    </>
  );
}
