import type { Metadata } from "next";
import Link from "next/link";
import { Sprout, MapPin, ArrowLeft, ShieldCheck, Handshake, Scale } from "lucide-react";
import { listPublishedProducers } from "@/services/rooziteh";

/** روزیته — لندینگ. اگر تولیدکنندهٔ منتشرشده نباشد، وضعیت واقعی نشان داده می‌شود. */
export const metadata: Metadata = {
  title: "روزیته | هلسا ایرانیان — تولیدکنندگان کوچک، محصولات واقعی",
  description: "روزیته برنامهٔ هلسا برای معرفی تولیدکنندگان کوچک است: پروفایل، منطقهٔ تولید و محصولات واقعی هر تولیدکننده، پس از بررسی و تأیید هلسا.",
  alternates: { canonical: "/rooziteh" },
};

const STEPS = [
  { title: "درخواست تولیدکننده", body: "تولیدکننده فرم عضویت را پر می‌کند: منطقه، حوزهٔ تولید و معرفی از زبان خودش." },
  { title: "بررسی هلسا", body: "مدارک و اطلاعات تماس بررسی می‌شود. بدون تأیید، هیچ پروفایلی منتشر نمی‌شود." },
  { title: "انتشار پروفایل", body: "پس از تأیید، پروفایل و محصولات تأییدشدهٔ همان تولیدکننده نمایش داده می‌شود." },
  { title: "نظارت مستمر", body: "در صورت بروز مشکل، پروفایل موقتاً از دسترس خارج می‌شود تا وضعیت روشن شود." },
];

export default async function RoozitehPage() {
  const producers = await listPublishedProducers();
  return (
    <div className="container-x py-12">
      <header className="mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand-300 bg-brand-50 px-3.5 py-1.5 text-[11px] font-bold text-brand-800"><Sprout className="size-3.5" aria-hidden /> روزیته</span>
        <h1 className="mt-4 text-2xl font-black leading-tight text-heading md:text-3xl">تولیدکنندگان کوچک، با نام و نشان خودشان</h1>
        <p className="mt-3 text-sm leading-7 text-muted">
          روزیته بخشی از هلساست برای دیده‌شدن کارگاه‌ها و تولیدکنندگان کوچک. هر پروفایل متعلق به یک تولیدکنندهٔ واقعی است
          که اطلاعاتش را خودش ثبت کرده و هلسا آن را بررسی و تأیید کرده است.
        </p>
      </header>

      <section aria-labelledby="how" className="mt-12">
        <h2 id="how" className="text-base font-black text-heading">روزیته چطور کار می‌کند؟</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-2xl border border-line bg-surface p-5">
              <span className="grid size-8 place-items-center rounded-full bg-brand-50 text-xs font-black text-brand-800">{i + 1}</span>
              <p className="mt-3 text-sm font-black text-heading">{s.title}</p>
              <p className="mt-1.5 text-[11px] leading-6 text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="list" className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="list" className="text-base font-black text-heading">تولیدکنندگان روزیته</h2>
            <p className="mt-1 text-[11px] text-muted">فقط پروفایل‌های تأییدشده و منتشرشده اینجا دیده می‌شوند.</p>
          </div>
          <Link href="/rooziteh/apply" className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-xs font-bold text-white">ثبت درخواست تولیدکننده <ArrowLeft className="size-3.5" aria-hidden /></Link>
        </div>

        {producers.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-line bg-surface2 p-8 text-center">
            <Sprout className="mx-auto size-8 text-brand-700" aria-hidden />
            <p className="mt-3 text-sm font-black text-heading">هنوز تولیدکننده‌ای در روزیته منتشر نشده است</p>
            <p className="mx-auto mt-2 max-w-md text-[11px] leading-6 text-muted">
              این بخش فقط پروفایل‌های تأییدشده را نمایش می‌دهد و ما پروفایل نمونه یا ساختگی نمی‌سازیم.
              اگر تولیدکننده یا کارگاه هستید، درخواست‌تان را ثبت کنید تا بررسی شود.
            </p>
            <Link href="/rooziteh/apply" className="mt-4 inline-block rounded-xl border border-brand-600 px-4 py-2 text-xs font-bold text-brand-800">ثبت درخواست</Link>
          </div>
        ) : (
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {producers.map((p) => (
              <li key={p.slug}>
                <Link href={`/rooziteh/${encodeURIComponent(p.slug)}`} className="group block h-full overflow-hidden rounded-2xl border border-line bg-surface hover:border-brand-300">
                  <div className="aspect-[16/9] w-full bg-surface3">
                    {p.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.coverImage} alt={`تصویر ${p.displayName}`} className="size-full object-cover" />
                    ) : <div className="grid size-full place-items-center text-[11px] text-faint">بدون تصویر</div>}
                  </div>
                  <div className="p-4">
                    <p className="text-sm font-black text-heading">{p.displayName}</p>
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-muted"><MapPin className="size-3" aria-hidden /> {p.region}{p.craft ? ` · ${p.craft}` : ""}</p>
                    <p className="mt-2 line-clamp-2 text-[11px] leading-6 text-muted">{p.bio}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="rules" className="mt-12 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-surface p-5">
          <ShieldCheck className="size-4 text-brand-700" aria-hidden />
          <p className="mt-2 text-xs font-black text-heading">بدون تأیید منتشر نمی‌شود</p>
          <p className="mt-1 text-[11px] leading-6 text-muted">هیچ پروفایلی پیش از بررسی هلسا در روزیته دیده نمی‌شود.</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-5">
          <Handshake className="size-4 text-brand-700" aria-hidden />
          <p className="mt-2 text-xs font-black text-heading">اطلاعات از خود تولیدکننده</p>
          <p className="mt-1 text-[11px] leading-6 text-muted">معرفی، منطقه و حوزهٔ تولید را خودِ تولیدکننده ثبت می‌کند؛ هلسا آن را بازنویسی یا بزرگ‌نمایی نمی‌کند.</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-5">
          <Scale className="size-4 text-brand-700" aria-hidden />
          <p className="mt-2 text-xs font-black text-heading">ادعاهای تأییدنشده، نشان نمی‌گیرند</p>
          <p className="mt-1 text-[11px] leading-6 text-muted">هر ادعای گواهی یا تأثیر اجتماعی با برچسب «اعلام تولیدکننده» نمایش داده می‌شود؛ نشان رسمی هلسا نیست.</p>
        </div>
      </section>

      <p className="mt-8 text-center text-[11px] text-muted">
        قیمت‌ها از پایگاه‌دادهٔ فروشگاه خوانده می‌شوند؛ در این صفحه هیچ قیمت یا محصول نمونه‌ای ساخته نمی‌شود.
      </p>
      <p className="mt-2 text-center text-[11px] text-muted">
        شرایط عضویت و مسئولیت تولیدکننده در بخش «روزیته و تولیدکنندگان» و «ایمنی غذا و برچسب» صفحهٔ{" "}
        <Link href="/terms" className="font-bold text-brand-700 underline decoration-brand-300 underline-offset-4">قوانین و مقررات</Link> آمده است.
      </p>
    </div>
  );
}
