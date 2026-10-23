"use client";
/**
 * هیروی فروش‌محور هلسا — همان زبان بصری و مکانیک قبلی (crossfade بدون CLS، سوایپ،
 * کیبورد، نقطه‌ها، autoplay با توقف در هاور/فوکوس/تب مخفی)، اما هر اسلاید یک هدف
 * تجاری دارد: پرفروش واقعی · پیشنهاد ویژهٔ واقعی · سینی مزه · هدیه سازمانی · خرید عمده.
 * اسلایدهای محصولی از دادهٔ واقعی کاتالوگ ساخته می‌شوند (قیمت/تخفیف/موجودی واقعی)
 * و «افزودن به سبد» مستقیم از هیرو کار می‌کند. آمادهٔ کنترل ادمین: هر اسلاید
 * دارای id/active/start/end است (فیلتر تاریخ اعمال می‌شود؛ منبع داده فعلاً کاتالوگ).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { SmartImage } from "@/components/ui/SmartImage";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, ShoppingBag, Star } from "lucide-react";
import { LinkButton, Price } from "@/components/ui/primitives";
import { faDigits, formatToman, formatPriceShort } from "@/lib/format";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { trackEvent } from "@/lib/analytics";
import type { Product } from "@/types";

const ease = [0.22, 1, 0.36, 1] as const;
const AUTOPLAY_MS = 6500;

type HeroSlide = {
  id: string;
  image: string;
  alt: string;
  kicker: string;
  title: string;
  titleLine2: string;
  desc: string;
  cta: { label: string; href: string };
  cta2?: { label: string; href: string };
  /** افزودن مستقیم به سبد از هیرو (فقط اسلایدهای محصولی) */
  quickAdd?: Product;
  price?: number;
  oldPrice?: number | null;
  discount?: number;
  active?: boolean;
};

/** ساخت اسلایدهای هیرو — ویترین محصولیِ گردآوری‌شده (قابل نگهداشت، آمادهٔ کنترل ادمین).
 *  تصویر هر اسلاید بنرِ اختصاصی ۱۶:۹ برند است (منبع: public/images/gen/hero-*؛ تولیدشده
 *  با ارجاع به عکس واقعی همان محصول)؛ نام/قیمت/تخفیف/quickAdd همیشه از کاتالوگ واقعی
 *  می‌آید — تک‌منبعی دادهٔ تجاری حفظ می‌شود و سبدِ مستقیم فقط برای محصول موجود. */
