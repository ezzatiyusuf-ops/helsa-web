/* eslint-disable @next/next/no-img-element -- compact admin tables/cards use localized <img> by design */
"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Pencil, Archive, Boxes, Package, ShoppingBag, Users, Calculator, AlertTriangle, Download, Save, Trash2, Megaphone, MessageSquare } from "lucide-react";
import { AdminPageHead } from "@/components/admin/AdminShell";
import { Button, LinkButton } from "@/components/ui/primitives";
import { Input, Select, TextArea, FieldLabel, Skeleton, EmptyState } from "@/components/ui/controls";
import { useToast } from "@/components/ui/Toast";
import { faDate, faDigits, formatToman } from "@/lib/format";

type ApiState<T> = { loading: boolean; error: string; data: T | null };
function useApi<T>(url: string) {
  const [state, setState] = useState<ApiState<T>>({ loading: true, error: "", data: null });
  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const res = await fetch(url, { cache: "no-store" });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.message || "خطایی رخ داد. دوباره تلاش کنید.");
      setState({ loading: false, error: "", data: body });
    } catch (e) { setState({ loading: false, error: e instanceof Error ? e.message : "خطایی رخ داد. دوباره تلاش کنید.", data: null }); }
  }, [url]);
  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);
  return { ...state, reload: load };
}
const Panel = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => <div className={`rounded-2xl border border-line bg-surface p-5 ${className}`}>{children}</div>;
const ErrorState = ({ text, retry }: { text: string; retry?: () => void }) => <div className="rounded-2xl border border-accent-500/30 bg-accent-500/10 p-5 text-sm text-accent-600"><p>{text}</p>{retry && <Button variant="outline" size="sm" className="mt-3" onClick={retry}>تلاش مجدد</Button>}</div>;
const LoadingRows = () => <div className="space-y-3">{[1,2,3,4].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>;

/* ————————————————— Dashboard ————————————————— */
export function DashboardAdmin() {
  const { data, loading, error, reload } = useApi<{ dashboard: Record<string, number> }>("/api/admin/dashboard");
  const d = data?.dashboard;
  const cards = d ? [
    ["فروش امروز", formatToman(d.salesToday), Package], ["فروش این ماه", formatToman(d.salesMonth), Calculator],
    ["تعداد سفارش‌ها", faDigits(d.orders), ShoppingBag], ["در انتظار", faDigits(d.pendingOrders), AlertTriangle],
    ["کم‌موجود", faDigits(d.lowStock), Boxes], ["ناموجود", faDigits(d.outOfStock), Archive],
    ["مشتریان", faDigits(d.customers), Users], ["ارزش موجودی", formatToman(d.inventoryValue), Calculator],
    ["محصولات (فعال از کل)", `${faDigits(d.productsActive ?? 0)} / ${faDigits(d.productsTotal ?? 0)}`, Package],
    ["کمپین‌های فعال", faDigits(d.activeCampaigns ?? 0), Megaphone],
    ["پیام‌های تماس", faDigits(d.contactMessages ?? 0), MessageSquare],
  ] as const : [];
  return (
    <>
      <AdminPageHead title="داشبورد مدیریت" desc="آمار واقعی فروشگاه بر اساس داده‌های پایگاه داده" />
      {loading ? <LoadingRows /> : error ? <ErrorState text={error} retry={reload} /> : !d ? <EmptyState title="اطلاعاتی برای نمایش وجود ندارد" /> : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {cards.map(([label, value, Icon]) => <Panel key={label}><Icon className="size-4 text-gold-700" /><p className="mt-3 text-[11px] text-muted">{label}</p><p className="mt-1 text-base font-black text-heading">{value}</p></Panel>)}
          </div>
          <Panel className="mt-6"><h2 className="text-sm font-black">دسترسی سریع</h2><div className="mt-4 flex flex-wrap gap-2">
            <LinkButton href="/admin/products/new" size="sm">افزودن محصول</LinkButton><LinkButton href="/admin/trays/new" size="sm">افزودن سینی</LinkButton><LinkButton href="/admin/categories" variant="outline" size="sm">افزودن دسته‌بندی</LinkButton><LinkButton href="/admin/products" variant="outline" size="sm">مدیریت قیمت‌ها</LinkButton><LinkButton href="/admin/inventory" variant="outline" size="sm">مدیریت موجودی</LinkButton><LinkButton href="/admin/orders" variant="outline" size="sm">سفارش‌ها</LinkButton><LinkButton href="/admin/accounting" variant="outline" size="sm">حسابداری</LinkButton>
          </div></Panel>
        </>
      )}
    </>
  );
}

/* ————————————————— Products ————————————————— */
type AdminProduct = { id:number; name:string; slug:string; sku:string; category:string; price:number; oldPrice:number|null; stock:number; lowStockThreshold:number; isActive:boolean; isFeatured:boolean; isVisible:boolean; image:string; shortDescription:string; description:string; costPrice:number|null; weight:string; unit:string; packaging:string; ingredients:string; origin:string; storage:string; imageAlt:string; seoTitle:string|null; seoDescription:string|null; badge:string|null; variants?: Variant[]; allergens?: string[]; features?: { label:string; value:string }[]; discountStartsAt?: string };
type Variant = { id?:number; name:string; sku:string; price:number; compareAtPrice:number|null; costPrice:number|null; stock:number; weight:number|null; unit:string; flavor:string|null; isActive:boolean; sortOrder:number };
type AdminCategory = { id:number; name:string; slug:string; description:string; shortDescription:string; image:string; imageAlt:string; sortOrder:number; isActive:boolean; seoTitle:string|null; seoDescription:string|null };

