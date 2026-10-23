"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Coupon } from "@/types";
import type { Address, Notification, OrderRecord } from "@/types/account";
import { SITE } from "@/config/site";
import { trackEvent } from "@/lib/analytics";

interface CartState {
  items: CartItem[];
  wishlist: number[];
  compare: number[];
  coupon: Coupon | null;
  user: { name: string; mobile: string } | null;
  orders: OrderRecord[];
  addresses: Address[];
  notifications: Notification[];
  guest: boolean;
  consent: boolean | null;
  authRedirect: string | null;

  addItem: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  setItemPrice: (key: string, price: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
  toggleWishlist: (id: number) => boolean;
  toggleCompare: (id: number) => boolean;
  clearCompare: () => void;
  setCoupon: (c: Coupon | null) => void;
  login: (u: { name: string; mobile: string }, opts?: { merge?: boolean }) => void;
  logout: () => void;
  addOrder: (o: OrderRecord) => void;
  mergeServerOrders: (list: OrderRecord[]) => void;
  getOrder: (code: string) => OrderRecord | undefined;
  updateOrder: (code: string, patch: Partial<OrderRecord>) => void;
  addAddress: (a: Omit<Address, "id">) => Address;
  updateAddress: (id: string, patch: Partial<Address>) => void;
  removeAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
  pushNotification: (kind: Notification["kind"], text: string) => void;
  markNotificationRead: (id: string) => void;
  setGuest: (g: boolean) => void;
  setConsent: (c: boolean) => void;
  setAuthRedirect: (p: string | null) => void;
}

let seq = 1000;
const uid = () => `id-${(seq += 1)}-${Date.now().toString(36)}`;

export const useStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      wishlist: [],
      compare: [],
      coupon: null,
      user: null,
      orders: [],
      addresses: [],
      notifications: [],
      guest: false,
      consent: null,
      authRedirect: null,

      addItem: (item, qty = 1) =>
        set((s) => {
          trackEvent("add_to_cart", { item_name: item.name, item_kind: item.kind, value: item.price * qty, quantity: qty });
          const found = s.items.find((i) => i.key === item.key);
          if (found) {
            return { items: s.items.map((i) => (i.key === item.key ? { ...i, qty: Math.min(i.qty + qty, 99) } : i)) };
          }
          return { items: [...s.items, { ...item, qty }] };
        }),

      setQty: (key, qty) =>
        set((s) => ({ items: s.items.map((i) => (i.key === key ? { ...i, qty: Math.min(Math.max(1, qty), 99) } : i)) })),

      // قیمت نمایشی سبد را با قیمت به‌روز سرور هم‌راستا می‌کند (نمایش صادقانه؛
      // مبلغ نهایی همیشه سمت سرور در ثبت سفارش بازمحاسبه می‌شود)
      setItemPrice: (key, price) =>
        set((s) => ({ items: s.items.map((i) => (i.key === key && i.price !== price ? { ...i, price } : i)) })),

      removeItem: (key) =>
        set((s) => {
          const removed = s.items.find((i) => i.key === key);
          if (removed) trackEvent("remove_from_cart", { item_name: removed.name, item_kind: removed.kind });
          return { items: s.items.filter((i) => i.key !== key) };
        }),
      clearCart: () => set({ items: [], coupon: null }),

      toggleWishlist: (id) => {
        const has = get().wishlist.includes(id);
        if (!has) trackEvent("wishlist_add", { item_id: id });
        set((s) => ({ wishlist: has ? s.wishlist.filter((w) => w !== id) : [...s.wishlist, id] }));
        return !has;
      },
      toggleCompare: (id) => {
        const has = get().compare.includes(id);
        set((s) => ({
          compare: has ? s.compare.filter((c) => c !== id) : s.compare.length < 4 ? [...s.compare, id] : s.compare,
        }));
        return !has;
      },
      clearCompare: () => set({ compare: [] }),
      setCoupon: (c) => set({ coupon: c }),

      login: (u, opts) => {
        const cur = get();
        // merge guest cart & wishlist into account (no double-add — dedupe by key)
        const merged = opts?.merge ?? false;
        set({
          user: u,
          guest: false,
          items: merged ? cur.items : cur.items,
          authRedirect: null,
        });
      },
      logout: () => set({ user: null, guest: true }),

      addOrder: (o) => set((s) => ({ orders: [o, ...s.orders] })),
      // Server orders are authoritative; local-only orders (e.g. offline history) are kept.
      // Dedupe by order code prevents duplicate rows from merging.
      mergeServerOrders: (list) => set((s) => {
        if (!list.length) return {};
        const byCode = new Map<string, OrderRecord>();
        for (const o of list) byCode.set(o.code, o);
        for (const o of s.orders) if (!byCode.has(o.code)) byCode.set(o.code, o);
        const orders = [...byCode.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
        return { orders };
      }),
      getOrder: (code) => get().orders.find((o) => o.code === code),
      updateOrder: (code, patch) =>
        set((s) => ({ orders: s.orders.map((o) => (o.code === code ? { ...o, ...patch } : o)) })),

      addAddress: (a) => {
        const newA: Address = { ...a, id: uid() };
        set((s) => ({
          addresses: newA.default ? [...s.addresses.map((x) => ({ ...x, default: false })), newA] : [...s.addresses, newA],
        }));
        return newA;
      },
      updateAddress: (id, patch) =>
        set((s) => ({
          addresses: s.addresses.map((a) =>
            a.id === id ? { ...a, ...patch, default: patch.default ? true : a.default } : patch.default ? { ...a, default: false } : a,
          ),
        })),
      removeAddress: (id) => set((s) => ({ addresses: s.addresses.filter((a) => a.id !== id) })),
      setDefaultAddress: (id) =>
        set((s) => ({ addresses: s.addresses.map((a) => ({ ...a, default: a.id === id })) })),

      pushNotification: (kind, text) =>
        set((s) => ({ notifications: [{ id: uid(), kind, text, date: new Date().toISOString(), read: false }, ...s.notifications] })),
      markNotificationRead: (id) =>
        set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),

      setGuest: (g) => set({ guest: g }),
      setConsent: (c) => set({ consent: c }),
      setAuthRedirect: (p) => set({ authRedirect: p }),
    }),
    { name: "helsa-store-v2", version: 2 },
  ),
);

// توابع پولی به منبع واحد منتقل شدند (src/lib/money.ts) — برای سازگاری importهای موجود re-export می‌شوند
export { cartSubtotal, couponDiscount, shippingFee } from "@/lib/money";

/* ——— order status track (visual timeline) ——— */
export const ORDER_LIFECYCLE = ["pending", "paid", "preparing", "shipped", "transit", "delivered"] as const;
export function statusIndex(status: string): number {
  const i = ORDER_LIFECYCLE.indexOf(status as (typeof ORDER_LIFECYCLE)[number]);
  return i >= 0 ? i : 0;
}
export const STATUS_LABEL: Record<string, string> = {
  pending: "در انتظار پرداخت",
  paid: "پرداخت شده",
  preparing: "در حال آماده‌سازی",
  shipped: "تحویل به پست",
  transit: "در مسیر",
  delivered: "تحویل شده",
  cancelled: "لغو شده",
  refunded: "مرجوع شده",
};
