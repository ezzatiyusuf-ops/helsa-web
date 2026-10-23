import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Clock3, XCircle, LogIn, UserPlus, PauseCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LinkButton, Price } from "@/components/ui/primitives";
import { readSession, customerIdFromSession } from "@/lib/session";
import { getBusinessForCustomer, getWholesaleCatalog, listWholesaleOrders } from "@/services/wholesale";
import { WholesaleDashboardClient } from "@/components/wholesale/WholesaleDashboardClient";
import { faDate } from "@/lib/format";
import { WHOLESALE_STATUS_LABEL } from "@/config/wholesale";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "پنل خرید عمده | هلسا",
  robots: { index: false, follow: false },
};

function StatusCard({
  icon: Icon, title, desc, children,
}: { icon: typeof Clock3; title: string; desc: string; children?: React.ReactNode }) {
  return (
    <div className="container-x py-16 max-w-xl mx-auto">
      <div className="rounded-2xl border border-line/70 bg-surface p-8 text-center">
        <Icon className="mx-auto size-10 text-brand-700" aria-hidden />
        <h2 className="mt-4 text-lg font-black text-heading">{title}</h2>
        <p className="mt-3 text-sm leading-7 text-muted">{desc}</p>
        {children && <div className="mt-6 flex justify-center flex-wrap gap-2">{children}</div>}
      </div>
    </div>
  );
}

export default async function WholesaleDashboardPage() {
  const session = await readSession();
  const customerId = customerIdFromSession(session);

  if (!session) {
    return (
      <>
        <PageHeader compact title="پنل خرید عمده" desc="برای دسترسی به پنل عمده، ابتدا وارد حساب کاربری شوید." crumbs={[{ label: "خانه", href: "/" }, { label: "خرید عمده", href: "/wholesale" }, { label: "پنل", href: "/wholesale/dashboard" }]} />
        <StatusCard icon={LogIn} title="ورود به حساب" desc="با شماره موبایل و رمز عبوری که هنگام ثبت‌نام عمده ساختید وارد شوید.">
          <LinkButton href="/login?next=/wholesale/dashboard">ورود</LinkButton>
          <LinkButton href="/wholesale/register" variant="outline">ثبت‌نام عمده</LinkButton>
        </StatusCard>
      </>
    );
  }

  const business = await getBusinessForCustomer(customerId, session.phone);

  if (!business) {
    return (
      <>
        <PageHeader compact title="پنل خرید عمده" crumbs={[{ label: "خانه", href: "/" }, { label: "خرید عمده", href: "/wholesale" }, { label: "پنل", href: "/wholesale/dashboard" }]} />
        <StatusCard icon={UserPlus} title="حساب عمده‌ای برای شما ثبت نشده" desc="برای فعال‌سازی قیمت همکاری و خرید عمده، ابتدا ثبت‌نام کسب‌وکار را کامل کنید.">
          <LinkButton href="/wholesale/register">ثبت‌نام خرید عمده</LinkButton>
        </StatusCard>
      </>
    );
  }

  if (business.status === "pending") {
    return (
      <>
        <PageHeader compact title="پنل خرید عمده" crumbs={[{ label: "خانه", href: "/" }, { label: "خرید عمده", href: "/wholesale" }, { label: "پنل", href: "/wholesale/dashboard" }]} />
        <StatusCard icon={Clock3} title="در انتظار تأیید کارشناس B2B" desc={`درخواست «${business.businessName}» با کد ${business.code} ثبت شده و در صف بررسی است. تأیید معمولاً کمتر از یک روز کاری طول می‌کشد.`}>
          <LinkButton href="/" variant="outline">بازگشت به فروشگاه</LinkButton>
        </StatusCard>
      </>
    );
  }

  if (business.status === "rejected" || business.status === "suspended") {
    return (
      <>
        <PageHeader compact title="پنل خرید عمده" crumbs={[{ label: "خانه", href: "/" }, { label: "خرید عمده", href: "/wholesale" }, { label: "پنل", href: "/wholesale/dashboard" }]} />
        <StatusCard
          icon={business.status === "rejected" ? XCircle : PauseCircle}
          title={`حساب عمده ${WHOLESALE_STATUS_LABEL[business.status]}`}
          desc={business.adminNote || "برای اطلاعات بیشتر با کارشناس B2B هلسا تماس بگیرید."}
        >
          <LinkButton href="/contact">تماس با کارشناس</LinkButton>
        </StatusCard>
      </>
    );
  }

  // approved → full dashboard
  const [catalog, orders] = await Promise.all([
    getWholesaleCatalog(business.discountPercent),
    listWholesaleOrders(business),
  ]);

  return (
    <>
      <PageHeader
        compact
        title={`پنل عمده — ${business.businessName}`}
        desc={`قیمت همکاری شما: ${business.discountPercent}٪ تخفیف روی قیمت روز کاتالوگ`}
        crumbs={[{ label: "خانه", href: "/" }, { label: "خرید عمده", href: "/wholesale" }, { label: "پنل", href: "/wholesale/dashboard" }]}
      />

      {/* summary strip */}
      <section className="container-x pt-6" aria-label="خلاصه حساب عمده">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "کد همکاری", value: business.code },
            { label: "تخفیف همکاری", value: `${business.discountPercent}٪` },
            { label: "سفارش‌های ثبت‌شده", value: String(orders.length) },
            { label: "آخرین سفارش", value: orders[0] ? faDate(orders[0].createdAt.slice(0, 10)) : "—" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-line/70 bg-surface p-4">
              <p className="text-[10.5px] text-muted">{s.label}</p>
              <p dir="auto" className="mt-1.5 text-sm font-black text-heading truncate">{s.value}</p>
            </div>
          ))}
        </div>
      </section>

      <WholesaleDashboardClient
        business={{ code: business.code, businessName: business.businessName, discountPercent: business.discountPercent }}
        catalog={catalog}
        orders={orders}
      />
    </>
  );
}
