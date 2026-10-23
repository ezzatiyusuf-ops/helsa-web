"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Package, MapPin, Heart, TicketPercent, UtensilsCrossed, User, Settings, Bell, LogOut, Plus, RotateCcw, CreditCard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { AddressForm, StatusBadge, InvoicePrint, OrderProducts } from "@/components/account/shared";
import { Button, LinkButton } from "@/components/ui/primitives";
import { FieldLabel, Input } from "@/components/ui/controls";
import { useTheme } from "@/components/theme/ThemeProvider";
import { faDate, faDigits, formatToman } from "@/lib/format";
import { COUPONS } from "@/data/content";
import { trackEvent } from "@/lib/analytics";
import type { OrderRecord } from "@/types/account";
import type { CartItem } from "@/types";

type Tab = "overview" | "orders" | "addresses" | "wishlist" | "coupons" | "trays" | "profile" | "settings" | "notifications";

const NAV: { id: Tab; label: string; icon: typeof User; href: string }[] = [
  { id: "overview", label: "نمای کلی", icon: User, href: "/account" },
  { id: "orders", label: "سفارش‌های من", icon: Package, href: "/account/orders" },
  { id: "addresses", label: "آدرس‌ها", icon: MapPin, href: "/account/addresses" },
  { id: "wishlist", label: "علاقه‌مندی‌ها", icon: Heart, href: "/wishlist" },
  { id: "coupons", label: "کدهای تخفیف", icon: TicketPercent, href: "/account?tab=coupons" },
  { id: "trays", label: "سینی‌های مزه من", icon: UtensilsCrossed, href: "/account?tab=trays" },
  { id: "profile", label: "اطلاعات شخصی", icon: User, href: "/account/profile" },
  { id: "settings", label: "تنظیمات", icon: Settings, href: "/account/settings" },
  { id: "notifications", label: "اعلان‌ها", icon: Bell, href: "/account/notifications" },
];

const STATUS_LABEL: Record<string, string> = {
  pending: "در انتظار پرداخت", paid: "پرداخت شده", preparing: "در حال آماده‌سازی", shipped: "تحویل به پست",
  transit: "در مسیر", delivered: "تحویل شده", cancelled: "لغو شده", refunded: "مرجوع شده",
};
const PAY_LABEL: Record<string, string> = { online: "پرداخت آنلاین", card: "کارت به کارت", cod: "پرداخت در محل" };
/**
 * آیا این سفارش منتظر واریز کارت‌به‌کارت است؟
 * وضعیت پرداخت (payState) و وضعیت سفارش (status) دو چیز جدا هستند.
 */
function needsCardPayment(o: OrderRecord): boolean {
  return o.paymentMethod === "card" && o.payState === "pending" && (o.status === "pending" || o.status === "awaiting_payment");
}

function CardPayButton({ code, size = "sm" }: { code: string; size?: "sm" | "md" }) {
  return (
    <Link href={`/payment/card?code=${encodeURIComponent(code)}`} aria-label={`پرداخت کارت‌به‌کارت سفارش ${code}`}
      className={size === "sm"
        ? "inline-flex h-9 items-center gap-1.5 rounded-full bg-brand-700 px-3.5 text-[11px] font-bold text-white hover:bg-brand-800"
        : "inline-flex h-11 items-center gap-2 rounded-full bg-brand-700 px-5 text-[13px] font-bold text-white hover:bg-brand-800"}>
      <CreditCard className={size === "sm" ? "size-3.5" : "size-4"} aria-hidden />
      پرداخت کارت‌به‌کارت
    </Link>
  );
}

const cls = "w-full h-11 rounded-xl border border-line bg-surface2 px-4 text-sm text-heading placeholder:text-muted outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 transition-[border-color,box-shadow,background-color]";

