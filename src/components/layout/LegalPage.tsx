import { LEGAL_PAGES } from "@/data/content";
import { PageHeader } from "@/components/layout/PageHeader";
import { Reveal } from "@/components/ui/primitives";

export function LegalPage({ slug }: { slug: keyof typeof LEGAL_PAGES }) {
  const page = LEGAL_PAGES[slug];
  return (
    <>
      <PageHeader title={page.title} desc={`آخرین به‌روزرسانی: ${page.updated}`} crumbs={[{ label: "خانه", href: "/" }, { label: page.title, href: `/${slug}` }]} />
      <div className="container-x max-w-3xl py-14 space-y-6">
        {page.sections.map((s, i) => (
          <Reveal key={s.h} delay={i * 0.05}>
            <section className="rounded-2xl bg-surface border border-line p-6 md:p-8">
              <h2 className="text-base font-black text-heading">{s.h}</h2>
              <p className="mt-3 text-sm leading-8 text-body">{s.p}</p>
            </section>
          </Reveal>
        ))}
      </div>
    </>
  );
}
