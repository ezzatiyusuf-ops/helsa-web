"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, FolderTree, Boxes, ShoppingBag, Users, Calculator, Settings, UtensilsCrossed, Store, Search, Gift, Truck, Palette, Megaphone, ReceiptText, Sprout } from "lucide-react";
import { HelsaLogo } from "@/components/ui/primitives";
import { InstagramIcon } from "@/components/ui/icons";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";

const NAV = [
  { href: "/admin", label: "داشبورد", icon: LayoutDashboard },
  { href: "/admin/products", label: "محصولات", icon: Package },
  { href: "/admin/categories", label: "دسته‌بندی‌ها", icon: FolderTree },
  { href: "/admin/trays", label: "سینی‌ها", icon: UtensilsCrossed },
  { href: "/admin/inventory", label: "موجودی", icon: Boxes },
  { href: "/admin/orders", label: "سفارش‌ها", icon: ShoppingBag },
  { href: "/admin/receipts", label: "رسیدهای کارت‌به‌کارت", icon: ReceiptText },
  { href: "/admin/rooziteh", label: "روزیته", icon: Sprout },
  { href: "/admin/campaigns", label: "کمپین‌ها", icon: Megaphone },
  { href: "/admin/customers", label: "مشتریان", icon: Users },
  { href: "/admin/inquiries", label: "درخواست‌ها", icon: Gift },
  { href: "/admin/wholesale", label: "عمده B2B", icon: Truck },
  { href: "/admin/accounting", label: "حسابداری", icon: Calculator },
  { href: "/admin/settings", label: "تنظیمات", icon: Settings },
  { href: "/admin/catalog", label: "کاتالوگ UI", icon: Palette },
];

export function AdminShell({ adminName, children }: { adminName: string; children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-canvas text-heading">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-xl">
        <div className="flex h-16 items-center gap-4 px-4 md:px-6">
          <Link href="/admin" aria-label="مدیریت هلسا"><HelsaLogo className="h-10" /></Link>
          <span className="hidden h-6 w-px bg-line sm:block" aria-hidden />
          <p className="hidden text-xs font-black text-heading sm:block">مدیریت فروشگاه</p>
          <div className="ms-auto flex items-center gap-2">
            <Link href="/admin/search" className="hidden size-9 place-items-center rounded-full border border-line text-muted md:grid" aria-label="جستجوی مدیریت"><Search className="size-4" /></Link>
            <ThemeSwitcher compact />
            <Link href="/" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[11px] font-bold text-heading hover:bg-surface2">
              <Store className="size-3.5" /> فروشگاه
            </Link>
            <span className="hidden text-[11px] text-muted lg:inline">{adminName}</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr]">
        <aside className="border-b border-line bg-surface lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:border-b-0 lg:border-e">
          <nav className="flex gap-1 overflow-x-auto p-3 no-scrollbar lg:flex-col lg:p-4" aria-label="منوی مدیریت">
            {NAV.map((item) => {
              const active = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition-colors ${active ? "bg-brand-700 text-inverse" : "text-muted hover:bg-surface2 hover:text-heading"}`}>
                  <item.icon className="size-4" /> {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export function AdminPageHead({ title, desc, action }: { title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-2xl font-black text-heading">{title}</h1>{desc && <p className="mt-1 text-xs text-muted">{desc}</p>}</div>
      {action}
    </div>
  );
}