export function ProductsAdmin() {
  const [q, setQ] = useState(""); const [category, setCategory] = useState(""); const [stock, setStock] = useState("");
  const url = `/api/admin/products?${new URLSearchParams({ ...(q ? {q} : {}), ...(category ? {category} : {}), ...(stock ? {stock} : {}) })}`;
  const { data, loading, error, reload } = useApi<{ products: AdminProduct[] }>(url);
  const cats = useApi<{ categories: AdminCategory[] }>("/api/admin/categories"); const toast = useToast();
  const archive = async (id:number) => { if (!confirm("محصول بایگانی شود؟ سفارش‌های تاریخی حذف نمی‌شوند.")) return; const r=await fetch(`/api/admin/products/${id}`,{method:"DELETE"}); const b=await r.json(); b.ok ? (toast.push("محصول بایگانی شد"),reload()) : toast.push(b.message,"error"); };
  return <>
    <AdminPageHead title="مدیریت محصولات" desc="قیمت، موجودی، وضعیت و SEO" action={<LinkButton href="/admin/products/new" size="sm"><Plus className="size-4" /> افزودن محصول</LinkButton>} />
    <Panel><div className="grid gap-3 md:grid-cols-3"><Input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="جستجو نام، SKU یا slug" /><Select value={category} onChange={(e)=>setCategory(e.target.value)}><option value="">همه دسته‌ها</option>{cats.data?.categories.map((c)=><option key={c.id} value={c.slug}>{c.name}</option>)}</Select><Select value={stock} onChange={(e)=>setStock(e.target.value)}><option value="">همه موجودی‌ها</option><option value="available">موجود</option><option value="low">کم‌موجود</option><option value="out">ناموجود</option></Select></div></Panel>
    <div className="mt-4">{loading?<LoadingRows/>:error?<ErrorState text={error} retry={reload}/>:!data?.products.length?<EmptyState title="محصولی با این جستجو پیدا نشد"/>:<div className="overflow-x-auto rounded-2xl border border-line bg-surface"><table className="w-full min-w-[820px] text-xs"><thead className="bg-surface2 text-muted"><tr><th className="p-3 text-start">محصول</th><th>SKU</th><th>دسته</th><th>قیمت فعلی</th><th>قیمت قبل</th><th>موجودی</th><th>وضعیت</th><th>عملیات</th></tr></thead><tbody className="divide-y divide-line-soft">{data.products.map((p)=><tr key={p.id}><td className="p-3"><span className="flex items-center gap-2"><img src={p.image} alt={p.name} className="size-10 rounded-lg object-cover"/><b>{p.name}</b></span></td><td dir="ltr" className="text-center">{p.sku}</td><td className="text-center">{cats.data?.categories.find(c=>c.slug===p.category)?.name??p.category}</td><td className="text-center font-bold">{formatToman(p.price)}</td><td className="text-center">{p.oldPrice?formatToman(p.oldPrice):"—"}</td><td className="text-center">{faDigits(p.stock)}</td><td className="text-center">{p.isActive&&p.isVisible?"فعال":"بایگانی"}</td><td><span className="flex justify-center gap-1"><Link href={`/admin/products/${p.id}`} className="grid size-9 place-items-center rounded-full border border-line" aria-label="ویرایش"><Pencil className="size-4"/></Link><button onClick={()=>archive(p.id)} className="grid size-9 place-items-center rounded-full border border-line text-accent-600" aria-label="بایگانی"><Archive className="size-4"/></button></span></td></tr>)}</tbody></table></div>}</div>
  </>;
}

