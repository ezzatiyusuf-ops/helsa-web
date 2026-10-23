import type { MetadataRoute } from "next";

/** PWA manifest — served at /manifest.webmanifest by Next.js */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "هلسا ایرانیان",
    short_name: "هلسا",
    description: "فروشگاه محصولات طبیعی و پذیرایی هلسا ایرانیان",
    lang: "fa-IR",
    dir: "rtl",
    display: "standalone",
    orientation: "portrait",
    start_url: "/",
    scope: "/",
    theme_color: "#0b5f3b",
    background_color: "#fffdf9",
    categories: ["food", "shopping", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "محصولات هلسا", short_name: "محصولات", url: "/products" },
      { name: "سینی مزه هلسا", short_name: "سینی مزه", url: "/mazeh-trays" },
      { name: "سبد خرید", short_name: "سبد خرید", url: "/cart" },
    ],
  };
}
