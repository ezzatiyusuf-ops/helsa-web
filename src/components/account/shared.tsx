"use client";
import { useState } from "react";
import { Check, Printer, CalendarDays, Truck, Home, Package, Ban, RotateCcw } from "lucide-react";
import type { OrderRecord, Address } from "@/types/account";
import { STATUS_LABEL, statusIndex } from "@/lib/store";
import { faDate, faDigits, formatToman } from "@/lib/format";
import { SITE } from "@/config/site";
import { Input, Select, FieldLabel } from "@/components/ui/controls";
import { Button } from "@/components/ui/primitives";
import { useState as useReactState } from "react";

const STEP_ICONS = [Package, Check, Ban, Truck, Home, Home];

export function StatusBadge({ status }: { status: string }) {
  const good = ["paid", "delivered"].includes(status);
  const bad = ["cancelled", "refunded"].includes(status);
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold ${
        bad ? "bg-accent-500/15 text-accent-600" : good ? "bg-brand-500/15 text-brand-600" : "bg-surface2 text-muted"
      }`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function OrderTimeline({ status }: { status: string }) {
  const idx = statusIndex(status);
  const steps = ["pending", "paid", "preparing", "shipped", "transit", "delivered"];
  return (
    <ol className="flex items-center gap-1" aria-label="مراحل سفارش">
      {steps.map((s, i) => {
        const done = i <= idx;
        const isLast = i === steps.length - 1;
        return (
          <li key={s} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 min-w-14">
              <span
                aria-hidden
                className={`flex size-7 items-center justify-center rounded-full border transition-colors ${
                  done ? "border-brand-600 bg-brand-600 text-inverse" : "border-line text-muted"
                }`}
              >
                {constIcon(s, i)}
              </span>
              <span className={`text-[9.5px] font-bold ${done ? "text-heading" : "text-muted"}`}>{STATUS_LABEL[s]}</span>
            </div>
            {!isLast && <span className={`h-px flex-1 mx-1 -mt-5 ${i < idx ? "bg-brand-600" : "bg-line"}`} aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
function constIcon(s: string, i: number) {
  const IC = s === "delivered" ? Home : s === "cancelled" ? Ban : i === 0 ? Package : s === "paid" ? Check : Truck;
  return <IC className="size-3.5" aria-hidden />;
}

export function InvoicePrint({ order }: { order: OrderRecord }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Printer className="size-3.5" aria-hidden /> دانلود / چاپ فاکتور
      </Button>
      {open && (
        <div className="fixed inset-0 z-[90] overflow-auto bg-ink-900/50 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div
            className="mx-auto max-w-2xl rounded-2xl bg-white p-8 text-[#201f1b] shadow-soft"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="فاکتور سفارش"
            id={`invoice-${order.code}`}
          >
            <div className="flex items-start justify-between border-b border-black/10 pb-5">
              <div>
                <p className="text-xl font-black text-brand-700">هلسا</p>
                <p className="text-[10px] font-bold text-[#a8861d] mt-0.5">محصولات طبیعی</p>
                <p className="mt-2 text-[11px] text-black/60">{SITE.businessName}</p>
                <p className="mt-1 text-[11px] text-black/60 leading-5">{SITE.address}</p>
                <p className="text-[11px] text-black/60" dir="ltr">{SITE.landline} · {SITE.mobile}</p>
              </div>
              <div className="text-end text-[11px] text-black/70 space-y-1">
                <p className="text-base font-black text-black">فاکتور فروش</p>
                <p dir="ltr">{order.code}</p>
                <p className="flex items-center gap-1 justify-end"><CalendarDays className="size-3" aria-hidden /> {faDate(order.date)}</p>
                <p className="font-bold">{STATUS_LABEL[order.status] ?? order.status}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 py-5 text-[11px] text-black/70">
              <div>
                <p className="font-black text-black mb-1.5">مشخصات گیرنده</p>
                <p>{order.customer.firstName} {order.customer.lastName}</p>
                <p dir="ltr" className="mt-0.5">{order.customer.mobile}</p>
                {order.customer.email && <p dir="ltr" className="mt-0.5">{order.customer.email}</p>}
              </div>
              {order.address && (
                <div>
                  <p className="font-black text-black mb-1.5">آدرس ارسال</p>
                  <p>{order.address.province}، {order.address.city}</p>
                  <p className="mt-0.5">{order.address.full}</p>
                  <p className="mt-0.5">کد پستی: {faDigits(order.address.postal)}</p>
                </div>
              )}
            </div>

            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-y border-black/10 text-black/70 font-bold">
                  <th className="text-start py-2">محصول</th>
                  <th className="text-center py-2">تعداد</th>
                  <th className="text-center py-2">قیمت واحد</th>
                  <th className="text-end py-2">جمع</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((it) => (
                  <tr key={it.key} className="border-b border-black/5">
                    <td className="py-2.5">
                      <span className="font-bold">{it.name}</span>
                      {it.meta && <span className="mt-0.5 block text-[10px] text-black/50">{it.meta}</span>}
                    </td>
                    <td className="text-center">{faDigits(it.qty)}</td>
                    <td className="text-center">{formatToman(it.price)}</td>
                    <td className="text-end font-bold">{formatToman(it.price * it.qty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <dl className="mt-4 ms-auto max-w-xs space-y-1.5 text-[12px] text-black/70">
              <div className="flex justify-between"><dt>جمع محصولات</dt><dd>{formatToman(order.subtotal)}</dd></div>
              <div className="flex justify-between"><dt>تخفیف</dt><dd>{order.discount ? formatToman(order.discount) : "—"}</dd></div>
              <div className="flex justify-between"><dt>هزینه ارسال</dt><dd>{order.shipping ? formatToman(order.shipping) : "رایگان"}</dd></div>
              <div className="flex justify-between border-t border-black/10 pt-2 text-base font-black text-black"><dt>مبلغ نهایی</dt><dd>{formatToman(order.total)}</dd></div>
            </dl>

            <div className="mt-8 flex items-center justify-between border-t border-black/10 pt-4 text-[10px] text-black/50">
              <p>هلسا؛ طعم طبیعت، هنر پذیرایی ایرانی</p>
              <p>{SITE.slogan}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function AddressForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Address;
  onSave: (a: Omit<Address, "id">) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState<Omit<Address, "id">>({
    province: initial?.province ?? "تهران",
    city: initial?.city ?? "",
    full: initial?.full ?? "",
    postal: initial?.postal ?? "",
    plate: initial?.plate ?? "",
    unit: initial?.unit ?? "",
    recipient: initial?.recipient ?? "",
    phone: initial?.phone ?? "",
    label: initial?.label ?? "منزل",
    default: initial?.default ?? false,
  });
  const [err, setErr] = useState<Record<string, string>>({});
  const set = (k: keyof Omit<Address, "id">, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  const submit = () => {
    const e: Record<string, string> = {};
    if (!f.city.trim()) e.city = "شهر را وارد کنید";
    if (f.full.trim().length < 6) e.full = "آدرس کامل را وارد کنید";
    if (!/^\d{10}$/.test(f.postal)) e.postal = "کد پستی باید ۱۰ رقم باشد";
    if (f.recipient.trim().length < 2) e.recipient = "نام گیرنده الزامی است";
    if (!/^09\d{9}$/.test(f.phone)) e.phone = "شماره تماس معتبر نیست";
    setErr(e);
    if (Object.keys(e).length) return;
    onSave(f);
  };

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <FieldLabel text="برچسب" hint="منزل / محل کار">
        <Select value={f.label} onChange={(e) => set("label", e.target.value)}>
          <option>منزل</option><option>محل کار</option><option>سایر</option>
        </Select>
      </FieldLabel>
      <FieldLabel text="نام گیرنده" error={err.recipient}>
        <Input value={f.recipient} onChange={(e) => set("recipient", e.target.value)} placeholder="نام و نام خانوادگی گیرنده" />
      </FieldLabel>
      <FieldLabel text="استان" error={err.province}>
        <Select value={f.province} onChange={(e) => set("province", e.target.value)}>
          {["تهران","البرز","اصفهان","فارس","خراسان رضوی","گیلان","مازندران","کرمان","خوزستان","هرمزگان","بوشهر","یزد","قم","سایر"].map((p) => <option key={p}>{p}</option>)}
        </Select>
      </FieldLabel>
      <FieldLabel text="شهر" error={err.city}>
        <Input value={f.city} onChange={(e) => set("city", e.target.value)} placeholder="مثلاً تهران" />
      </FieldLabel>
      <FieldLabel text="آدرس کامل" error={err.full} className="sm:col-span-2">
        <Input value={f.full} onChange={(e) => set("full", e.target.value)} placeholder="خیابان، کوچه، پلاک" />
      </FieldLabel>
      <FieldLabel text="کد پستی" error={err.postal}>
        <Input value={f.postal} onChange={(e) => set("postal", e.target.value.replace(/[^\d]/g, ""))} placeholder="۱۰ رقم" dir="ltr" inputMode="numeric" />
      </FieldLabel>
      <FieldLabel text="شماره تماس" error={err.phone}>
        <Input value={f.phone} onChange={(e) => set("phone", e.target.value.replace(/[^\d]/g, ""))} placeholder="۰۹۱۲۳۴۵۶۷۸۹" dir="ltr" inputMode="numeric" />
      </FieldLabel>
      <FieldLabel text="پلاک" hint="اختیاری">
        <Input value={f.plate} onChange={(e) => set("plate", e.target.value)} placeholder="۱۲" />
      </FieldLabel>
      <FieldLabel text="واحد" hint="اختیاری">
        <Input value={f.unit} onChange={(e) => set("unit", e.target.value)} placeholder="۳" />
      </FieldLabel>
      <label className="flex items-center gap-2 text-xs font-bold text-heading cursor-pointer sm:col-span-2">
        <input type="checkbox" checked={f.default} onChange={(e) => set("default", e.target.checked)} className="size-4 accent-brand-600" />
        انتخاب به‌عنوان آدرس پیش‌فرض
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <Button onClick={submit}>{initial ? "ذخیره تغییرات" : "افزودن آدرس"}</Button>
        <Button variant="outline" onClick={onCancel}>انصراف</Button>
      </div>
    </div>
  );
}

export function OrderProducts({ order }: { order: OrderRecord }) {
  return (
    <ul className="divide-y divide-line-soft">
      {order.items.map((it) => (
        <li key={it.key} className="flex items-center gap-4 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={it.image} alt={it.name ?? "تصویر محصول"} className="size-14 rounded-xl object-cover border border-line/70" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-heading truncate">{it.name}</p>
            <p className="text-[11px] text-muted mt-0.5">{it.weight ?? it.meta ?? ""}</p>
          </div>
          <div className="text-end">
            <p className="text-sm font-extrabold text-heading">{formatToman(it.price * it.qty)}</p>
            <p className="text-[11px] text-muted">{faDigits(it.qty)} × {formatToman(it.price)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
