"use client";
import { trackEvent } from "@/lib/analytics";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { FieldLabel, Input, Select, TextArea } from "@/components/ui/controls";
import { useToast } from "@/components/ui/Toast";
import { WHOLESALE_TYPES } from "@/config/wholesale";

export function WholesaleRegisterClient({ authenticated }: { authenticated: boolean }) {
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [form, setForm] = useState({
    businessName: "",
    businessType: "supermarket",
    contactName: "",
    mobile: "",
    email: "",
    password: "",
    city: "",
    address: "",
    economicCode: "",
    monthlyVolume: "کمتر از ۵۰ میلیون",
    interests: "",
    notes: "",
  });

  const submit = async () => {
    setBusy(true);
    try {
      const { password, ...rest } = form;
      // if already logged in, no password needed (account exists)
      const payload = authenticated ? rest : { ...rest, password };
      const res = await fetch("/api/wholesale/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.ok) trackEvent("wholesale_form_submitted", { form: "wholesale_register" });
      if (!res.ok || !data.ok) {
        toast.push(data.message || "ثبت‌نام ممکن نشد", "error");
        return;
      }
      setDone(data.code);
      toast.push("ثبت‌نام عمده ثبت شد");
      // if a new account was created, log in to activate the dashboard session
      if (!authenticated && form.password) {
        await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: form.mobile, password: form.password }),
        }).catch(() => undefined);
      }
    } catch {
      toast.push("متأسفانه مشکلی پیش آمد. دوباره تلاش کنید.", "error");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="container-x py-16 max-w-xl mx-auto">
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-8 text-center">
          <Building2 className="mx-auto size-10 text-brand-700" aria-hidden />
          <h2 className="mt-4 text-lg font-black text-heading">درخواست شما ثبت شد</h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            کد پیگیری: <span dir="ltr" className="font-bold text-heading">{done}</span>
          </p>
          <p className="mt-2 text-xs leading-6 text-muted">
            کارشناس B2B هلسا اطلاعات کسب‌وکار شما را بررسی می‌کند. پس از تأیید، پنل عمده با قیمت همکاری اختصاصی فعال می‌شود.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button onClick={() => router.push("/wholesale/dashboard")}>رفتن به پنل عمده</Button>
            <Button variant="outline" onClick={() => router.push("/")}>بازگشت به فروشگاه</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-x py-12 md:py-16 max-w-3xl mx-auto">
      <div className="rounded-2xl border border-line/70 bg-surface p-6 md:p-8">
        <h2 className="text-base font-black text-heading flex items-center gap-2">
          <Building2 className="size-4 text-gold-700" aria-hidden /> ثبت‌نام خرید عمده
        </h2>
        {!authenticated && (
          <p className="mt-2 text-[11px] leading-6 text-muted">
            با این ثبت‌نام، حساب کاربری هلسا هم برای شما ساخته می‌شود (شماره موبایل + رمز عبور) و می‌توانید وارد پنل عمده شوید.
          </p>
        )}

        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          <FieldLabel text="نام کسب‌وکار"><Input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} placeholder="مثلاً سوپرمارکت های‌پر" /></FieldLabel>
          <FieldLabel text="نوع کسب‌وکار">
            <Select value={form.businessType} onChange={(e) => setForm({ ...form, businessType: e.target.value })}>
              {WHOLESALE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </Select>
          </FieldLabel>
          <FieldLabel text="نام مدیر/مسئول خرید"><Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} placeholder="نام و نام خانوادگی" /></FieldLabel>
          <FieldLabel text="موبایل"><Input dir="ltr" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/[^\d]/g, "") })} placeholder="0912..." /></FieldLabel>
          <FieldLabel text="ایمیل"><Input dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@business.ir" /></FieldLabel>
          {!authenticated && (
            <FieldLabel text="رمز عبور حساب کاربری (حداقل ۸ کاراکتر)">
              <Input dir="ltr" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
            </FieldLabel>
          )}
          <FieldLabel text="شهر"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="تهران" /></FieldLabel>
          <FieldLabel text="شناسه ملی / کد اقتصادی (اختیاری)"><Input dir="ltr" value={form.economicCode} onChange={(e) => setForm({ ...form, economicCode: e.target.value })} placeholder="۱۴۰..." /></FieldLabel>
          <FieldLabel text="حجم خرید ماهانه تقریبی">
            <Select value={form.monthlyVolume} onChange={(e) => setForm({ ...form, monthlyVolume: e.target.value })}>
              {["کمتر از ۵۰ میلیون", "۵۰ تا ۲۰۰ میلیون", "۲۰۰ میلیون تا ۱ میلیارد", "بیش از ۱ میلیارد"].map((v) => <option key={v}>{v}</option>)}
            </Select>
          </FieldLabel>
          <FieldLabel text="نشانی (اختیاری)" className="sm:col-span-2"><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="خیابان، محله، پلاک" /></FieldLabel>
          <FieldLabel text="اقلام مورد علاقه (اختیاری)" className="sm:col-span-2"><TextArea rows={2} value={form.interests} onChange={(e) => setForm({ ...form, interests: e.target.value })} placeholder="مثلاً خرما، آجیل مخلوط، عسل" /></FieldLabel>
          <FieldLabel text="توضیحات تکمیلی (اختیاری)" className="sm:col-span-2"><TextArea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></FieldLabel>
          <div className="sm:col-span-2 flex items-center justify-between gap-3 pt-2">
            <p className="text-[10.5px] leading-5 text-muted">اطلاعات شما فقط برای بررسی همکاری استفاده می‌شود و محرمانه است.</p>
            <Button onClick={submit} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
              ثبت درخواست همکاری
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