export function AccountDashboard({ tab, orderId }: { tab: Tab; orderId?: string }) {
  const { user, logout, orders, addresses, wishlist, notifications, items, addAddress, updateAddress, removeAddress, setDefaultAddress, markNotificationRead, pushNotification, mergeServerOrders } = useStore();
  const toast = useToast();
  const router = useRouter();

  // سفارش‌های واقعی این حساب از دیتابیس — مالکیت سمت سرور بررسی می‌شود؛
  // با تاریخ محلی ادغام می‌شود (بدون تکرار؛ کد سفارش ملاک است).
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch("/api/orders")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { ok?: boolean; orders?: OrderRecord[] } | null) => {
        if (!cancelled && d?.ok && Array.isArray(d.orders)) mergeServerOrders(d.orders);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.name, user?.mobile]);

  const handleLogout = async () => {
    trackEvent("logout", { method: "account" });
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    logout();
    toast.push("از حساب خود خارج شدید", "info");
  };

  // Sync authoritative server session (OAuth / password / OTP). Never invent a local session.
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d: { ok: boolean; name?: string; email?: string | null; phone?: string | null; provider?: string }) => {
        if (d.ok && d.name) {
          const mobile = d.phone || d.email || "";
          if (!user || user.name !== d.name || user.mobile !== mobile) {
            useStore.getState().login({ name: d.name, mobile });
          }
        } else if (user) {
          useStore.getState().logout();
        }
      })
      .catch(() => undefined);
  }, [user, toast]);

  if (!user) {
    return (
      <div className="container-x py-20 max-w-md mx-auto text-center">
        <User className="size-12 mx-auto text-muted" aria-hidden />
        <h1 className="mt-4 text-lg font-black text-heading">ابتدا وارد حساب خود شوید</h1>
        <p className="mt-2 text-sm text-muted leading-7">برای مشاهده سفارش‌ها، علاقه‌مندی‌ها و سینی‌های خود وارد شوید.</p>
        <div className="mt-6 flex justify-center gap-3">
          <LinkButton href="/login">ورود</LinkButton>
          <LinkButton href="/register" variant="outline">ثبت‌نام</LinkButton>
        </div>
      </div>
    );
  }

  const myTrays = items.filter((i) => i.kind === "tray" || i.kind === "custom-tray");
  const selected = orderId ? orders.find((o) => o.code === orderId) : null;

  return (
    <div className="container-x py-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-8">
        <div>
          <p className="text-[11px] font-bold tracking-[0.2em] text-gold-700">حساب کاربری من</p>
          <h1 className="mt-2 text-3xl font-black text-heading">سلام، <span className="text-brand-700">{user.name}</span></h1>
        </div>
        <button
          onClick={handleLogout}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-xs font-bold text-heading hover:text-accent-600 transition-colors"
        >
          <LogOut className="size-3.5" aria-hidden /> خروج
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-10 items-start">
        <nav className="lg:sticky lg:top-28 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-2" aria-label="بخش‌های حساب">
          {NAV.map((n) => {
            const Icon = n.icon;
            const badge = n.id === "wishlist" ? wishlist.length : n.id === "notifications" ? notifications.filter((x) => !x.read).length : n.id === "orders" ? orders.length : 0;
            const active = tab === n.id || (n.id === "orders" && orderId);
            return (
              <button
                key={n.id}
                onClick={() => router.push(n.href)}
                className={`flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-[12.5px] font-bold transition-colors ${active ? "bg-brand-700 text-inverse" : "text-muted hover:bg-surface2 hover:text-heading"}`}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-4" aria-hidden />
                <span className="flex-1 text-start">{n.label}</span>
                {badge > 0 && <span className="size-4 rounded-full bg-gold-500 text-brand-950 text-[9.5px] flex items-center justify-center">{faDigits(badge)}</span>}
              </button>
            );
          })}
        </nav>

        <div className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div key={orderId ?? tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
              {tab === "overview" && <Overview orders={orders.length} wishlistLen={wishlist.length} traysLen={myTrays.length} />}
              {tab === "orders" && !orderId && <OrdersList orders={orders} />}
              {tab === "orders" && orderId && selected && <OrderDetail order={selected} />}
              {tab === "addresses" && <Addresses />}
              {tab === "wishlist" && <WishlistPanel count={wishlist.length} />}
              {tab === "coupons" && <Coupons />}
              {tab === "trays" && <MyTrays trays={myTrays} />}
              {tab === "profile" && <Profile />}
              {tab === "settings" && <SettingsPanel />}
              {tab === "notifications" && <NotificationsPanel notifications={notifications} markRead={markNotificationRead} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Overview({ orders, wishlistLen, traysLen }: { orders: number; wishlistLen: number; traysLen: number }) {
  const cards = [
    { label: "سفارش‌های من", icon: Package, n: orders, n0: "سفارش", href: "/account/orders" },
    { label: "علاقه‌مندی‌ها", icon: Heart, n: wishlistLen, n0: "محصول", href: "/wishlist" },
    { label: "سینی‌های مزه من", icon: UtensilsCrossed, n: traysLen, n0: "سینی", href: "/account?tab=trays" },
    { label: "آدرس‌ها", icon: MapPin, href: "/account/addresses" },
    { label: "کدهای تخفیف", icon: TicketPercent, href: "/account?tab=coupons" },
    { label: "تنظیمات", icon: Settings, href: "/account/settings" },
  ];
  return (
    <div>
      <p className="text-xs text-muted mb-4">دسترسی سریع شما به همه بخش‌های حساب.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.label} href={c.href} className="group rounded-2xl border border-line bg-surface p-5 card-hover">
              <span className="inline-flex size-10 rounded-full border border-brand-200 text-brand-700 items-center justify-center group-hover:bg-brand-700 group-hover:text-inverse transition-colors">
                <Icon className="size-4" aria-hidden />
              </span>
              <p className="mt-3 text-[13px] font-black text-heading">{c.label}</p>
              {c.n !== undefined && <p className="mt-1 text-[11px] text-muted">{faDigits(c.n)} {c.n0}</p>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function OrdersList({ orders }: { orders: OrderRecord[] }) {
  const addItem = useStore((st) => st.addItem);
  const toast = useToast();

  // خرید مجدد: اقلام واقعی سفارش با همان کلید/نوع به سبد برمی‌گردند
  const reorder = (o: OrderRecord) => {
    let n = 0;
    for (const it of o.items) {
      const kind: CartItem["kind"] = it.key.startsWith("t-")
        ? "tray"
        : it.key.startsWith("g-") || it.key.startsWith("gift-quote-")
          ? "gift"
          : it.key.startsWith("custom-quote-")
            ? "custom-tray"
            : "product";
      addItem({ key: it.key, kind, id: it.key.replace(/[^0-9]/g, "") || it.key, name: it.name, image: it.image, price: it.price, weight: it.weight, meta: it.meta }, it.qty);
      n++;
    }
    trackEvent("reorder_click", { order: o.code, items: n });
    toast.push(`${faDigits(n)} قلم دوباره به سبد خرید اضافه شد`);
  };

  return (
    <div>
      <h2 className="text-base font-black text-heading mb-5">سفارش‌های من</h2>
      {orders.length === 0 ? (
        <p className="text-sm text-muted">هنوز سفارشی ثبت نکرده‌اید. <Link href="/products" className="text-brand-700 font-bold">شروع خرید</Link></p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.code} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 card-hover">
              <Link href={`/account/orders/${o.code}`} className="min-w-0">
                <p className="text-sm font-black text-heading" dir="ltr">{o.code}</p>
                <p className="text-[11px] text-muted mt-0.5">{faDate(o.date)} · {faDigits(o.items.length)} قلم</p>
              </Link>
              <div className="flex items-center gap-3">
                <StatusBadge status={o.status} />
                <p className="text-sm font-black text-heading">{formatToman(o.total)}</p>
                {needsCardPayment(o) && <CardPayButton code={o.code} />}
                <button
                  type="button"
                  onClick={() => reorder(o)}
                  aria-label={`خرید مجدد اقلام سفارش ${o.code}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3.5 text-[11px] font-bold text-brand-700 transition-colors hover:border-brand-500 hover:bg-brand-50"
                >
                  <RotateCcw className="size-3.5" aria-hidden /> خرید مجدد
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OrderDetail({ order }: { order: OrderRecord }) {
  const steps = [
    { k: "تماس با ما", desc: "استقبال", side: "fr" },
  ];
  void steps;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-heading" dir="ltr">{order.code}</h2>
          <p className="text-[11px] text-muted mt-1">{faDate(order.date)} · {STATUS_LABEL[order.status] ?? order.status}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="rounded-2xl border border-line bg-surface p-5">
        <OrderTrack status={order.status} />
      </div>

      <div className="rounded-2xl border border-line bg-surface p-6">
        <h3 className="text-sm font-black text-heading mb-4">محصولات</h3>
        <OrderProducts order={order} />
        <dl className="mt-5 space-y-2 text-[13px] text-muted">
          <div className="flex justify-between"><dt>جمع محصولات</dt><dd>{formatToman(order.subtotal)}</dd></div>
          {order.discount ? <div className="flex justify-between"><dt>تخفیف</dt><dd className="text-accent-600">{formatToman(order.discount)}</dd></div> : null}
          <div className="flex justify-between"><dt>هزینه ارسال</dt><dd>{order.shipping ? formatToman(order.shipping) : "رایگان"}</dd></div>
          <div className="flex justify-between border-t border-line-soft pt-2 text-base font-black text-heading"><dt>مبلغ نهایی</dt><dd>{formatToman(order.total)}</dd></div>
        </dl>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {order.address && (
          <div className="rounded-2xl border border-line bg-surface p-6">
            <h3 className="text-sm font-black text-heading flex items-center gap-2 mb-3"><MapPin className="size-4 text-brand-600" aria-hidden /> آدرس ارسال</h3>
            <p className="text-xs text-muted leading-6">{order.address.recipient} · <span dir="ltr">{order.address.phone}</span></p>
            <p className="text-xs text-muted leading-6 mt-1">{order.address.province}، {order.address.city}، {order.address.full} · کد پستی {faDigits(order.address.postal)}</p>
          </div>
        )}
        <div className="rounded-2xl border border-line bg-surface p-6">
          <h3 className="text-sm font-black text-heading mb-3">روش پرداخت و ارسال</h3>
          <p className="text-xs text-muted">پرداخت: {PAY_LABEL[order.paymentMethod] ?? order.paymentMethod}</p>
          <p className="text-xs text-muted mt-1">ارسال: {order.shippingMethod}</p>
          {order.payRef && <p className="text-xs text-muted mt-1">کد پیگیری: <span dir="ltr">{order.payRef}</span></p>}
          {order.note && <p className="text-xs text-muted mt-1 leading-6">یادداشت سفارش: {order.note}</p>}
          {order.isGift && (
            <p className="text-xs text-muted mt-1 leading-6">
              سفارش هدیه{order.giftRecipient ? ` برای ${order.giftRecipient}` : ""}{order.giftMessage ? ` — پیام: «${order.giftMessage}»` : ""}{order.giftPackaging ? " · بسته‌بندی هدیه درخواست شده" : ""}
            </p>
          )}
        </div>
      </div>

      {needsCardPayment(order) && (
        <div className="rounded-2xl border border-brand-500/30 bg-brand-50/60 p-5">
          <h3 className="text-sm font-black text-heading flex items-center gap-2 mb-2"><CreditCard className="size-4 text-brand-600" aria-hidden /> پرداخت کارت‌به‌کارت</h3>
          <p className="text-[12px] text-muted leading-6">
            این سفارش در انتظار واریز است. کارت‌به‌کارت کنید و تصویر رسید را در همان صفحه بارگذاری کنید؛
            سفارش پس از <b className="text-heading">تأیید واریز توسط هلسا</b> پرداخت‌شده می‌شود — بارگذاری رسید به‌تنهایی به معنای پرداخت نیست.
          </p>
          <div className="mt-3"><CardPayButton code={order.code} size="md" /></div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <InvoicePrint order={order} />
        <LinkButton href="/products" variant="outline" size="sm">خرید مجدد</LinkButton>
        <LinkButton href="/track" variant="outline" size="sm">پیگیری سفارش</LinkButton>
      </div>
    </div>
  );
}

function OrderTrack({ status }: { status: string }) {
  const steps = ["pending", "paid", "preparing", "shipped", "transit", "delivered"];
  const idx = steps.indexOf(status);
  if (idx < 0) return <p className="text-xs text-muted">{STATUS_LABEL[status] ?? status}</p>;
  return (
    <ol className="flex flex-wrap gap-2" aria-label="مراحل سفارش">
      {steps.map((s, i) => (
        <li key={s} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ${i <= idx ? "bg-brand-700 text-inverse" : "bg-surface2 text-muted"}`}>
          {i <= idx && <span aria-hidden>✓</span>}
          {STATUS_LABEL[s]}
        </li>
      ))}
    </ol>
  );
}

function Addresses() {
  const { addresses, addAddress, updateAddress, removeAddress, setDefaultAddress } = useStore();
  const toast = useToast();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-black text-heading">آدرس‌های من</h2>
        <Button size="sm" onClick={() => setAdding(true)}><Plus className="size-3.5" aria-hidden /> افزودن آدرس</Button>
      </div>
      {(adding || !!editing) && (
        <div className="rounded-2xl border border-line bg-surface p-5 mb-5">
          <AddressForm
            key={editing ?? "new"}
            initial={addresses.find((a) => a.id === editing)}
            onCancel={() => { setAdding(false); setEditing(null); }}
            onSave={(a) => { if (editing) { updateAddress(editing, a); toast.push("آدرس ویرایش شد"); } else { addAddress(a); toast.push("آدرس اضافه شد"); } setAdding(false); setEditing(null); }}
          />
        </div>
      )}
      {addresses.length === 0 ? (
        <p className="text-sm text-muted rounded-2xl border border-dashed border-line p-8 text-center">هنوز آدرسی ثبت نکرده‌اید.</p>
      ) : (
        <div className="space-y-3">
          {addresses.map((a) => (
            <div key={a.id} className="rounded-2xl border border-line bg-surface p-5">
              <p className="text-sm font-bold text-heading">
                {a.recipient} <span className="text-[10px] text-muted">({a.label})</span>
                {a.default && <span className="ms-2 text-[10px] text-brand-600 font-bold">پیش‌فرض</span>}
              </p>
              <p className="text-xs text-muted mt-1 leading-6">{a.province}، {a.city}، {a.full} · پلاک {a.plate || "—"} · واحد {a.unit || "—"}</p>
              <p className="text-xs text-muted mt-1" dir="ltr">{a.phone}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(a.id)}>ویرایش</Button>
                <Button size="sm" variant="outline" onClick={() => removeAddress(a.id)}>حذف</Button>
                {!a.default && <Button size="sm" variant="outline" onClick={() => setDefaultAddress(a.id)}>انتخاب پیش‌فرض</Button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WishlistPanel({ count }: { count: number }) {
  return (
    <div>
      <h2 className="text-base font-black text-heading mb-5">علاقه‌مندی‌ها</h2>
      {count === 0 ? (
        <p className="text-sm text-muted">هنوز محصولی به علاقه‌مندی‌ها اضافه نکرده‌اید. <Link href="/products" className="text-brand-700 font-bold">مشاهده محصولات</Link></p>
      ) : (
        <p className="text-sm text-muted">{faDigits(count)} محصول در لیست شماست — <Link href="/wishlist" className="text-brand-700 font-bold">مشاهده کامل</Link></p>
      )}
    </div>
  );
}

function Coupons() {
  return (
    <div>
      <h2 className="text-base font-black text-heading mb-5">کدهای تخفیف</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {COUPONS.map((c) => (
          <div key={c.code} className="rounded-xl border border-line bg-surface p-4">
            <p className="font-black tracking-widest text-heading" dir="ltr">{c.code}</p>
            <p className="mt-1 text-[11px] text-muted">{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MyTrays({ trays }: { trays: ReturnType<typeof useStore.getState>["items"] }) {
  return (
    <div>
      <h2 className="text-base font-black text-heading mb-5">سینی‌های مزه من</h2>
      {trays.length === 0 ? (
        <p className="text-sm text-muted">هنوز سینی‌ای نساخته‌اید — <Link href="/mazeh-trays/build" className="text-brand-700 font-bold">سینی مزه خودتان را بسازید</Link>.</p>
      ) : (
        <ul className="space-y-3">
          {trays.map((t) => (
            <li key={t.key} className="flex items-center gap-4 rounded-xl border border-line bg-surface p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.image} alt={t.name ?? "تصویر سینی"} className="size-14 rounded-lg object-cover" />
              <span className="flex-1">
                <span className="block text-sm font-bold text-heading">{t.name}</span>
                <span className="block text-[11px] text-muted mt-0.5">{t.meta}</span>
              </span>
              <span className="text-sm font-black text-heading">{formatToman(t.price * t.qty)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Profile() {
  const { user } = useStore();
  const toast = useToast();
  const [p, setP] = useState({ name: user?.name ?? "", mobile: user?.mobile ?? "", email: "" });
  return (
    <div className="max-w-lg space-y-4">
      <h2 className="text-base font-black text-heading">اطلاعات شخصی</h2>
      <FieldLabel text="نام و نام خانوادگی"><Input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></FieldLabel>
      <FieldLabel text="شماره موبایل"><Input value={p.mobile} dir="ltr" onChange={(e) => setP({ ...p, mobile: e.target.value })} /></FieldLabel>
      <FieldLabel text="ایمیل"><Input value={p.email} dir="ltr" onChange={(e) => setP({ ...p, email: e.target.value })} placeholder="اختیاری" /></FieldLabel>
      <Button onClick={() => toast.push("اطلاعات شخصی با موفقیت ذخیره شد")}>ذخیره تغییرات</Button>
    </div>
  );
}

function SettingsPanel() {
  const { pref, setPref } = useTheme();
  const toast = useToast();
  const options = [
    { id: "system", label: "مطابق سیستم" },
    { id: "light", label: "حالت روشن" },
    { id: "dark", label: "حالت شب" },
  ] as const;
  return (
    <div className="max-w-md space-y-6">
      <h2 className="text-base font-black text-heading">تنظیمات نمایش</h2>
      <div>
        <p className="text-xs font-bold text-heading mb-2">حالت نمایش</p>
        <div className="flex flex-wrap gap-2">
          {options.map((o) => (
            <button key={o.id} onClick={() => setPref(o.id)} className={`rounded-full px-4 py-2 text-xs font-bold border transition-colors ${pref === o.id ? "bg-brand-700 text-inverse border-brand-700" : "border-line text-heading hover:border-brand-400"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-bold text-heading mb-2">اعلان‌ها</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => toast.push("اعلان سفارش و پرداخت همیشه فعال است", "info")} className="rounded-full px-4 py-2 text-xs font-bold border border-brand-400 text-heading">سفارش و پرداخت (فعال)</button>
          <button onClick={() => toast.push("اعلان تبلیغاتی غیرفعال است؛ بدون رضایت شما ارسال نمی‌شود", "info")} className="rounded-full px-4 py-2 text-xs font-bold border border-line text-muted">تبلیغاتی (غیرفعال)</button>
        </div>
      </div>
    </div>
  );
}

function NotificationsPanel({ notifications, markRead }: { notifications: ReturnType<typeof useStore.getState>["notifications"]; markRead: (id: string) => void }) {
  return (
    <div>
      <h2 className="text-base font-black text-heading mb-5">اعلان‌ها</h2>
      {notifications.length === 0 ? (
        <p className="text-sm text-muted rounded-2xl border border-dashed border-line p-8 text-center">اعلان‌ی ندارید.</p>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <button key={n.id} onClick={() => markRead(n.id)} className={`w-full rounded-2xl border p-4 text-start transition-colors ${n.read ? "border-line bg-surface opacity-70" : "border-brand-200 bg-surface"}`}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-heading">{n.text}</p>
                {!n.read && <span className="size-2 rounded-full bg-brand-600" aria-hidden />}
              </div>
              <p className="mt-1 text-[11px] text-muted">{faDate(n.date)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
