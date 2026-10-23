"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
import { trackEvent } from "@/lib/analytics";
import { useStore, cartSubtotal } from "@/lib/store";
import { SITE } from "@/config/site";
import Pagination from "./Pagination";
import Link from "next/link";
import { SlidersHorizontal, X, Filter, ChevronDown, Leaf, Building2, ArrowDownUp } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { Category, Product } from "@/types";
import { ProductCard } from "@/components/product/ProductCard";
import { CategoryHero } from "@/components/product/CategoryHero";
import { faDigits, normalizeFa, formatToman } from "@/lib/format";
import { isOrganic, isWholesaleReady } from "@/lib/product-flags";
import { Button } from "@/components/ui/primitives";

type Sort = "popular" | "bestselling" | "newest" | "cheapest" | "expensive" | "discount";

const SORTS: { id: Sort; label: string }[] = [
  { id: "bestselling", label: "پرفروش‌ترین" },
  { id: "popular", label: "منتخب هلسا" },
  { id: "newest", label: "جدیدترین" },
  { id: "cheapest", label: "ارزان‌ترین" },
  { id: "expensive", label: "گران‌ترین" },
  { id: "discount", label: "بیشترین تخفیف" },
];

function weightGrams(w: string): number {
  const num = parseFloat(w.replace(/[^\d.]/g, "")) || 0;
  return w.includes("کیلو") ? num * 1000 : num;
}