function buildSlides(products: Product[]): HeroSlide[] {
  const bySlug = (slug: string) => products.find((x) => x.slug === slug);
  const sellable = (x?: Product) => (x && x.stock > 0 ? x : undefined);
  const firstSentence = (x: Product) => (x.shortDescription || x.description).split(/[؛.]/)[0].trim();

  const slides: HeroSlide[] = [];

  const piarom = bySlug("piaram-dates");
  if (piarom) {
    slides.push({
      id: "piarom",
      // بنر اختصاصی از مجموعهٔ عکس‌های ادیت‌شدهٔ مالک (hero-banner-v1) — ۱۴۰۰×۷۸۸
      image: "/images/opt/hero-piarom.jpg",
      alt: "خرما پیارم هلسا روی بشقاب سنگی تیره — چند خرما با بافت کاراملی",
      kicker: "پیشنهاد ویژهٔ هلسا",
      title: piarom.name,
      titleLine2: "پرمیوم‌ترین خرمای ایران",
      desc: firstSentence(piarom),
      cta: { label: "مشاهده محصول", href: `/products/${piarom.slug}` },
      quickAdd: sellable(piarom),
      price: piarom.price,
      oldPrice: piarom.oldPrice,
      discount: piarom.discount,
      active: true,
    });
  }

  const mazafati = bySlug("mazafati-dates");
  if (mazafati) {
    slides.push({
      id: "mazafati",
      image: "/images/opt/hero-mazafati.jpg",
      alt: "خرما مضافتی بم هلسا در ظرف سرامیکی کرم — نرم و شیرین با درخشش طبیعی",
      kicker: "خرمای ممتاز بم",
      title: mazafati.name,
      titleLine2: "نرم، آبدار و شیرین",
      desc: firstSentence(mazafati),
      cta: { label: "مشاهده محصول", href: `/products/${mazafati.slug}` },
      quickAdd: sellable(mazafati),
      price: mazafati.price,
      oldPrice: mazafati.oldPrice,
      discount: mazafati.discount,
      active: true,
    });
  }

  const choco = bySlug("handmade-date-chocolate");
  if (choco) {
    slides.push({
      id: "date-chocolate",
      image: "/images/opt/hero-date-chocolate.jpg",
      alt: "شکلات دست‌ساز خرمای هلسا — تکه‌های شکلات با مغز خرما",
      kicker: "دست‌سازِ هلسا",
      title: choco.name,
      titleLine2: "شکلات واقعی، خرمای واقعی",
      desc: firstSentence(choco),
      cta: { label: "مشاهده محصول", href: `/products/${choco.slug}` },
      quickAdd: sellable(choco),
      price: choco.price,
      oldPrice: choco.oldPrice,
      discount: choco.discount,
      active: true,
    });
  }

  slides.push(
    {
      id: "nuts-dried-fruits",
      // B-02 رفع شد: بنر اختصاصی از مجموعهٔ مالک (hero-banner-v1/hero-nuts-dried-fruits) اکنون موجود است.
      image: "/images/opt/hero-nuts-dried-fruits.jpg",
      alt: "چیدمان آجیل و خشکبار هلسا — مغز گردو، کشمش سبز طلایی و انجیر خشک روی سنگ کرم",
      kicker: "آجیل و خشکبار هلسا",
      title: "بهترین‌های آجیل و خشکبار",
      titleLine2: "گردو، کشمش و انجیر",
      desc: "مغز گردوی چهارپره، کشمش سبز طلایی و انجیر خشک استهبان — طبیعی و تازه، با بسته‌بندی شکیل.",
      cta: { label: "مشاهدهٔ آجیل و خشکبار", href: "/products?cat=nuts-dried-fruits" },
      cta2: { label: "همهٔ محصولات", href: "/products" },
      active: true,
    },
    {
      id: "tray-builder",
      // B-02 رفع شد: بنر اختصاصی از مجموعهٔ مالک (hero-banner-v1/hero-mazeh-tray) اکنون موجود است.
      image: "/images/opt/hero-mazeh-tray.jpg",
      alt: "سینی پذیرایی هلسا با شکلات خرما، گردو، کشمش و انجیر روی سینی چوبی گردو",
      kicker: "سینی مزه‌های هلسا",
      title: "سینی مزه خودت را بساز",
      titleLine2: "مزه‌های مورد علاقه‌ات را انتخاب کن",
      desc: "اندازه، مزه‌ها و تزئینات به انتخاب شما — با قیمت زنده و دقیق، آمادهٔ پذیرایی.",
      cta: { label: "ساخت سینی", href: "/mazeh-trays/tray-builder" },
      cta2: { label: "سینی‌های آماده", href: "/mazeh-trays" },
      active: true,
    },
  );

  return slides.filter((s) => s.active !== false);
}

