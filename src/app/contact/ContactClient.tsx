"use client";
import { useState } from "react";
import { z } from "zod";
import { Mail, Phone, MapPin, Clock, Send, Loader2, MessageCircle } from "lucide-react";
import { SITE } from "@/config/site";
import { PageHeader } from "@/components/layout/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { Reveal, SectionHead } from "@/components/ui/primitives";

const schema = z.object({
  name: z.string().min(2, "نام الزامی است"),
  mobile: z.string().regex(/^09\d{9}$/, "شماره موبایل معتبر نیست"),
  email: z.union([z.string().email("ایمیل معتبر نیست"), z.literal("")]),
  subject: z.string().min(2, "موضوع را وارد کنید"),
  message: z.string().min(10, "پیام باید حداقل ۱۰ نویسه باشد"),
});

const SUBJECTS = ["پیگیری سفارش", "خرید عمده و سازمانی", "سفارش سینی مزه", "پیشنهاد و انتقاد", "همکاری با هلسا", "سایر"];

export default function ContactClient() {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", mobile: "", email: "", subject: SUBJECTS[0], message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const wa = SITE.whatsappUrl;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const r = schema.safeParse(form);
    if (!r.success) {
      const errs: Record<string, string> = {};
      for (const i of r.error.issues) errs[String(i.path[0])] = i.message;
      setErrors(errs);
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = (await res.json()) as { ok: boolean; message: string };
      toast.push(data.message, data.ok ? "success" : "error");
      if (data.ok) setForm({ name: "", mobile: "", email: "", subject: SUBJECTS[0], message: "" });
    } catch {
      toast.push("متأسفانه مشکلی پیش آمده است. لطفاً دوباره تلاش کنید.", "error");
    }
    setSending(false);
  };

  const cards = [
    { icon: Phone, title: "تماس تلفنی", line: SITE.landline, sub: "شنبه تا چهارشنبه، ۹ تا ۱۸", href: `tel:${SITE.landline}` },
    { icon: MessageCircle, title: "واتس‌اپ", line: SITE.mobile, sub: "پاسخ سریع در ساعات کاری", href: wa },
    { icon: Mail, title: "ایمیل", line: SITE.email, sub: "پاسخ طی ۲۴ ساعت", href: `mailto:${SITE.email}` },
    { icon: MapPin, title: "آدرس", line: SITE.addressLines.join("\n"), sub: "با هماهنگی قبلی", href: "#map" },
  ];

  return (
    <>
      <PageHeader
        title="با هلسا در ارتباط باشید"
        desc="سوال، پیشنهاد یا سفارش ویژه؛ هر پیام شما مستقیماً به تیم هلسا می‌رسد."
        crumbs={[{ label: "خانه", href: "/" }, { label: "تماس با ما", href: "/contact" }]}
      />

      {/* contact cards */}
      <section className="container-x py-16 md:py-20 grid sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-label="راه‌های ارتباط">
        {cards.map((c, i) => (
          <Reveal key={c.title} delay={i * 0.06}>
            <a
              href={c.href}
              target={c.href.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer"
              className="group block rounded-2xl border border-line/70 bg-surface p-6 h-full card-hover"
            >
              <span className="inline-flex size-11 rounded-full border border-brand-200 text-brand-700 items-center justify-center group-hover:bg-brand-700 group-hover:text-inverse transition-colors duration-300">
                <c.icon className="size-4.5" aria-hidden />
              </span>
              <h2 className="mt-4 text-sm font-black text-heading">{c.title}</h2>
              <p className={`mt-2 text-[12.5px] font-bold text-body leading-6 whitespace-pre-line ${c.title === "آدرس" ? "" : "font-mono"}`} dir={c.title === "آدرس" ? "rtl" : "ltr"}>{c.line}</p>
              <p className="mt-1 text-[11px] text-muted">{c.sub}</p>
            </a>
          </Reveal>
        ))}
      </section>

      <div className="container-x pb-20 grid grid-cols-1 lg:grid-cols-5 gap-10 items-start">
        {/* form */}
        <Reveal className="lg:col-span-3">
          <form onSubmit={submit} className="rounded-2xl border border-line/70 bg-surface p-7 md:p-9" noValidate>
            <h2 className="text-base font-black text-heading">فرم تماس</h2>
            <div className="mt-6 grid sm:grid-cols-2 gap-4">
              <Lbl text="نام" err={errors.name}>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={cls} placeholder="نام و نام خانوادگی" />
              </Lbl>
              <Lbl text="شماره موبایل" err={errors.mobile}>
                <input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/[^\d]/g, "") })} className={cls} placeholder="۰۹۲۳۴۵۶۷۸۹" dir="ltr" inputMode="numeric" />
              </Lbl>
              <Lbl text="ایمیل (اختیاری)" err={errors.email}>
                <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={cls} placeholder="you@example.com" dir="ltr" />
              </Lbl>
              <Lbl text="موضوع" err={errors.subject}>
                <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={cls}>
                  {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Lbl>
              <Lbl text="پیام" err={errors.message} className="sm:col-span-2">
                <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={5} className={cls} placeholder="پیام خود را بنویسید ..." />
              </Lbl>
            </div>
            <button type="submit" disabled={sending} className="mt-6 h-12 px-8 rounded-full bg-brand-700 text-inverse text-sm font-bold hover:bg-brand-800 disabled:opacity-60 transition-colors inline-flex items-center gap-2">
              {sending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
              ارسال پیام
            </button>
          </form>
        </Reveal>

        {/* hours + messengers + map */}
        <Reveal delay={0.1} className="lg:col-span-2 space-y-5">
          <div className="rounded-2xl border border-line/70 bg-surface p-7">
            <h2 className="text-sm font-black text-heading flex items-center gap-2"><Clock className="size-4 text-gold-700" aria-hidden /> ساعات پاسخگویی</h2>
            <ul className="mt-4 space-y-2.5 text-xs text-body">
              {SITE.workHours.map((w) => (
                <li key={w.day} className="flex justify-between rounded-xl bg-surface2 border border-line-soft px-4 py-2.5">
                  <span className="font-bold">{w.day}</span>
                  <span>{w.hours}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-line/70 bg-surface p-7">
            <h2 className="text-sm font-black text-heading">پیام‌رسان‌ها</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <a href={wa} target="_blank" rel="noreferrer" className="h-11 rounded-full border border-line text-[12px] font-bold text-body flex items-center justify-center gap-2 hover:border-brand-400 hover:text-heading transition-colors">
                <MessageCircle className="size-4" aria-hidden /> واتس‌اپ
              </a>
              <a href={SITE.instagramUrl} target="_blank" rel="noreferrer" className="h-11 rounded-full border border-line text-[12px] font-bold text-body flex items-center justify-center gap-2 hover:border-brand-400 hover:text-heading transition-colors">
                اینستاگرام
              </a>
            </div>
          </div>

          {/* نقشهٔ واقعی — OpenStreetMap (بدون کلید API)؛ نشانگر: محلهٔ نیاوران */}
          <div id="map" className="rounded-2xl overflow-hidden border border-line/70 relative">
            <iframe
              title="نقشهٔ محل هلسا — نیاوران، تهران"
              src="https://www.openstreetmap.org/export/embed.html?bbox=51.4580%2C35.8090%2C51.4840%2C35.8240&layer=mapnik&marker=35.8161%2C51.4709"
              className="h-64 w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 bg-surface2 px-4 py-2.5">
              <p className="flex items-center gap-1.5 text-[11px] font-bold text-heading">
                <MapPin className="size-3.5 text-brand-700" aria-hidden /> {SITE.address}
              </p>
              <a
                href="https://www.openstreetmap.org/?mlat=35.8161&mlon=51.4709#map=16/35.8161/51.4709"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-brand-700 hover:text-brand-800"
              >
                مشاهدهٔ بزرگ‌تر / مسیریابی ↗
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </>
  );
}

const cls = "w-full h-11 rounded-xl border border-line bg-surface2 px-4 text-sm outline-none focus:border-brand-500 transition-colors";

function Lbl({ text, err, children, className = "" }: { text: string; err?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-bold text-body mb-1.5 block">{text}</span>
      {children}
      {err && <span className="mt-1 block text-[11px] font-bold text-accent-600">{err}</span>}
    </label>
  );
}
