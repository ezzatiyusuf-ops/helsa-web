"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search, Heart, User, ShoppingBag, Menu, X, ChevronDown, Home, LayoutGrid, Trash2, ArrowLeft,
  Phone, Clock, Sun, Moon, Monitor,
} from "lucide-react";
import { MAIN_NAV, SECONDARY_NAV, SITE } from "@/config/site";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { useStore, cartSubtotal } from "@/lib/store";
import { formatToman } from "@/lib/format";
import { HelsaLogo } from "@/components/ui/primitives";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { useLang } from "@/lib/i18n";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useToast } from "@/components/ui/Toast";

interface SearchHit {
  slug: string;
  name: string;
  category?: string;
  image: string;
  price?: number;
  kind?: string;
  href?: string;
}

/**
 * منوی هدایا — کاشی‌های بصری هم‌کیفیت با منوی محصولات (فاز Premium Phase 1).
 * تصاویر از نسخهٔ 480webp استفاده می‌کنند (کاشی‌های کوچک = بار سبک‌تر).
 */
const GIFT_TILES = [
  { label: "جعبه‌های هدایای سازمانی", desc: "پکیج شرکتی با برندینگ اختصاصی", href: "/gifts/corporate", image: "corporate-gift-box" },
  { label: "جعبه‌های خرمای پرمیوم", desc: "خرمای ممتاز در جعبهٔ لوکس", href: "/gifts/personal", image: "premium-date-box" },
  { label: "هدایای مدیریتی", desc: "انتخاب فاخر برای مدیران", href: "/gifts/corporate?cat=executive", image: "executive-gift" },
  { label: "یلدا و مناسبت‌ها", desc: "شب چله با امضای هلسا", href: "/gifts/personal?occasion=یلدا", image: "tray-yalda" },
  { label: "جعبه‌های چوبی لوکس", desc: "چوب گردو، ساخت دستی", href: "/gifts/corporate?cat=clients", image: "luxury-wooden-box" },
  { label: "هدایای برندشدهٔ اختصاصی", desc: "طراحی کامل با نشان شما", href: "/gifts/corporate?cat=custom", image: "custom-branded-gift" },
  { label: "هدایای کنفرانس", desc: "پذیرایی و هدیهٔ همایش‌ها", href: "/gifts/corporate?cat=events", image: "conference-gift" },
  { label: "پکیج‌های ویژه VIP", desc: "فاخرترین انتخاب هلسا", href: "/gifts/corporate?cat=executive", image: "gift-pack" },
];

/** تصویر سبک کاشی‌ها: نسخهٔ 480px webp از pipeline بهینه‌شده */
const tileImg = (name: string) => `/images/opt/${name}-480.webp`;

const MEGA_TILES = [
  { label: "خرما", desc: "پیارم، مضافتی، مجول", href: "/products?cat=dates", image: "hero-piarom" },
  { label: "آجیل و مغزها", desc: "آجیل ممتاز و تک‌مغز", href: "/products?cat=nuts", image: "walnut-kernels" },
  { label: "خشکبار", desc: "انجیر، توت، برگه", href: "/products?cat=dried-fruits", image: "hero-nuts-dried-fruits" },
  { label: "شکلات خرمایی", desc: "دست‌ساز کارگاه هلسا", href: "/products?cat=date-products", image: "handmade-date-chocolate" },
  { label: "قند و فرآورده‌های خرما", desc: "قند، شیره و پودر خرما", href: "/products?cat=date-products", image: "date-coconut-sugar" },
  { label: "عسل", desc: "طبیعی، با آنالیز", href: "/products?q=عسل", image: "natural-gon-honey" },
  { label: "زعفران", desc: "سرگل نگین قائنات", href: "/products?q=زعفران", image: "saffron-negin" },
  { label: "محصولات طبیعی", desc: "ارده، چای، دمنوش، ادویه", href: "/products?cat=natural", image: "lahijan-black-tea" },
];

/** Visual tray categories used in the «سینی مزه» mega menu (spec §9) */
const TRAY_TILES = [
  { label: "سینی دو نفره", href: "/mazeh-trays?cat=two", image: "hero-mazeh-tray" },
  { label: "سینی خانوادگی", href: "/mazeh-trays?cat=family", image: "hero-mazeh-tray" },
  { label: "سینی مهمانی", href: "/mazeh-trays?cat=party", image: "hero-mazeh-tray" },
  { label: "سینی VIP", href: "/mazeh-trays?cat=vip", image: "hero-mazeh-tray" },
  { label: "سینی یلدا", href: "/mazeh-trays?cat=yalda", image: "tray-yalda" },
  { label: "سینی نوروز", href: "/mazeh-trays?cat=norooz", image: "tray-norooz" },
];

