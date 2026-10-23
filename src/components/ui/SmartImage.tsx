import variants from "@/data/image-variants.json";
import blurMap from "@/data/image-blur.json";

/**
 * SEO/performance image: <picture> with AVIF → WebP → JPEG fallback,
 * responsive srcset from the generated variants in /images/opt.
 * Falls back to a plain <img> for paths without generated variants
 * (e.g. legacy assets) — graceful everywhere.
 */
export function SmartImage({
  src,
  alt,
  className = "",
  sizes = "100vw",
  priority = false,
  width,
  height,
  draggable = false,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  width?: number;
  height?: number;
  draggable?: boolean;
}) {
  // مسیرهای opt و ریشه‌ای (پس از تولید variants برای تصاویر ریشه، هر دو پشتیبانی می‌شوند)
  const m = src.match(/^\/images\/(?:opt\/)?(.+)\.jpg$/);
  const v = m ? (variants as Record<string, { avif: number[]; webp: number[]; jpg: boolean }>)[m[1]] : undefined;
  const name = m?.[1];

  // LQIP: بندانگشتی محوِ درون‌خطی (~۲۰۰ بایت) — جای تصویر از لحظهٔ اول «پر» دیده می‌شود؛
  // وقتی پیکسل‌های اصلی می‌رسند، object-cover آن‌ها را کامل می‌پوشاند. صفر CLS.
  const blur = name ? (blurMap as Record<string, string>)[name] : undefined;
  const blurStyle = blur ? { backgroundImage: `url("${blur}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined;

  if (!v) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={className}
        style={blurStyle}
        sizes={sizes}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        draggable={draggable}
      />
    );
  }

  const base = `/images/opt/${name}`;
  const srcSetFor = (ext: "avif" | "webp") =>
    v[ext]
      .filter((w) => w > 0)
      .map((w) => `${base}-${w}.${ext} ${w}w`)
      // فایل پایه فقط وقتی در manifest ثبت شده است به srcset اضافه شود (پیشگیری از 404)
      .concat(v[ext].includes(0) ? [`${base}.${ext} 1400w`] : [])
      .join(", ");

  return (
    <picture>
      <source type="image/avif" srcSet={srcSetFor("avif")} sizes={sizes} />
      <source type="image/webp" srcSet={srcSetFor("webp")} sizes={sizes} />
      <img
        src={`${base}.jpg`}
        alt={alt}
        className={className}
        style={blurStyle}
        sizes={sizes}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        draggable={draggable}
      />
    </picture>
  );
}