export function ProductsExplorer({
  products,
  categories,
  initialCat,
  initialQ,
  suggestions = [],
  todaySlugs = [],
}: {
  products: Product[];
  categories: Category[];
  initialCat: string;
  initialQ: string;
  suggestions?: Product[];
  /** محصولات «پیشنهاد امروز» — به‌جای کاروسل جدا، بج روی همان کارت در گرید می‌گیرند */
  todaySlugs?: string[];
}) {
  const [cat, setCat] = useState(initialCat);
  const [sub, setSub] = useState("");
  const [q, setQ] = useState(initialQ);
  const [sort, setSort] = useState<Sort>("popular");
  const [maxPrice, setMaxPrice] = useState(2_000_000);
  const [weight, setWeight] = useState("all");
  const [inStock, setInStock] = useState(false);
  const [hasDiscount, setHasDiscount] = useState(false);
  const [organic, setOrganic] = useState(false);
  const [wholesale, setWholesale] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [panel, setPanel] = useState(false);
  // نیت خرید (CRO): اقتصادی / محبوب / پریمیوم / هدیه — فیلتر روی دادهٔ واقعی محصولات
  const [intent, setIntent] = useState<"" | "eco" | "popular" | "premium" | "gift">("");
  const [mobileSheet, setMobileSheet] = useState(false);
  const { t } = useLang();
  // صفحه در URL (?page=n) — خواندن ایمن در اولین رندر کلاینت
  const [page, setPage] = useState(() => {
    if (typeof window === "undefined") return 1;
    const n = parseInt(new URLSearchParams(window.location.search).get("page") ?? "1", 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  });
  const syncPageUrl = (n: number) => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    if (n > 1) sp.set("page", String(n)); else sp.delete("page");
    const qs = sp.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? "?" + qs : ""}`);
  };
  const gridRef = useRef<HTMLDivElement>(null);
  // ۱۲ محصول در صفحه (بازگشت به تجربهٔ اصلی فروشگاه) — تعداد صفحه‌ها از طول کاتالوگ محاسبه می‌شود، نه عدد ثابت
  // تعداد صفحات همیشه داینامیک از ceil(تعداد/۱۲) محاسبه می‌شود: هیچ صفحهٔ خالی ساخته نمی‌شود
  // و با تغییر تعداد محصولات خودکار تنظیم می‌ماند. صفحهٔ جاری در ?page=n با حفظ فیلترها نگه‌داری می‌شود.
  const PER_PAGE = 12;

  const activeCategory = categories.find((c) => c.slug === cat);
  // پریمیوم = یک‌چهارم گران‌ترین محصولات کاتالوگ (آستانهٔ واقعی، نه عدد ثابت)
  const premiumThreshold = useMemo(() => {
    const prices = products.map((p) => p.price).sort((a, b) => a - b);
    return prices.length ? prices[Math.floor(prices.length * 0.75)] : Infinity;
  }, [products]);

  const todaySet = useMemo(() => new Set(todaySlugs), [todaySlugs]);

  // مرجع واحد امتیاز = نظرهای تأییدشدهٔ واقعی (src/services/catalog.ts). تا وقتی هیچ محصولی
  // نظر ندارد، کنترل‌های وابسته به امتیاز («امتیاز حداقل» و هدف «محبوب») رندر نمی‌شوند؛
  // به‌جای نمایش فیلتری که همیشه صفر نتیجه می‌دهد، منتظر دادهٔ واقعی می‌مانیم.
  const hasRealRatings = useMemo(() => products.some((p) => p.reviews > 0), [products]);

  const list = useMemo(() => {
    let out = products.filter((p) => {
      if (cat && p.category !== cat) return false;
      if (sub && !(p.name.includes(sub) || p.description.includes(sub) || p.tags.some((tag) => tag.includes(sub)))) return false;
      if (q && !normalizeFa([p.name, p.description, p.sku, ...p.tags].join(" ")).includes(normalizeFa(q))) return false;
      if (p.price > maxPrice) return false;
      if (weight === "light" && weightGrams(p.weight) >= 500) return false;
      if (weight === "mid" && (weightGrams(p.weight) < 500 || weightGrams(p.weight) > 1000)) return false;
      if (weight === "heavy" && weightGrams(p.weight) <= 1000) return false;
      if (inStock && p.stock <= 0) return false;
      if (hasDiscount && p.discount <= 0) return false;
      if (organic && !isOrganic(p)) return false;
      if (wholesale && !isWholesaleReady(p)) return false;
      if (intent === "eco" && p.price > 300_000) return false;
      if (intent === "popular" && hasRealRatings && !(p.rating >= 4.5 && p.reviews >= 30)) return false;
      if (intent === "premium" && p.price < premiumThreshold) return false;
      if (intent === "gift" && !(p.isFeatured || p.badge === "ویژه" || p.category === "dates" || p.category === "nuts")) return false;
      if (minRating && p.rating < minRating) return false;
      return true;
    });
    out = [...out].sort((a, b) => {
      switch (sort) {
        case "cheapest": return a.price - b.price;
        case "expensive": return b.price - a.price;
        case "discount": return b.discount - a.discount;
        case "bestselling":
          // اول نظرهای واقعی؛ در نبود نظر، انتخاب تحریریهٔ مالک و سپس تازگی — تا ترتیب پایدار بماند.
          return (b.reviews - a.reviews) || (Number(b.isFeatured ?? false) - Number(a.isFeatured ?? false)) || (+new Date(b.createdAt) - +new Date(a.createdAt));
        case "newest": return +new Date(b.createdAt) - +new Date(a.createdAt);
        default:
          return (b.rating * b.reviews - a.rating * a.reviews) || (Number(b.isFeatured ?? false) - Number(a.isFeatured ?? false)) || (+new Date(b.createdAt) - +new Date(a.createdAt));
      }
    });
    return out;
  }, [products, cat, sub, q, sort, maxPrice, weight, inStock, hasDiscount, organic, wholesale, minRating, intent, premiumThreshold, hasRealRatings]);

  // reset pagination during render when the filter signature changes
  const filterSig = [cat, sub, q, sort, maxPrice, weight, inStock, hasDiscount, organic, wholesale, minRating, intent].join("|");
  const [prevSig, setPrevSig] = useState(filterSig);
  if (prevSig !== filterSig) {
    setPrevSig(filterSig);
    setPage(1);
    syncPageUrl(1);
  }

  const totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const visible = list.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const goToPage = (n: number) => {
    setPage(n);
    syncPageUrl(n);
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const activeFilters = (intent ? 1 : 0) + (cat ? 1 : 0) + (sub ? 1 : 0) + (maxPrice < 2_000_000 ? 1 : 0) + (weight !== "all" ? 1 : 0) + (inStock ? 1 : 0) + (hasDiscount ? 1 : 0) + (organic ? 1 : 0) + (wholesale ? 1 : 0) + (minRating ? 1 : 0);
  const clearAll = () => { setIntent(""); setCat(""); setSub(""); setMaxPrice(2_000_000); setWeight("all"); setInStock(false); setHasDiscount(false); setOrganic(false); setWholesale(false); setMinRating(0); };

  const FilterBody = (
    <div className="space-y-6">
      <div>
        <label htmlFor="price" className="text-xs font-bold text-body block mb-2">
          حداکثر قیمت: {Number(maxPrice).toLocaleString("fa-IR")} تومان
        </label>
        <input
          id="price"
          type="range"
          min={100_000}
          max={2_000_000}
          step={50_000}
          value={maxPrice}
          onChange={(e) => setMaxPrice(+e.target.value)}
          className="w-full accent-brand-600"
        />
      </div>
      <div>
        <span className="text-xs font-bold text-body block mb-2">وزن بسته</span>
        <div className="flex flex-wrap gap-2">
          {[["all", "همه"], ["light", "تا ۵۰۰ گرم"], ["mid", "۵۰۰ گرم تا ۱ کیلو"], ["heavy", "بالای ۱ کیلو"]].map(([v, l]) => (
            <Chip key={v} active={weight === v} onClick={() => setWeight(v)}>{l}</Chip>
          ))}
        </div>
        {activeCategory && activeCategory.subs.length > 0 && (
          <div className="mt-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <Chip active={!sub} onClick={() => setSub("")}>همه {activeCategory.name}</Chip>
            {activeCategory.subs.map((item) => (
              <Chip key={item} active={sub === item} onClick={() => setSub(sub === item ? "" : item)}>
                {item}
              </Chip>
            ))}
          </div>
        )}
      </div>
      {hasRealRatings && (
      <div>
        <span className="text-xs font-bold text-body block mb-2">امتیاز حداقل</span>
        <div className="flex flex-wrap gap-2">
          {[0, 4.5, 4.8].map((r) => (
            <Chip key={r} active={minRating === r} onClick={() => setMinRating(r)}>
              {r === 0 ? "همه" : `${faDigits(r)} ستاره به بالا`}
            </Chip>
          ))}
        </div>
      </div>
      )}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs font-bold text-body cursor-pointer">
          <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} className="size-4 accent-brand-600" />
          {t("filters.inStock")}
        </label>
        <label className="flex items-center gap-2 text-xs font-bold text-body cursor-pointer">
          <input type="checkbox" checked={hasDiscount} onChange={(e) => setHasDiscount(e.target.checked)} className="size-4 accent-brand-600" />
          {t("filters.discounted")}
        </label>
        <label className="flex items-center gap-2 text-xs font-bold text-body cursor-pointer">
          <input type="checkbox" checked={organic} onChange={(e) => setOrganic(e.target.checked)} className="size-4 accent-brand-600" aria-label="فقط محصولات طبیعی و بدون افزودنی" />
          <Leaf className="size-3.5 text-brand-600" aria-hidden /> فقط طبیعی و بدون افزودنی
        </label>
        <label className="flex items-center gap-2 text-xs font-bold text-body cursor-pointer">
          <input type="checkbox" checked={wholesale} onChange={(e) => setWholesale(e.target.checked)} className="size-4 accent-brand-600" aria-label="موجود برای خرید عمده" />
          <Building2 className="size-3.5 text-gold-700" aria-hidden /> موجود برای خرید عمده
        </label>
        {activeFilters > 0 && (
          <button onClick={clearAll} className="text-[11px] font-bold text-accent-600 inline-flex items-center gap-1">
            <X className="size-3" aria-hidden /> {t("filters.clear")}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div>
      {activeCategory && <CategoryHero category={activeCategory} products={products} />}

      {/* نوار چسبان فیلتر/مرتب‌سازی — دراپ‌داون‌های فشرده در دسکتاپ، یک دکمه در موبایل */}
      <div className="sticky top-16 z-30 -mx-5 px-5 md:mx-0 md:px-0 py-3 bg-canvas/92 backdrop-blur-xl border-b border-line/80">
        <div className="flex items-center gap-2.5">
          {/* دسکتاپ: دسته‌بندی ▾ + هدف خرید ▾ | مرتب‌سازی ▾ + فیلترهای پیشرفته */}
          <div className="hidden md:flex min-w-0 flex-1 items-center gap-2.5">
            <div className="relative min-w-0">
              <select
                value={cat}
                onChange={(e) => { setSub(""); setCat(e.target.value); trackEvent("filter_category", { cat: e.target.value || "all" }); }}
                aria-label="دسته‌بندی محصولات"
                className="h-10 w-full min-[900px]:w-auto appearance-none rounded-xl border border-line bg-surface ps-3.5 pe-9 text-xs font-bold text-body outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">همه دسته‌ها</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            </div>
            <div className="relative min-w-0">
              <select
                value={intent}
                onChange={(e) => { setIntent(e.target.value as typeof intent); trackEvent("filter_intent", { intent: e.target.value || "all" }); }}
                aria-label="هدف خرید"
                className="h-10 w-full min-[900px]:w-auto appearance-none rounded-xl border border-line bg-surface ps-3.5 pe-9 text-xs font-bold text-body outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">همه اهداف خرید</option>
                <option value="eco">🪙 اقتصادی</option>
                {hasRealRatings && <option value="popular">❤️ محبوب</option>}
                <option value="premium">👑 پریمیوم</option>
                <option value="gift">🎁 هدیه</option>
              </select>
              <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            </div>
            <span className="mx-1 hidden lg:block h-6 w-px bg-line" aria-hidden />
            <label className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-xs font-bold text-body" htmlFor="sort-select">
              <ArrowDownUp className="size-4 text-brand-700" aria-hidden />
              <span className="hidden lg:inline">مرتب‌سازی:</span>
            </label>
            <div className="relative min-w-0 flex-1 sm:flex-none">
              <select
                id="sort-select"
                value={sort}
                onChange={(e) => { setSort(e.target.value as Sort); trackEvent("sort_change", { sort: e.target.value }); }}
                aria-label="مرتب‌سازی محصولات"
                className="h-10 w-full min-w-[9.5rem] sm:w-auto appearance-none rounded-xl border border-line bg-surface ps-3.5 pe-9 text-xs font-bold text-body outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              >
                {SORTS.map((x) => (
                  <option key={x.id} value={x.id}>{x.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            </div>
            <button
              onClick={() => setPanel((v) => !v)}
              className={`ml-auto inline-flex h-10 shrink-0 rounded-xl border px-4 text-xs font-bold items-center gap-2 transition-colors ${panel || activeFilters ? "bg-brand-700 text-inverse border-brand-700" : "bg-surface border-line text-body"}`}
              aria-expanded={panel}
              aria-haspopup="dialog"
            >
              <SlidersHorizontal className="size-4" aria-hidden />
              {t("filters.title")}
              {activeFilters > 0 && <span className="flex size-4 items-center justify-center rounded-full bg-inverse/20 text-[10px] text-inverse">{faDigits(activeFilters)}</span>}
            </button>
          </div>

          {/* موبایل: یک دکمه → کشوی پایین */}
          <button
            onClick={() => setMobileSheet(true)}
            className={`md:hidden inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border px-4 text-xs font-bold transition-colors ${activeFilters ? "bg-brand-700 text-inverse border-brand-700" : "bg-surface border-line text-body"}`}
            aria-haspopup="dialog"
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            فیلتر و مرتب‌سازی
            {activeFilters > 0 && <span className="flex size-4 items-center justify-center rounded-full bg-brand-700 text-[10px] text-inverse">{faDigits(activeFilters)}</span>}
          </button>
        </div>
      </div>

      {/* desktop filter panel */}
      <AnimatePresence>
        {panel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="hidden md:block overflow-hidden"
          >
            <div className="mt-4 rounded-2xl bg-surface border border-line p-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {FilterBody}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <FreeShippingBar />

      {list.length === 0 ? (
        <div className="py-12 text-center">
          <Filter className="size-12 mx-auto text-faint" aria-hidden />
          <p className="mt-4 text-sm font-black text-heading">محصول موردنظر پیدا نشد</p>
          <p className="mt-2 text-xs font-bold text-muted">پیشنهاد می‌کنیم این محصولات را ببینید</p>
          {suggestions.length > 0 && (
            <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {suggestions.slice(0, 4).map((p) => (
                <ProductCard key={p.id} product={p} today={todaySet.has(p.slug)} />
              ))}
            </div>
          )}
          <Button variant="outline" onClick={clearAll} className="mt-8">{t("filters.clear")}</Button>
        </div>
      ) : (
        <>
        {/* وضعیت زندهٔ نتایج (سرفصل نیست — H1 صفحه شمار کل را دارد) */}
        <p className="mt-5 flex flex-wrap items-baseline gap-x-2 text-[12px] font-bold text-muted" role="status">
          {q ? <span className="text-heading">نتایج جست‌وجو: «{q}» · </span> : null}
          {faDigits(list.length)} محصول
          {totalPages > 1 && <span>· صفحهٔ {faDigits(safePage)} از {faDigits(totalPages)}</span>}
          <span>· مرتب‌شده بر اساس {SORTS.find((x) => x.id === sort)?.label ?? "منتخب هلسا"}</span>
        </p>
        <h2 className="sr-only">فهرست محصولات</h2>
        <div ref={gridRef} id="product-grid" className="mt-4 grid grid-cols-2 gap-3 min-[400px]:gap-4 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
          {visible.map((p, i) => (
            <ProductCard key={p.id} product={p} today={todaySet.has(p.slug)} priority={i < 4} />
          ))}
        </div>

        <Pagination
          page={safePage}
          totalPages={totalPages}
          onChange={goToPage}
          label={t("pagination.label")}
          prevLabel={t("pagination.prev")}
          nextLabel={t("pagination.next")}
        />

        </>
      )}

      {/* mobile bottom sheet */}
      <AnimatePresence>
        {mobileSheet && (
          <motion.div
            className="fixed inset-0 z-[80] bg-ink-900/50 backdrop-blur-sm md:hidden"
            onClick={() => setMobileSheet(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="absolute inset-y-0 start-0 w-[min(88vw,21rem)] bg-surface shadow-lift border-s border-line flex flex-col"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label={t("filters.title")}
            >
              <div className="shrink-0 bg-surface border-b border-line p-5 flex items-center justify-between">
                <h2 className="text-base font-black text-heading flex items-center gap-2">
                  <Filter className="size-5" aria-hidden /> {t("filters.title")}
                </h2>
                <button onClick={() => setMobileSheet(false)} className="p-2 rounded-lg hover:bg-surface2" aria-label="بستن فیلترها">
                  <X className="size-5" aria-hidden />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* دسته‌بندی و مرتب‌سازی — در کشو هم در دسترس */}
                <div className="space-y-4">
                  <div>
                    <label htmlFor="m-cat" className="mb-2 block text-[10.5px] font-bold tracking-[0.12em] text-muted">دسته‌بندی</label>
                    <div className="relative">
                      <select
                        id="m-cat"
                        value={cat}
                        onChange={(e) => { setSub(""); setCat(e.target.value); trackEvent("filter_category", { cat: e.target.value || "all" }); }}
                        className="h-11 w-full appearance-none rounded-xl border border-line bg-surface ps-3.5 pe-9 text-xs font-bold text-body outline-none focus:border-brand-500"
                      >
                        <option value="">همه دسته‌ها</option>
                        {categories.map((c) => (
                          <option key={c.slug} value={c.slug}>{c.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="m-intent" className="mb-2 block text-[10.5px] font-bold tracking-[0.12em] text-muted">هدف خرید</label>
                    <div className="relative">
                      <select
                        id="m-intent"
                        value={intent}
                        onChange={(e) => { setIntent(e.target.value as typeof intent); trackEvent("filter_intent", { intent: e.target.value || "all" }); }}
                        className="h-11 w-full appearance-none rounded-xl border border-line bg-surface ps-3.5 pe-9 text-xs font-bold text-body outline-none focus:border-brand-500"
                      >
                        <option value="">همه اهداف خرید</option>
                        <option value="eco">🪙 اقتصادی</option>
                        {hasRealRatings && <option value="popular">❤️ محبوب</option>}
                        <option value="premium">👑 پریمیوم</option>
                        <option value="gift">🎁 هدیه</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="m-sort" className="mb-2 block text-[10.5px] font-bold tracking-[0.12em] text-muted">مرتب‌سازی</label>
                    <div className="relative">
                      <select
                        id="m-sort"
                        value={sort}
                        onChange={(e) => { setSort(e.target.value as Sort); trackEvent("sort_change", { sort: e.target.value }); }}
                        className="h-11 w-full appearance-none rounded-xl border border-line bg-surface ps-3.5 pe-9 text-xs font-bold text-body outline-none focus:border-brand-500"
                      >
                        {SORTS.map((x) => (
                          <option key={x.id} value={x.id}>{x.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
                    </div>
                  </div>
                </div>
                <div className="h-px bg-line/70" aria-hidden />
                {FilterBody}
              </div>
              <div className="mt-auto bg-surface border-t border-line p-4 flex gap-2 shrink-0">
                <Button variant="outline" onClick={() => { clearAll(); setMobileSheet(false); }} className="flex-1">{t("filters.clear")}</Button>
                <Button variant="primary" onClick={() => setMobileSheet(false)} className="flex-1">
                  نمایش {faDigits(list.length)} محصول
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2 min-h-9 text-xs font-bold border transition-all ${
        active ? "bg-brand-700 border-brand-700 text-inverse" : "bg-surface border-line text-body hover:border-brand-400"
      }`}
    >
      {children}
    </button>
  );
}

function FreeShippingBar() {
  const items = useStore((s) => s.items);
  const subtotal = cartSubtotal(items);
  // اگر سبد خالی است یا آستانه‌ای تعریف نشده، چیزی نشان نمی‌دهیم
  if (subtotal <= 0 || !SITE.freeShippingThreshold || subtotal >= SITE.freeShippingThreshold) return null;
  const remain = SITE.freeShippingThreshold - subtotal;
  const pct = Math.min(100, Math.round((subtotal / SITE.freeShippingThreshold) * 100));
  return (
    <div className="mt-4 rounded-2xl border border-brand-200 bg-brand-50/70 p-4" role="status">
      <p className="text-[12px] font-bold text-brand-800">
        فقط {formatToman(remain)} تا ارسال رایگان
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface" aria-hidden>
        <div className="h-full rounded-full bg-brand-600 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
