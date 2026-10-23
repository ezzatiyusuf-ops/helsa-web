"use client";
import { useState } from "react";
import Link from "next/link";
import { Heart, ShoppingBag, Users, Ruler, Wine, Snowflake, Clock3, ShieldAlert, Wand2, ChevronLeft, Truck } from "lucide-react";
import type { MazehTray } from "@/types";
import { SECTION_LABELS } from "@/data/trays";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { Badge, Price, QtyPicker, Reveal } from "@/components/ui/primitives";
import { TrayCard } from "@/components/mazeh/TrayCard";
import { faDigits } from "@/lib/format";
import { trayVisual } from "@/lib/trayVisuals";

export function TrayDetailClient({ tray, related }: { tray: MazehTray; related: MazehTray[] }) {
  const { addItem, toggleWishlist, wishlist, user } = useStore();
  const toast = useToast();
  const [qty, setQty] = useState(1);
  const inWish = wishlist.includes(tray.id + 1000);
  const image = trayVisual(tray.slug, tray.image);
  const stock = tray.stock ?? 0;
  const available = tray.active !== false && stock > 0;

  const onAdd = () => {
    if (!available) {
      toast.push("این سینی در حال حاضر موجود نیست", "error");
      return;
    }
    addItem(
      { key: `t-${tray.id}`, kind: "tray", id: tray.id, name: tray.name, slug: tray.slug, image, price: tray.basePrice, meta: `برای ${faDigits(tray.servesMin)} تا ${faDigits(tray.servesMax)} نفر` },
      Math.min(qty, Math.max(stock, 1)),
    );
    toast.push("سینی مزه با موفقیت به سبد خرید اضافه شد");
  };
  const onWish = () => {
    if (!user) return toast.push("برای افزودن به علاقه‌مندی‌ها ابتدا وارد حساب خود شوید", "info");
    const added = toggleWishlist(tray.id + 1000);
    toast.push(added ? "محصول به علاقه‌مندی‌ها اضافه شد" : "محصول از علاقه‌مندی‌ها حذف شد", added ? "success" : "info");
  };

  const groups = Object.keys(SECTION_LABELS)
    .map((code) => ({ code, label: SECTION_LABELS[code], items: tray.contents.filter((c) => c.section === code) }))
    .filter((g) => g.items.length);

  return (
    <>
      <section className="container-x pt-12 md:pt-16 pb-6 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        <Reveal>
          <div className="relative rounded-2xl overflow-hidden border border-line/70 shadow-soft">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt={tray.name} className="w-full aspect-[4/3] object-cover" fetchPriority="high" />
            <span className="absolute top-4 start-4"><Badge tone="brand">امضای هلسا</Badge></span>
          </div>
        </Reveal>
        <Reveal delay={0.12}>
          <nav aria-label="مسیر صفحه" className="text-[11px] text-muted flex items-center gap-1.5">
            <Link href="/" className="hover:text-brand-700">خانه</Link>
            <ChevronLeft className="size-3" aria-hidden />
            <Link href="/mazeh-trays" className="hover:text-brand-700">سینی مزه هلسا</Link>
            <ChevronLeft className="size-3" aria-hidden />
            <span className="text-heading font-bold">{tray.name}</span>
          </nav>
          <h1 className="mt-4 text-3xl md:text-[42px] font-black text-heading leading-[1.4]">{tray.name}</h1>
          <p className="mt-4 text-sm md:text-[15px] leading-8 text-muted">{tray.shortDescription}</p>
          <div className="mt-5 flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full bg-surface2 border border-line px-3 py-1.5 text-body flex items-center gap-1.5"><Users className="size-3.5 text-gold-700" aria-hidden /> {faDigits(tray.servesMin)} تا {faDigits(tray.servesMax)} نفر</span>
            <span className="rounded-full bg-surface2 border border-line px-3 py-1.5 text-body flex items-center gap-1.5"><Ruler className="size-3.5 text-gold-700" aria-hidden /> اندازه {tray.size}</span>
            <span className="rounded-full bg-surface2 border border-line px-3 py-1.5 text-body flex items-center gap-1.5"><Snowflake className="size-3.5 text-gold-700" aria-hidden /> خودرو یخچال‌دار (تهران)</span>
          </div>
          <div className="mt-7 rounded-2xl bg-surface border border-line/70 p-6">
            <Price price={tray.basePrice} oldPrice={tray.oldPrice} size="lg" />
            <p className={`mt-2 text-[11px] font-bold ${available ? "text-brand-700" : "text-accent-600"}`}>
              {available ? `موجود · ${faDigits(stock)} سینی` : "ناموجود"}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <QtyPicker value={qty} onChange={setQty} max={Math.max(stock, 1)} />
              <button onClick={onAdd} disabled={!available} className="flex-1 min-w-44 h-12 rounded-full bg-brand-700 text-inverse text-sm font-bold hover:bg-brand-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40">
                <ShoppingBag className="size-4" aria-hidden /> افزودن به سبد
              </button>
              <button onClick={onWish} aria-label="علاقه‌مندی" className={`size-12 rounded-full border flex items-center justify-center transition-colors ${inWish ? "bg-brand-700 border-brand-700 text-inverse" : "border-line text-body hover:border-brand-500 hover:text-brand-700"}`}>
                <Heart className={`size-5 ${inWish ? "fill-current" : ""}`} aria-hidden />
              </button>
            </div>
            <Link href="/mazeh-trays/build" className="mt-3 w-full h-11 rounded-full border border-brand-700/40 text-heading text-xs font-bold flex items-center justify-center gap-2 hover:bg-brand-50 transition-colors">
              <Wand2 className="size-4" aria-hidden /> یا سینی دلخواه خودت را بساز
            </Link>
          </div>
        </Reveal>
      </section>

      <div className="container-x py-14 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-10">
          <section aria-label="معرفی سینی">
            <h2 className="text-xl font-black text-heading mb-4">درباره این سینی</h2>
            <p className="text-sm leading-8 text-body">{tray.description}</p>
          </section>

          <section aria-label="داخل این سینی چیست">
            <h2 className="text-xl font-black text-heading mb-5">داخل این سینی چیست؟</h2>
            <div className="space-y-5">
              {groups.map((g) => (
                <div key={g.code} className="rounded-2xl bg-surface border border-line p-5">
                  <h3 className="text-sm font-black text-accent-600 mb-3">{g.label}</h3>
                  <ul className="grid sm:grid-cols-2 gap-2.5">
                    {g.items.map((c) => (
                      <li key={c.title} className="flex items-center justify-between gap-3 rounded-xl bg-surface2 border border-line-soft px-4 py-2.5 text-xs">
                        <span className="font-bold text-heading">{c.title}</span>
                        <span className="text-muted shrink-0">{c.qty}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section aria-label="پیشنهاد نوشیدنی" className="rounded-2xl bg-brand-50 border border-brand-100 p-6">
            <h2 className="text-base font-black text-heading flex items-center gap-2"><Wine className="size-5 text-accent-600" aria-hidden /> پیشنهاد هلسا برای نوشیدنی</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {tray.pairings.map((p) => (
                <span key={p} className="rounded-full bg-surface border border-line px-4 py-2 text-xs font-bold text-body">{p}</span>
              ))}
            </div>
            <p className="mt-4 text-[11px] text-muted leading-6">
              سرو پیشنهادی: سینی را ۲۰ دقیقه پیش از پذیرایی از یخچال خارج کنید تا پنیرها به دمای مطلوب برسند؛ نوشیدنی گرم را جداگانه و تازه سرو کنید.
            </p>
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24">
          <div className="rounded-2xl bg-surface border border-line p-6">
            <h2 className="text-base font-black text-heading mb-4 flex items-center gap-2"><ShieldAlert className="size-5 text-accent-600" aria-hidden /> اطلاعات آلرژن‌ها</h2>
            <div className="flex flex-wrap gap-2">
              {tray.allergens.map((a) => (
                <span key={a} className="rounded-full bg-accent-500/10 border border-accent-500/30 px-3 py-1.5 text-[11px] font-bold text-accent-700">حاوی {a}</span>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-muted leading-6">این اطلاعات از پایگاه داده هلسا مدیریت می‌شود و در صورت تغییر ترکیب سینی به‌روز می‌گردد.</p>
          </div>
          <div className="rounded-2xl bg-surface border border-line p-6 space-y-4 text-xs text-body">
            <h2 className="text-base font-black text-heading">تازگی و نگهداری</h2>
            <p className="flex gap-2"><Snowflake className="size-4 text-brand-600 shrink-0 mt-0.5" aria-hidden /> {tray.storage}</p>
            <p className="flex gap-2"><Clock3 className="size-4 text-brand-600 shrink-0 mt-0.5" aria-hidden /> {tray.freshness}</p>
            <p className="flex gap-2"><Truck className="size-4 text-brand-600 shrink-0 mt-0.5" aria-hidden /> تحویل فقط در تهران، ۲۴ تا ۴۸ ساعت پیش از زمان مورد نظر شما، با خودرو یخچال‌دار و هماهنگی ساعت.</p>
          </div>
          <div className="rounded-2xl bg-surface border border-line p-6">
            <h2 className="text-base font-black text-heading mb-3">مناسب مناسبت‌ها</h2>
            <div className="flex flex-wrap gap-2">
              {tray.occasions.map((o) => (
                <span key={o} className="rounded-full bg-brand-50 border border-brand-100 px-3 py-1.5 text-[11px] font-bold text-brand-700">{o}</span>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="container-x pb-16" aria-label="سینی‌های مشابه">
          <h2 className="text-xl font-black text-heading mb-6">سینی‌های دیگر هلسا</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
            {related.map((t) => (
              <TrayCard key={t.slug} tray={t} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

