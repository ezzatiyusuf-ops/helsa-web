import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTrayBySlug, getTrays } from "@/services/catalog";
import { TrayDetailClient } from "@/components/mazeh/TrayDetailClient";
import { JsonLd } from "@/components/seo/JsonLd";
import { traySchema, breadcrumbSchema } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tray = await getTrayBySlug(slug);
  if (!tray) notFound();
  return {
    title: `${tray.name} | سینی پذیرایی هلسا`,
    description: tray.shortDescription,
    alternates: { canonical: `/mazeh-trays/${tray.slug}` },
    openGraph: { title: tray.name, description: tray.shortDescription, images: [{ url: tray.image, width: 1200, height: 630, alt: tray.name }] },
  };
}

export default async function TrayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [tray, all] = await Promise.all([getTrayBySlug(slug), getTrays()]);
  if (!tray) notFound();
  const related = all.filter((t) => t.slug !== tray.slug).slice(0, 3);
  const schema = traySchema({
    name: tray.name,
    slug: tray.slug,
    description: tray.description,
    image: tray.image,
    price: tray.basePrice,
    servesMin: tray.servesMin,
    servesMax: tray.servesMax,
  });
  const crumbs = breadcrumbSchema([
    { name: "خانه", path: "/" },
    { name: "سینی مزه هلسا", path: "/mazeh-trays" },
    { name: tray.name, path: `/mazeh-trays/${tray.slug}` },
  ]);
  return (
    <>
      <JsonLd data={schema} />
      <JsonLd data={crumbs} />
      <TrayDetailClient tray={tray} related={related} />
    </>
  );
}
