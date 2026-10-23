"use client";
import { useEffect, useState } from "react";
import { SITE } from "@/config/site";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Heart, Share2, ShoppingBag, Truck, ShieldCheck, Snowflake, Check, Leaf, Thermometer,
  CalendarDays, Package, Zap, Bookmark, Award, Headset, BadgeCheck, ChevronDown,
  Building2, Clock3, Scale, FileText, Sparkles, MapPin,
} from "lucide-react";
import type { Product, ProductVariant } from "@/types";
import { trackEvent } from "@/lib/analytics";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { Badge, Price, QtyPicker, Stars, SectionHead } from "@/components/ui/primitives";
import { FieldLabel, TextArea, Select } from "@/components/ui/controls";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductGallery } from "@/components/product/ProductGallery";
import { FrequentlyBought } from "@/components/product/FrequentlyBought";
import { isOrganic, isWholesaleReady, isLowStock, isMadeInIran, deliveryEstimate } from "@/lib/product-flags";
import { toggleSaved, isSaved as isSavedSlug } from "@/lib/saved";
import { faDigits, formatToman, todayJalali } from "@/lib/format";
import { toEnglishDigits } from "@/lib/nid";

type ReviewItem = { id: string; name: string; date: string; rating: number; title: string; text: string };
export type FaqItem = { q: string; a: string };

const ALLOWED_BADGES = ["جدید", "پرفروش", "ویژه", "تخفیف"];

const TRUST = [
  { icon: ShieldCheck, title: "پرداخت امن", desc: "درگاه بانکی رسمی" },
  { icon: Truck, title: "ارسال سریع", desc: "تهران ۲۴ تا ۴۸ ساعته" },
  { icon: Leaf, title: "تضمین تازگی", desc: "تولید تا مصرف کوتاه" },
  { icon: Award, title: "ضمانت کیفیت", desc: "کنترل چندمرحله‌ای" },
  { icon: Headset, title: "پشتیبانی واقعی", desc: "۹ تا ۱۸، هر روز کاری" },
  { icon: BadgeCheck, title: "تأمین‌کننده تأییدشده", desc: "تولید بازرگانی هلسا ایرانیان" },
] as const;

