"use client";
import { useMemo, useState } from "react";
import { Gift, Loader2, ShoppingBag } from "lucide-react";
import type { GiftPackage } from "@/types";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { Button, Price, QtyPicker } from "@/components/ui/primitives";
import { FieldLabel, Input, Select, TextArea } from "@/components/ui/controls";
import { faDigits } from "@/lib/format";

export function PersonalGiftClient({ pack }: { pack: GiftPackage }) {
  const toast = useToast();
  const addItem = useStore((s) => s.addItem);
  const [qty, setQty] = useState(Math.max(1, pack.minQty));
  const [packagingId, setPackagingId] = useState(pack.packagingOptions[0]?.id ?? "standard");
  const [occasion, setOccasion] = useState(pack.occasions[0] ?? "");
  const [recipientName, setRecipientName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const packaging = useMemo(
    () => pack.packagingOptions.find((p) => p.id === packagingId) ?? pack.packagingOptions[0],
    [pack.packagingOptions, packagingId],
  );
  const unitPreview = pack.basePrice + (packaging?.price ?? 0);

  const onAdd = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/gifts/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageSlug: pack.slug,
          quantity: qty,
          packagingId,
          occasion,
          recipientName: pack.allowsRecipient ? recipientName : undefined,
          message: pack.allowsMessage ? message : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok || !data.quote?.id) {
        toast.push(data.message || "قیمت‌گذاری هدیه انجام نشد", "error");
        return;
      }
      const q = data.quote as {
        id: number;
        unitPrice: number;
        total: number;
        quantity: number;
        packageName: string;
        packagingLabel: string;
        image: string;
        config: { recipientName?: string; message?: string; occasion?: string };
      };
      addItem({
        key: `gift-quote-${q.id}`,
        kind: "gift",
        id: `gift-${q.id}`,
        name: q.packageName,
        image: q.image || pack.image,
        price: q.unitPrice,
        meta: [
          q.packagingLabel,
          q.config.occasion,
          q.config.recipientName ? `گیرنده: ${q.config.recipientName}` : "",
          q.config.message ? "همراه با پیام" : "",
        ].filter(Boolean).join(" · "),
      }, q.quantity);
      toast.push("هدیه با قیمت تأییدشده سرور به سبد اضافه شد");
    } catch {
      toast.push("متأسفانه مشکلی پیش آمد. دوباره تلاش کنید.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-x py-10 md:py-14 grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
      <div className="rounded-2xl overflow-hidden border border-line/70 bg-surface2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pack.image} alt={pack.imageAlt || pack.name} className="w-full aspect-[4/3] object-cover" />
      </div>

      <div>
        <p className="text-[11px] font-bold tracking-[0.2em] text-gold-700">هدیه شخصی هلسا</p>
        <h2 className="mt-3 text-2xl md:text-[34px] font-black text-heading leading-[1.45]">{pack.name}</h2>
        <p className="mt-4 text-sm leading-8 text-muted">{pack.description}</p>

        <ul className="mt-5 flex flex-wrap gap-2">
          {pack.contents.map((c) => (
            <li key={c} className="rounded-full border border-line bg-surface px-3 py-1.5 text-[11px] font-bold text-body">{c}</li>
          ))}
        </ul>

        <div className="mt-7 rounded-2xl border border-line/70 bg-surface p-6 space-y-4">
          <div className="flex items-end justify-between gap-3">
            <Price price={unitPreview} oldPrice={pack.oldPrice} size="lg" />
            <span className="text-[11px] font-bold text-muted">موجود · {faDigits(pack.stock)}</span>
          </div>

          <FieldLabel text="نوع بسته‌بندی">
            <Select value={packagingId} onChange={(e) => setPackagingId(e.target.value)}>
              {pack.packagingOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}{p.price ? ` (+${p.price.toLocaleString("fa-IR")} تومان)` : ""}
                </option>
              ))}
            </Select>
          </FieldLabel>

          <FieldLabel text="مناسبت">
            <Select value={occasion} onChange={(e) => setOccasion(e.target.value)}>
              {pack.occasions.map((o) => <option key={o} value={o}>{o}</option>)}
            </Select>
          </FieldLabel>

          {pack.allowsRecipient && (
            <FieldLabel text="نام گیرنده (اختیاری)">
              <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="مثلاً سارا" />
            </FieldLabel>
          )}

          {pack.allowsMessage && (
            <FieldLabel text="پیام هدیه (اختیاری)">
              <TextArea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="پیام کوتاه روی کارت هدیه..." />
            </FieldLabel>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <QtyPicker value={qty} onChange={setQty} max={Math.min(pack.maxQty, Math.max(pack.stock, 1))} />
            <Button onClick={onAdd} disabled={busy || pack.stock <= 0} className="flex-1 min-w-44">
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ShoppingBag className="size-4" aria-hidden />}
              افزودن هدیه به سبد
            </Button>
          </div>
          <p className="text-[11px] text-muted leading-6 flex items-start gap-2">
            <Gift className="size-3.5 mt-0.5 text-gold-700 shrink-0" aria-hidden />
            قیمت نهایی پس از تأیید سرور به سبد افزوده می‌شود؛ مبلغ کلاینت مبنای سفارش نیست.
          </p>
        </div>
      </div>
    </div>
  );
}
