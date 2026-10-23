"use client";

/**
 * کاتالوگ رسمی کامپوننت‌های هلسا — /admin/catalog (فقط برای ادمین، noindex)
 * ---------------------------------------------------------------------------
 * هر کامپوننت با نمونهٔ زندهٔ واقعی (همان کد تولیدی، همان Tailwind tokenها)
 * رندر می‌شود؛ نه کپی/شبیه‌سازی. ابزار توسعهٔ تیم طراحی/فرانت.
 *
 * چرا Storybook جدا نصب نشد؟ بیلد Storybook در سندباکس ۲GB RAM جواب نمی‌دهد و
 * پشتیبانی آن از Next 16 هنوز تأییدنشده است؛ این کاتالوگ همان نقش را با
 * صفر وابستگی جدید ایفا می‌کند و در محیط واقعی پروژه رندر می‌شود
 * (RTL، فونت وزیرمتن، دارک‌مود، توکن‌های برند). اگر بعداً Storybook مستقل
 * خواستید: `npx storybook@latest init` روی ماشین توسعه (RAM ≥ ۴GB).
 */

import { useState } from "react";
import { Sparkles, Package, Type as TypeIcon, Image as ImageIcon, Layers } from "lucide-react";
import {
  HelsaLogo,
  Button,
  LinkButton,
  Badge,
  Stars,
  Price,
  QtyPicker,
  SectionHead,
  Reveal,
  Countdown,
  LOGO_GREEN,
} from "@/components/ui/primitives";
import { Input, Select, TextArea, FieldLabel, Skeleton, CardSkeleton, EmptyState, Modal } from "@/components/ui/controls";
import { useToast } from "@/components/ui/Toast";
import { SmartImage } from "@/components/ui/SmartImage";
import { CouponBanner } from "@/components/ui/CouponBanner";

/* ─────────────────────────── primitives کوچک نمایش ─────────────────────────── */

