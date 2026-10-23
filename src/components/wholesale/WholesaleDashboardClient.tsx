"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Minus, Plus, Search, Send, ShoppingCart, Repeat2, CheckCircle2 } from "lucide-react";
import { Button, Price } from "@/components/ui/primitives";
import { Input } from "@/components/ui/controls";
import { useToast } from "@/components/ui/Toast";
import { faDate, faDigits, formatToman } from "@/lib/format";
import { WHOLESALE_MIN_ITEM_QTY } from "@/config/wholesale";

interface CatalogItem { id: number; name: string; slug: string; category: string; unit: string; price: number; wholesalePrice: number; stock: number }
interface OrderRow { id: number; code: string; total: number; status: string; paymentStatus: string; createdAt: string }

export function WholesaleDashboardClient({
  business, catalog, orders,
}: {
  business: { code: string; businessName: string; discountPercent: number };
  catalog: CatalogItem[];
  orders: OrderRow[];
}) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [qty, setQty] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState(false);
  const [doneCode, setDoneCode] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return catalog;
    return catalog.filter((c) => c.name.includes(q) || c.category.includes(q) || c.slug.includes(q.toLowerCase()));
  }, [catalog, query]);

  const lines = useMemo(
    () => Object.entries(qty).filter(([, q]) => q >= WHOLESALE_MIN_ITEM_QTY).map(([id, q]) => ({ item: catalog.find((c) => c.id === Number(id))!, qty: q })).filter((l) => l.item),
    [qty, catalog],
  );
  const total = lines.reduce((s, l) => s + l.item.wholesalePrice * l.qty, 0);
  const retailTotal = lines.reduce((s, l) => s + l.item.price * l.qty, 0);
  const savings = retailTotal - total;

  const inc = (id: number, delta: number, max: number) =>
    setQty((q) => ({ ...q, [id]: Math.min(max, Math.max(0, (q[id] ?? 0) + delta)) }));

  const submit = async () => {
    if (!lines.length) { toast.push("سبد عمده خالی است", "error"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/wholesale/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: lines.map((l) => ({ productId: l.item.id, qty: l.qty })) }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) { toast.push(data.message || "ثبت سفارش انجام نشد", "error"); return; }
      setDoneCode(data.code);
      setQty({});
      toast.push(`سفارش عمده ${data.code} ثبت شد`);
      setTimeout(() => window.location.reload(), 1600);
    } catch {
      toast.push("متأسفانه مشکلی پیش آمد. دوباره تلاش کنید.", "error");
    } finally { setBusy(false); }
  };

  const repeatOrder = async (orderId: number) => {
    setBusy(true);
    try {
      const res = await fetch("/api/wholesale/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repeatOrderId: orderId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) { toast.push(data.message || "تکرار سفارش انجام نشد", "error"); return; }
      setDoneCode(data.code);
      toast.push(`سفارش تکراری ${data.code} ثبت شد`);
      setTimeout(() => window.location.reload(), 1600);
    } catch {
      toast.push("متأسفانه مشکلی پیش آمد. دوباره تلاش کنید.", "error");
    } finally { setBusy(false); }
  };

  return (
    <div className="container-x py-10 grid grid-cols-1 lg:grid-cols-[1fr_330px] gap-8 items-start">
      {/* catalog */}
      <section aria-label="کاتالوگ عمده">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-black text-heading">کاتالوگ با قیمت همکاری ({faDigits(catalog.length)} کالا)</h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted" aria-hidden />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جستجوی کالا یا دسته..." className="ps-9" aria-label="جستجو در کاتالوگ عمده" />
          </div>
        </div>

        {doneCode && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-[12px] font-bold text-brand-800">
            <CheckCircle2 className="size-4 shrink-0" aria-hidden />
            سفارش {doneCode} ثبت شد — کارشناس B2B برای فاکتور و پرداخت با شما تماس می‌گیرد.
          </div>
        )}

        <div className="mt-4 overflow-x-auto rounded-2xl border border-line/70 bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line/70 text-[11px] text-muted">
                <th scope="col" className="p-3 text-start font-bold">کالا</th>
                <th scope="col" className="p-3 text-start font-bold">قیمت خرده</th>
                <th scope="col" className="p-3 text-start font-bold">قیمت همکاری</th>
                <th scope="col" className="p-3 text-start font-bold">موجودی</th>
                <th scope="col" className="p-3 text-start font-bold">تعداد</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 120).map((c) => {
                const q = qty[c.id] ?? 0;
                return (
                  <tr key={c.id} className={`border-b border-line/50 last:border-0 ${q > 0 ? "bg-brand-50/60" : ""}`}>
                    <td className="p-3">
                      <Link href={`/products/${c.slug}`} className="font-bold text-heading hover:text-brand-700">{c.name}</Link>
                      <span className="block text-[10px] text-muted">{c.category}{c.unit ? ` · ${c.unit}` : ""}</span>
                    </td>
                    <td className="p-3 text-xs text-muted line-through">{formatToman(c.price)}</td>
                    <td className="p-3"><Price price={c.wholesalePrice} size="sm" /></td>
                    <td className="p-3">
                      <span className={`text-[11px] font-bold ${c.stock > 20 ? "text-brand-700" : c.stock > 0 ? "text-accent-600" : "text-accent-700"}`}>
                        {c.stock > 0 ? faDigits(c.stock) : "ناموجود"}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5" role="group" aria-label={`تعداد ${c.name}`}>
                        <button type="button" onClick={() => inc(c.id, -WHOLESALE_MIN_ITEM_QTY, c.stock)} disabled={q === 0} aria-label="کاهش" className="grid size-8 place-items-center rounded-full border border-line bg-surface2 disabled:opacity-40"><Minus className="size-3.5" aria-hidden /></button>
                        <span className="w-8 text-center text-sm font-black text-heading">{faDigits(q)}</span>
                        <button type="button" onClick={() => inc(c.id, WHOLESALE_MIN_ITEM_QTY, c.stock)} disabled={c.stock < WHOLESALE_MIN_ITEM_QTY} aria-label="افزایش" className="grid size-8 place-items-center rounded-full border border-line bg-surface2 disabled:opacity-40"><Plus className="size-3.5" aria-hidden /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-xs text-muted">کالایی یافت نشد</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10.5px] text-muted">
          گام تعداد هر کالا {faDigits(WHOLESALE_MIN_ITEM_QTY)} عدد است. قیمت‌ها سمت سرور با تخفیف همکاری {faDigits(business.discountPercent)}٪ شما محاسبه می‌شوند.
        </p>
      </section>

      {/* order summary */}
      <aside className="lg:sticky lg:top-24 space-y-4" aria-label="خلاصه سفارش عمده">
        <div className="rounded-2xl border border-line/70 bg-surface p-5">
          <p className="text-[11px] font-bold tracking-[0.18em] text-gold-700">سبد عمده</p>
          {lines.length === 0 ? (
            <p className="mt-3 text-[11px] text-muted">هنوز کالایی انتخاب نشده است</p>
          ) : (
            <ul className="mt-3 space-y-2 max-h-52 overflow-y-auto">
              {lines.map((l) => (
                <li key={l.item.id} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="truncate text-body">{l.item.name}</span>
                  <span className="shrink-0 font-bold text-heading">×{faDigits(l.qty)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 border-t border-line/70 pt-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">جمع خرده‌فروشی</span>
              <span className="text-muted line-through">{formatToman(retailTotal)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">سود قیمت همکاری</span>
              <span className="font-bold text-brand-700">{formatToman(savings)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-line/70 pt-2">
              <span className="text-sm font-black text-heading">جمع سفارش</span>
              <Price price={total} size="md" />
            </div>
          </div>
          <Button className="mt-4 w-full" onClick={submit} disabled={busy || !lines.length}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
            ثبت سفارش عمده
          </Button>
          <p className="mt-2 text-[10px] leading-5 text-muted">پرداخت پس از صدور فاکتور رسمی و هماهنگی با کارشناس B2B انجام می‌شود؛ هیچ پرداخت جعلی شبیه‌سازی نمی‌شود.</p>
        </div>

        {/* orders history */}
        <div className="rounded-2xl border border-line/70 bg-surface p-5">
          <p className="text-[11px] font-bold tracking-[0.18em] text-gold-700">سفارش‌های عمده</p>
          {orders.length === 0 ? (
            <p className="mt-3 text-[11px] text-muted">هنوز سفارش عمده‌ای ثبت نکرده‌اید</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {orders.map((o) => (
                <li key={o.id} className="rounded-xl border border-line/70 bg-surface2 px-3.5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span dir="ltr" className="text-[11px] font-black text-heading">{o.code}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-black ${o.status === "delivered" ? "bg-brand-100 text-brand-800" : "bg-surface text-muted border border-line"}`}>
                      {o.status === "pending" ? "در انتظار" : o.status === "paid" ? "پرداخت‌شده" : o.status}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-price">{formatToman(o.total)}</span>
                    <span className="text-[9.5px] text-muted">{faDate(o.createdAt.slice(0, 10))}</span>
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    <Link href={`/account/orders/${o.id}`} className="rounded-full border border-line bg-surface px-2.5 py-1 text-[9.5px] font-bold text-brand-700 hover:border-brand-400">فاکتور</Link>
                    <button type="button" onClick={() => repeatOrder(o.id)} disabled={busy} className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-[9.5px] font-bold text-heading hover:border-brand-400 disabled:opacity-50">
                      <Repeat2 className="size-3" aria-hidden /> تکرار
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-line/70 bg-surface2 p-4 flex items-start gap-2.5">
          <ShoppingCart className="size-4 mt-0.5 shrink-0 text-brand-700" aria-hidden />
          <p className="text-[10.5px] leading-5 text-muted">حداقل جمع سفارش عمده {formatToman(5_000_000)} است. برای زمان‌بندی ارسال منظم (هفتگی/ماهانه) با کارشناس خود هماهنگ کنید.</p>
        </div>
      </aside>
    </div>
  );
}