const emptyProduct = { name:"",slug:"",category:"",sku:"",shortDescription:"",description:"",price:0,oldPrice:null as number|null,discountStartsAt:"" as string,costPrice:null as number|null,stock:0,lowStockThreshold:5,minOrderQty:1,maxOrderQty:null as number|null,weight:"",unit:"بسته",packaging:"",ingredients:"",origin:"",storage:"",image:"/images/hero-light.jpg",imageAlt:"",isActive:true,isFeatured:false,isVisible:true,seoTitle:"",seoDescription:"",badge:null as string|null,variants:[] as Variant[],allergens:"" as string|unknown as string,prodDate:"",expDate:"" };
export function ProductFormAdmin({ id }: { id?: number }) {
  const router=useRouter(); const toast=useToast(); const [form,setForm]=useState(emptyProduct); const [loading,setLoading]=useState(Boolean(id)); const [busy,setBusy]=useState(false); const [error,setError]=useState(""); const cats=useApi<{categories:AdminCategory[]}>("/api/admin/categories");
  useEffect(()=>{if(!id)return;fetch(`/api/admin/products/${id}`).then(r=>r.json()).then(b=>{if(!b.ok)throw new Error(b.message);setForm({...emptyProduct,...b.product,allergens:(b.product.allergens??[]).join("، "),discountStartsAt:b.product.discountStartsAt?String(b.product.discountStartsAt).slice(0,10):"",prodDate:b.product.features?.find((f:{label:string})=>f.label==="تاریخ تولید")?.value??"",expDate:b.product.features?.find((f:{label:string})=>f.label==="تاریخ انقضا")?.value??"",variants:b.product.variants??[]});setLoading(false)}).catch(e=>{setError(e.message);setLoading(false)});},[id]);
  const set=<K extends keyof typeof form>(k:K,v:(typeof form)[K])=>setForm(f=>({...f,[k]:v}));
  const save=async()=>{setBusy(true);setError("");try{const r=await fetch(id?`/api/admin/products/${id}`:"/api/admin/products",{method:id?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,allergens:String(form.allergens??"").split(/[،,;]+/).map((x:string)=>x.trim()).filter(Boolean)})});const b=await r.json();if(!b.ok)throw new Error(b.message);toast.push(id?"محصول به‌روزرسانی شد":"محصول ایجاد شد");router.push("/admin/products");router.refresh()}catch(e){setError(e instanceof Error?e.message:"خطایی رخ داد. دوباره تلاش کنید.")}finally{setBusy(false)}};
  const addVariant=()=>set("variants",[...form.variants,{name:"۵۰۰ گرم",sku:`${form.sku}-V${form.variants.length+1}`,price:form.price,compareAtPrice:null,costPrice:null,stock:0,weight:500,unit:"گرم",flavor:null,isActive:true,sortOrder:form.variants.length}]);
  if(loading)return <LoadingRows/>;
  return <><AdminPageHead title={id?"ویرایش محصول":"افزودن محصول"} desc="تمام تغییرات پس از ذخیره مستقیماً در فروشگاه استفاده می‌شوند"/><Panel>{error&&<ErrorState text={error}/>}<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    <FieldLabel text="نام محصول"><Input value={form.name} onChange={e=>set("name",e.target.value)}/></FieldLabel><FieldLabel text="slug"><Input dir="ltr" value={form.slug} onChange={e=>set("slug",e.target.value)}/></FieldLabel><FieldLabel text="SKU"><Input dir="ltr" value={form.sku} onChange={e=>set("sku",e.target.value)}/></FieldLabel>
    <FieldLabel text="دسته‌بندی"><Select value={form.category} onChange={e=>set("category",e.target.value)}><option value="">انتخاب کنید</option>{cats.data?.categories.filter(c=>c.isActive).map(c=><option key={c.id} value={c.slug}>{c.name}</option>)}</Select></FieldLabel>
    <FieldLabel text="قیمت (تومان)"><Input type="number" value={form.price} onChange={e=>set("price",Number(e.target.value))}/></FieldLabel><FieldLabel text="قیمت قبل"><Input type="number" value={form.oldPrice??""} onChange={e=>set("oldPrice",e.target.value?Number(e.target.value):null)}/></FieldLabel>
    <FieldLabel text="شروع تخفیف (YYYY-MM-DD)"><Input dir="ltr" type="date" value={form.discountStartsAt??""} onChange={e=>set("discountStartsAt",e.target.value)}/></FieldLabel><FieldLabel text="بهای تمام‌شده"><Input type="number" value={form.costPrice??""} onChange={e=>set("costPrice",e.target.value?Number(e.target.value):null)}/></FieldLabel>
    <FieldLabel text="موجودی"><Input type="number" value={form.stock} onChange={e=>set("stock",Number(e.target.value))}/></FieldLabel><FieldLabel text="آستانه کم‌موجود"><Input type="number" value={form.lowStockThreshold} onChange={e=>set("lowStockThreshold",Number(e.target.value))}/></FieldLabel><FieldLabel text="وزن"><Input value={form.weight} onChange={e=>set("weight",e.target.value)}/></FieldLabel>
    <FieldLabel text="واحد"><Input value={form.unit} onChange={e=>set("unit",e.target.value)}/></FieldLabel><FieldLabel text="حداقل سفارش"><Input type="number" value={form.minOrderQty} onChange={e=>set("minOrderQty",Number(e.target.value))}/></FieldLabel><FieldLabel text="حداکثر سفارش"><Input type="number" value={form.maxOrderQty??""} onChange={e=>set("maxOrderQty",e.target.value?Number(e.target.value):null)}/></FieldLabel>
    <FieldLabel text="تصویر اصلی (URL/مسیر)" className="md:col-span-2"><Input dir="ltr" value={form.image} onChange={e=>set("image",e.target.value)}/></FieldLabel><FieldLabel text="متن جایگزین تصویر"><Input value={form.imageAlt} onChange={e=>set("imageAlt",e.target.value)}/></FieldLabel>
    <FieldLabel text="توضیح کوتاه" className="md:col-span-2 lg:col-span-3"><Input value={form.shortDescription} onChange={e=>set("shortDescription",e.target.value)}/></FieldLabel><FieldLabel text="توضیحات کامل" className="md:col-span-2 lg:col-span-3"><TextArea rows={5} value={form.description} onChange={e=>set("description",e.target.value)}/></FieldLabel>
    <FieldLabel text="بسته‌بندی"><Input value={form.packaging} onChange={e=>set("packaging",e.target.value)}/></FieldLabel><FieldLabel text="مواد تشکیل‌دهنده"><Input value={form.ingredients} onChange={e=>set("ingredients",e.target.value)}/></FieldLabel><FieldLabel text="مبدأ"><Input value={form.origin} onChange={e=>set("origin",e.target.value)}/></FieldLabel><FieldLabel text="شرایط نگهداری" className="md:col-span-2 lg:col-span-3"><Input value={form.storage} onChange={e=>set("storage",e.target.value)}/></FieldLabel>
    <FieldLabel text="آلرژن‌ها (با ویرگول جدا کنید)" className="md:col-span-2 lg:col-span-3"><Input value={String(form.allergens??"")} onChange={e=>set("allergens",e.target.value)} placeholder="مثال: بادام زمینی، گردو، کنجد"/></FieldLabel>
    <FieldLabel text="تاریخ تولید (شمسی)"><Input value={form.prodDate} onChange={e=>set("prodDate",e.target.value)} placeholder="۱۴۰۵/۰۶/۰۱"/></FieldLabel>
    <FieldLabel text="تاریخ انقضا (شمسی)"><Input value={form.expDate} onChange={e=>set("expDate",e.target.value)} placeholder="۱۴۰۶/۰۶/۰۱"/></FieldLabel>
    <p className="md:col-span-2 lg:col-span-3 text-[10.5px] leading-5 text-muted">برای انتشار در فروشگاه (فعال + قابل نمایش)، تکمیل وزن، مواد اولیه، بسته‌بندی، مبدأ، شرایط نگهداری، آلرژن‌ها و تاریخ تولید/انقضا الزامی است.</p>
    <FieldLabel text="SEO title"><Input value={form.seoTitle??""} onChange={e=>set("seoTitle",e.target.value)}/></FieldLabel><FieldLabel text="SEO description" className="md:col-span-2"><Input value={form.seoDescription??""} onChange={e=>set("seoDescription",e.target.value)}/></FieldLabel>
  </div><div className="mt-5 flex flex-wrap gap-4 text-xs">{[["isActive","فعال"],["isFeatured","ویژه"],["isVisible","قابل نمایش"]].map(([k,l])=><label key={k} className="flex items-center gap-2"><input type="checkbox" checked={Boolean(form[k as keyof typeof form])} onChange={e=>setForm(f=>({...f,[k]:e.target.checked}))}/>{l}</label>)}</div>
  <div className="mt-8 border-t border-line pt-5"><div className="flex items-center justify-between"><h2 className="text-sm font-black">گونه‌ها / وزن‌ها</h2><Button size="sm" variant="outline" onClick={addVariant}><Plus className="size-3"/> افزودن گونه</Button></div><div className="mt-3 space-y-2">{form.variants.map((v,i)=><div key={i} className="grid gap-2 rounded-xl bg-surface2 p-3 md:grid-cols-6"><Input value={v.name} onChange={e=>set("variants",form.variants.map((x,j)=>j===i?{...x,name:e.target.value}:x))}/><Input dir="ltr" value={v.sku} onChange={e=>set("variants",form.variants.map((x,j)=>j===i?{...x,sku:e.target.value}:x))}/><Input type="number" value={v.price} onChange={e=>set("variants",form.variants.map((x,j)=>j===i?{...x,price:Number(e.target.value)}:x))}/><Input type="number" value={v.stock} onChange={e=>set("variants",form.variants.map((x,j)=>j===i?{...x,stock:Number(e.target.value)}:x))}/><Input value={v.flavor??""} placeholder="طعم" onChange={e=>set("variants",form.variants.map((x,j)=>j===i?{...x,flavor:e.target.value||null}:x))}/><Button variant="outline" onClick={()=>set("variants",form.variants.filter((_,j)=>j!==i))}><Trash2 className="size-4"/> حذف</Button></div>)}</div></div>
  <div className="mt-8 flex gap-2"><Button onClick={save} disabled={busy}><Save className="size-4"/> {busy?"در حال ذخیره...":"ذخیره محصول"}</Button><LinkButton href="/admin/products" variant="outline">انصراف</LinkButton></div></Panel></>;
}