function Section({ id, icon, title, desc, children }: { id: string; icon: React.ReactNode; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-line bg-surface p-6 md:p-8">
      <header className="mb-6 flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">{icon}</span>
        <div>
          <h2 className="text-lg font-black text-heading">{title}</h2>
          {desc && <p className="mt-1 text-[13px] leading-6 text-muted">{desc}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

function CodeNote({ children }: { children: React.ReactNode }) {
  return (
    <p dir="ltr" className="mt-5 overflow-x-auto rounded-xl bg-surface2 px-4 py-2.5 text-left font-mono text-[11px] leading-5 text-muted">
      {children}
    </p>
  );
}

const TOKENS: Array<{ name: string; hex: string; use: string }> = [
  { name: "brand-700", hex: "#2f6800", use: "سبز اصلی — دکمه/لوگو/تأکید" },
  { name: "brand-800", hex: "#245200", use: "hover سبز" },
  { name: "accent-500", hex: "#c2410c", use: "تأکید ثانویه (مسی)" },
  { name: "gold-500", hex: "#d97706", use: "طلایی — نشان/هشدار ملایم" },
  { name: "canvas", hex: "#faf7ef", use: "پس‌زمینهٔ صفحه" },
  { name: "surface", hex: "#ffffff", use: "کارت/پنل" },
  { name: "line", hex: "#e7e0cf", use: "حاشیه‌ها" },
  { name: "heading", hex: "#1f2937", use: "متن تیتر" },
];

/** مقدار نمایشی Countdown — یک‌بار در بارگذاری ماژول (خارج از رندرِ کامپوننت) */
const COUNTDOWN_DEMO_UNTIL = new Date(Date.now() + 3 * 86400000).toISOString();

export default function AdminCatalogPage() {
  const toast = useToast();
  const [qty, setQty] = useState(2);
  const [modalOpen, setModalOpen] = useState(false);
  const [sampleText, setSampleText] = useState("خرید عمده خرما");

  const nav = [
    { href: "#tokens", label: "توکن‌ها" },
    { href: "#buttons", label: "دکمه‌ها" },
    { href: "#data", label: "داده/قیمت" },
    { href: "#forms", label: "فرم" },
    { href: "#feedback", label: "بازخورد" },
    { href: "#media", label: "رسانه" },
  ];

  return (
    <div className="space-y-6">
      {/* ── معرفی ── */}
      <div className="rounded-2xl border border-line bg-gradient-to-l from-brand-50 to-surface p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold tracking-[0.2em] text-gold-700">کتابخانهٔ طراحی هلسا</p>
            <h1 className="mt-2 text-2xl font-black text-heading">کاتالوگ رسمی کامپوننت‌ها</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
              نمونهٔ زندهٔ تمام اجزای رابط کاربری فروشگاه — همان کد تولیدی از <code dir="ltr">src/components/ui</code>،
              همان توکن‌های برند و فونت وزیرمتن. هر بخش مسیر import واقعی را نشان می‌دهد.
            </p>
          </div>
          <HelsaLogo className="h-14" />
        </div>
        <nav className="mt-6 flex flex-wrap gap-2">
          {nav.map((n) => (
            <a key={n.href} href={n.href} className="rounded-full border border-line bg-surface px-4 py-1.5 text-xs font-bold text-heading transition-colors hover:border-brand-700 hover:bg-brand-50">
              {n.label}
            </a>
          ))}
        </nav>
      </div>

      {/* ── توکن‌های رنگ ── */}
      <Section id="tokens" icon={<Sparkles className="size-5" />} title="توکن‌های رنگ برند" desc="از این توکن‌ها استفاده کنید؛ رنگ خام HTML ممنوع (به‌جز مقادیر ثابت مثل LOGO_GREEN).">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {TOKENS.map((t) => (
            <div key={t.name} className="rounded-xl border border-line p-3">
              <span className="block h-10 w-full rounded-lg border border-line" style={{ backgroundColor: t.hex }} />
              <p dir="ltr" className="mt-2 text-left font-mono text-[11px] font-bold text-heading">{t.name}</p>
              <p className="mt-1 text-[11px] leading-5 text-muted">{t.use}</p>
            </div>
          ))}
        </div>
        <CodeNote>{`LOGO_GREEN = "${LOGO_GREEN}" · tailwind: bg-brand-700 text-gold-700 border-line …`}</CodeNote>
      </Section>

      {/* ── دکمه‌ها ── */}
      <Section id="buttons" icon={<Layers className="size-5" />} title="دکمه‌ها — Button / LinkButton" desc="۶ گونه × ۳ اندازه؛ حالت disabled و فعال (press) را هم امتحان کنید.">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">primary — خرید</Button>
          <Button variant="accent">accent</Button>
          <Button variant="gold">gold</Button>
          <Button variant="outline">outline</Button>
          <Button variant="cream">cream</Button>
          <Button variant="ghost">ghost</Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button size="sm">small</Button>
          <Button size="md">medium</Button>
          <Button size="lg">large</Button>
          <Button disabled>disabled</Button>
          <LinkButton href="/admin" variant="outline" size="sm">LinkButton →</LinkButton>
        </div>
        <CodeNote>{`<Button variant="gold" size="lg">متن</Button> · <LinkButton href="/products" variant="primary">متن</LinkButton>`}</CodeNote>
      </Section>

      {/* ── داده: Badge/Stars/Price/QtyPicker/Countdown ── */}
      <Section id="data" icon={<Package className="size-5" />} title="نمایش داده — Badge · Stars · Price · QtyPicker · Countdown" desc="قیمت با جداکنندهٔ فارسی و تومان؛ QtyPicker تعاملی است.">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="mb-3 text-xs font-bold text-muted">Badge — ۴ لحن</p>
            <div className="flex flex-wrap gap-2">
              <Badge tone="brand">جدید</Badge>
              <Badge tone="accent">پرفروش</Badge>
              <Badge tone="gold">پیشنهاد ویژه</Badge>
              <Badge tone="ink">عمده</Badge>
            </div>
            <p className="mb-3 mt-6 text-xs font-bold text-muted">Stars + Price</p>
            <Stars rating={4.5} reviews={128} />
            <div className="mt-3 flex flex-wrap items-end gap-6">
              <Price price={485000} size="sm" />
              <Price price={485000} size="md" />
              <Price price={620000} oldPrice={690000} size="lg" />
            </div>
          </div>
          <div>
            <p className="mb-3 text-xs font-bold text-muted">QtyPicker — تعاملی (max=10)</p>
            <QtyPicker value={qty} onChange={setQty} max={10} />
            <p className="mt-3 text-xs text-muted">مقدار فعلی: {qty}</p>
            <p className="mb-3 mt-6 text-xs font-bold text-muted">Countdown — تا ۳ روز دیگر</p>
            <Countdown until={COUNTDOWN_DEMO_UNTIL} />
          </div>
        </div>
        <CodeNote>{`<Badge tone="gold">…</Badge> · <Stars rating={4.5} reviews={128} /> · <Price price={485000} oldPrice={620000} size="lg" />`}</CodeNote>
      </Section>

      {/* ── فرم ── */}
      <Section id="forms" icon={<TypeIcon className="size-5" />} title="کنترل‌های فرم — Input · Select · TextArea · FieldLabel" desc="الگوی ثابت فرم‌های هلسا (ورود/چک‌اوت/ادمین).">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <FieldLabel text="متن جست‌وجو" hint="الزومی">
              <Input value={sampleText} onChange={(e) => setSampleText(e.target.value)} placeholder="مثلاً: خرمای مضافتی" />
            </FieldLabel>
          </div>
          <div className="space-y-2">
            <FieldLabel text="دسته‌بندی">
              <Select defaultValue="dates">
                <option value="dates">خرما</option>
                <option value="nuts">آجیل</option>
                <option value="gifts">سبد هدیه</option>
              </Select>
            </FieldLabel>
          </div>
          <div className="space-y-2 md:col-span-2">
            <FieldLabel text="توضیحات سفارش" hint="اختیاری">
              <TextArea rows={3} placeholder="مثلاً: بسته‌بندی کادویی باشد" />
            </FieldLabel>
          </div>
        </div>
        <CodeNote>{`import { Input, Select, TextArea, FieldLabel } from "@/components/ui/controls"`}</CodeNote>
      </Section>

      {/* ── بازخورد: Skeleton/EmptyState/Modal/Toast ── */}
      <Section id="feedback" icon={<Sparkles className="size-5" />} title="بازخورد و حالت‌ها — Skeleton · EmptyState · Modal · Toast" desc="همه تعاملی: دکمه‌ها را بزنید.">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="mb-3 text-xs font-bold text-muted">Skeleton — حین بارگذاری</p>
            <div className="space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-28 w-full" /></div>
            <p className="mb-3 mt-5 text-xs font-bold text-muted">CardSkeleton</p>
            <div className="max-w-[220px]"><CardSkeleton /></div>
          </div>
          <div>
            <p className="mb-3 text-xs font-bold text-muted">EmptyState</p>
            <EmptyState icon={<Package className="size-7" />} title="سبد خرید خالی است" desc="از فروشگاه هلسا انتخاب کنید" ctaLabel="رفتن به فروشگاه" onAction={() => toast.push("نمونه — در صفحهٔ واقعی به /products می‌رود", "info")} />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="gold" onClick={() => setModalOpen(true)}>نمایش Modal</Button>
          <Button variant="accent" onClick={() => toast.push("محصول به سبد اضافه شد ✓", "success")}>Toast موفق</Button>
          <Button variant="outline" onClick={() => toast.push("موجودی کافی نیست", "error")}>Toast خطا</Button>
          <Button variant="ghost" onClick={() => toast.push("این یک اطلاع‌رسانی است", "info")}>Toast اطلاع</Button>
        </div>
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} label="نمونهٔ مودال">
          <p className="text-sm leading-7 text-muted">
            این همان Modal تولیدی است که در چک‌اوت و پنل ادمین استفاده می‌شود — با انیمیشن، برچسب دسترس‌پذیری و بستن با کلیک بیرون.
          </p>
        </Modal>
        <CodeNote>{`const toast = useToast(); toast.push("متن", "success" | "error" | "info") · <Modal open={} onClose={} label="عنوان">…</Modal>`}</CodeNote>
      </Section>

      {/* ── رسانه: SmartImage/لوگو/CouponBanner/SectionHead/Reveal ── */}
      <Section id="media" icon={<ImageIcon className="size-5" />} title="رسانه و ترکیب — SmartImage · CouponBanner · SectionHead · Reveal" desc="SmartImage با مسیر بدون variant به <img> ساده fallback می‌کند (رفتار امن).">
        <div className="grid items-start gap-6 md:grid-cols-2">
          <div>
            <p className="mb-3 text-xs font-bold text-muted">SmartImage (fallback امن) + HelsaLogo</p>
            <div className="flex items-center gap-4 rounded-xl border border-line bg-surface2 p-4">
              <SmartImage src="/brand/helsa-logo.png" alt="لوگوی هلسا" className="size-16 rounded-xl object-contain" width={64} height={64} />
              <HelsaLogo className="h-8" light={false} />
            </div>
            <p className="mb-3 mt-6 text-xs font-bold text-muted">CouponBanner — کد کپی‌شو</p>
            <CouponBanner />
          </div>
          <div>
            <p className="mb-3 text-xs font-bold text-muted">Reveal — اسکرول کنید (انیمیشن ورود)</p>
            <Reveal>
              <div className="rounded-xl border border-line bg-canvas p-5 text-sm leading-7 text-muted">
                این کارت با Reveal رندر شده — حرکت نرم ۴۵۰ms، یک‌بار در عمر اسکرول.
              </div>
            </Reveal>
            <div className="mt-8">
              <SectionHead eyebrow="کاتالوگ هلسا" title="SectionHead" desc="تیتر استاندارد بخش‌های فروشگاه با ابرو و جداکنندهٔ ستاره." align="start" />
            </div>
          </div>
        </div>
        <CodeNote>{`import { … } from "@/components/ui/primitives" · "@/components/ui/SmartImage" · "@/components/ui/CouponBanner"`}</CodeNote>
      </Section>

      <p className="pb-4 text-center text-[11px] leading-6 text-muted">
        این صفحه فقط برای تیم (ادمین) است و <code dir="ltr">robots: noindex</code> دارد ·
        منبع اجزا: <code dir="ltr">src/components/ui/*</code> · رویدادهای تحلیل: <code dir="ltr">src/lib/analytics.ts</code>
      </p>
    </div>
  );
}