export function Hero({ products }: { products: Product[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [added, setAdded] = useState(false);
  const touchX = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();
  const addItem = useStore((s) => s.addItem);
  const toast = useToast();

  const SLIDES = useMemo(() => buildSlides(products), [products]);
  const total = SLIDES.length;
  const slide = SLIDES[Math.min(active, total - 1)];

  const go = useCallback((n: number) => setActive((a) => (n + total) % total), [total]);

  // autoplay — فقط وقتی دیده می‌شود و pause نیست؛ با prefers-reduced-motion به‌کلی متوقف
  useEffect(() => {
    if (paused || reduceMotion || typeof document === "undefined" || document.hidden) return;
    const id = window.setInterval(() => setActive((a) => (a + 1) % total), AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [paused, reduceMotion, total]);

  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // impression آنالیتیکس (§14) — هر بار اسلاید فعال عوض شود
  const slideId = slide?.id;
  useEffect(() => {
    if (slideId) trackEvent("hero_slide_view", { slide: slideId });
  }, [slideId]);

  const onQuickAdd = () => {
    if (!slide?.quickAdd) return;
    addItem(
      {
        key: `p-${slide.quickAdd.id}`,
        kind: "product",
        id: slide.quickAdd.id,
        name: slide.quickAdd.name,
        slug: slide.quickAdd.slug,
        image: slide.quickAdd.image,
        price: slide.quickAdd.price,
        weight: slide.quickAdd.weight,
      },
      1,
    );
    trackEvent("hero_quick_add", { item_name: slide.quickAdd.name, value: slide.quickAdd.price, slide: slide.id });
    toast.push("به سبد خرید اضافه شد");
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); go(active + 1); } // RTL: چپ = بعدی
    else if (e.key === "ArrowRight") { e.preventDefault(); go(active - 1); }
  };

  if (!slide) return null;

  return (
    <section
      className="relative bg-surface overflow-hidden"
      aria-label="پیشنهادهای ویژه هلسا"
      aria-roledescription="اسلایدر"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={onKeyDown}
    >
      <div className="grid lg:grid-cols-12 lg:h-[480px]">
        {/* photograph column — crossfade slider (RTL: order-2) */}
        <div
          className="relative lg:order-2 lg:col-span-7 h-[240px] sm:h-[300px] lg:h-auto"
          onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 48) go(dx > 0 ? active - 1 : active + 1); // RTL: کشیدن به چپ = بعدی
            touchX.current = null;
          }}
        >
          {SLIDES.map((s, i) => (
            <motion.div
              key={s.id}
              initial={false}
              animate={{ opacity: i === active ? 1 : 0 }}
              transition={{ duration: 0.9, ease }}
              aria-hidden={i !== active}
              className="absolute inset-0"
            >
              <SmartImage
                src={s.image}
                alt={s.alt}
                sizes="(min-width: 1024px) 58vw, 100vw"
                priority={i === 0}
                className="absolute inset-0 size-full object-cover"
              />
              {/* بج تخفیف واقعی روی تصویر */}
              {i === active && s.discount && s.discount > 0 && (
                <span className="absolute top-4 start-4 z-10 rounded-full bg-accent-600 px-3 py-1.5 text-[11px] font-black text-inverse shadow-lift">
                  {faDigits(s.discount)}٪ تخفیف
                </span>
              )}
            </motion.div>
          ))}

          {/* soft cream feather toward the text column (desktop) */}
          <div className="hidden lg:block absolute inset-y-0 start-0 w-40 bg-gradient-to-l from-canvas to-transparent" aria-hidden />
          {/* soft feather toward the text on mobile */}
          <div className="lg:hidden absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-canvas to-transparent" aria-hidden />

          {/* slider controls — glass chips, bottom of image */}
          <div className="absolute bottom-4 inset-x-4 z-10 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-ink-950/70 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur-md" aria-live="polite">
              {faDigits(active + 1)} / {faDigits(total)}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => go(active - 1)}
                aria-label="اسلاید قبلی"
                className="inline-flex size-9 items-center justify-center rounded-full border border-white/25 bg-ink-950/70 text-white backdrop-blur-md transition-colors hover:bg-ink-950/55 active:scale-95"
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => go(active + 1)}
                aria-label="اسلاید بعدی"
                className="inline-flex size-9 items-center justify-center rounded-full border border-white/25 bg-ink-950/70 text-white backdrop-blur-md transition-colors hover:bg-ink-950/55 active:scale-95"
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>

        {/* text column — per-slide content, same motion language */}
        <div className="relative lg:order-1 lg:col-span-5 flex items-center">
          <div className="pattern-persian absolute top-0 start-0 w-56 h-56 opacity-70 pointer-events-none" aria-hidden />
          <div className="relative w-full px-6 md:px-12 lg:ps-14 lg:pe-8 py-8 lg:py-8">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={slide.id}>
                <motion.p
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.45, ease }}
                  className="text-[11px] font-bold tracking-[0.25em] text-gold-700"
                >
                  {slide.kicker}
                </motion.p>

                <motion.h1
                  initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5, delay: 0.06, ease }}
                  className="mt-3 text-[26px] min-[390px]:text-[29px] md:text-[38px] lg:text-[40px] font-black leading-[1.45] text-heading"
                >
                  {slide.title}
                  <br />
                  {slide.titleLine2}
                </motion.h1>

                <motion.span
                  initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ duration: 0.5, delay: 0.16, ease }}
                  className="mt-4 block w-16 rule-gold origin-right"
                  aria-hidden
                />

                <motion.p
                  initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.5, delay: 0.18, ease }}
                  className="mt-3 max-w-md text-sm md:text-[15px] leading-7 text-muted"
                >
                  {slide.desc}
                </motion.p>

                {/* قیمت واقعی (فقط اسلایدهای محصولی) */}
                {typeof slide.price === "number" && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.22, ease }}
                    className="mt-3 flex flex-wrap items-baseline gap-2"
                  >
                    <Price price={slide.price} oldPrice={slide.oldPrice} size="lg" />
                  </motion.p>
                )}

                <motion.div
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.5, delay: 0.28, ease }}
                  className="mt-5 flex flex-wrap items-center gap-3"
                >
                  <LinkButton
                    href={slide.cta.href}
                    variant="primary"
                    size="lg"
                    onClick={() => trackEvent("hero_slide_click", { slide: slide.id, target: slide.cta.href })}
                  >
                    {slide.cta.label}
                  </LinkButton>
                  {slide.quickAdd ? (
                    <button
                      type="button"
                      onClick={onQuickAdd}
                      className="inline-flex h-11 items-center gap-2 rounded-full border border-brand-300 bg-surface px-6 text-[13px] font-bold text-brand-700 transition-colors hover:border-brand-500 hover:bg-brand-50"
                    >
                      {added ? <Check className="size-4" aria-hidden /> : <ShoppingBag className="size-4" aria-hidden />}
                      {added ? "به سبد اضافه شد" : "افزودن به سبد"}
                    </button>
                  ) : (
                    slide.cta2 && (
                      <LinkButton href={slide.cta2.href} variant="outline" size="lg">
                        {slide.cta2.label}
                        <ArrowLeft className="size-4" aria-hidden />
                      </LinkButton>
                    )
                  )}
                </motion.div>
              </motion.div>
            </AnimatePresence>

            {/* نشان اعتماد برند — در ستون محتوا (پس از CTA)؛ سلسله‌مراتب: عنوان ← مزیت ← CTA ← اعتماد ← ناوبری.
                قبلاً به‌صورت شناور روی گوشهٔ پایینِ startِ عکس بود و دقیقاً روی شمارهٔ اسلاید می‌افتاد (برخورد §۶۹). */}
            <p className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-brand-300/70 bg-surface px-3.5 py-1.5 text-[11.5px] font-bold text-brand-700">
              <Star className="size-3.5 text-gold-500" aria-hidden />
              کیفیت ممتاز مواد اولیه
            </p>

            {/* pagination dots */}
            <div className="mt-4 flex items-center gap-1" role="tablist" aria-label="انتخاب اسلاید">
              {SLIDES.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  aria-label={`اسلاید ${faDigits(i + 1)}: ${s.titleLine2}`}
                  onClick={() => go(i)}
                  className="group grid size-6 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                >
                  <span
                    className={`block h-2 rounded-full transition-all duration-300 ${i === active ? "w-7 bg-brand-700" : "w-2 bg-line group-hover:bg-brand-300"}`}
                  />
                </button>
              ))}
            </div>

            <motion.ul
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-4 pt-3.5 border-t border-line/80 hidden sm:flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-muted"
            >
              <li>طبیعی و بدون افزودنی غیرضروری</li>
              <li className="size-1 rounded-full bg-gold-500/70" aria-hidden />
              <li>بسته‌بندی شکیل</li>
              <li className="size-1 rounded-full bg-gold-500/70" aria-hidden />
              <li>ارسال مطمئن</li>
            </motion.ul>
          </div>
        </div>
      </div>
    </section>
  );
}
