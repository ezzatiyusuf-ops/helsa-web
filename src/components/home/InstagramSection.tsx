import { Send, MessageCircle, Heart, MessageSquare, ArrowLeft, } from "lucide-react";
import { InstagramIcon, LinkedinIcon, YoutubeIcon } from "@/components/ui/icons";
import { SITE } from "@/config/site";
import { getInstagramFeed, getInstagramStories } from "@/services/instagram";
import { SmartImage } from "@/components/ui/SmartImage";
import { SectionHead } from "@/components/ui/primitives";
import { Stories } from "@/components/home/Stories";
import { CarouselRow } from "@/components/ui/CarouselRow";
import { faDigits } from "@/lib/format";

/**
 * «هلسا در اینستاگرام» — ویترین شبکه‌های اجتماعی صفحهٔ اصلی.
 * Server component است: فید و استوری‌ها سمت سرور خوانده می‌شوند (بدون ریسک هیدریشن).
 * منبع: فید/استوری زندهٔ Graph API در صورت اتصال از پنل، وگرنه پست‌های منتخب.
 * پست‌ها/استوری‌ها فقط با دادهٔ واقعی رندر می‌شوند (بدون دادهٔ جعلی)؛
 * اما نوار دنبال‌کردن شبکه‌های اجتماعی استاتیک است و حتی بدون دیتابیس هم نمایش داده می‌شود
 * (اجرای محلی/قطعی DB نباید حضور برند در شبکه‌های اجتماعی را حذف کند).
 */
export async function InstagramSection() {
  const [{ posts }, { stories }] = await Promise.all([getInstagramFeed(8), getInstagramStories()]);

  const tg = `https://t.me/${SITE.messengers.telegram}`;
  const wa = SITE.whatsappUrl;

  // اکوسیستم کامل شبکه‌های اجتماعی (فاز ۱۱) — بدون پاپ‌آپ؛ دعوت طبیعی به دنبال‌کردن
  const socials = [
    { href: SITE.instagramUrl, label: "اینستاگرام", handle: SITE.instagram, Icon: InstagramIcon, external: true },
    { href: tg, label: "تلگرام", handle: `@${SITE.messengers.telegram}`, Icon: Send, external: true },
    { href: wa, label: "واتس‌اپ", handle: faDigits(SITE.messengers.whatsapp), Icon: MessageCircle, external: true },
    // linkedin/youtube hidden until the owner provides verified handles (brief 3.4)
  ];

  return (
    <section className="bg-surface2/70 border-y border-line/60 pt-16 md:pt-20 pb-8 md:pb-10" aria-label="هلسا در شبکه‌های اجتماعی">
      <div className="container-x">
        <SectionHead
          eyebrow="هلسا در شبکه‌های اجتماعی"
          title="اینستاگرام هلسا را دنبال کنید"
          desc={`تازه‌های فروشگاه، پشت‌صحنهٔ تولید و ایده‌های پذیرایی — ${SITE.instagram}`}
        />

        {/* نوار استوری‌ها */}
        {stories.length > 0 && <Stories stories={stories} className="mt-10" />}

        {/* نوار کشویی افقی (بازخورد کاربر): پست‌ها کنار-هم با فلش/سوایپ */}
        {posts.length > 0 && (
        <CarouselRow ariaLabel="پست‌های اینستاگرام هلسا — نوار کشویی" className="mt-8">
          {posts.map((post) => {
            const href = post.permalink ?? (post.productSlug ? `/products/${post.productSlug}` : SITE.instagramUrl);
            const external = href.startsWith("http");
            return (
              <div key={post.id} className="w-[42vw] min-[400px]:w-[40vw] sm:w-[224px] lg:w-[248px] shrink-0 snap-start">
                <a
                  href={href}
                  {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="group relative block aspect-square overflow-hidden rounded-2xl border border-line bg-surface shadow-soft transition-shadow hover:shadow-lift"
                  aria-label={post.caption ? post.caption.slice(0, 60) : "پست اینستاگرام هلسا"}
                >
                  <SmartImage
                    src={post.imageUrl}
                    alt={post.caption || "پست اینستاگرام هلسا"}
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
                  />
                  {/* hover overlay — کپشن + آمار واقعی (فقط اگر از API باشد) */}
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
              </div>
            );
          })}
        </CarouselRow>
        )}

        {/* نوار دنبال‌کردن شبکه‌های اجتماعی */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {socials.map(({ href, label, handle, Icon, external }) => (
              <a
                key={label}
                href={href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="inline-flex items-center gap-2.5 rounded-full border border-line bg-surface px-5 py-2.5 text-xs font-bold text-heading transition-all hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-soft"
              >
                <span className="grid size-8 place-items-center rounded-full bg-brand-700 text-inverse"><Icon className="size-4" aria-hidden /></span>
                <span className="flex flex-col items-start leading-5">
                  <span>{label} هلسا</span>
                  <span className="text-[10px] font-bold text-muted" dir="ltr">{handle}</span>
                </span>
              </a>
            ))}
        </div>

        {/* لینک صفحهٔ کامل اینستاگرام هلسا */}
        {posts.length >= 8 && (
          <div className="mt-3 text-center">
              <a
                href="/instagram"
                className="inline-flex items-center gap-2 text-xs font-black text-brand-700 transition-colors hover:text-brand-600"
              >
                مشاهدهٔ همهٔ پست‌ها و استوری‌ها
                <ArrowLeft className="size-4" aria-hidden />
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
