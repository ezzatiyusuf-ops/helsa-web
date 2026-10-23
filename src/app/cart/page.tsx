"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ShoppingBag, Trash2, TicketPercent, ShieldCheck, Truck, Headset, Leaf, PackageCheck, Gift, Loader2, Send, Heart } from "lucide-react";
import { TrustBadges } from "@/components/ui/TrustBadges";
import { useStore, cartSubtotal, couponDiscount, shippingFee } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { formatToman, faDigits } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { LinkButton } from "@/components/ui/primitives";
import { SITE } from "@/config/site";
import { useLang, IconForward } from "@/lib/i18n";
import { CartUpsell } from "@/components/cart/CartUpsell";
import { EmptyCartSuggestions } from "@/components/cart/EmptyCartSuggestions";
import { CheckoutSteps } from "@/components/cart/CheckoutSteps";
import { trackEvent } from "@/lib/analytics";

/**健康状况 یک قلم سبد در برابر دادهٔ سرور (قیمت/موجودی واقعی) */
interface ItemCheck {
  key: string;
  checked: boolean;
  available?: boolean;
  price?: number;
  stock?: number;
  lowStock?: number;
  maxQty?: number;
}

interface ShippingMethod {
  code: string;
  label: string;
  description: string;
  estimatedTime: string;
  price: number;
}

const EMPTY_SHORTCUTS = [
  { label: "پرفروش‌ها", href: "/products?sort=popular" },
  { label: "خرما", href: "/products?cat=dates" },
  { label: "آجیل و خشکبار", href: "/products?cat=nuts-dried-fruits" },
  { label: "شکلات خرما", href: "/products?cat=date-chocolate" },
  { label: "سینی مزه", href: "/mazeh-trays" },
  { label: "هدایا", href: "/gifts" },
];

