import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Reveal, SectionHead, LinkButton } from "@/components/ui/primitives";

export const metadata: Metadata = {
  alternates: { canonical: "/mazeh" },
  title: "مزه هلسا | هر مزه، یک تجربه",
  description: "ترکیب‌های دست‌چین‌شده هلسا: خرما و شکلات، خرما و مغزها، پنیر و گردو و خرما، میوه خشک و آجیل؛ مزه‌های شور و شیرین در یک تجربه متفاوت.",
};

const COMBOS = [
  { a: "خرما", b: "شکلات دست‌ساز", note: "شیرینی طبیعی، روکش تلخ", image: "/images/chocolate-craft.jpg" },
  { a: "خرما", b: "مغزها", note: "پسته، گردو و بادام درشت", image: "/images/opt/premium-mixed-nuts.jpg" },
  { a: "پنیر + گردو", b: "خرما", note: "تعادل شور و شیرین سفره ایرانی", image: "/images/opt/cheese-walnut-dates.jpg" },
  { a: "میوه خشک", b: "آجیل", note: "میان‌وعده‌ای برای روزهای روشن", image: "/images/opt/dried-figs.jpg" },
  { a: "مزه‌های شور", b: "مزه‌های شیرین", note: "زیتون و پنیر، کنار خرما و عسل", image: "/images/mazeh-board.jpg" },
];

export default function MazehPage() {
  return (
    <>
      <PageHeader
        title="هر مزه، یک تجربه"
        desc="مزه هلسا یعنی کنار هم نشستن طعم‌هایی که به‌تنهایی کامل‌اند، اما کنار هم خاطره می‌سازند؛ ترکیب‌های شور و شیرین، دست‌چین‌شده با وسواس."
        crumbs={[{ label: "خانه", href: "/" }, { label: "مزه هلسا", href: "/mazeh" }]}
      />

      {/* editorial intro */}
      <section className="container-x py-20 md:py-28 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center" aria-label="فلسفه مزه هلسا">
        <Reveal>
          <div className="rounded-2xl overflow-hidden border border-line/70 img-zoom">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/mazeh-board.jpg" alt="سینی مزه هلسا با ترکیب شور و شیرین" className="w-full aspect-[4/3] object-cover" fetchPriority="high" />
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <span className="text-[11px] font-bold tracking-[0.2em] text-gold-700">مزه هلسا</span>
          <h2 className="mt-4 text-3xl md:text-[40px] font-black leading-[1.4] text-heading">
            شیرین و شور،
            <br />
            در یک قاب ایرانی
          </h2>
          <p className="mt-6 text-sm md:text-[15px] leading-8 text-muted max-w-md">
            پنیر، زیتون، آجیل، خشکبار، خرما، شکلات خرمایی، میوه، کراکر، دیپ و عسل؛ ده ماده‌ای که در دست هلسا به یک تجربه پذیرایی تبدیل می‌شوند. ما ترکیب‌ها را می‌سنجیم تا هیچ طعمی بر طعم دیگر سایه نیندازد.
          </p>
          <div className="mt-8">
            <LinkButton href="/mazeh-trays" variant="primary" size="lg">
              کشف مزه‌ها
              <ArrowLeft className="size-4" aria-hidden />
            </LinkButton>
          </div>
        </Reveal>
      </section>

      {/* combinations */}
      <section className="bg-surface2/70 border-y border-line/60 py-20 md:py-28" aria-label="ترکیب‌های دست‌چین‌شده">
        <div className="container-x">
          <Reveal>
            <SectionHead eyebrow="ترکیب‌های دست‌چین‌شده" title="پنج پیوند طعمی که امتحان خود را پس داده‌اند" />
          </Reveal>
          <div className="space-y-4">
            {COMBOS.map((c, i) => (
              <Reveal key={c.a + c.b} delay={i * 0.05}>
                <Link href="/mazeh-trays" className="group grid md:grid-cols-[120px_1fr_auto] items-center gap-5 rounded-2xl bg-surface border border-line/70 p-4 md:p-5 card-hover">
                  <span className="rounded-xl overflow-hidden aspect-square md:aspect-[4/3] w-24 md:w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.image} alt={`${c.a} و ${c.b}`} loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                  </span>
                  <span>
                    <span className="flex items-center gap-2.5 text-[15px] font-black text-heading">
                      {c.a}
                      <Plus className="size-3.5 text-gold-500" aria-hidden />
                      {c.b}
                    </span>
                    <span className="mt-1.5 block text-xs text-muted">{c.note}</span>
                  </span>
                  <span className="hidden md:inline-flex items-center gap-2 text-xs font-bold text-brand-700">
                    مشاهده سینی
                    <ArrowLeft className="size-3.5 transition-transform duration-300 group-hover:-translate-x-1" aria-hidden />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-x py-20 md:py-24 text-center" aria-label="دعوت به کشف">
        <Reveal>
          <p className="text-[11px] font-bold tracking-[0.2em] text-gold-700">آماده چشیدن هستید؟</p>
          <h2 className="mt-4 text-3xl md:text-[36px] font-black leading-[1.4] text-heading">سینی مزه‌تان را انتخاب یا بسازید</h2>
          <div className="mt-8 flex justify-center flex-wrap gap-3">
            <LinkButton href="/mazeh-trays" variant="primary" size="lg">مشاهده سینی‌های آماده</LinkButton>
            <LinkButton href="/mazeh-trays/build" variant="outline" size="lg">سینی خودت را بساز</LinkButton>
          </div>
        </Reveal>
      </section>
    </>
  );
}
