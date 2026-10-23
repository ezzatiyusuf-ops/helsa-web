import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, BadgeCheck, Info, ArrowLeft } from "lucide-react";
import { getPublishedProducer } from "@/services/rooziteh";
import { formatToman } from "@/lib/format";

/** پروفایل عمومی تولیدکنندهٔ روزیته — فقط published (وگرنه 404). */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublishedProducer(decodeURIComponent(slug));
  if (!data) return { title: "روزیته | هلسا ایرانیان" };
  const p = data.producer;
  return { title: `${p.displayName} | روزیته — هلسا ایرانیان`, description: p.bio.slice(0, 160), alternates: { canonical: `/rooziteh/${p.slug}` } };
}

export default async function ProducerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPublishedProducer(decodeURIComponent(slug));
  if (!data) notFound();
  const { producer, products } = data;

  return (
    <div className="container-x py-10">
      <nav aria-label="مسیر" className="mb-5 flex flex-wrap items-center gap-2 text-[11px] text-muted">
        <Link href="/rooziteh" className="font-bold text-brand-700">روزیته</Link>
        <span aria-hidden>/</span>
        <span>{producer.displayName}</span>
      </nav>

      <header className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="aspect-[21/7] w-full bg-surface3">
          {producer.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={producer.coverImage} alt={`تصویر ${producer.displayName}`} className="size-full object-cover" />
          ) : <div className="grid size-full place-items-center text-[11px] text-faint">تصویر معرفی ثبت نشده است</div>}
        </div>
        <div className="p-6">
          <div className="flex flex-wrap items-start gap-4">
            {producer.avatarImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={producer.avatarImage} alt={producer.displayName} className="size-16 rounded-2xl border border-line object-cover" />
            ) : null}
            <div className="min-w-0">
              <h1 className="text-xl font-black text-heading">{producer.displayName}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                <span className="inline-flex items-center gap-1"><MapPin className="size-3" aria-hidden /> {producer.region}</span>
                {producer.craft ? <span>{producer.craft}</span> : null}
                <span className="inline-flex items-center gap-1 text-brand-700"><BadgeCheck className="size-3.5" aria-hidden /> پروفایل بررسی‌شدهٔ هلسا</span>
              </p>
            </div>
          </div>

          <p className="mt-4 text-sm leading-7 text-heading">{producer.bio}</p>
          {producer.story ? (
            <div className="mt-4 rounded-xl border border-line-soft bg-surface2 p-4">
              <p className="text-[11px] font-black text-heading">داستان کارگاه</p>
              <p className="mt-1.5 whitespace-pre-line text-[12px] leading-7 text-muted">{producer.story}</p>
            </div>
          ) : null}
          {producer.socialImpact ? (
            <div className="mt-3 rounded-xl border border-line-soft bg-surface2 p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-black text-heading"><Info className="size-3.5" aria-hidden /> تأثیر اجتماعی (اعلام تولیدکننده)</p>
              <p className="mt-1.5 whitespace-pre-line text-[12px] leading-7 text-muted">{producer.socialImpact}</p>
            </div>
          ) : null}
          {producer.certifications.length ? (
            <div className="mt-3">
              <p className="text-[11px] font-black text-heading">گواهی‌های اعلام‌شده توسط تولیدکننده</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {producer.certifications.map((c) => (<li key={c} className="rounded-full border border-line bg-surface2 px-3 py-1 text-[10.5px] text-muted">{c}</li>))}
              </ul>
              <p className="mt-2 text-[10px] text-faint">این گواهی‌ها ادعای خود تولیدکننده است و توسط هلسا صادر یا تأیید نشده است.</p>
            </div>
          ) : null}
        </div>
      </header>

      <section aria-labelledby="products" className="mt-8">
        <h2 id="products" className="text-base font-black text-heading">محصولات این تولیدکننده در هلسا</h2>
        {products.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-line bg-surface2 p-6 text-center text-[11px] text-muted">هنوز محصولی از این تولیدکننده در فروشگاه منتشر نشده است.</p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((p) => (
              <li key={p.id}>
                <Link href={`/products/${encodeURIComponent(p.slug)}`} className="group block h-full overflow-hidden rounded-2xl border border-line bg-surface hover:border-brand-300">
                  <div className="aspect-square w-full bg-surface3">
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image} alt={p.imageAlt || p.name} className="size-full object-cover" />
                    ) : null}
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-black text-heading">{p.name}</p>
                    {p.weight ? <p className="mt-0.5 text-[10px] text-muted">{p.weight}</p> : null}
                    <p className="mt-2 text-sm font-black text-brand-700">{formatToman(p.price)}</p>
                    <p className="mt-1 text-[10px] text-muted">{p.stock > 0 ? "موجود" : "ناموجود"}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-8 text-center">
        <Link href="/rooziteh" className="inline-flex items-center gap-2 text-xs font-bold text-brand-700">بازگشت به روزیته <ArrowLeft className="size-3.5" aria-hidden /></Link>
      </div>
    </div>
  );
}