/**
 * کاشی‌های بصری «مرکز سلامت و رسانه» — همان کیفیت منوی محصولات/هدایا (درخواست کاربر).
 * تصاویر واقعی و منطبق با مقصد: هروهای خود صفحات سلامت، تصویر راهنمای واقعی دمنوش
 * و تصویر مقالهٔ واقعی دانش کشاورزی (هیچ تصویر گمراه‌کننده‌ای استفاده نشده).
 */
const HEALTH_TILES = [
  { label: "مرکز سلامت", desc: "تغذیه، سبک زندگی و دمنوش", href: "/health-center", image: "health-center-hero" },
  { label: "سلامت روان", desc: "استرس، خواب و ذهن‌آگاهی", href: "/health-center/mental-health", image: "mental-health-hero" },
  { label: "راهنمای محصولات", desc: "انتخاب، نگهداری و مصرف درست", href: "/guides", image: "herbal-tea" },
  { label: "مجلهٔ هلسا", desc: "دانش، پشت‌صحنه و داستان‌ها", href: "/blog", image: "agriculture-knowledge" },
];

/** Image-based entries for the mobile drawer (spec §11) */

const MOBILE_TILES = [
  { label: "محصولات", href: "/products", image: "hero-nuts-dried-fruits" },
  { label: "مهمانی و مزه هلسا", href: "/experience", image: "tray-classic" },
  { label: "هدایای هلسا", href: "/gifts", image: "corporate-gift-box" },
  { label: "سینی‌های مزه", href: "/mazeh-trays", image: "hero-mazeh-tray" },
  { label: "روزیته", href: "/rooziteh", image: "rooziteh-tile" },
  { label: "جشنواره‌ها", href: "/campaigns", image: "medjool-dates" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useLang();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // keyboard: Escape closes every overlay; Ctrl/⌘+K opens search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMenu(null);
        setMobileOpen(false);
        setSearchOpen(false);
        setCartOpen(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // lock page scroll while a full-screen overlay is open
  useEffect(() => {
    const locked = mobileOpen || searchOpen || cartOpen;
    document.body.style.overflow = locked ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen, searchOpen, cartOpen]);

  const items = useStore((s) => s.items);
  const wishlist = useStore((s) => s.wishlist);
  const count = items.reduce((a, b) => a + b.qty, 0);

  return (
    <>
      <AnnouncementBar />
      {/* hairline top bar */}
      <div className="hidden md:block bg-surface2 border-b border-line/70 text-[11px] text-muted">
        <div className="container-x flex items-center justify-between h-9">
          <div className="flex items-center gap-5">
            <a href={`tel:${SITE.landline}`} className="inline-flex items-center gap-1.5 hover:text-brand-700 transition-colors" dir="ltr">
              <Phone className="size-3 text-gold-700" aria-hidden />
              {SITE.landline}
            </a>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3 text-gold-700" aria-hidden />
              پشتیبانی {SITE.supportHours}
            </span>
          </div>
          <div className="flex items-center gap-5">
            {SECONDARY_NAV.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-brand-700 transition-colors">{l.label}</Link>
            ))}
            <a href={SITE.instagramUrl} target="_blank" rel="noreferrer" className="hover:text-brand-700 transition-colors" dir="ltr">
              {SITE.instagram}
            </a>
          </div>
        </div>
      </div>

      <header
        className={`sticky top-[34px] z-50 transition-all duration-500 ${
          scrolled ? "bg-surface/85 backdrop-blur-xl border-b border-line/70" : "bg-surface border-b border-transparent"
        }`}
      >
        <div className={`container-x flex items-center gap-3 sm:gap-6 transition-all duration-500 ${scrolled ? "h-16" : "h-20"}`}>
          <button
            className="xl:hidden size-10 shrink-0 grid place-items-center rounded-full text-heading hover:bg-surface2 transition-colors"
            onClick={() => setMobileOpen(true)}
            aria-label={t("header.menu")}
            aria-expanded={mobileOpen}
          >
            <Menu className="size-6" aria-hidden />
          </button>

          <Link href="/" className="shrink-0" aria-label="هلسا — صفحه اصلی">
            <HelsaLogo className={scrolled ? "h-9" : "h-11"} />
          </Link>

          {/* desktop nav */}
          <nav className="hidden xl:flex items-center gap-1 mx-auto" aria-label="ناوبری اصلی" onMouseLeave={() => setOpenMenu(null)}>
            {MAIN_NAV.map((item) => (
              <div key={item.href} className="relative" onMouseEnter={() => setOpenMenu(item.children ? item.label : null)}>
                <Link
                  href={item.href}
                  onClick={() => setOpenMenu(null)}
                  className={`flex items-center gap-1 px-3.5 py-2 text-[13px] font-bold rounded-full transition-colors duration-300 ${
                    pathname === item.href ? "text-brand-700 bg-brand-50" : "text-body hover:text-brand-700"
                  }`}
                >
                  {item.label}
                  {pathname === item.href && (
                    <span className="absolute -bottom-0.5 start-1/2 translate-x-1/2 size-1 rounded-full bg-gold-500" aria-hidden />
                  )}
                  {item.children && <ChevronDown className={`size-3 opacity-50 transition-transform duration-300 ${openMenu === item.label ? "rotate-180" : ""}`} aria-hidden />}
                </Link>

                <AnimatePresence>
                  {item.children && openMenu === item.label && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.25 }}
                      className={`absolute top-full start-0 mt-2 rounded-2xl bg-surface shadow-lift border border-line/80 p-5 overflow-hidden ${item.label === "محصولات" || item.label === "هدایا" || item.label === "مرکز سلامت" ? "w-[640px]" : item.href === "/experience" ? "w-[420px]" : item.href === "/rooziteh" ? "w-[520px]" : "w-72"}`}
                    >
                      {item.label === "محصولات" ? (
                        <div className="grid grid-cols-4 gap-4">
                          {MEGA_TILES.map((t) => (
                            <Link key={t.label} href={t.href} className="group block">
                              <span className="block rounded-xl overflow-hidden aspect-[4/3] bg-surface2">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={tileImg(t.image)} alt={t.label} loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                              </span>
                              <span className="mt-2.5 block text-[12.5px] font-bold text-heading group-hover:text-brand-600 transition-colors">{t.label}</span>
                              <span className="block text-[10.5px] text-muted mt-0.5 leading-4">{t.desc}</span>
                            </Link>
                          ))}
                        </div>
                      ) : item.label === "هدایا" ? (
                        <div>
                          <div className="grid grid-cols-4 gap-4">
                            {GIFT_TILES.map((t) => (
                              <Link key={t.label} href={t.href} className="group block">
                                <span className="block rounded-xl overflow-hidden aspect-[4/3] bg-surface2 shadow-soft transition-shadow duration-500 group-hover:shadow-lift">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={tileImg(t.image)} alt={t.label} loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                                </span>
                                <span className="mt-2.5 block text-[12.5px] font-bold text-heading group-hover:text-brand-600 transition-colors">{t.label}</span>
                                <span className="block text-[10.5px] text-muted mt-0.5 leading-4">{t.desc}</span>
                              </Link>
                            ))}
                          </div>
                          <div className="mt-4 flex gap-2 border-t border-line-soft pt-4">
                            <Link href="/gifts" className="flex-1 h-10 flex items-center justify-center rounded-full bg-brand-700 text-[11.5px] font-bold text-inverse transition-colors hover:bg-brand-800">
                              مشاهده همه هدایا
                            </Link>
                            <Link href="/wholesale/register" className="flex-1 h-10 flex items-center justify-center rounded-full border border-brand-700/40 text-[11.5px] font-bold text-heading transition-colors hover:bg-brand-50">
                              استعلام سازمانی و عمده
                            </Link>
                          </div>
                        </div>
                      ) : item.href === "/experience" ? (
                        <div className="grid grid-cols-3 gap-3">
                          {TRAY_TILES.map((t) => (
                            <Link key={t.label} href={t.href} className="group block">
                              <span className="block overflow-hidden rounded-xl aspect-[4/3] bg-surface2">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={tileImg(t.image)} alt={t.label} loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                              </span>
                              <span className="mt-2 block text-[11.5px] font-bold text-heading group-hover:text-brand-600 transition-colors">{t.label}</span>
                            </Link>
                          ))}
                          <Link href="/mazeh-trays/build" className="col-span-3 mt-1 flex h-10 items-center justify-center rounded-full bg-brand-700 text-[11.5px] font-bold text-inverse transition-colors hover:bg-brand-800">
                            سینی مزه خودت را بساز
                          </Link>
                        </div>
                      ) : item.label === "مرکز سلامت" ? (
                        /* کاشی‌های بصری مرکز سلامت — هم‌الگوی محصولات/هدایا و هم‌محتوا با منوی موبایل (درخواست کاربر) */
                        <div>
                          <div className="grid grid-cols-4 gap-4">
                            {HEALTH_TILES.map((t) => (
                              <Link key={t.label} href={t.href} className="group block">
                                <span className="block rounded-xl overflow-hidden aspect-[4/3] bg-surface2 shadow-soft transition-shadow duration-500 group-hover:shadow-lift">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={tileImg(t.image)} alt={t.label} loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                                </span>
                                <span className="mt-2.5 block text-[12.5px] font-bold text-heading group-hover:text-brand-600 transition-colors">{t.label}</span>
                                <span className="block text-[10.5px] text-muted mt-0.5 leading-4">{t.desc}</span>
                              </Link>
                            ))}
                          </div>
                          <div className="mt-4 flex gap-2 border-t border-line-soft pt-4">
                            <Link href="/podcast" className="flex-1 h-10 flex items-center justify-center rounded-full border border-brand-700/40 text-[11.5px] font-bold text-heading transition-colors hover:bg-brand-50">
                              پادکست هلسا — به‌زودی
                            </Link>
                            <Link href="/videocast" className="flex-1 h-10 flex items-center justify-center rounded-full border border-brand-700/40 text-[11.5px] font-bold text-heading transition-colors hover:bg-brand-50">
                              ویدیاکست
                            </Link>
                          </div>
                        </div>
                      ) : item.href === "/rooziteh" ? (
                        /* روزیته — پنل بصری با بنر ساخته‌شده از عکس واقعی محصولات مالک */
                        <div>
                          <Link href="/rooziteh" className="group block overflow-hidden rounded-xl">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/images/opt/rooziteh-banner-768.webp" alt="روزیته — تولیدکنندگان کوچک هلسا" loading="lazy" className="h-32 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                          </Link>
                          <div className="mt-3 space-y-1">
                            {item.children.map((c) => (
                              <Link key={c.href + c.label} href={c.href} className="group block rounded-xl px-3 py-2 transition-colors hover:bg-brand-50">
                                <span className="flex items-center justify-between text-[13px] font-bold text-heading group-hover:text-brand-700">
                                  {c.label}
                                  <ArrowLeft className="size-3 opacity-0 transition-opacity group-hover:opacity-60" aria-hidden />
                                </span>
                                {c.desc && <span className="mt-0.5 block text-[10.5px] text-muted">{c.desc}</span>}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {item.children.map((c) => (
                            <Link key={c.href + c.label} href={c.href} className="block rounded-xl px-3 py-2 hover:bg-brand-50 transition-colors group">
                              <span className="flex items-center justify-between text-[13px] font-bold text-heading group-hover:text-brand-700">
                                {c.label}
                                <ArrowLeft className="size-3 opacity-0 group-hover:opacity-60 transition-opacity" aria-hidden />
                              </span>
                              {c.desc && <span className="block text-[10.5px] text-muted mt-0.5">{c.desc}</span>}
                            </Link>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </nav>

          {/* actions */}
          <div className="flex items-center gap-1 ms-auto lg:ms-0">
            <Link href="/products" className="hidden lg:inline-flex h-10 items-center rounded-full bg-brand-700 px-5 text-xs font-bold text-inverse transition-colors hover:bg-brand-800 me-2">خرید محصولات</Link>
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden md:flex items-center gap-2 h-10 rounded-full border border-line bg-surface2 px-4 text-xs text-muted hover:border-brand-300 transition-colors me-2"
              aria-label={t("search.placeholder")}
            >
              <Search className="size-3.5 text-brand-600" aria-hidden />
              جستجو در هلسا...
            </button>
            <button onClick={() => setSearchOpen(true)} className="p-2.5 rounded-full text-body hover:bg-surface2 hover:text-heading transition-colors md:hidden" aria-label="جستجو" title="جستجو">
              <Search className="size-5" aria-hidden />
            </button>
            <div className="hidden xl:block me-1"><ThemeSwitcher compact /></div>
            <Link href="/wishlist" className="relative p-2.5 rounded-full text-body hover:bg-surface2 hover:text-heading transition-colors hidden xl:block" aria-label={t("header.wishlist")} title={t("header.wishlist")}>
              <Heart className="size-5" aria-hidden />
              {wishlist.length > 0 && (
                <span className="absolute top-1 end-1 size-4 rounded-full bg-brand-700 text-inverse text-[9.5px] font-bold flex items-center justify-center">
                  {wishlist.length.toLocaleString("fa-IR")}
                </span>
              )}
            </Link>
            <Link href="/account" className="p-2.5 rounded-full text-body hover:bg-brand-50 hover:text-brand-700 transition-colors hidden xl:block" aria-label={t("header.account")} title={t("header.account")}>
              <User className="size-5" aria-hidden />
            </Link>
            <button onClick={() => setCartOpen(true)} className="relative p-2.5 rounded-full text-body hover:bg-brand-50 hover:text-brand-700 transition-colors" aria-label={`${t("header.cart")}, ${count}`} title={t("header.cart")}>
              <ShoppingBag className="size-5" aria-hidden />
              {count > 0 && (
                <span className="absolute top-1 end-1 min-w-4 size-4 px-1 rounded-full bg-brand-700 text-inverse text-[9.5px] font-bold flex items-center justify-center">
                  {count.toLocaleString("fa-IR")}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} onSearch={() => { setMobileOpen(false); setSearchOpen(true); }} />
      <BottomNav onSearch={() => setSearchOpen(true)} />
    </>
  );
}

/* ————————— Search overlay ————————— */
function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLang();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [hi, setHi] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const hitHref = (h: SearchHit) => h.href || `/products/${h.slug}`;

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  useEffect(() => {
    if (!q.trim()) return;
    trackEvent("search", { search_term: q.trim() });
    const id = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { results?: SearchHit[]; trays?: SearchHit[]; gifts?: SearchHit[]; blog?: SearchHit[] };
        const extra = [
          ...(data.trays ?? []).map((t) => ({ ...t, href: `/mazeh-trays/${t.slug}` })),
          ...(data.blog ?? []).map((b) => ({ ...b, href: `/blog/${b.slug}`, category: "مقاله" })),
          ...(data.gifts ?? []),
        ];
        setHits([...(data.results ?? []), ...extra].slice(0, 12));
        setHi(-1);
      } catch {
        setHits([]);
        setHi(-1);
      }
      setLoading(false);
    }, 250);
    return () => clearTimeout(id);
  }, [q]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] bg-ink-900/40 backdrop-blur-sm" onClick={onClose}>
          <motion.div
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-surface mx-auto mt-24 w-[min(94vw,40rem)] rounded-2xl shadow-lift border border-line overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="جستجوی محصولات"
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-line-soft">
              <Search className="size-4.5 text-brand-600" aria-hidden />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown" && hits.length) {
                    e.preventDefault();
                    setHi((h) => (h + 1) % hits.length);
                  } else if (e.key === "ArrowUp" && hits.length) {
                    e.preventDefault();
                    setHi((h) => (h <= 0 ? hits.length - 1 : h - 1));
                  } else if (e.key === "Enter" && q.trim()) {
                    e.preventDefault();
                    onClose();
                    if (hi >= 0 && hits[hi]) router.push(hitHref(hits[hi]));
                    else router.push(`/products?q=${encodeURIComponent(q)}`);
                  } else if (e.key === "Escape") {
                    onClose();
                  }
                }}
                placeholder={t("search.placeholder")}
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-faint"
                aria-label="عبارت جستجو"
              />
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface2" aria-label={t("search.close")}>
                <X className="size-4.5" aria-hidden />
              </button>
            </div>
            <div className="max-h-[58vh] overflow-y-auto p-2">
              {!q.trim() && (
                <div className="p-4">
                  <p className="text-[11px] font-bold text-muted mb-3">{t("search.suggestions")}</p>
                  <div className="flex flex-wrap gap-2">
                    {["خرما پیارم", "خرما مضافتی", "شکلات خرمایی", "آجیل ممتاز", "سینی مزه"].map((s) => (
                      <button key={s} onClick={() => setQ(s)} className="rounded-full border border-line bg-surface2 px-4 py-1.5 text-xs font-bold text-body hover:border-brand-400 hover:text-brand-700 transition-colors">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {loading && <div className="p-4 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>}
              {!loading && q.trim() && hits.length === 0 && (
                <p className="p-6 text-center text-sm text-muted">{t("search.empty")}</p>
              )}
              {!loading && q.trim() &&
                hits.map((h, i) => (
                  <Link
                    key={`${h.kind ?? "p"}-${h.slug}`}
                    href={hitHref(h)}
                    onClick={onClose}
                    aria-current={i === hi}
                    className={`flex items-center gap-3 rounded-xl p-2.5 transition-colors ${i === hi ? "bg-brand-50" : "hover:bg-brand-50"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={h.image} alt={h.name} className="size-12 rounded-lg object-cover" loading="lazy" />
                    <span className="flex-1">
                      <span className="block text-sm font-bold text-heading">{h.name}</span>
                      <span className="block text-[11px] text-muted">{h.price ? formatToman(h.price) : (h.category ?? "")}</span>
                    </span>
                    <ArrowLeft className="size-4 text-faint" aria-hidden />
                  </Link>
                ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ————————— Cart drawer ————————— */
function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLang();
  const { items, setQty, removeItem } = useStore();
  const subtotal = cartSubtotal(items);
  const toast = useToast();
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[80] bg-ink-900/40 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 36 }}
            className="absolute start-0 top-0 h-full w-[min(92vw,25rem)] bg-surface shadow-lift flex flex-col border-s border-line"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="سبد خرید"
          >
            <div className="flex items-center justify-between p-5 border-b border-line-soft">
              <h2 className="font-black text-heading text-sm flex items-center gap-2">
                <ShoppingBag className="size-4.5" aria-hidden /> {t("cart.title")}
              </h2>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface2" aria-label={t("common.close")}>
                <X className="size-4.5" aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {items.length === 0 && (
                <div className="text-center py-16">
                  <ShoppingBag className="size-12 mx-auto text-faint" aria-hidden />
                  <p className="mt-4 text-sm text-muted">سبد خرید شما هنوز خالی است</p>
                  <Link href="/products" onClick={onClose} className="mt-4 inline-block text-sm font-bold text-brand-700 hover:text-heading">
                    مشاهده محصولات
                  </Link>
                </div>
              )}
              {items.map((i) => (
                <div key={i.key} className="flex gap-3 rounded-xl border border-line-soft bg-surface2 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={i.image} alt={i.name} className="size-16 rounded-lg object-cover" loading="lazy" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{i.name}</p>
                    <p className="text-[11px] text-muted mt-0.5">{i.weight ?? i.meta}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs font-extrabold text-heading">{formatToman(i.price * i.qty)}</span>
                      <span className="flex items-center gap-2">
                        <button onClick={() => setQty(i.key, i.qty + 1)} className="size-9 rounded-full bg-surface border border-line text-brand-700 text-sm font-bold" aria-label="افزایش تعداد">+</button>
                        <span className="text-xs font-bold w-5 text-center">{i.qty.toLocaleString("fa-IR")}</span>
                        <button onClick={() => setQty(i.key, i.qty - 1)} className="size-9 rounded-full bg-surface border border-line text-brand-700 text-sm font-bold" aria-label="کاهش تعداد">−</button>
                        <button onClick={() => { removeItem(i.key); toast.push("محصول از سبد خرید حذف شد", "info"); }} className="text-faint hover:text-accent-600 p-1" aria-label="حذف">
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {items.length > 0 && (
              <div className="border-t border-line-soft p-5 space-y-3 bg-surface2">
                {/* پیشرفت ارسال رایگان (CRO/AOV) — آستانهٔ واقعی ۲ میلیون تومان */}
                <div>
                  <p className="text-[11px] font-bold text-muted">
                    {subtotal >= SITE.freeShippingThreshold
                      ? "ارسال رایگان این سفارش فعال شد 🎉"
                      : `${formatToman(SITE.freeShippingThreshold - subtotal)} دیگر تا ارسال رایگان`}
                  </p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
                    <div
                      className="h-full rounded-full bg-brand-600 transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.round((subtotal / SITE.freeShippingThreshold) * 100))}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">{t("cart.subtotal")}</span>
                  <span className="font-extrabold text-heading">{formatToman(subtotal)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/cart" onClick={onClose} className="h-11 rounded-full border border-brand-700/40 text-heading font-bold text-sm flex items-center justify-center hover:bg-brand-50 transition-colors">
                    مشاهده سبد
                  </Link>
                  <Link href="/checkout" onClick={onClose} className="h-11 rounded-full bg-brand-700 text-inverse font-bold text-sm flex items-center justify-center hover:bg-brand-800 transition-colors">
                    ادامه به پرداخت
                  </Link>
                </div>
              </div>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ————————— Mobile full-screen drawer ————————— */
/** Full-height drawer sliding from the RIGHT (correct for RTL), header stays
 *  stable, outside-click closes, body scroll is locked by the parent. */
function MobileMenu({ open, onClose, onSearch }: { open: boolean; onClose: () => void; onSearch: () => void }) {
  const { pref, setPref } = useTheme();
  const { t } = useLang();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[85] xl:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* scrim — click outside closes */}
          <div className="absolute inset-0 bg-ink-900/55 backdrop-blur-[2px]" onClick={onClose} aria-hidden />

          {/* drawer from the right */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 36 }}
            className="absolute inset-y-0 start-0 flex w-[min(86vw,21rem)] flex-col bg-surface shadow-lift border-s border-line"
            role="dialog"
            aria-modal="true"
            aria-label="منوی اصلی"
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-line-soft px-5">
              <HelsaLogo className="h-9" />
              <button onClick={onClose} className="size-10 grid place-items-center rounded-full text-body hover:bg-surface2 hover:text-heading transition-colors" aria-label={t("header.closeMenu")}>
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-5 py-4" aria-label="منوی اصلی">
              {/* visual category tiles (spec §11) */}
              <div className="grid grid-cols-2 gap-2.5 pb-4 mb-3 border-b border-line-soft">
                {MOBILE_TILES.map((t, i) => (
                  <motion.div key={t.href} className={i === 0 ? "col-span-2" : ""} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 * i, duration: 0.25 }}>
                    <Link href={t.href} onClick={onClose} className={`group relative block overflow-hidden rounded-xl border border-line/60 ${i === 0 ? "aspect-[16/7]" : "aspect-[4/3]"}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={tileImg(t.image)} alt={t.label} loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                      <span className="absolute inset-0 bg-gradient-to-t from-brand-950/85 to-transparent" aria-hidden />
                      <span className="absolute bottom-2 start-3 text-[12px] font-black text-inverse">{t.label}</span>
                    </Link>
                  </motion.div>
                ))}
              </div>
              {/* هدایا — گرید بصری هم‌کیفیت با دسکتاپ (فاز Premium) */}
              <div className="pb-4 mb-3 border-b border-line-soft">
                <p className="mb-2.5 text-[11px] font-black text-muted">هدایای سازمانی و پرمیوم</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {GIFT_TILES.map((t, i) => (
                    <motion.div key={t.href + t.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.02 * i, duration: 0.22 }}>
                      <Link href={t.href} onClick={onClose} className="group relative block overflow-hidden rounded-xl border border-line/60 aspect-[4/3]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={tileImg(t.image)} alt={t.label} loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
                        <span className="absolute inset-0 bg-gradient-to-t from-brand-950/85 to-transparent" aria-hidden />
                        <span className="absolute bottom-1.5 start-2.5 end-2 text-[11px] font-black text-inverse leading-4">{t.label}</span>
                      </Link>
                    </motion.div>
                  ))}
                </div>
                <Link href="/wholesale/register" onClick={onClose} className="mt-2.5 flex h-10 items-center justify-center rounded-full border border-brand-700/40 text-xs font-bold text-heading transition-colors hover:bg-brand-50">
                  استعلام خرید سازمانی و عمده
                </Link>
              </div>

              {/* سلامت و رسانه — کاشی‌های بصری هم‌کیفیت با محصولات/هدایا (درخواست کاربر) */}
              <div className="pb-4 mb-3 border-b border-line-soft">
                <p className="mb-2.5 text-[11px] font-black text-muted">مرکز سلامت و رسانهٔ هلسا</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {HEALTH_TILES.map((t, i) => (
                    <motion.div key={t.href} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.02 * i, duration: 0.22 }}>
                      <Link href={t.href} onClick={onClose} className="group relative block overflow-hidden rounded-xl border border-line/60 aspect-[4/3]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={tileImg(t.image)} alt={t.label} loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
                        <span className="absolute inset-0 bg-gradient-to-t from-brand-950/85 to-transparent" aria-hidden />
                        <span className="absolute bottom-1.5 start-2.5 end-2 leading-4">
                          <span className="block text-[11px] font-black text-inverse">{t.label}</span>
                          <span className="block text-[9.5px] font-bold text-inverse/75">{t.desc}</span>
                        </span>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>

              <ul className="space-y-0.5">
                {[
                  { label: "پیشنهاد ویژه", href: "/offers" },
                  { label: "علاقه‌مندی‌ها", href: "/wishlist" },
                  ...SECONDARY_NAV,
                ].map((item, i) => (
                  <motion.li key={item.href} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.03 * i, duration: 0.25 }}>
                    <Link href={item.href} onClick={onClose} className="flex items-center justify-between rounded-xl px-3 py-3 text-[14px] font-bold text-heading hover:bg-surface2 hover:text-brand-600 transition-colors">
                      <span className="inline-flex items-center gap-2">
                        {item.href === "/wishlist" && <Heart className="size-4 text-gold-500" aria-hidden />}
                        {item.label}
                      </span>
                      <ArrowLeft className="size-4 text-gold-500" aria-hidden />
                    </Link>
                  </motion.li>
                ))}
              </ul>

              <button onClick={onSearch} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full border border-brand-700/40 text-sm font-bold text-heading transition-colors hover:bg-surface2">
                <Search className="size-4" aria-hidden /> {t("search.placeholder")}
              </button>

              {/* account */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link href="/login" onClick={onClose} className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-brand-700 text-sm font-bold text-inverse transition-colors hover:bg-brand-800">
                  <User className="size-4" aria-hidden /> {t("header.login")}
                </Link>
                <Link href="/register" onClick={onClose} className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-line text-sm font-bold text-heading transition-colors hover:bg-surface2">
                  {t("header.register")}
                </Link>
              </div>

              {/* theme */}
              <div className="mt-6 border-t border-line-soft pt-4">
                <p className="mb-2 text-[10.5px] font-bold text-muted">حالت نمایش</p>
                <div className="grid grid-cols-3 gap-1.5">
                  <button onClick={() => setPref("light")} aria-pressed={pref === "light"} className={`flex h-10 items-center justify-center gap-1.5 rounded-full border text-[11px] font-bold transition-colors ${pref === "light" ? "border-brand-600 bg-brand-50 text-brand-600" : "border-line text-muted hover:text-heading"}`}>
                    <Sun className="size-3.5" aria-hidden /> روشن
                  </button>
                  <button onClick={() => setPref("dark")} aria-pressed={pref === "dark"} className={`flex h-10 items-center justify-center gap-1.5 rounded-full border text-[11px] font-bold transition-colors ${pref === "dark" ? "border-brand-600 bg-brand-50 text-brand-600" : "border-line text-muted hover:text-heading"}`}>
                    <Moon className="size-3.5" aria-hidden /> شب
                  </button>
                  <button onClick={() => setPref("system")} aria-pressed={pref === "system"} className={`flex h-10 items-center justify-center gap-1 rounded-full border text-[11px] font-bold transition-colors ${pref === "system" ? "border-brand-600 bg-brand-50 text-brand-600" : "border-line text-muted hover:text-heading"}`}>
                    <Monitor className="size-3.5" aria-hidden /> سیستم
                  </button>
                </div>
              </div>
            </nav>

            <div className="shrink-0 border-t border-line-soft px-5 py-4 text-[10.5px] text-muted">
              <p className="font-bold text-heading">{SITE.slogan}</p>
              <p className="mt-1" dir="ltr">{SITE.landline}</p>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ————————— Bottom nav (mobile) ————————— */
function BottomNav({ onSearch }: { onSearch: () => void }) {
  const pathname = usePathname();
  const items = useStore((s) => s.items);
  const count = items.reduce((a, b) => a + b.qty, 0);
  const tabs = [
    { href: "/", label: "خانه", icon: Home },
    { href: "/products", label: "دسته‌بندی", icon: LayoutGrid },
    { href: "#search", label: "جستجو", icon: Search, action: onSearch },
    { href: "/cart", label: "سبد", icon: ShoppingBag, badge: count },
    { href: "/account", label: "حساب", icon: User },
  ];
  return (
    <nav className="fixed bottom-0 inset-x-0 z-[70] lg:hidden bg-surface/95 backdrop-blur-xl border-t border-line/80" aria-label="ناوبری پایین">
      <div className="grid grid-cols-5">
        {tabs.map((t) => {
          const active = t.href !== "#search" && pathname === t.href;
          const Icon = t.icon;
          const inner = (
            <span className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold transition-colors ${active ? "text-brand-700" : "text-muted"}`}>
              <span className="relative">
                <Icon className="size-5" aria-hidden />
                {!!t.badge && t.badge > 0 && (
                  <span className="absolute -top-1.5 -end-2 size-4 rounded-full bg-brand-700 text-inverse text-[9px] flex items-center justify-center font-bold">
                    {t.badge.toLocaleString("fa-IR")}
                  </span>
                )}
              </span>
              {t.label}
            </span>
          );
          return t.action ? (
            <button key={t.label} onClick={t.action} className="relative" aria-label={t.label}>{inner}</button>
          ) : (
            <Link key={t.label} href={t.href} className="relative" aria-label={t.label} aria-current={active ? "page" : undefined}>
              {inner}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