export default function CartPage() {
  const { t } = useLang();
  const { items, setQty, setItemPrice, removeItem, toggleWishlist, coupon, setCoupon } = useStore();
  const toast = useToast();
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [checks, setChecks] = useState<Record<string, ItemCheck>>({});
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [giftCode, setGiftCode] = useState("");
  const [giftBusy, setGiftBusy] = useState(false);
  const [giftDone, setGiftDone] = useState<string | null>(null);

  const subtotal = cartSubtotal(items);
  const discount = couponDiscount(subtotal, coupon);
  const shipping = shippingFee(subtotal - discount, items.length);
  const total = subtotal - discount + shipping;
  const cartKeys = useMemo(() => items.map((i) => i.key).join("|"), [items]);

  // cart_view — شمار اقلام، بدون دادهٔ شخصی (یک‌بار، پس از آماده‌شدن سبد از persist)
  const viewTracked = useRef(false);
  useEffect(() => {
    if (viewTracked.current || items.length === 0) return;
    viewTracked.current = true;
    trackEvent("cart_view", { items: items.length, value: subtotal });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // رهاشدن سبد (بریف G5): خروج از صفحهٔ سبد با کالای مانده — یک‌بار در هر نشست
  useEffect(() => {
    return () => {
      try {
        if (items.length > 0 && !sessionStorage.getItem("helsa-cart-abandoned")) {
          trackEvent("cart_abandoned", { items: items.length, value: subtotal });
          sessionStorage.setItem("helsa-cart-abandoned", "1");
        }
      } catch { /* analytics هرگز اپ را نمی‌شکند */ }
    };
  }, [items.length, subtotal]);

  // سلامت سبد در برابر سرور — قیمت به‌روز + موجودی واقعی (فقط با تغییر ترکیب سبد)
  useEffect(() => {
    let cancelled = false;
    // تأخیر یک تیک: خواندن سبد و setState خارج از رندر همزمان (React Compiler purity)
    const timer = window.setTimeout(() => {
    if (cancelled) return;
    if (!items.length) { setChecks({}); return; }
    fetch("/api/cart/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: items.map((i) => ({ key: i.key, kind: i.kind, id: typeof i.id === "number" ? i.id : undefined, qty: i.qty, price: i.price })) }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { ok?: boolean; items?: ItemCheck[] } | null) => {
        if (cancelled || !d?.ok || !Array.isArray(d.items)) return;
        const map: Record<string, ItemCheck> = {};
        let priceChanged = 0;
        for (const c of d.items) {
          map[c.key] = c;
          const item = items.find((i) => i.key === c.key);
          if (c.checked && typeof c.price === "number" && item && c.price !== item.price) {
            setItemPrice(c.key, c.price);
            priceChanged++;
          }
        }
        setChecks(map);
        if (priceChanged) toast.push(`${faDigits(priceChanged)} قلم از سبد شما با قیمت به‌روز سرور هم‌راستا شد.`, "info");
      })
      .catch(() => undefined); // خطای بررسی سبد جریان خرید را نمی‌بندد؛ ثبت سفارش بازهم سمت سرور اعتبارسنجی می‌کند
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKeys]);

  // روش‌های ارسال واقعی از دیتابیس
  useEffect(() => {
    fetch("/api/shipping/methods")
      .then((r) => r.json())
      .then((d: { ok: boolean; methods: ShippingMethod[] }) => { if (d.ok) setShippingMethods(d.methods ?? []); })
      .catch(() => undefined);
  }, []);

  const applyCoupon = async () => {
    if (!code.trim()) return;
    setChecking(true);
    setCouponError("");
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), subtotal }),
      });
      const data = (await res.json()) as { ok: boolean; message: string; coupon?: typeof coupon };
      if (data.ok && data.coupon) {
        setCoupon(data.coupon);
        trackEvent("coupon_applied", { coupon_code: code, value: data.coupon.value });
        toast.push("کد تخفیف با موفقیت اعمال شد");
        setCode("");
      } else {
        trackEvent("coupon_rejected", { coupon_code: code });
        setCouponError(data.message || "کد تخفیف معتبر نیست.");
        toast.push(data.message || "کد تخفیف معتبر نیست.", "error");
      }
    } catch {
      setCouponError("ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.");
      toast.push("ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.", "error");
    }
    setChecking(false);
  };

  const removeCoupon = () => {
    if (coupon) trackEvent("coupon_remove", { coupon_code: coupon.code });
    setCoupon(null);
  };

  // هدیهٔ واقعی اولین خرید — همان سیستم خبرنامه (کد WELCOME- یک‌بارمصرف با پشتوانهٔ دیتابیس)
  const claimFirstPurchase = async () => {
    const val = giftCode.trim();
    const isMobile = /^09\d{9}$/.test(val);
    const isEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val);
    if (!isMobile && !isEmail) {
      toast.push("ایمیل معتبر یا شمارهٔ موبایل (09xxxxxxxxx) وارد کنید.", "error");
      return;
    }
    setGiftBusy(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isMobile ? { mobile: val } : { email: val }),
      });
      const data = (await res.json()) as { ok: boolean; code?: string | null; message?: string };
      if (data.ok && data.code) {
        setGiftDone(data.code);
        setCode(data.code); // آمادهٔ اعمال در کادر کد تخفیف
        trackEvent("coupon_applied", { coupon_code: data.code, surface: "first_purchase_gift" });
        toast.push("کد هدیهٔ اولین خرید صادر شد؛ روی «اعمال» بزنید.");
      } else {
        toast.push(data.message ?? "ثبت ممکن نشد؛ بعداً تلاش کنید.", "error");
      }
    } catch {
      toast.push("ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.", "error");
    }
    setGiftBusy(false);
  };

  const changeQty = (key: string, name: string, delta: number) => {
    const item = items.find((i) => i.key === key);
    const check = checks[key];
    const next = (item?.qty ?? 1) + delta;
    if (delta > 0 && check?.maxQty && next > check.maxQty) {
      toast.push(`بیشتر از ${faDigits(check.maxQty)} عدد از این قلم در موجودی نیست.`, "error");
      return;
    }
    trackEvent("cart_quantity_change", { item_name: name, delta });
    setQty(key, Math.max(1, next));
  };

  const remove = (key: string, name: string) => {
    trackEvent("cart_item_remove", { item_name: name });
    removeItem(key);
    toast.push("محصول از سبد خرید حذف شد", "info");
  };

  const saveForLater = (key: string, id: number, name: string) => {
    toggleWishlist(id);
    removeItem(key);
    toast.push(`«${name}» به علاقه‌مندی‌ها منتقل شد.`, "info");
  };

  const startCheckout = () => trackEvent("checkout_start", { value: total, items: items.length });

  const stockBadge = (key: string) => {
    const c = checks[key];
    if (!c || !c.checked) return null;
    if (c.available === false) return <span className="rounded-full bg-accent-50 border border-accent-200 px-2 py-0.5 text-[10px] font-bold text-accent-700">ناموجود</span>;
    if (typeof c.stock === "number" && c.stock > 0 && c.stock <= (c.lowStock ?? 5))
      return <span className="rounded-full bg-gold-50 border border-gold-300 px-2 py-0.5 text-[10px] font-bold text-gold-700">فقط {faDigits(c.stock)} عدد باقی مانده</span>;
    return <span className="rounded-full bg-brand-50 border border-brand-200 px-2 py-0.5 text-[10px] font-bold text-brand-700">موجود</span>;
  };

  const progressBase = Math.max(0, subtotal - discount);
  const freeRemaining = SITE.freeShippingThreshold - progressBase;

  return (
    <>
      <PageHeader
        title="سبد خرید شما"
        desc="سفارش شما یک قدم تا ثبت نهایی فاصله دارد."
        crumbs={[{ label: "خانه", href: "/" }, { label: "سبد خرید", href: "/cart" }]}
      />
      <div className="pb-2">
        <CheckoutSteps current="cart" />
      </div>
      <div className="container-x py-10 grid grid-cols-1 lg:grid-cols-3 gap-10 items-start lg:pb-14 pb-32 lg:pb-14">
        <div className="lg:col-span-2">
          {items.length === 0 && (
            <div className="rounded-2xl border border-line/70 bg-surface p-8 sm:p-14 text-center">
              <span className="mx-auto flex size-16 items-center justify-center rounded-full border border-line bg-surface2 text-brand-600"><ShoppingBag className="size-6" aria-hidden /></span>
              <h2 className="mt-5 text-lg font-black text-heading">سبد خریدت هنوز منتظر اولین انتخاب توست.</h2>
              <p className="mt-2 text-sm text-muted leading-7">از خرما و خشکبار تا هدیه و سینی مزه، انتخابت را از هلسا شروع کن.</p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <LinkButton href="/products">مشاهده محصولات</LinkButton>
                <LinkButton href="/mazeh-trays/build" variant="outline">ساخت سینی مزه</LinkButton>
                <LinkButton href="/gifts" variant="outline">مشاهده هدایا</LinkButton>
              </div>
              <ul className="mt-7 flex flex-wrap items-center justify-center gap-2" aria-label="میان‌برهای خرید">
                {EMPTY_SHORTCUTS.map((s) => (
                  <li key={s.href}>
                    <Link href={s.href} className="inline-flex h-9 items-center rounded-full border border-line bg-surface2 px-4 text-[11.5px] font-bold text-body transition-colors hover:border-brand-400 hover:text-brand-700">
                      {s.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {items.length === 0 && <EmptyCartSuggestions />}

          {items.length > 0 && (
            <ul className="divide-y divide-line/70 border-y border-line/70">
              {items.map((i) => {
                const c = checks[i.key];
                const unavailable = c?.checked && c.available === false;
                const atMax = Boolean(c?.maxQty && i.qty >= c.maxQty);
                return (
                  <li key={i.key} className="flex gap-4 sm:gap-5 py-6">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={i.image} alt={i.name} className="size-24 md:size-28 rounded-xl object-cover border border-line/60" loading="lazy" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link href={i.slug ? `/products/${i.slug}` : "/mazeh-trays"} className="text-sm font-extrabold text-heading hover:text-brand-600 transition-colors line-clamp-2-fa">
                            {i.name}
                          </Link>
                          <p className="mt-1 text-[11px] text-muted">{i.weight ?? i.meta}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">{stockBadge(i.key)}</div>
                          {unavailable && (
                            <p className="mt-2 text-[11px] font-bold text-accent-600" role="alert">
                              این قلم فعلاً موجود نیست؛ برای ثبت سفارش آن را حذف کنید یا بعداً دوباره تلاش کنید.
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <button
                            onClick={() => remove(i.key, i.name)}
                            aria-label={`حذف ${i.name} از سبد`}
                            className="p-2 rounded-full text-faint hover:text-accent-600 hover:bg-surface2 transition-colors"
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </button>
                          {i.kind === "product" && typeof i.id === "number" && (
                            <button
                              onClick={() => saveForLater(i.key, i.id as number, i.name)}
                              aria-label={`ذخیرهٔ ${i.name} برای بعد`}
                              title="ذخیره برای بعد (علاقه‌مندی‌ها)"
                              className="p-2 rounded-full text-faint hover:text-brand-600 hover:bg-surface2 transition-colors"
                            >
                              <Heart className="size-4" aria-hidden />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="inline-flex items-center rounded-full border border-line bg-surface overflow-hidden">
                          <button
                            onClick={() => changeQty(i.key, i.name, 1)}
                            disabled={atMax}
                            className="px-3.5 h-9 hover:bg-brand-50 text-brand-700 font-bold disabled:opacity-40 disabled:hover:bg-transparent"
                            aria-label={`افزایش تعداد ${i.name}${atMax ? " (بیشینهٔ موجودی)" : ""}`}
                          >
                            +
                          </button>
                          <span className="w-9 text-center text-sm font-bold" aria-live="polite">{faDigits(i.qty)}</span>
                          <button
                            onClick={() => (i.qty === 1 ? remove(i.key, i.name) : changeQty(i.key, i.name, -1))}
                            className="px-3.5 h-9 hover:bg-brand-50 text-brand-700 font-bold"
                            aria-label={`کاهش تعداد ${i.name}`}
                          >
                            −
                          </button>
                        </div>
                        <div className="text-end">
                          <p className="text-sm font-extrabold text-heading">{formatToman(i.price * i.qty)}</p>
                          {i.qty > 1 && <p className="text-[11px] text-muted">هر عدد {formatToman(i.price)}</p>}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {items.length > 0 && (
            <div className="mt-6">
              <LinkButton href="/products" variant="outline" size="sm">
                <IconForward className="size-3.5" />
                {t("cart.continue")}
              </LinkButton>
            </div>
          )}

          {items.length > 0 && <CartUpsell />}

          {items.length > 0 && shippingMethods.length > 0 && (
            <section className="mt-8 rounded-2xl border border-line/70 bg-surface p-5" aria-label="ارسال سفارش">
              <h3 className="flex items-center gap-2 text-sm font-black text-heading"><Truck className="size-4 text-brand-600" aria-hidden /> ارسال سفارش</h3>
              <ul className="mt-4 space-y-3">
                {shippingMethods.map((m) => (
                  <li key={m.code} className="flex items-center justify-between gap-3 text-[12px]">
                    <span className="font-bold text-heading">
                      {m.label}
                      <span className="block mt-0.5 text-[10.5px] font-normal text-muted">{m.description}{m.estimatedTime ? ` · ${m.estimatedTime}` : ""}</span>
                    </span>
                    <span className="shrink-0 font-black text-heading">{m.price === 0 ? "رایگان" : formatToman(m.price)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 rounded-xl bg-brand-50 border border-brand-100 p-3 text-[11px] font-bold text-brand-800">
                ارسال سفارش‌های {formatToman(SITE.freeShippingThreshold)} و بالاتر رایگان است.
              </p>
            </section>
          )}
        </div>

        <aside className="rounded-2xl border border-line/70 bg-surface p-7 shadow-soft lg:sticky lg:top-28">
          <p className="text-[11px] font-bold tracking-[0.18em] text-gold-700">سفارش شما</p>
          <h2 className="mt-2 text-base font-black text-heading">{t("checkout.summary")}</h2>

          <div className="mt-5">
            <label htmlFor="coupon" className="text-xs font-bold text-body flex items-center gap-1.5">
              <TicketPercent className="size-4 text-gold-700" aria-hidden /> کد تخفیف
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="coupon"
                value={code}
                onChange={(e) => { setCode(e.target.value.toUpperCase()); setCouponError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") applyCoupon(); }}
                placeholder="HELSA10"
                dir="ltr"
                aria-invalid={Boolean(couponError) || undefined}
                aria-describedby={couponError ? "coupon-error" : undefined}
                className="min-w-0 flex-1 h-11 rounded-full border border-line bg-surface2 px-3 sm:px-4 text-sm outline-none focus:border-brand-500 text-center font-bold tracking-widest"
              />
              <button
                onClick={applyCoupon}
                disabled={checking || !code.trim()}
                className="h-11 px-5 rounded-full bg-brand-700 text-inverse text-xs font-bold hover:bg-brand-800 disabled:opacity-50 transition-colors"
              >
                {checking ? <Loader2 className="size-4 animate-spin mx-auto" aria-hidden /> : t("cart.apply")}
              </button>
            </div>
            <div id="coupon-error" aria-live="polite">
              {couponError && <p className="mt-2 text-[11px] font-bold text-accent-600" role="alert">{couponError}</p>}
            </div>
            {coupon && (
              <p className="mt-2 text-[11px] font-bold text-brand-700 flex items-center justify-between gap-2">
                <span className="min-w-0">کد {coupon.code} اعمال شد — {coupon.label}</span>
                <button onClick={removeCoupon} className="text-muted hover:text-accent-600 shrink-0">حذف</button>
              </p>
            )}
            {!coupon && items.length > 0 && !giftDone && (
              <div className="mt-4 rounded-xl border border-gold-300/70 bg-gold-50/70 p-3.5">
                <p className="flex items-center gap-1.5 text-[12px] font-black text-heading">
                  <Gift className="size-4 text-gold-700" aria-hidden /> هدیه خرید اول شما
                </p>
                <p className="mt-1 text-[10.5px] leading-5 text-muted">
                  ۲۰۰٬۰۰۰ تومان کد تخفیف واقعی اولین خرید — با عضویت در خبرنامهٔ هلسا صادر می‌شود (یک‌بارمصرف، حداقل خرید ۱٬۰۰۰٬۰۰۰ تومان، اعتبار ۳۰ روز).
                </p>
                <div className="mt-2.5 flex gap-2">
                  <input
                    value={giftCode}
                    onChange={(e) => setGiftCode(e.target.value)}
                    placeholder="ایمیل یا 09xxxxxxxxx"
                    dir="ltr"
                    aria-label="ایمیل یا شمارهٔ موبایل برای دریافت کد هدیهٔ اولین خرید"
                    className="min-w-0 flex-1 h-10 rounded-full border border-line bg-surface px-3 text-[12px] outline-none focus:border-brand-500"
                  />
                  <button
                    onClick={claimFirstPurchase}
                    disabled={giftBusy}
                    className="h-10 shrink-0 rounded-full bg-gold-500 px-4 text-[11px] font-black text-heading hover:bg-gold-600 disabled:opacity-50 transition-colors"
                  >
                    {giftBusy ? "..." : "دریافت کد"}
                  </button>
                </div>
              </div>
            )}
            {giftDone && (
              <p className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-3 text-[11px] font-bold leading-5 text-brand-800">
                کد هدیهٔ اولین خرید شما: <span dir="ltr" className="font-black">{giftDone}</span> — در کادر بالا آماده است؛ روی «اعمال» بزنید.
              </p>
            )}
          </div>

          <dl className="mt-6 space-y-3 text-sm border-t border-line/70 pt-5">
            <div className="flex justify-between"><dt className="text-muted">جمع محصولات</dt><dd className="font-bold">{formatToman(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">{t("cart.discount")}</dt><dd className={`font-bold ${discount ? "text-accent-600" : ""}`}>{discount ? formatToman(discount) : "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">{t("cart.shipping")}</dt><dd className="font-bold">{shipping === 0 ? (items.length ? "رایگان" : "—") : formatToman(shipping)}</dd></div>
            <div className="flex justify-between items-center border-t border-line/70 pt-4">
              <dt className="font-black text-heading">{t("cart.total")}</dt>
              <dd className="text-lg font-black text-brand-700">{formatToman(total)}</dd>
            </div>
          </dl>

          {items.length > 0 && freeRemaining > 0 && (
            <div className="mt-4">
              <p className="text-[11px] font-bold text-heading leading-5">
                فقط {formatToman(freeRemaining)} تا ارسال رایگان
              </p>
              <div
                className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-surface2"
                role="progressbar"
                aria-label="پیشرفت تا ارسال رایگان"
                aria-valuenow={Math.min(100, Math.round((progressBase / SITE.freeShippingThreshold) * 100))}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-l from-brand-500 to-gold-500 transition-[width] duration-500"
                  style={{ width: `${Math.min(100, (progressBase / SITE.freeShippingThreshold) * 100)}%` }}
                />
              </div>
            </div>
          )}
          {items.length > 0 && freeRemaining <= 0 && (
            <p className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-3 text-[11px] font-bold text-brand-800">
              🎉 تبریک! ارسال سفارش شما رایگان شد.
            </p>
          )}

          <Link
            href="/checkout"
            onClick={startCheckout}
            aria-label="ادامه به پرداخت"
            className={`mt-6 flex h-12 items-center justify-center gap-2 rounded-full text-sm font-bold transition-colors ${items.length ? "bg-brand-700 text-inverse hover:bg-brand-800" : "pointer-events-none bg-surface2 text-faint"}`}
          >
            {t("cart.checkout")} <IconForward className="size-4" aria-hidden />
          </Link>
          <ul className="mt-5 space-y-2 border-t border-line/70 pt-4 text-[11px] text-muted">
            <li className="flex items-center gap-2"><ShieldCheck className="size-3.5 text-brand-600" aria-hidden /> پرداخت امن از طریق درگاه بانکی رسمی</li>
            <li className="flex items-center gap-2"><PackageCheck className="size-3.5 text-brand-600" aria-hidden /> بسته‌بندی حرفه‌ای</li>
            <li className="flex items-center gap-2"><Truck className="size-3.5 text-brand-600" aria-hidden /> ارسال مطمئن از انبار اختصاصی هلسا</li>
            <li className="flex items-center gap-2"><Headset className="size-3.5 text-brand-600" aria-hidden /> پشتیبانی هلسا {SITE.supportHours}</li>
            <li className="flex items-center gap-2"><Leaf className="size-3.5 text-brand-600" aria-hidden /> تضمین تازگی محصولات</li>
          </ul>
          <div className="mt-5">
            <TrustBadges tone="light" />
          </div>
        </aside>
      </div>

      {/* نوار چسبان موبایل — جمع نهایی + ادامهٔ پرداخت (با رعایت safe-area) */}
      {items.length > 0 && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur lg:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="container-x flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-muted">مبلغ نهایی</p>
              <p className="text-sm font-black text-brand-700">{formatToman(total)}</p>
            </div>
            <Link
              href="/checkout"
              onClick={startCheckout}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-brand-700 px-6 text-[13px] font-bold text-inverse hover:bg-brand-800 transition-colors"
            >
              {t("cart.checkout")} <IconForward className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