/* ————————————————— Categories ————————————————— */
export function CategoriesAdmin() {
  const {data,loading,error,reload}=useApi<{categories:AdminCategory[]}>("/api/admin/categories"); const toast=useToast();
  const empty={name:"",slug:"",description:"",shortDescription:"",image:"/images/hero-light.jpg",imageAlt:"",sortOrder:0,isActive:true,seoTitle:"",seoDescription:""};
  const [form,setForm]=useState(empty); const [editing,setEditing]=useState<number|null>(null); const [busy,setBusy]=useState(false);
  const save=async()=>{setBusy(true);const r=await fetch(editing?`/api/admin/categories/${editing}`:"/api/admin/categories",{method:editing?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});const b=await r.json();setBusy(false);if(!b.ok)return toast.push(b.message,"error");toast.push("دسته‌بندی ذخیره شد");setForm(empty);setEditing(null);reload()};
  return <><AdminPageHead title="دسته‌بندی‌ها" desc="دسته جدید بدون تغییر React در فروشگاه و جستجو ظاهر می‌شود"/><div className="grid gap-5 lg:grid-cols-[360px_1fr]"><Panel><h2 className="mb-4 text-sm font-black">{editing?"ویرایش دسته":"افزودن دسته"}</h2><div className="space-y-3"><FieldLabel text="نام"><Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></FieldLabel><FieldLabel text="slug"><Input dir="ltr" value={form.slug} onChange={e=>setForm({...form,slug:e.target.value})}/></FieldLabel><FieldLabel text="توضیح"><TextArea rows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></FieldLabel><FieldLabel text="تصویر"><Input dir="ltr" value={form.image} onChange={e=>setForm({...form,image:e.target.value})}/></FieldLabel><FieldLabel text="alt تصویر"><Input value={form.imageAlt} onChange={e=>setForm({...form,imageAlt:e.target.value})}/></FieldLabel><FieldLabel text="ترتیب"><Input type="number" value={form.sortOrder} onChange={e=>setForm({...form,sortOrder:Number(e.target.value)})}/></FieldLabel><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.isActive} onChange={e=>setForm({...form,isActive:e.target.checked})}/> فعال</label><Button className="w-full" onClick={save} disabled={busy}>{busy?"...":"ذخیره"}</Button></div></Panel><div>{loading?<LoadingRows/>:error?<ErrorState text={error}/>:<div className="space-y-2">{data?.categories.map(c=><button key={c.id} onClick={()=>{setEditing(c.id);setForm({...empty,...c,seoTitle:c.seoTitle??"",seoDescription:c.seoDescription??""})}} className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-3 text-start hover:border-brand-400"><img src={c.image} alt={c.name} className="size-11 rounded-lg object-cover"/><span className="flex-1"><b className="text-sm">{c.name}</b><small className="block text-muted" dir="ltr">{c.slug}</small></span><span className="text-[10px] text-muted">{c.isActive?"فعال":"غیرفعال"}</span><Pencil className="size-4"/></button>)}</div>}</div></div></>;
}

/* ————————————————— Trays ————————————————— */
type AdminTray={id:number;name:string;slug:string;sku:string|null;shortDescription:string;description:string;image:string;imageAlt:string;basePrice:number;oldPrice:number|null;costPrice:number|null;stock:number;lowStockThreshold:number;weight:string|null;size:string;servesMin:number;servesMax:number;featured:boolean;active:boolean;contents:Array<{title:string;section:string;qty:string}>;storage:string;freshness:string;seoTitle:string|null;seoDescription:string|null};
export function TraysAdmin(){const{data,loading,error,reload}=useApi<{trays:AdminTray[]}>("/api/admin/trays");const toast=useToast();const archive=async(id:number)=>{if(!confirm("سینی غیرفعال شود؟"))return;const b=await (await fetch(`/api/admin/trays/${id}`,{method:"DELETE"})).json();b.ok?(toast.push("سینی غیرفعال شد"),reload()):toast.push(b.message,"error")};return <><AdminPageHead title="مدیریت سینی‌ها" desc="قیمت، محتوا، تعداد مهمان و موجودی" action={<LinkButton href="/admin/trays/new" size="sm"><Plus className="size-4"/> افزودن سینی</LinkButton>}/>{loading?<LoadingRows/>:error?<ErrorState text={error}/>:<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data?.trays.map(t=><Panel key={t.id}><img src={t.image} alt={t.imageAlt} className="aspect-[16/9] w-full rounded-xl object-cover"/><h2 className="mt-3 text-sm font-black">{t.name}</h2><p className="mt-1 text-[11px] text-muted">{t.servesMin} تا {t.servesMax} نفر · {t.contents.length} قلم</p><div className="mt-3 flex justify-between"><b>{formatToman(t.basePrice)}</b><span>{faDigits(t.stock)} موجود</span></div><div className="mt-4 flex gap-2"><LinkButton href={`/admin/trays/${t.id}`} variant="outline" size="sm"><Pencil className="size-3"/> ویرایش</LinkButton><Button onClick={()=>archive(t.id)} variant="outline" size="sm"><Archive className="size-3"/> غیرفعال</Button></div></Panel>)}</div>}</>}
const emptyTray={name:"",slug:"",sku:"",shortDescription:"",description:"",image:"/images/tray-classic.jpg",imageAlt:"",basePrice:0,oldPrice:null as number|null,discountStartsAt:"" as string,costPrice:null as number|null,stock:0,lowStockThreshold:2,weight:null as string|null,size:"متوسط",servesMin:2,servesMax:6,featured:false,active:true,contents:[] as Array<{title:string;section:string;qty:string}>,storage:"یخچال",freshness:"",seoTitle:"",seoDescription:""};
export function TrayFormAdmin({id}:{id?:number}){const router=useRouter(),toast=useToast();const[form,setForm]=useState(emptyTray),[loading,setLoading]=useState(Boolean(id)),[busy,setBusy]=useState(false),[error,setError]=useState("");useEffect(()=>{if(!id)return;fetch(`/api/admin/trays/${id}`).then(r=>r.json()).then(b=>{if(!b.ok)throw new Error(b.message);setForm({...emptyTray,...b.tray,contents:b.tray.contents??[]});setLoading(false)}).catch(e=>{setError(e.message);setLoading(false)})},[id]);const save=async()=>{setBusy(true);const r=await fetch(id?`/api/admin/trays/${id}`:"/api/admin/trays",{method:id?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});const b=await r.json();setBusy(false);if(!b.ok)return setError(b.message);toast.push("سینی ذخیره شد");router.push("/admin/trays");router.refresh()};if(loading)return <LoadingRows/>;return <><AdminPageHead title={id?"ویرایش سینی":"افزودن سینی"}/><Panel>{error&&<ErrorState text={error}/>}<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{([['نام','name'],['slug','slug'],['SKU','sku'],['توضیح کوتاه','shortDescription'],['قیمت','basePrice'],['قیمت قبل','oldPrice'],['موجودی','stock'],['اندازه','size'],['حداقل مهمان','servesMin'],['حداکثر مهمان','servesMax'],['وزن','weight'],['تصویر','image'],['alt تصویر','imageAlt'],['شرایط نگهداری','storage'],['تازگی','freshness'],['SEO title','seoTitle'],['SEO description','seoDescription']] as const).map(([l,k])=><FieldLabel key={k} text={l}><Input type={["basePrice","oldPrice","stock","servesMin","servesMax"].includes(k)?"number":"text"} value={form[k]??""} onChange={e=>setForm(f=>({...f,[k]:["basePrice","oldPrice","stock","servesMin","servesMax"].includes(k)?(e.target.value?Number(e.target.value):null):e.target.value}))}/></FieldLabel>)}<FieldLabel text="توضیحات کامل" className="md:col-span-2 lg:col-span-3"><TextArea rows={5} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></FieldLabel></div><div className="mt-6"><div className="flex items-center justify-between"><h2 className="text-sm font-black">محتویات سینی</h2><Button size="sm" variant="outline" onClick={()=>setForm({...form,contents:[...form.contents,{title:"",section:"SAVORY",qty:""}]})}><Plus className="size-3"/> افزودن قلم</Button></div><div className="mt-3 space-y-2">{form.contents.map((c,i)=><div key={i} className="grid gap-2 rounded-xl bg-surface2 p-3 md:grid-cols-4"><Input value={c.title} placeholder="نام قلم" onChange={e=>setForm({...form,contents:form.contents.map((x,j)=>j===i?{...x,title:e.target.value}:x)})}/><Select value={c.section} onChange={e=>setForm({...form,contents:form.contents.map((x,j)=>j===i?{...x,section:e.target.value}:x)})}>{["SAVORY","SWEET","NUTS","FRUIT","BREAD","DIP","DECORATION"].map(x=><option key={x}>{x}</option>)}</Select><Input value={c.qty} placeholder="مقدار" onChange={e=>setForm({...form,contents:form.contents.map((x,j)=>j===i?{...x,qty:e.target.value}:x)})}/><Button variant="outline" onClick={()=>setForm({...form,contents:form.contents.filter((_,j)=>j!==i)})}><Trash2 className="size-4"/> حذف</Button></div>)}</div></div><div className="mt-5 flex gap-4 text-xs"><label><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> فعال</label><label><input type="checkbox" checked={form.featured} onChange={e=>setForm({...form,featured:e.target.checked})}/> ویژه</label></div><div className="mt-7 flex gap-2"><Button onClick={save} disabled={busy}>{busy?"...":"ذخیره سینی"}</Button><LinkButton href="/admin/trays" variant="outline">انصراف</LinkButton></div></Panel></>}

/* ————————————————— Inventory ————————————————— */
export function InventoryAdmin(){const[q,setQ]=useState(""),[status,setStatus]=useState("");const{data,loading,error,reload}=useApi<{inventory:Array<{id:number;name:string;sku:string;stock:number;lowStockThreshold:number;stockStatus:string;isActive:boolean}>;movements:Array<{id:number;productId:number|null;quantityChange:number;previousQuantity:number;newQuantity:number;reason:string;createdBy:string;createdAt:string}>}>(`/api/admin/inventory?${new URLSearchParams({...q?{q}:{},...status?{status}:{}})}`);const toast=useToast();const[edit,setEdit]=useState<{id:number;mode:string;quantity:number;reason:string;note:string}|null>(null);const save=async()=>{if(!edit)return;const b=await(await fetch(`/api/admin/inventory/${edit.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(edit)})).json();b.ok?(toast.push("موجودی به‌روزرسانی شد"),setEdit(null),reload()):toast.push(b.message,"error")};return <><AdminPageHead title="مدیریت موجودی" desc="هر تغییر به‌عنوان حرکت موجودی و audit ثبت می‌شود"/><Panel><div className="grid gap-3 sm:grid-cols-2"><Input value={q} onChange={e=>setQ(e.target.value)} placeholder="نام یا SKU"/><Select value={status} onChange={e=>setStatus(e.target.value)}><option value="">همه وضعیت‌ها</option><option value="available">موجود</option><option value="low">کم‌موجود</option><option value="out">ناموجود</option></Select></div></Panel><div className="mt-4">{loading?<LoadingRows/>:error?<ErrorState text={error}/>:!data?.inventory.length?<EmptyState title="موجودی ثبت نشده است"/>:<div className="overflow-x-auto rounded-2xl border border-line bg-surface"><table className="w-full min-w-[680px] text-xs"><thead className="bg-surface2"><tr><th className="p-3 text-start">محصول</th><th>SKU</th><th>موجودی</th><th>آستانه</th><th>وضعیت</th><th>عملیات</th></tr></thead><tbody>{data.inventory.map(p=><tr key={p.id} className="border-t border-line-soft"><td className="p-3 font-bold">{p.name}</td><td dir="ltr" className="text-center">{p.sku}</td><td className="text-center font-black">{faDigits(p.stock)}</td><td className="text-center">{faDigits(p.lowStockThreshold)}</td><td className="text-center">{p.stock<=0?"ناموجود":p.stock<=p.lowStockThreshold?"کم‌موجود":"موجود"}</td><td className="text-center"><Button size="sm" variant="outline" onClick={()=>setEdit({id:p.id,mode:"set",quantity:p.stock,reason:"اصلاح موجودی",note:""})}>اصلاح موجودی</Button></td></tr>)}</tbody></table></div>}</div>{edit&&<Panel className="mt-5"><h2 className="text-sm font-black">تغییر موجودی</h2><div className="mt-3 grid gap-3 md:grid-cols-4"><Select value={edit.mode} onChange={e=>setEdit({...edit,mode:e.target.value})}><option value="increase">ورود</option><option value="decrease">خروج</option><option value="set">تنظیم دقیق</option><option value="unavailable">ناموجود</option></Select><Input type="number" value={edit.quantity} onChange={e=>setEdit({...edit,quantity:Number(e.target.value)})}/><Select value={edit.reason} onChange={e=>setEdit({...edit,reason:e.target.value})}>{["ورود کالا","فروش","اصلاح موجودی","مرجوعی","ضایعات"].map(x=><option key={x}>{x}</option>)}</Select><Input value={edit.note} placeholder="یادداشت" onChange={e=>setEdit({...edit,note:e.target.value})}/></div><div className="mt-4 flex gap-2"><Button onClick={save}>ثبت تغییر</Button><Button variant="outline" onClick={()=>setEdit(null)}>انصراف</Button></div></Panel>}</>}

/* ————————————————— Orders / customers ————————————————— */
// گذارهای مجاز وضعیت سفارش — آینهٔ قاعدهٔ سرور در services/admin.ts (منبع حقیقت سرور است)
const ADMIN_NEXT: Record<string, string[]> = {
  pending: ["pending", "paid", "preparing", "cancelled"],
  paid: ["paid", "preparing", "cancelled", "refunded"],
  preparing: ["preparing", "shipped", "cancelled", "refunded", "paid"],
  shipped: ["shipped", "transit", "delivered", "refunded", "preparing"],
  transit: ["transit", "delivered", "refunded", "shipped"],
  delivered: ["delivered", "refunded"],
  cancelled: ["cancelled", "pending", "refunded"],
  refunded: ["refunded"],
};
type AdminOrder={id:number;code:string;customer:Record<string,unknown>;items:Record<string,unknown>[];total:number;paymentStatus:string;paymentMethod:string|null;status:string;shippingMethod:string|null;createdAt:string;note?:string|null;isGift?:boolean;giftRecipient?:string|null;giftMessage?:string|null;giftPackaging?:boolean};
export function OrdersAdmin(){const[q,setQ]=useState("");const{data,loading,error,reload}=useApi<{orders:AdminOrder[]}>(`/api/admin/orders${q?`?q=${encodeURIComponent(q)}`:""}`);const toast=useToast();const update=async(o:AdminOrder,status:string)=>{const body={status,paymentStatus:status==="paid"?"paid":o.paymentStatus};const b=await(await fetch(`/api/admin/orders/${o.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})).json();b.ok?(toast.push("وضعیت سفارش ذخیره شد"),reload()):toast.push(b.message,"error")};
const collect=async(o:AdminOrder)=>{const b=await(await fetch(`/api/admin/orders/${o.id}/collect`,{method:"POST",headers:{"Content-Type":"application/json"}})).json();b.ok?(toast.push(b.message??"دریافت وجه ثبت شد"),reload()):toast.push(b.message,"error")};return <><AdminPageHead title="سفارش‌ها" desc="قیمت تاریخی اقلام در order snapshot حفظ می‌شود"/><Panel><Input value={q} onChange={e=>setQ(e.target.value)} placeholder="جستجو شماره سفارش"/></Panel><div className="mt-4">{loading?<LoadingRows/>:error?<ErrorState text={error}/>:!data?.orders.length?<EmptyState title="هنوز سفارشی ثبت نشده است"/>:<div className="overflow-x-auto rounded-2xl border border-line bg-surface"><table className="w-full min-w-[850px] text-xs"><thead className="bg-surface2"><tr><th className="p-3">سفارش</th><th>مشتری</th><th>تاریخ</th><th>اقلام</th><th>مبلغ</th><th>پرداخت</th><th>وضعیت سفارش</th></tr></thead><tbody>{data.orders.map(o=><tr key={o.id} className="border-t border-line-soft"><td className="p-3 font-bold" dir="ltr">{o.code}{o.note? <span className="block mt-0.5 max-w-[220px] truncate text-[10px] font-normal text-muted" title={o.note}>یادداشت: {o.note}</span> :null}{o.isGift? <span className="block mt-0.5 text-[10px] font-normal text-brand-700" title={[o.giftRecipient,o.giftMessage,o.giftPackaging?"بسته‌بندی هدیه":null].filter(Boolean).join(" · ")||undefined}>🎁 هدیه{o.giftRecipient?` — ${o.giftRecipient}`:""}</span> :null}</td><td>{String(o.customer.firstName??"")} {String(o.customer.lastName??"")}</td><td>{faDate(o.createdAt)}</td><td>{faDigits(o.items.length)}</td><td>{formatToman(o.total)}</td><td className="whitespace-nowrap">{o.paymentStatus}{(o.paymentMethod==="cod"||o.paymentMethod==="card")&&o.paymentStatus!=="paid"?<button onClick={()=>collect(o)} className="ms-2 rounded-full bg-brand-700 px-2.5 py-1 text-[10px] font-black text-inverse hover:bg-brand-800">ثبت دریافت وجه</button>:null}</td><td><Select value={o.status} onChange={e=>update(o,e.target.value)}>{(ADMIN_NEXT[o.status]??["pending","paid","preparing","shipped","transit","delivered","cancelled","refunded"]).map(x=><option key={x} value={x}>{x}</option>)}</Select></td></tr>)}</tbody></table></div>}</div></>}

type AdminCustomer={id:number;name:string;phone:string|null;email:string|null;orderCount:number;totalPurchases:number;createdAt:string};
export function CustomersAdmin(){const[q,setQ]=useState("");const{data,loading,error}=useApi<{customers:AdminCustomer[]}>(`/api/admin/customers${q?`?q=${encodeURIComponent(q)}`:""}`);return <><AdminPageHead title="مشتریان" desc="اطلاعات تماس و تاریخچه خرید؛ بدون داده حساس احراز هویت"/><Panel><Input value={q} onChange={e=>setQ(e.target.value)} placeholder="نام، موبایل یا ایمیل"/></Panel><div className="mt-4">{loading?<LoadingRows/>:error?<ErrorState text={error}/>:!data?.customers.length?<EmptyState title="اطلاعاتی برای نمایش وجود ندارد"/>:<div className="overflow-x-auto rounded-2xl border border-line bg-surface"><table className="w-full min-w-[650px] text-xs"><thead className="bg-surface2"><tr><th className="p-3 text-start">نام</th><th>موبایل</th><th>ایمیل</th><th>سفارش‌ها</th><th>جمع خرید</th></tr></thead><tbody>{data.customers.map(c=><tr key={c.id} className="border-t border-line-soft"><td className="p-3 font-bold">{c.name}</td><td dir="ltr" className="text-center">{c.phone??"—"}</td><td dir="ltr" className="text-center">{c.email??"—"}</td><td className="text-center">{faDigits(c.orderCount)}</td><td className="text-center">{formatToman(c.totalPurchases)}</td></tr>)}</tbody></table></div>}</div></>}

/* ————————————————— Accounting ————————————————— */
type Tx={id:number;type:string;amount:number;description:string;referenceType:string|null;referenceId:string|null;createdAt:string};
export function AccountingAdmin(){const{data,loading,error,reload}=useApi<{accounting:{rows:Tx[];summary:{sales:number;received:number;pending:number;refunds:number;expenses:number}}}>("/api/admin/accounting");const toast=useToast();const[form,setForm]=useState({type:"EXPENSE",amount:0,description:""});const save=async()=>{const b=await(await fetch("/api/admin/accounting",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)})).json();b.ok?(toast.push("تراکنش ثبت شد"),setForm({type:"EXPENSE",amount:0,description:""}),reload()):toast.push(b.message,"error")};const rows=data?.accounting.rows??[],s=data?.accounting.summary;const exportCsv=()=>{const csv=["type,amount,description,date",...rows.map(r=>`${r.type},${r.amount},"${r.description.replaceAll('"','""')}",${r.createdAt}`)].join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"}));a.download="helsa-accounting.csv";a.click();URL.revokeObjectURL(a.href)};return <><AdminPageHead title="حسابداری ساده" desc="این بخش جایگزین نرم‌افزار حسابداری قانونی نیست" action={<Button size="sm" variant="outline" onClick={exportCsv}><Download className="size-3"/> خروجی CSV</Button>}/>{loading?<LoadingRows/>:error?<ErrorState text={error}/>:<><div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{[["فروش کل",s?.sales],["دریافت‌شده",s?.received],["در انتظار پرداخت",s?.pending],["مرجوعی",s?.refunds],["هزینه‌ها",s?.expenses]].map(([l,v])=><Panel key={String(l)}><p className="text-[11px] text-muted">{l}</p><p className="mt-1 font-black">{formatToman(Number(v??0))}</p></Panel>)}</div><p className="mt-4 rounded-xl border border-gold-500/30 bg-gold-500/10 p-3 text-xs text-heading">برای محاسبه سود، بهای تمام‌شده همه محصولات باید ثبت شود.</p><Panel className="mt-5"><h2 className="text-sm font-black">ثبت هزینه / خرید</h2><div className="mt-3 grid gap-3 md:grid-cols-3"><Select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option value="EXPENSE">هزینه</option><option value="PURCHASE">خرید</option><option value="ADJUSTMENT">اصلاح</option></Select><Input type="number" value={form.amount} onChange={e=>setForm({...form,amount:Number(e.target.value)})}/><Input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="شرح تراکنش"/></div><Button className="mt-3" onClick={save}>ثبت تراکنش</Button></Panel>{!rows.length?<EmptyState title="تراکنشی برای نمایش وجود ندارد"/>:<div className="mt-5 overflow-x-auto rounded-2xl border border-line bg-surface"><table className="w-full min-w-[650px] text-xs"><thead className="bg-surface2"><tr><th className="p-3">نوع</th><th>شرح</th><th>مرجع</th><th>مبلغ</th><th>تاریخ</th></tr></thead><tbody>{rows.map(r=><tr key={r.id} className="border-t border-line-soft"><td className="p-3">{r.type}</td><td>{r.description}</td><td dir="ltr">{r.referenceId??"—"}</td><td>{formatToman(r.amount)}</td><td>{faDate(r.createdAt)}</td></tr>)}</tbody></table></div>}</>}</>}

export function AdminSearchPage(){const[q,setQ]=useState("");const{data,loading,error}=useApi<{results:Record<string,Array<{id:number;label:string;meta:string|null}>>}>(`/api/admin/search?q=${encodeURIComponent(q)}`);return <><AdminPageHead title="جستجوی مدیریت" desc="محصول، SKU، دسته، سینی، سفارش و مشتری"/><Panel><Input value={q} onChange={e=>setQ(e.target.value)} placeholder="حداقل دو حرف وارد کنید"/></Panel>{q.length<2?<p className="mt-5 text-sm text-muted">برای شروع جستجو حداقل دو حرف وارد کنید.</p>:loading?<LoadingRows/>:error?<ErrorState text={error}/>:<div className="mt-5 grid gap-4 md:grid-cols-2">{Object.entries(data?.results??{}).map(([k,rows])=><Panel key={k}><h2 className="text-xs font-black">{k}</h2>{rows.length?<ul className="mt-3 space-y-2">{rows.map(r=><li key={r.id} className="rounded-lg bg-surface2 p-2 text-xs"><b>{r.label}</b><small className="ms-2 text-muted">{r.meta}</small></li>)}</ul>:<p className="mt-2 text-xs text-muted">نتیجه‌ای نیست</p>}</Panel>)}</div>}</>}

export function AdminSettings(){const{data,loading,error}=useApi<{checks:Record<string,unknown>}>("/api/health");return <><AdminPageHead title="تنظیمات مدیریت" desc="وضعیت پیکربندی سرویس‌ها"/>{loading?<LoadingRows/>:error?<ErrorState text={error}/>:<Panel><pre dir="ltr" className="overflow-auto text-xs leading-6">{JSON.stringify(data?.checks,null,2)}</pre><p className="mt-4 text-xs text-muted">تنظیمات حساس فقط از متغیرهای محیطی مدیریت می‌شوند و در این صفحه قابل ویرایش نیستند.</p></Panel>}</>}

/* ————————————————— کمپین‌ها (§ادمین بریف) ————————————————— */
type AdminCampaign = { id: number; title: string; slug: string; banner: string; description: string; startDate: string; endDate: string; discount: number; category: string; active: boolean };

const emptyCampaign = { title: "", slug: "", banner: "", description: "", startDate: "", endDate: "", discount: 0, category: "all", active: true };

/** وضعیت کمپین را از تاریخ‌های واقعی محاسبه می‌کند (همان منطق سمت سرور) */
function campaignState(c: { startDate: string; endDate: string; active: boolean }, now = new Date()) {
  if (!c.active) return { label: "غیرفعال", cls: "bg-surface2 text-muted" };
  const start = new Date(c.startDate).getTime();
  const end = new Date(`${c.endDate}T23:59:59`).getTime();
  if (now.getTime() < start) return { label: "به‌زودی", cls: "bg-gold-50 text-gold-700" };
  if (now.getTime() <= end) return { label: "در حال برگزاری", cls: "bg-brand-50 text-brand-700" };
  return { label: "پایان‌یافته", cls: "bg-surface2 text-muted" };
}

export function CampaignsAdmin() {
  const { data, loading, error, reload } = useApi<{ campaigns: AdminCampaign[] }>("/api/admin/campaigns");
  const toast = useToast();
  const [editing, setEditing] = useState<AdminCampaign | null>(null);
  const [creating, setCreating] = useState(false);

  const toggle = async (c: AdminCampaign) => {
    const r = await fetch(`/api/admin/campaigns/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...c, active: !c.active }),
    });
    const b = await r.json();
    b.ok ? (toast.push(!c.active ? "کمپین فعال شد" : "کمپین غیرفعال شد"), reload()) : toast.push(b.message, "error");
  };

  return (
    <>
      <AdminPageHead
        title="مدیریت کمپین‌ها"
        desc="جشنواره‌ها، تخفیف‌ها و پیشنهادهای ویژه — شمارش‌معکوس صفحهٔ اصلی فقط در ۲۴ ساعت پایانی کمپینِ در حال برگزاری نمایش داده می‌شود"
        action={<Button size="sm" onClick={() => { setEditing(null); setCreating(true); }}><Plus className="size-4" /> کمپین جدید</Button>}
      />
      {loading ? <LoadingRows /> : error ? <ErrorState text={error} retry={reload} /> : !data?.campaigns.length ? (
        <EmptyState title="هنوز کمپینی ثبت نشده است" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[760px] text-xs">
            <thead className="bg-surface2 text-muted">
              <tr><th className="p-3 text-start">عنوان</th><th>slug</th><th>شروع</th><th>پایان</th><th>تخفیف</th><th>وضعیت</th><th>فعال</th><th>عملیات</th></tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {data.campaigns.map((c) => {
                const st = campaignState(c);
                return (
                  <tr key={c.id}>
                    <td className="p-3"><b>{c.title}</b></td>
                    <td dir="ltr" className="text-center text-muted">{c.slug}</td>
                    <td dir="ltr" className="text-center">{c.startDate}</td>
                    <td dir="ltr" className="text-center">{c.endDate}</td>
                    <td className="text-center font-bold">{faDigits(c.discount)}٪</td>
                    <td className="text-center"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${st.cls}`}>{st.label}</span></td>
                    <td className="text-center">
                      <button onClick={() => toggle(c)} aria-label={c.active ? "غیرفعال‌سازی" : "فعال‌سازی"} className={`relative h-6 w-11 rounded-full transition-colors ${c.active ? "bg-brand-600" : "bg-line"}`}>
                        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${c.active ? "start-[22px]" : "start-0.5"}`} />
                      </button>
                    </td>
                    <td className="text-center">
                      <button onClick={() => { setCreating(false); setEditing(c); }} className="grid size-9 place-items-center rounded-full border border-line" aria-label="ویرایش کمپین"><Pencil className="size-4" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {(creating || editing) && <CampaignForm campaign={editing} onDone={() => { setCreating(false); setEditing(null); reload(); }} onCancel={() => { setCreating(false); setEditing(null); }} />}
    </>
  );
}

function CampaignForm({ campaign, onDone, onCancel }: { campaign: AdminCampaign | null; onDone: () => void; onCancel: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(campaign ?? emptyCampaign);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setBusy(true);
    try {
      const r = await fetch(campaign ? `/api/admin/campaigns/${campaign.id}` : "/api/admin/campaigns", {
        method: campaign ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, discount: Number(form.discount) }),
      });
      const b = await r.json();
      if (b.ok) { toast.push(campaign ? "کمپین به‌روزرسانی شد" : "کمپین ساخته شد"); onDone(); }
      else toast.push(b.message ?? "خطا در ذخیرهٔ کمپین", "error");
    } finally { setBusy(false); }
  };

  return (
    <Panel className="mt-4">
      <h2 className="text-sm font-black">{campaign ? `ویرایش: ${campaign.title}` : "کمپین جدید"}</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <FieldLabel text="عنوان"><Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="جشنوارهٔ خرما" /></FieldLabel>
        <FieldLabel text="slug (انگلیسی)"><Input value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="dates-festival" dir="ltr" /></FieldLabel>
        <FieldLabel text="تاریخ شروع (میلادی)"><Input value={form.startDate} onChange={(e) => set("startDate", e.target.value)} placeholder="2026-09-20" dir="ltr" /></FieldLabel>
        <FieldLabel text="تاریخ پایان (میلادی)"><Input value={form.endDate} onChange={(e) => set("endDate", e.target.value)} placeholder="2026-09-21" dir="ltr" /></FieldLabel>
        <FieldLabel text="درصد تخفیف (0-100)"><Input value={String(form.discount)} onChange={(e) => set("discount", Number(e.target.value.replace(/[^\d]/g, "")) || 0)} inputMode="numeric" dir="ltr" /></FieldLabel>
        <FieldLabel text="دسته (all = همه)"><Input value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="all" dir="ltr" /></FieldLabel>
        <div className="md:col-span-2"><FieldLabel text="توضیح (اختیاری)"><Input value={form.description} onChange={(e) => set("description", e.target.value)} /></FieldLabel></div>
        <label className="flex items-center gap-2 text-xs font-bold text-body">
          <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} className="size-4 accent-[#0a5236]" /> فعال
        </label>
      </div>
      <p className="mt-3 text-[11px] text-muted">نکته: شمارش‌معکوس «پیشنهاد ویژهٔ» صفحهٔ اصلی فقط در ۲۴ ساعت پایانی کمپینِ فعال دیده می‌شود (سقف ۲۳:۵۹:۵۹).</p>
      <div className="mt-4 flex gap-2">
        <Button onClick={save} disabled={busy || !form.title || !form.slug || !form.startDate || !form.endDate}>{busy ? "در حال ذخیره…" : "ذخیره"}</Button>
        <Button onClick={onCancel} variant="outline">انصراف</Button>
      </div>
    </Panel>
  );
}
