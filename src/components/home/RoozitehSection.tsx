import Link from "next/link";
import { Sprout, ShieldCheck, Handshake, ArrowLeft } from "lucide-react";
import { SmartImage } from "@/components/ui/SmartImage";
import { SectionHead } from "@/components/ui/primitives";

/**
 * «روزیته» — بخش صفحهٔ اصلی (درخواست کاربر ۲۰۲۶-۱۰-۲۲: «روزیته هم به منو اضافه کن
 * و تو صفحه لندینگ باشه»).
 *
 * قواعد رعایت‌شده:
 * • هیچ پروفایل/تولیدکنندهٔ ساختگی نمایش داده نمی‌شود؛ این بخش فقط معرفی برنامه و
 *   مسیر ثبت درخواست است و آمار ساختگی (تعداد تولیدکننده، درآمد، رضایت) ندارد.
 * • ادعای معافیت مالیاتی یا هر ادعای حقوقی تأییدنشده در متن نیست.
 * • تصویر: عکس واقعی کارگاه هلسا از مجموعهٔ مالک (`handmade-date-chocolate`).
 */
export function RoozitehSection() {
  return (
    <section className="py-16 md:py-20" aria-labelledby="rooziteh-home">
      <div className="container-x">
        <SectionHead
          eyebrow="روزیته · تولیدکنندگان کوچک"
          title="روزیته؛ کارگاه‌های کوچک با نام و نشان خودشان"
          desc="روزیته بخشی از هلساست برای دیده‌شدن تولیدکنندگان کوچک. هیچ پروفایلی بدون بررسی و تأیید هلسا منتشر نمی‌شود."
        />

        {/* بنر عریض بخش روزیته — ساخته‌شده از عکس واقعی محصولات مالک (final-v2/01) */}
        <Link href="/rooziteh" className="group relative mb-5 block overflow-hidden rounded-[1.75rem] border border-line/70 shadow-soft">
          <SmartImage
            src="/images/opt/rooziteh-banner.jpg"
            alt="شکلات دست‌ساز خرما از کارگاه هلسا — بنر معرفی روزیته"
            className="h-[240px] w-full object-cover transition-transform duration-700 group-hover:scale-[1.02] md:h-[300px]"
            sizes="100vw"
          />
          <span className="absolute inset-0 bg-gradient-to-l from-brand-950/85 via-brand-950/35 to-transparent" aria-hidden />
          <span className="absolute inset-y-0 start-5 end-5 flex flex-col justify-center gap-2 md:start-8 md:end-8">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-gold-400/40 bg-gold-500/15 px-3 py-1.5 text-[11px] font-bold text-gold-200">
              <Sprout className="size-3.5" aria-hidden /> روزیته
            </span>
            <span className="max-w-lg text-lg font-black leading-9 text-inverse md:text-2xl md:leading-[1.7]">تولیدکنندگان کوچک، با نام و نشان خودشان</span>
            <span className="max-w-md text-[11.5px] leading-6 text-inverse/80 md:text-[12.5px]">هر پروفایل پس از ثبت درخواست و بررسی هلسا منتشر می‌شود؛ محصولات از کارگاه‌های واقعی.</span>
            <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-gold-500 px-4 py-2 text-[11.5px] font-black text-heading">
              ورود به روزیته <ArrowLeft className="size-3.5" aria-hidden />
            </span>
          </span>
        </Link>

        <div className="grid items-stretch gap-5 lg:grid-cols-[1.15fr_1fr]">
          {/* کارت معرفی + مسیرها */}
          <div className="order-2 flex flex-col justify-between rounded-[1.75rem] border border-line/70 bg-surface p-6 shadow-soft md:p-8 lg:order-1">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-300 bg-brand-50 px-3.5 py-1.5 text-[11px] font-bold text-brand-800">
                <Sprout className="size-3.5" aria-hidden /> روزیته
              </span>
              <h2 id="rooziteh-home" className="mt-4 text-xl font-black leading-[1.6] text-heading md:text-2xl">
                هر پروفایل، متعلق به یک تولیدکنندهٔ واقعی است
              </h2>
              <p className="mt-3 text-[13px] leading-7 text-muted">
                تولیدکننده اطلاعاتش را خودش ثبت می‌کند؛ هلسا مدارک و اطلاعات تماس را بررسی می‌کند و تنها پس از تأیید،
                پروفایل و محصولات همان تولیدکننده منتشر می‌شود. اگر وضعیت یک پروفایل روشن نباشد، موقتاً از دسترس خارج می‌شود.
              </p>

              <ul className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  { Icon: ShieldCheck, title: "بررسی پیش از انتشار", body: "هیچ پروفایلی بدون تأیید منتشر نمی‌شود." },
                  { Icon: Handshake, title: "نام و نشان خودِ تولیدکننده", body: "منطقهٔ تولید و معرفی، از زبان خودش." },
                  { Icon: Sprout, title: "بدون عدد ساختگی", body: "تعداد تولیدکننده و آمار را فقط از دادهٔ واقعی می‌گوییم." },
                ].map(({ Icon, title, body }) => (
                  <li key={title} className="rounded-2xl border border-line bg-surface2 p-4">
                    <Icon className="size-4 text-brand-700" aria-hidden />
                    <p className="mt-2 text-[12px] font-black text-heading">{title}</p>
                    <p className="mt-1 text-[11px] leading-6 text-muted">{body}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/rooziteh"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-5 py-3 text-[12.5px] font-bold text-white transition-colors hover:bg-brand-800"
              >
                آشنایی با روزیته
                <ArrowLeft className="size-4" aria-hidden />
              </Link>
              <Link
                href="/rooziteh/apply"
                className="inline-flex items-center gap-2 rounded-xl border border-brand-600 px-5 py-3 text-[12.5px] font-bold text-brand-800 transition-colors hover:bg-brand-50"
              >
                ثبت درخواست تولیدکننده
              </Link>
            </div>
          </div>

          {/* تصویر واقعی مالک */}
          <div className="relative order-1 min-h-[260px] overflow-hidden rounded-[1.75rem] border border-line/70 bg-surface3 lg:order-2">
            <SmartImage
              src="/images/opt/hero-mazeh-tray.jpg"
              alt="سینی پذیرایی هلسا با محصولات کارگاه‌های کوچک — شکلات خرما، گردو، کشمش و انجیر"
              className="size-full object-cover"
              sizes="(min-width: 1024px) 45vw, 100vw"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-brand-950/55 via-transparent to-transparent" aria-hidden />
            <span className="absolute bottom-4 start-5 end-5 text-[11.5px] font-bold leading-6 text-inverse">
              محصولات روزیته، محصولات کارگاه‌های کوچک است — با نام خودشان.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
