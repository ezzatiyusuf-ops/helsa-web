"use client";
import { useEffect, useState } from "react";
import { AdminPageHead } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/primitives";
import { FieldLabel, Input } from "@/components/ui/controls";
import { useToast } from "@/components/ui/Toast";
import { faDigits } from "@/lib/format";

type Post = {
  id: number;
  imageUrl: string;
  caption: string;
  kind: "post" | "story";
  title: string | null;
  permalink: string | null;
  productSlug: string | null;
  sortOrder: number;
  isActive: boolean;
  postedAt: string;
};

type ConnectState = {
  configured: boolean;
  tokenMasked: string | null;
  userId: string | null;
  source: "db" | "env" | null;
};

const EMPTY = { imageUrl: "", caption: "", kind: "post" as "post" | "story", title: "", permalink: "", productSlug: "", sortOrder: 0, isActive: true };

export default function AdminInstagramPage() {
  const toast = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [live, setLive] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...EMPTY });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  /* ——— اتصال فید زنده ——— */
  const [connect, setConnect] = useState<ConnectState | null>(null);
  const [token, setToken] = useState("");
  const [userId, setUserId] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connMsg, setConnMsg] = useState("");

  const load = () => {
    fetch("/api/admin/instagram")
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error(d.message || "خطا");
        setPosts(d.posts ?? []);
        setLive(Boolean(d.live));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "خطا"))
      .finally(() => setLoading(false));
    fetch("/api/admin/instagram/connect")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setConnect(d.credentials);
          setUserId(d.credentials.userId ?? "");
        }
      })
      .catch(() => undefined);
  };
  useEffect(load, []);

  const callConnect = async (body: Record<string, unknown>) => {
    setConnecting(true);
    setConnMsg("");
    try {
      const res = await fetch("/api/admin/instagram/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      setConnMsg(d.message ?? "");
      if (d.result?.ok) toast.push(d.message || "اتصال تأیید شد");
      else if (d.ok) toast.push(d.message || "انجام شد");
      else toast.push(d.message || "خطا", "error");
      load();
    } catch {
      setConnMsg("خطای شبکه — دوباره تلاش کنید");
    } finally {
      setConnecting(false);
    }
  };

  const savePost = async () => {
    if (!form.imageUrl.trim()) { toast.push("مسیر تصویر الزامی است", "error"); return; }
    setSaving(true);
    try {
      const body = {
        imageUrl: form.imageUrl.trim(),
        caption: form.caption.trim(),
        kind: form.kind,
        title: form.title.trim() || null,
        permalink: form.permalink.trim() || null,
        productSlug: form.productSlug.trim() || null,
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
      };
      const res = await fetch(editingId ? `/api/admin/instagram/${editingId}` : "/api/admin/instagram", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!d.ok) throw new Error(d.message || "ذخیره نشد");
      toast.push(editingId ? "ذخیره شد" : "اضافه شد");
      setForm({ ...EMPTY });
      setEditingId(null);
      load();
    } catch (e) {
      toast.push(e instanceof Error ? e.message : "خطا در ذخیره", "error");
    } finally { setSaving(false); }
  };

  const edit = (p: Post) => {
    setEditingId(p.id);
    setForm({ imageUrl: p.imageUrl, caption: p.caption, kind: p.kind, title: p.title ?? "", permalink: p.permalink ?? "", productSlug: p.productSlug ?? "", sortOrder: p.sortOrder, isActive: p.isActive });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (id: number) => {
    if (!window.confirm("حذف شود؟")) return;
    const res = await fetch(`/api/admin/instagram/${id}`, { method: "DELETE" });
    const d = await res.json();
    if (d.ok) { toast.push("حذف شد"); load(); } else toast.push(d.message || "حذف نشد", "error");
  };

  const toggle = async (p: Post) => {
    const res = await fetch(`/api/admin/instagram/${p.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    const d = await res.json();
    if (d.ok) load(); else toast.push(d.message || "تغییر وضعیت ناموفق", "error");
  };

  const cls = "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs text-heading outline-none focus:border-brand-400";
  const postCount = posts.filter((p) => p.kind === "post").length;
  const storyCount = posts.filter((p) => p.kind === "story").length;

  return (
    <>
      <AdminPageHead title="اینستاگرام و شبکه‌های اجتماعی" desc="اتصال فید زندهٔ @Helsa.Nuts و مدیریت پست‌ها/استوری‌های منتخب." />
      {error && <p className="text-sm text-accent-600">{error}</p>}
      {loading && <p className="text-sm text-muted">در حال بارگذاری...</p>}

      {/* ——— کارت اتصال فید زنده ——— */}
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-sm font-black">اتصال فید زندهٔ اینستاگرام</h2>
        <p className="mt-1.5 text-[11px] leading-5 text-muted">
          توکن و User ID را از Meta بگیرید و اینجا بچسبانید — بدون نیاز به تنظیم .env یا ری‌استارت سرور.
          پس از اتصال، پست‌ها و استوری‌های واقعیِ @{SITE_HANDLE} خودکار در سایت می‌آیند (استوری‌ها تا ۲۴ ساعت فعال می‌مانند) و این جدول فقط نقش پشتیبان را پیدا می‌کند. راهنمای گام‌به‌گام: docs/instagram.md
        </p>

        <div className={`mt-4 rounded-xl border p-3.5 text-xs leading-6 ${connect?.configured ? "border-brand-300 bg-brand-50" : "border-line bg-surface2/60"}`}>
          {connect?.configured ? (
            <>
              <p className="font-black text-brand-800">🟢 متصل به فید زنده {connect.source === "env" ? "(از env)" : "(از پنل)"}</p>
              <p className="mt-1 text-muted" dir="ltr">توکن: {connect.tokenMasked} — User ID: {connect.userId}</p>
            </>
          ) : (
            <p className="font-bold text-heading">🟡 حالت پست‌های منتخب — پست‌ها/استوری‌ها را خودتان از همین صفحه مدیریت می‌کنید.</p>
          )}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <FieldLabel text="Access Token (instagram_basic)">
            <Input value={token} onChange={(e) => setToken(e.target.value)} dir="ltr" placeholder="IGAAH… (حداقل ۲۰ نویسه)" />
          </FieldLabel>
          <FieldLabel text="Instagram User ID (عدد)">
            <Input value={userId} onChange={(e) => setUserId(e.target.value)} dir="ltr" inputMode="numeric" placeholder="مثلاً 17841400000000000" />
          </FieldLabel>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            onClick={() => {
              if (token.trim().length < 20) { toast.push("توکن باید حداقل ۲۰ نویسه باشد", "error"); return; }
              if (!/^\d{5,40}$/.test(userId.trim())) { toast.push("User ID باید عدد باشد", "error"); return; }
              callConnect({ action: "save", token: token.trim(), userId: userId.trim() });
              setToken("");
            }}
            disabled={connecting}
          >
            {connecting ? "..." : "ذخیره و اتصال"}
          </Button>
          <Button
            variant="outline"
            onClick={() => callConnect({ action: "test", ...(token.trim() ? { token: token.trim(), userId: userId.trim() } : {}) })}
            disabled={connecting}
          >
            تست اتصال
          </Button>
          {connect?.configured && (
            <Button variant="outline" onClick={() => callConnect({ action: "disconnect" })} disabled={connecting}>
              قطع اتصال
            </Button>
          )}
        </div>
        {connMsg && (
          <p className={`mt-3 rounded-xl border p-3 text-[11px] leading-5 font-bold ${connMsg.includes("تأیید نشد") || connMsg.includes("خطا") ? "border-accent-400/50 bg-accent-50 text-accent-700" : "border-brand-300 bg-brand-50 text-brand-800"}`}>
            {connMsg}
          </p>
        )}
      </section>

      <div className={`mt-6 rounded-2xl border p-4 text-xs leading-6 ${live ? "border-brand-300 bg-brand-50" : "border-line bg-surface"}`}>
        {live
          ? "🟢 فید زنده فعال است — پست‌های اخیر مستقیم از اینستاگرام خوانده می‌شوند و این جدول فقط fallback است."
          : "🟡 حالت پست‌های منتخب: پست‌ها را شما اینجا مدیریت می‌کنید."}
      </div>

      <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-4 text-sm font-black">{editingId ? `ویرایش #${faDigits(editingId)}` : "افزودن پست یا استوری جدید"}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel text="نوع">
              <div className="flex gap-2">
                {(["post", "story"] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => setForm({ ...form, kind: k })}
                    className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${form.kind === k ? "bg-brand-700 text-inverse" : "border border-line text-muted hover:border-brand-400"}`}
                    aria-pressed={form.kind === k}
                  >
                    {k === "post" ? "پست (گرید)" : "استوری (دایره)"}
                  </button>
                ))}
              </div>
            </FieldLabel>
          </div>
          {form.kind === "story" && (
            <FieldLabel text="عنوان استوری (زیر دایره)">
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثلاً: تخفیف یلدا" />
            </FieldLabel>
          )}
          <div>
            <FieldLabel text="مسیر تصویر (مثلاً /images/opt/dates-mazafati.jpg)"><Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} dir="ltr" placeholder="/images/opt/…" /></FieldLabel>
            <p className="mt-1 text-[10px] text-muted">می‌توانید از تصاویر بهینه‌شدهٔ محصولات (/images/opt/) یا آدرس https استفاده کنید.</p>
          </div>
          <FieldLabel text="شناسهٔ محصول (لینک داخلی — اختیاری)"><Input value={form.productSlug} onChange={(e) => setForm({ ...form, productSlug: e.target.value })} dir="ltr" placeholder="mazafati-dates" /></FieldLabel>
          <div className="md:col-span-2">
            <FieldLabel text={form.kind === "story" ? "متن استوری (اختیاری)" : "کپشن پست"}>
              <textarea value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} rows={2} maxLength={600} className={cls} placeholder="مثلاً: خرمای مضافتی بم، تازه رسیده 🌴" />
            </FieldLabel>
          </div>
          <FieldLabel text="لینک مستقیم پست اینستاگرام (اختیاری)"><Input value={form.permalink} onChange={(e) => setForm({ ...form, permalink: e.target.value })} dir="ltr" placeholder="https://instagram.com/p/…" /></FieldLabel>
          <div className="flex items-end gap-4">
            <FieldLabel text="ترتیب"><Input value={String(form.sortOrder)} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })} dir="ltr" inputMode="numeric" className="w-24" /></FieldLabel>
            <label className="flex items-center gap-2 pb-3 text-xs font-bold text-heading">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="size-4 accent-[#0b5f3b]" />
              نمایش در سایت
            </label>
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <Button onClick={savePost} disabled={saving}>{saving ? "..." : editingId ? "ذخیرهٔ تغییرات" : "افزودن"}</Button>
          {editingId && (
            <Button variant="outline" onClick={() => { setEditingId(null); setForm({ ...EMPTY }); }}>انصراف</Button>
          )}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-black">
          آیتم‌ها — {faDigits(postCount)} پست، {faDigits(storyCount)} استوری
        </h2>
        {!posts.length && !loading ? <p className="text-xs text-muted">هنوز چیزی ثبت نشده است؛ سکشن اینستاگرام تا افزودن اولین آیتم در صفحهٔ اصلی نمایش داده نمی‌شود.</p> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <div key={p.id} className={`flex gap-3 rounded-2xl border bg-surface p-3 ${p.isActive ? "border-line" : "border-line-soft opacity-60"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.imageUrl} alt={p.caption || p.title || "آیتم"} className="size-20 shrink-0 rounded-xl border border-line object-cover" loading="lazy" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${p.kind === "story" ? "bg-gold-100 text-gold-700" : "bg-brand-50 text-brand-700"}`}>
                      {p.kind === "story" ? "استوری" : "پست"}
                    </span>
                    <p className="line-clamp-2 text-[11px] leading-5 font-bold text-heading">{p.title || p.caption || "—"}</p>
                  </div>
                  <p className="mt-1 truncate text-[10px] text-muted" dir="ltr">{p.productSlug ? `/products/${p.productSlug}` : p.permalink ?? "—"}</p>
                  <div className="mt-2 flex items-center gap-2 text-[10px] font-bold">
                    <button onClick={() => toggle(p)} className={`rounded-full px-2.5 py-1 ${p.isActive ? "bg-brand-700 text-inverse" : "border border-line text-muted"}`}>{p.isActive ? "فعال" : "غیرفعال"}</button>
                    <button onClick={() => edit(p)} className="rounded-full border border-line px-2.5 py-1 hover:border-brand-400">ویرایش</button>
                    <button onClick={() => remove(p.id)} className="rounded-full border border-accent-400/50 px-2.5 py-1 text-accent-600 hover:border-accent-500">حذف</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

const SITE_HANDLE = "Helsa.Nuts";
