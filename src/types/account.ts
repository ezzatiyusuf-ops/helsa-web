import type { PayState } from "@/config/payments";

export interface Address {
  id: string;
  province: string;
  city: string;
  full: string;
  postal: string;
  plate: string;
  unit: string;
  recipient: string;
  phone: string;
  label: string;
  default: boolean;
}

export interface OrderProduct {
  key: string;
  name: string;
  price: number;
  qty: number;
  image: string;
  weight?: string;
  meta?: string;
}

export interface OrderRecord {
  code: string;
  date: string;
  customer: { firstName: string; lastName: string; mobile: string; email?: string };
  address?: Address;
  items: OrderProduct[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  couponCode?: string | null;
  shippingMethod: string;
  paymentMethod: string;
  payState: PayState;
  payRef?: string;
  status: string;
  /** §۲۰ یادداشت سفارش مشتری — از سرور می‌آید (ستون orders.note) */
  note?: string;
  /** مشارکت حمایتی داوطلبانه (تومان) */
  supportContribution?: number;
  /** §۲۱ گزینهٔ هدیه — پرچم + گیرنده + پیام + درخواست بسته‌بندی (بدون ادعای قیمتی) */
  isGift?: boolean;
  giftRecipient?: string;
  giftMessage?: string;
  giftPackaging?: boolean;
  track?: { label: string; when: string }[];
}

export interface Notification {
  id: string;
  kind: "order" | "payment" | "shipping" | "promo" | "system";
  text: string;
  date: string;
  read: boolean;
}

export interface Review {
  id: string;
  productId: number;
  author: string;
  rating: number;
  title: string;
  text: string;
  date: string;
}
