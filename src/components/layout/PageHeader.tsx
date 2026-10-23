import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/** Light editorial page header — cream ground, dark green type, fine gold rule */
export function PageHeader({
  title,
  desc,
  crumbs,
  compact = false,
}: {
  title: string;
  desc?: string;
  crumbs: { label: string; href: string }[];
  image?: string;
  compact?: boolean;
}) {
  return (
    <div className="relative bg-surface2 border-b border-line/70 overflow-hidden">
      <div className="pattern-persian absolute inset-0 opacity-60" aria-hidden />
      <div className="relative container-x py-14 md:py-20">
        <nav aria-label="مسیر صفحه" className="text-[11px] text-muted">
          <ol className="flex items-center gap-1.5 flex-wrap">
            {crumbs.map((c, i) => (
              <li key={c.href} className="flex items-center gap-1.5">
                <Link href={c.href} className="hover:text-brand-700 transition-colors">{c.label}</Link>
                {i < crumbs.length - 1 && <ChevronLeft className="size-3 opacity-50" aria-hidden />}
              </li>
            ))}
          </ol>
        </nav>
        <h1 className={`${compact ? "mt-3 text-2xl md:text-[34px]" : "mt-5 text-3xl md:text-[42px]"} font-black leading-[1.4] text-heading`}>{title}</h1>
        <span className={`${compact ? "mt-3 w-12" : "mt-5 w-16"} block rule-gold`} aria-hidden />
        {desc && <p className={`${compact ? "mt-3" : "mt-5"} max-w-xl text-sm md:text-[15px] leading-8 text-muted`}>{desc}</p>}
      </div>
    </div>
  );
}
