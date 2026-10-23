import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getGiftPackageBySlug } from "@/services/gifts";
import { PageHeader } from "@/components/layout/PageHeader";
import { PersonalGiftClient } from "@/components/gifts/PersonalGiftClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const pack = await getGiftPackageBySlug(slug);
  if (!pack || pack.kind !== "personal") notFound();
  return {
    title: pack.name,
    description: pack.shortDescription,
    alternates: { canonical: `/gifts/personal/${slug}` },
    openGraph: { title: pack.name, description: pack.shortDescription, url: `/gifts/personal/${slug}`, images: [{ url: pack.image }] },
  };
}

export default async function PersonalGiftDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pack = await getGiftPackageBySlug(slug);
  if (!pack || pack.kind !== "personal") notFound();

  return (
    <>
      <PageHeader
        compact
        title={pack.name}
        desc={pack.shortDescription}
        crumbs={[
          { label: "خانه", href: "/" },
          { label: "هدایا", href: "/gifts" },
          { label: "هدایای شخصی", href: "/gifts/personal" },
          { label: pack.name, href: `/gifts/personal/${pack.slug}` },
        ]}
      />
      <PersonalGiftClient pack={pack} />
    </>
  );
}