export function ProductDetailClient({
  product,
  related,
  categoryName,
  faq,
}: {
  product: Product;
  related: Product[];
  categoryName?: string;
  faq: FaqItem[];
}) {
  const router = useRouter();
  const { addItem, toggleWishlist, wishlist, user } = useStore();
  const productId = product.id;
  const productName = product.name;
  const productPrice = product.price;
  useEffect(() => { trackEvent("view_item", { item_name: productName, item_id: productId, value: productPrice }); }, [productId, productName, productPrice]);
  const toast = useToast();
  const [qty, setQty] = useState(1);
  const [variantId, setVariantId] = useState<number | null>(product.variants?.[0]?.id ?? null);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState<string | null>("desc");

  const inWish = wishlist.includes(product.id);
  const gallery = product.gallery.length ? product.gallery : [product.image];
  const badge = product.badge && ALLOWED_BADGES.includes(product.badge) ? product.badge : null;
  const organic = isOrganic(product);
  const wholesale = isWholesaleReady(product);
  const lowStock = isLowStock(product);
  const iran = isMadeInIran(product);
  const delivery = deliveryEstimate();

  const feature = (label: string) => product.features.find((f) => f.label === label)?.value;
  // Batch expiry — block purchase when the (real) batch date has passed
  const enDigits = (s: string) => s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  const expiryValue = feature("تاریخ انقضا");
  const expired = expiryValue ? enDigits(expiryValue).replace(/\s/g, "") < todayJalali() : false;
  const variant = product.variants?.find((item) => item.id === variantId);
  const currentPrice = variant?.price ?? product.price;
  const currentOldPrice = variant?.compareAtPrice ?? product.oldPrice;
  const currentStock = variant?.stock ?? product.stock;
  const currentWeight = variant?.name ?? product.weight;

  const onAdd = (goCheckout = false) => {
    addItem(
      {
        key: variant ? `p-${product.id}-v-${variant.id}` : `p-${product.id}`,
        kind: "product",
        id: product.id,
        name: variant ? `${product.name} - ${variant.name}` : product.name,
        slug: product.slug,
        image: product.image,
        price: currentPrice,
        weight: currentWeight,
      },
      Math.min(qty, currentStock),
    );
    toast.push("محصول با موفقیت به سبد خرید اضافه شد");
    if (goCheckout) router.push("/checkout");
  };

  const onWish = () => {
    if (!user) return toast.push("برای افزودن به علاقه‌مندی‌ها ابتدا وارد حساب خود شوید", "info");
    const added = toggleWishlist(product.id);
    toast.push(added ? "محصول به علاقه‌مندی‌ها اضافه شد" : "محصول از علاقه‌مندی‌ها حذف شد", added ? "success" : "info");
  };

  const onSave = () => {
    const added = toggleSaved({ slug: product.slug, name: product.name, image: product.image, price: currentPrice });
    setSaved(added || isSavedSlug(product.slug));
    toast.push(added ? "در فهرست «بعداً می‌خرم» ذخیره شد" : "از فهرست «بعداً می‌خرم» حذف شد", added ? "success" : "info");
  };

  const onShare = async () => {
    const data = { title: product.name, text: `خرید ${product.name} از هلسا`, url: window.location.href };
    const nav: Navigator | undefined = typeof navigator !== "undefined" ? navigator : undefined;
    if (nav && "share" in nav) {
      try {
        await nav.share(data);
        return;
      } catch {
        /* user cancelled — fall through to copy */
      }
    }
    try {
      await nav?.clipboard.writeText(data.url);
      toast.push("لینک محصول کپی شد");
    } catch {
      toast.push("امکان اشتراک‌گذاری وجود ندارد", "error");
    }
  };

  const toggleAcc = (id: string) => setOpen((cur) => (cur === id ? null : id));

  return (
    <div className="container-x py-8 md:py-14">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-14 items-start">
        {/* ——— photography ——— */}
        <div className="lg:col-span-7">
          <ProductGallery
            images={gallery}
            alt={product.imageAlt || product.name}
            badgeSlot={
              <>
                {badge && <Badge tone={badge === "تخفیف" ? "accent" : "brand"}>{badge}</Badge>}
                {product.discount > 0 && <Badge tone="accent">{faDigits(product.discount)}٪ تخفیف</Badge>}
              </>
            }
          />
        </div>

        {/* ——— purchase panel ——— */}
        <div className="lg:col-span-5 lg:sticky lg:top-24">
          <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.18em] text-gold-700">
            <span>{categoryName || product.category}</span>
            <span className="size-1 rounded-full bg-gold-500/60" aria-hidden />
            <span className="text-muted tracking-normal">هلسا مارکت</span>
          </div>

          <h1 className="mt-3 text-[26px] md:text-[38px] font-black leading-[1.4] text-heading">{product.name}</h1>

          {/* concise, entity-rich summary (AEO/GEO answer block) */}
          <p className="mt-4 text-[13.5px] leading-8 text-muted">
            {product.name} با وزن {currentWeight}
            {product.origin ? ` و خاستگاه ${product.origin}` : ""}
            {organic ? "، کاملاً طبیعی و بدون افزودنی" : ""} از {categoryName || "منتخب‌های"} هلسا ایرانیان؛
            ارسال به سراسر ایران با بسته‌بندی حفظ تازگی.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
            {product.reviews > 0 && <Stars rating={product.rating} reviews={product.reviews} />}
            <span className="text-[11px] text-muted">کد کالا: <b dir="ltr" className="font-bold text-body">{product.sku}</b></span>
          </div>

          {/* provenance & fulfilment badges */}
          <div className="mt-5 flex flex-wrap gap-2">
            {organic && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-[10.5px] font-bold text-brand-700">
                <Leaf className="size-3.5" aria-hidden /> ۱۰۰٪ طبیعی
              </span>
            )}
            {iran && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[10.5px] font-bold text-body">
                <MapPin className="size-3.5 text-brand-600" aria-hidden /> تولید ایران
              </span>
            )}
            {wholesale && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-300 bg-gold-50 px-3 py-1.5 text-[10.5px] font-bold text-gold-700">
                <Building2 className="size-3.5" aria-hidden /> قابل خرید عمده
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[10.5px] font-bold text-body">
              <Package className="size-3.5 text-brand-600" aria-hidden /> بسته‌بندی {feature("نوع بسته‌بندی") ?? "استاندارد هلسا"}
            </span>
          </div>

          <span className="mt-7 block w-16 rule-gold" aria-hidden />

          {/* price + availability */}
          <div className="mt-6 rounded-[1.5rem] border border-line/70 bg-surface p-5 shadow-soft">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <Price price={currentPrice} oldPrice={currentOldPrice} size="lg" />
              <span className={`inline-flex items-center gap-1.5 text-[11.5px] font-bold ${currentStock > 0 ? "text-brand-700" : "text-accent-600"}`}>
                <span className={`size-2 rounded-full ${currentStock > 0 ? "bg-brand-500" : "bg-accent-500"} ${lowStock ? "animate-pulse" : ""}`} aria-hidden />
                {currentStock > 0 ? (lowStock ? `تنها ${faDigits(currentStock)} عدد باقی مانده` : `موجود در انبار · ${faDigits(currentStock)} عدد`) : "ناموجود"}
              </span>
            </div>

            {!!product.variants?.length && (
              <div className="mt-4" role="radiogroup" aria-label="انتخاب وزن یا طعم">
                <p className="mb-2 text-xs font-bold text-heading">انتخاب گونه</p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((item) => (
                    <button
                      key={item.id}
                      role="radio"
                      aria-checked={variantId === item.id}
                      disabled={item.stock <= 0}
                      onClick={() => { setVariantId(item.id); setQty(1); }}
                      className={`rounded-full border px-3.5 py-2 text-[11px] font-bold transition-colors disabled:opacity-40 ${variantId === item.id ? "border-brand-600 bg-brand-50 text-brand-700" : "border-line text-muted hover:border-brand-400"}`}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {expired && (
              <p role="alert" className="mt-4 rounded-xl border border-accent-300 bg-accent-50 px-4 py-3 text-xs font-bold leading-6 text-accent-700">
                تاریخ انقضای این محموله ({expiryValue}) گذشته است و فعلاً قابل خرید نیست.
              </p>
            )}
            <div className="mt-5 flex items-center gap-3">
              <QtyPicker value={qty} onChange={setQty} max={Math.max(currentStock, 1)} />
              <button
                onClick={() => onAdd(false)}
                disabled={currentStock <= 0 || expired}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-brand-700 text-sm font-bold text-inverse shadow-soft transition-all hover:bg-brand-800 hover:shadow-lift active:scale-[0.98] disabled:opacity-40"
              >
                <ShoppingBag className="size-4" aria-hidden /> افزودن به سبد خرید
              </button>
            </div>

            <button
              onClick={() => onAdd(true)}
              disabled={currentStock <= 0}
              className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full border border-brand-700/40 text-sm font-bold text-heading transition-all hover:border-brand-700 hover:bg-brand-50 active:scale-[0.99] disabled:opacity-40"
            >
              <Zap className="size-4 text-gold-700" aria-hidden /> خرید فوری
            </button>

            <Link
              href="/wholesale/register"
              className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full border border-dashed border-gold-400/80 bg-gold-50/60 text-[13px] font-bold text-gold-700 transition-all hover:border-gold-500 hover:bg-gold-50"
            >
              <Building2 className="size-4" aria-hidden /> استعلام قیمت عمده (B2B)
            </Link>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                onClick={onWish}
                aria-label={inWish ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
                aria-pressed={inWish}
                className={`flex h-10 items-center justify-center gap-1.5 rounded-full border text-[11px] font-bold transition-colors ${inWish ? "border-brand-600 bg-brand-700 text-inverse" : "border-line text-body hover:border-brand-500 hover:text-brand-700"}`}
              >
                <Heart className={`size-3.5 ${inWish ? "fill-current" : ""}`} aria-hidden /> علاقه‌مندی
              </button>
              <button
                onClick={onSave}
                aria-pressed={saved}
                className={`flex h-10 items-center justify-center gap-1.5 rounded-full border text-[11px] font-bold transition-colors ${saved ? "border-gold-500 bg-gold-500 text-brand-950" : "border-line text-body hover:border-gold-500 hover:text-gold-700"}`}
              >
                <Bookmark className="size-3.5" aria-hidden /> بعداً می‌خرم
              </button>
              <button
                onClick={onShare}
                aria-label="اشتراک‌گذاری محصول"
                className="flex h-10 items-center justify-center gap-1.5 rounded-full border border-line text-[11px] font-bold text-body transition-colors hover:border-brand-500 hover:text-brand-700"
              >
                <Share2 className="size-3.5" aria-hidden /> اشتراک
              </button>
            </div>
          </div>

          {/* delivery estimate */}
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-line/60 bg-surface2/60 px-4 py-3.5 text-[11.5px] leading-6 text-muted">
            <Clock3 className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden />
            <p>
              <b className="text-body">زمان تحویل تخمینی:</b> تهران {delivery.tehran}؛ سایر شهرها {delivery.cities}.
              <span className="text-faint"> با بسته‌بندی چندلایهٔ حفظ تازگی.</span>
            </p>
          </div>

          <ul className="mt-6 space-y-2.5 border-t border-line/80 pt-5 text-[11.5px] text-muted">
            <li className="flex items-center gap-2.5"><Truck className="size-4 shrink-0 text-brand-600" aria-hidden /> ارسال مطمئن با بسته‌بندی محافظ</li>
            <li className="flex items-center gap-2.5"><ShieldCheck className="size-4 shrink-0 text-brand-600" aria-hidden /> ضمانت اصالت و مهر سلامت هلسا</li>
            <li className="flex items-center gap-2.5"><Snowflake className="size-4 shrink-0 text-brand-600" aria-hidden /> نگهداری و ارسال متناسب با شرایط هر محصول</li>
          </ul>
        </div>
      </div>

      {/* ——— trust strip ——— */}
      <section className="mt-16" aria-label="مزیت‌های خرید از هلسا">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {TRUST.map((t) => (
            <li key={t.title} className="flex flex-col items-center gap-2 rounded-2xl border border-line/60 bg-surface px-3 py-5 text-center">
              <span className="grid size-11 place-items-center rounded-full bg-brand-50 text-brand-700"><t.icon className="size-5" aria-hidden /></span>
              <span className="text-[11.5px] font-black text-heading">{t.title}</span>
              <span className="text-[10px] leading-4 text-muted">{t.desc}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ——— details accordion ——— */}
      <div className="mt-14 space-y-3">
        <AccSection id="desc" open={open === "desc"} onToggle={toggleAcc} icon={<FileText className="size-4" aria-hidden />} title="توضیحات محصول">
          <div className="space-y-6 text-sm leading-8 text-body">
            <p>{product.description}</p>
            <p>
              {product.name} یکی از منتخب‌های {categoryName || "هلسا"} است که با کنترل کیفی چندمرحله‌ای — از برداشت تا بسته‌بندی نهایی — همراهی می‌شود.
            </p>
            <ul className="grid gap-3 pt-2 sm:grid-cols-2">
              {product.features.filter((f) => !["شرایط نگهداری", "تاریخ تولید", "تاریخ انقضا", "مواد اولیه", "نوع بسته‌بندی"].includes(f.label) && f.value && String(f.value).trim()).map((f) => (
                <li key={f.label} className="flex items-start gap-3 rounded-xl border border-line/70 bg-surface px-4 py-3">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden />
                  <div>
                    <p className="text-[10.5px] text-muted">{f.label}</p>
                    <p className="mt-0.5 text-[13px] font-bold text-heading">{f.value}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </AccSection>

        <AccSection id="specs" open={open === "specs"} onToggle={toggleAcc} icon={<Scale className="size-4" aria-hidden />} title="مشخصات">
          <dl className="grid gap-x-8 gap-y-0 text-sm sm:grid-cols-2">
            {[
              ["نام محصول", product.name],
              ["کد کالا (SKU)", product.sku],
              ["دسته‌بندی", categoryName ?? product.category],
              ["وزن / حجم", currentWeight],
              ["برند", product.brand ?? "هلسا ایرانیان"],
              ["کشور تولید", product.origin ?? "ایران"],
              ["بسته‌بندی", feature("نوع بسته‌بندی") ?? "استاندارد هلسا"],
              ["واحد فروش", product.unit ?? "عدد"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-4 border-b border-line/50 py-3">
                <dt className="text-xs text-muted">{k}</dt>
                <dd className="text-[13px] font-bold text-heading">{v}</dd>
              </div>
            ))}
          </dl>
        </AccSection>

        <AccSection id="ingredients" open={open === "ingredients"} onToggle={toggleAcc} icon={<Leaf className="size-4" aria-hidden />} title="ترکیبات">
          <div className="space-y-6">
            <p className="text-sm leading-8 text-body">
              <Leaf className="me-1.5 -mt-0.5 inline size-4 text-brand-600" aria-hidden />
              مواد اولیه: <b className="text-heading">{feature("مواد اولیه") ?? product.ingredients ?? "طبیعی و منتخب"}</b>؛ بدون افزودنی غیرضروری.
            </p>
            {product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.tags.map((t) => (
                  <span key={t} className="rounded-full border border-line bg-surface px-4 py-1.5 text-xs font-bold text-body">{t}</span>
                ))}
              </div>
            )}
            {product.allergens.length > 0 ? (
              <p className="rounded-xl border border-accent-500/30 bg-accent-500/10 px-4 py-3 text-xs font-bold text-accent-700">
                هشدار آلرژن: حاوی {product.allergens.join("، ")}
              </p>
            ) : (
              <p className="text-xs text-muted">این محصول آلرژن شناخته‌شده‌ای ندارد.</p>
            )}
          </div>
        </AccSection>

        {Array.isArray(product.nutrition) && product.nutrition.length > 0 && (
          <AccSection id="nutrition" open={open === "nutrition"} onToggle={toggleAcc} icon={<Sparkles className="size-4" aria-hidden />} title="ارزش غذایی">
            <div className="max-w-md overflow-hidden rounded-2xl border border-line/70 bg-surface">
              <p className="bg-brand-800 px-5 py-3 text-xs font-bold text-inverse">ارزش غذایی در هر ۱۰۰ گرم</p>
              <table className="w-full text-sm">
                <tbody>
                  {product.nutrition.map((n, i) => (
                    <tr key={n.label} className={i % 2 ? "bg-surface2" : ""}>
                      <td className="px-5 py-3 text-muted">{n.label}</td>
                      <td className="px-5 py-3 font-bold text-heading">{n.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t border-line/70 bg-surface2/50 px-5 py-2 text-[10.5px] leading-5 text-muted">
                مقادیر تقریبی بر پایهٔ جداول مرجع ترکیب مواد غذایی؛ در صورت دریافت آنالیز آزمایشگاهی تأمین‌کننده به‌روزرسانی می‌شود.
              </p>
            </div>
          </AccSection>
        )}

        <AccSection id="storage" open={open === "storage"} onToggle={toggleAcc} icon={<Thermometer className="size-4" aria-hidden />} title="شرایط نگهداری">
          <dl className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: Thermometer, label: "شرایط نگهداری", value: product.storage },
              { icon: Package, label: "نوع بسته‌بندی", value: feature("نوع بسته‌بندی") },
              { icon: CalendarDays, label: "تاریخ تولید", value: feature("تاریخ تولید") },
              { icon: CalendarDays, label: "تاریخ انقضا", value: feature("تاریخ انقضا") },
            ].filter((row) => row.value && String(row.value).trim()).map((row) => (
              <div key={row.label} className="flex items-start gap-3 rounded-xl border border-line/70 bg-surface px-4 py-3.5">
                <row.icon className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden />
                <div>
                  <dt className="text-[10.5px] text-muted">{row.label}</dt>
                  <dd className="mt-0.5 text-[13px] font-bold leading-6 text-heading">{row.value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </AccSection>

        <AccSection id="shipping" open={open === "shipping"} onToggle={toggleAcc} icon={<Truck className="size-4" aria-hidden />} title="ارسال و تحویل">
          <div className="space-y-3 text-sm leading-8 text-body">
            <p>سفارش‌های هلسا با بسته‌بندی چندلایه حفظ تازگی ارسال می‌شوند. تحویل در تهران {delivery.tehran} و در سایر شهرها {delivery.cities} انجام می‌شود.</p>
            <p className="text-xs leading-6 text-muted">ارسال سفارش‌های {formatToman(SITE.freeShippingThreshold)} و بالاتر رایگان است؛ هزینهٔ ارسال پیش از پرداخت به‌صورت شفاف نمایش داده می‌شود. امکان پیگیری لحظه‌ای سفارش از صفحه «پیگیری سفارش» وجود دارد.</p>
            <Link href="/shipping" className="inline-flex items-center gap-1.5 text-[12px] font-bold text-brand-600 hover:text-brand-700">
              شرایط کامل ارسال <ChevronDown className="size-3.5 -rotate-90" aria-hidden />
            </Link>
          </div>
        </AccSection>

        <AccSection id="wholesale" open={open === "wholesale"} onToggle={toggleAcc} icon={<Building2 className="size-4" aria-hidden />} title="خرید عمده (B2B)">
          <div className="space-y-4 text-sm leading-8 text-body">
            <p>این محصول از طریق پرتال عمده هلسا برای کسب‌وکارها قابل سفارش است: قیمت همکاری با تخفیف اختصاصی، فاکتور رسمی و سفارش تکراری.</p>
            <ul className="grid gap-2 text-xs leading-6 text-muted sm:grid-cols-2">
              <li className="rounded-xl border border-line/70 bg-surface px-4 py-3">حداقل هر خط سفارش: <b className="text-heading">۲ عدد</b></li>
              <li className="rounded-xl border border-line/70 bg-surface px-4 py-3">حداقل جمع سفارش: <b className="text-heading">۵٬۰۰۰٬۰۰۰ تومان</b></li>
            </ul>
            <Link href="/wholesale" className="inline-flex h-11 items-center gap-2 rounded-full bg-brand-700 px-6 text-[13px] font-bold text-inverse transition-colors hover:bg-brand-800">
              ورود به پرتال عمده هلسا
            </Link>
          </div>
        </AccSection>

        {faq.length > 0 && (
          <AccSection id="faq" open={open === "faq"} onToggle={toggleAcc} icon={<BadgeCheck className="size-4" aria-hidden />} title="پرسش‌های متداول">
            <div className="space-y-6">
              {faq.map((f) => (
                <div key={f.q}>
                  <h3 className="text-[13px] font-black text-heading">{f.q}</h3>
                  <p className="mt-2 text-[13px] leading-7 text-muted">{f.a}</p>
                </div>
              ))}
            </div>
          </AccSection>
        )}

        <AccSection id="reviews" open={open === "reviews"} onToggle={toggleAcc} icon={<Award className="size-4" aria-hidden />} title="نظرات خریداران">
          <ReviewsPanel product={product} />
        </AccSection>
      </div>

      {/* ——— intelligent sections ——— */}
      <FrequentlyBought product={product} pool={related} />

      {related.length > 0 && (
        <section className="mt-16 pt-14 border-t border-line/70" aria-label="محصولات مشابه">
          <SectionHead align="start" eyebrow="انتخاب هلسا" title="محصولات مشابه" desc={`اگر این محصول را می‌پسندید، این گزینه‌ها از ${categoryName || "همان خانواده"} هم با همان نگاه هلسا انتخاب شده‌اند.`} />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {related.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <RecommendedForYou category={product.category} excludeId={product.id} />

      <RecentlyViewed currentSlug={product.slug} />

      {/* sticky mobile purchase bar */}
      <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] inset-x-0 z-[65] border-t border-line/80 bg-surface/95 p-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] text-muted">{product.name}</p>
            <p className="truncate text-[15px] font-black tabular-nums text-heading">{formatToman(currentPrice)}</p>
          </div>
          <button
            onClick={() => onAdd(false)}
            disabled={currentStock <= 0}
            className="inline-flex h-11 items-center gap-1.5 rounded-full bg-brand-700 px-6 text-xs font-bold text-inverse disabled:opacity-40"
          >
            <ShoppingBag className="size-4" aria-hidden /> افزودن به سبد
          </button>
        </div>
      </div>
    </div>
  );
}

/* ——— accessible accordion section ——— */
function AccSection({
  id, open, onToggle, icon, title, children,
}: {
  id: string;
  open: boolean;
  onToggle: (id: string) => void;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`overflow-hidden rounded-2xl border bg-surface transition-colors ${open ? "border-brand-200 shadow-soft" : "border-line/70"}`}>
      <h2>
        <button
          type="button"
          onClick={() => onToggle(id)}
          aria-expanded={open}
          aria-controls={`acc-${id}`}
          className="flex w-full items-center gap-3 px-5 py-4.5 text-start md:px-6"
        >
          <span className={`grid size-9 shrink-0 place-items-center rounded-full transition-colors ${open ? "bg-brand-700 text-inverse" : "bg-brand-50 text-brand-700"}`}>{icon}</span>
          <span className="flex-1 text-[13.5px] font-black text-heading md:text-sm">{title}</span>
          <ChevronDown className={`size-4 shrink-0 text-muted transition-transform duration-400 ${open ? "rotate-180" : ""}`} aria-hidden />
        </button>
      </h2>
      <div id={`acc-${id}`} className="acc-panel" data-open={open} role="region" aria-label={title}>
        <div>
          <div className="px-5 pb-6 pt-1 md:px-6">{children}</div>
        </div>
      </div>
    </section>
  );
}

/* ——— recommended: bestsellers of the same category ——— */
function RecommendedForYou({ category, excludeId }: { category: string; excludeId: number }) {
  const [list, setList] = useState<Product[] | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/products")
      .then((r) => r.json())
      .then((d: { products: Product[] }) => {
        if (!alive) return;
        setList(
          d.products
            .filter((p) => p.id !== excludeId && p.category === category && p.stock > 0)
            .sort((a, b) => b.rating * b.reviews - a.rating * a.reviews)
            .slice(0, 4),
        );
      })
      .catch(() => { if (alive) setList([]); });
    return () => { alive = false; };
  }, [category, excludeId]);
  if (!list || list.length === 0) return null;
  return (
    <section className="mt-16" aria-label="پیشنهاد برای شما">
      <SectionHead align="start" eyebrow="منتخب مشتریان" title="پیشنهاد هلسا برای شما" desc="محبوب‌ترین محصولات این دسته در میان خریداران هلسا." />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {list.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}

function RecentlyViewed({ currentSlug }: { currentSlug: string }) {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [all, setAll] = useState<Product[]>([]);

  useEffect(() => {
    try {
      const prev = JSON.parse(localStorage.getItem("helsa-recent") ?? "[]") as string[];
      const next = [currentSlug, ...prev.filter((s) => s !== currentSlug)].slice(0, 8);
      localStorage.setItem("helsa-recent", JSON.stringify(next));
      // state mirrors external storage (localStorage) on slug change
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSlugs(next.filter((s) => s !== currentSlug));
    } catch {
      /* private mode */
    }
    fetch("/api/products")
      .then((r) => r.json())
      .then((d: { products: Product[] }) => setAll(d.products))
      .catch(() => setAll([]));
  }, [currentSlug]);

  const list = all.filter((p) => slugs.includes(p.slug)).slice(0, 4);
  if (!list.length) return null;
  return (
    <section className="mt-16" aria-label="اخیراً مشاهده‌شده">
      <SectionHead align="start" eyebrow="ادامه مرور" title="اخیراً مشاهده‌شده" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {list.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}

function ReviewsPanel({ product }: { product: Product }) {
  const { user, orders } = useStore();
  const toast = useToast();
  // نظرات نوشته‌شده فقط واقعی‌اند: تأییدشده‌ها از /api/reviews (GET)، نظر تازهٔ همین
  // نشست به‌صورت خوش‌بینانه بالای فهرست می‌نشیند. نمرهٔ کل و شمار نظراتِ سربرگ از
  // رکورد خودِ محصول می‌آید — همان منبعی که کارت‌ها و JSON-LD استفاده می‌کنند (منبع واحد).
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [form, setForm] = useState({ rating: 5, title: "", text: "" });
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  // مسیر مهمان — تأیید مالکیت موبایل با کد یک‌بارمصرف (بدون ساخت حساب)
  const [gPhone, setGPhone] = useState("");
  const [gCode, setGCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpHint, setOtpHint] = useState("");

  useEffect(() => {
    let alive = true;
    fetch(`/api/reviews?productId=${product.id}`)
      .then((r) => r.json())
      .then((d: { ok: boolean; reviews?: ReviewItem[] }) => {
        if (alive && d.ok && Array.isArray(d.reviews)) setReviews(d.reviews);
      })
      .catch(() => {
        /* خواندن نظرات ناموفق — فهرست خالی می‌ماند و فرم ثبت همچنان کار می‌کند */
      });
    return () => {
      alive = false;
    };
  }, [product.id]);

  const purchased = orders.some((o) => o.items.some((it) => it.name === product.name || it.key === `p-${product.id}`));

  const requestOtp = async () => {
    const phone = toEnglishDigits(gPhone).replace(/[\s-]/g, "");
    if (!/^09\d{9}$/.test(phone)) { toast.push("شمارهٔ موبایل معتبر نیست (مثال: ۰۹۱۲۳۴۵۶۷۸۹)", "error"); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const d = (await r.json()) as { ok: boolean; devCode?: string; message?: string };
      if (!d.ok) { toast.push(d.message ?? "ارسال کد انجام نشد", "error"); setBusy(false); return; }
      setOtpSent(true);
      setOtpHint(d.devCode ?? "");
      toast.push("کد تأیید ارسال شد");
    } catch { toast.push("ارسال کد انجام نشد؛ دوباره تلاش کنید", "error"); }
    setBusy(false);
  };

  const submit = async () => {
    const e: Record<string, string> = {};
    const phone = toEnglishDigits(gPhone).replace(/[\s-]/g, "");
    if (!user) {
      if (!/^09\d{9}$/.test(phone)) e.phone = "شمارهٔ موبایل را وارد کنید";
      else if (!otpSent) e.phone = "ابتدا کد تأیید را دریافت کنید";
      else if (!/^\d{4,8}$/.test(toEnglishDigits(gCode))) e.code = "کد تأیید را وارد کنید";
    }
    if (form.title.trim().length < 2) e.title = "عنوان را وارد کنید";
    if (form.text.trim().length < 5) e.text = "متن نظر را کامل‌تر بنویسید";
    setErr(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          author: user ? user.name : (form.title ? undefined : undefined),
          rating: form.rating,
          title: form.title,
          text: form.text,
          ...(!user ? { phone, otpCode: toEnglishDigits(gCode) } : {}),
        }),
      });
      const result = (await response.json()) as { ok: boolean; verifiedPurchase?: boolean; message?: string };
      if (!result.ok) {
        toast.push(result.message ?? "ثبت نظر انجام نشد؛ دوباره تلاش کنید", "error");
        setBusy(false);
        return;
      }
      setReviews((prev) => [{ id: `local-${Date.now()}`, name: user ? user.name : "شما", date: new Date().toISOString(), rating: form.rating, title: form.title, text: form.text, verifiedPurchase: result.verifiedPurchase }, ...prev]);
      setForm({ rating: 5, title: "", text: "" });
      setGCode(""); setOtpSent(false); setOtpHint("");
      toast.push(result.message ?? "نظر شما ثبت شد؛ پس از بررسی نمایش داده می‌شود");
    } catch {
      toast.push("متأسفانه در ثبت نظر مشکلی پیش آمد؛ دوباره تلاش کنید", "error");
    }
    setBusy(false);
  };

  return (
    <div className="max-w-3xl">
      {product.reviews > 0 && (
        <div className="mb-6 flex items-center gap-4">
          <p className="text-2xl font-black text-heading">{faDigits(Math.round(product.rating * 10) / 10)}</p>
          <div>
            <Stars rating={product.rating} reviews={product.reviews} />
            <p className="mt-1 text-[11px] text-muted">امتیاز از {faDigits(product.reviews)} نظر</p>
          </div>
        </div>
      )}
      {reviews.length === 0 && (
        <div className="mb-8 rounded-2xl border border-dashed border-line bg-surface2 p-6 text-center">
          <p className="text-sm font-black text-heading">اولین نظر تأییدشدهٔ این صفحه را شما بنویسید</p>
          <p className="mt-2 text-xs leading-6 text-muted">نظرها پس از بازبینی تیم هلسا منتشر می‌شوند. اگر این محصول را خریده‌اید، تجربهٔ خود را با دیگران به اشتراک بگذارید.</p>
        </div>
      )}

      <div className="mb-8 space-y-4">
        {reviews.map((r) => (
          <article key={r.id} className="rounded-2xl border border-line/70 bg-surface p-6">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-brand-50 font-black text-brand-700">م</span>
                <span>
                  <span className="flex items-center gap-2">
                    <span className="block text-sm font-bold text-heading">{r.name}</span>
                    {(r as { verifiedPurchase?: boolean }).verifiedPurchase && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[9.5px] font-bold text-brand-700">
                        <BadgeCheck className="size-3" aria-hidden /> خریدار تأییدشده
                      </span>
                    )}
                  </span>
                  <span className="block text-[11px] text-muted">{faDigits(r.date)}</span>
                </span>
              </span>
              <Stars rating={r.rating} />
            </div>
            <p className="mt-3 text-sm font-bold text-heading">{r.title}</p>
            <p className="mt-2 text-sm leading-8 text-body">{r.text}</p>
          </article>
        ))}
      </div>

      <div className="rounded-2xl border border-line bg-surface p-6">
        <h3 className="mb-4 text-sm font-black text-heading">ثبت نظر شما</h3>
        <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
          <FieldLabel text="امتیاز">
            <Select value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}>
              {[5, 4, 3, 2, 1].map((v) => <option key={v} value={v}>{faDigits(v)} ستاره</option>)}
            </Select>
          </FieldLabel>
          <FieldLabel text="عنوان" error={err.title}><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={rcls} placeholder="مثلاً عالی بود" /></FieldLabel>
        </div>
        <div className="mt-4">
          <FieldLabel text="متن نظر" error={err.text}><TextArea rows={4} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} placeholder="تجربه خود را بنویسید..." /></FieldLabel>
        </div>
        {!user && (
          <div className="mt-4 grid gap-4 rounded-2xl border border-dashed border-line bg-surface2/60 p-4 sm:grid-cols-2">
            <p className="sm:col-span-2 text-[11px] leading-6 text-muted">
              حساب کاربری لازم نیست — فقط شمارهٔ موبایل خود را با کد یک‌بارمصرف تأیید کنید تا نظر شما ثبت شود. اگر این محصول را خریده باشید، نشان «خریدار تأییدشده» می‌گیرد.
            </p>
            <FieldLabel text="شمارهٔ موبایل" error={err.phone}>
              <input value={gPhone} onChange={(e) => setGPhone(e.target.value)} inputMode="tel" dir="ltr" className={rcls} placeholder="۰۹۱۲۳۴۵۶۷۸۹" />
            </FieldLabel>
            <FieldLabel text={otpSent ? "کد تأیید (پیامک‌شده)" : "کد تأیید"} error={err.code}>
              <div className="flex gap-2">
                <input value={gCode} onChange={(e) => setGCode(e.target.value)} inputMode="numeric" dir="ltr" className={rcls} placeholder="۶ رقم" disabled={!otpSent} />
                <button type="button" onClick={requestOtp} disabled={busy || !/^09\d{9}$/.test(toEnglishDigits(gPhone).replace(/[\s-]/g, ""))} className="h-11 shrink-0 rounded-xl bg-brand-700 px-4 text-xs font-bold text-inverse transition-colors hover:bg-brand-800 disabled:opacity-50">
                  {otpSent ? "ارسال دوباره" : "دریافت کد"}
                </button>
              </div>
            </FieldLabel>
            {otpSent && otpHint && (
              <p className="sm:col-span-2 rounded-xl border border-dashed border-gold-400/60 bg-gold-50 p-2.5 text-[11px] font-bold text-gold-700">محیط تست (بدون پیامک واقعی) — کد تأیید: <span dir="ltr">{otpHint}</span></p>
            )}
          </div>
        )}
        <button onClick={submit} disabled={busy} className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-brand-700 px-6 text-sm font-bold text-inverse transition-colors hover:bg-brand-800 disabled:opacity-50">
          {busy ? "..." : user ? "ثبت نظر" : otpSent ? "ثبت نظر با کد تأیید" : "دریافت کد و ثبت نظر"}
        </button>
      </div>
    </div>
  );
}
const rcls = "w-full h-11 rounded-xl border border-line bg-surface2 px-4 text-sm text-heading outline-none transition-colors focus:border-brand-500";
