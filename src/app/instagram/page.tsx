import type { Metadata } from "next";
import { Heart, MessageSquare, Send, MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { InstagramIcon } from "@/components/ui/icons";
import { Stories } from "@/components/home/Stories";
import { SmartImage } from "@/components/ui/SmartImage";
import { Reveal } from "@/components/ui/primitives";
import { SITE } from "@/config/site";
import { getInstagramFeed, getInstagramStories } from "@/services/instagram";
import { faDigits } from "@/lib/format";

export const metadata: Metadata = {
  alternates: { canonical: "/instagram" },
  title: "هلسا در اینستاگرام | پست‌ها و استوری‌های هلسا مارکت",
  description: `پست‌ها و استوری‌های ${SITE.instagram} — تازه‌های فروشگاه، پشت‌صحنهٔ تولید و ایده‌های پذیرایی هلسا.`,
};

/**
 * Phase 5 (Netlify): هرگز در زمان build به PostgreSQL وصل نمی‌شویم —
 * رندر سروری در زمان درخواست؛ DB در دسترس نباشد صفحه با حالت خالی رندر می‌شود.
 */
export const dynamic = "force-dynamic";

/**
 * صفحهٔ عمومی اینستاگرام هلسا — گرید کامل پست‌ها + نوار استوری‌ها.
 * Server component: فید و استوری سمت سرور خوانده می‌شود (بدون ریسک هیدریشن).
 */
export default async function InstagramPage() {
  const [{ posts }, { stories }] = await Promise.all([getInstagramFeed(48), getInstagramStories()]);

  const tg = `https://t.me/${SITE.messengers.telegram}`;
  const socials = [
    { href: SITE.instagramUrl, label: "اینستاگرام", handle: SITE.instagram, Icon: InstagramIcon },
    { href: tg, label: "تلگرام", handle: `@${SITE.messengers.telegram}`, Icon: Send },
    { href: SITE.whatsappUrl, label: "واتس‌اپ", handle: faDigits(SITE.messengers.whatsapp), Icon: MessageCircle },
  ];

  return (
    <>
      <PageHeader
        title="هلسا در اینستاگرام"
        desc={`تازه‌های فروشگاه، پشت‌صحنهٔ تولید و ایده‌های پذیرایی — ${SITE.instagram}`}
        crumbs={[{ label: "خانه", href: "/" }, { label: "اینستاگرام هلسا", href: "/instagram" }]}
      />

      <section className="container-x py-12 md:py-16" aria-label="پست‌ها و استوری‌های هلسا">
        {stories.length > 0 && (
          <Reveal>
            <div>
              <h2 className="mb-4 text-sm font-black text-heading">استوری‌های هلسا</h2>
              <Stories stories={stories} />
            </div>
          </Reveal>
        )}

        <Reveal>
          <h2 className="mb-4 mt-10 text-sm font-black text-heading">
            پست‌ها ({faDigits(posts.length)})
          </h2>
        </Reveal>

        {posts.length === 0 ? (
          <p className="rounded-2xl border border-line bg-surface p-6 text-center text-xs font-bold text-muted">
            هنوز پستی منتشر نشده است — به‌زودی @{SITE.instagram.slice(1)} را دنبال کنید.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {posts.map((post) => {
              const href = post.permalink ?? (post.productSlug ? `/products/${post.productSlug}` : SITE.instagramUrl);
              const external = href.startsWith("http");
              return (
                <a
                  key={post.id}
                  href={href}
                  {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="group relative block aspect-square overflow-hidden rounded-2xl border border-line bg-surface shadow-soft transition-shadow hover:shadow-lift"
                  aria-label={post.caption ? post.caption.slice(0, 60) : "پست اینستاگرام هلسا"}
                >
                  <SmartImage
                    src={post.imageUrl}
                    alt={post.caption || "پست اینستاگرام هلسا"}
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(min-width: 1024px) 22vw, (min-width: 640px) 33vw, 50vw"
                  />
                  <span className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-brand-950/85 via-brand-950/25 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    {post.caption && (
                      <span className="line-clamp-2 text-[11px] leading-5 font-bold text-inverse">{post.caption}</span>
                    )}
                    <span className="mt-1.5 flex items-center gap-3 text-[10.5px] font-bold text-inverse/85">
                      <InstagramIcon className="size-3.5" />
                      {post.likes !== null && (
                        <span className="inline-flex items-center gap-1"><Heart className="size-3.5" aria-hidden />{faDigits(post.likes)}</span>
                      )}
                      {post.comments !== null && (
                        <span className="inline-flex items-center gap-1"><MessageSquare className="size-3.5" aria-hidden />{faDigits(post.comments)}</span>
                      )}
                      {post.likes === null && post.comments === null && <span>مشاهده در اینستاگرام</span>}
                    </span>
                  </span>
                </a>
              );
            })}
          </div>
        )}

        <Reveal delay={100}>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
            {socials.map(({ href, label, handle, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 rounded-full border border-line bg-surface px-5 py-2.5 text-xs font-bold text-heading transition-all hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-soft"
                aria-label={`${label} هلسا — ${handle}`}
              >
                <span className="grid size-8 place-items-center rounded-full bg-brand-700 text-inverse"><Icon className="size-4" aria-hidden /></span>
                <span className="flex flex-col items-start leading-5">
                  <span>{label} هلسا</span>
                  <span className="text-[10px] font-bold text-muted" dir="ltr">{handle}</span>
                </span>
              </a>
            ))}
          </div>
        </Reveal>
      </section>
    </>
  );
}
