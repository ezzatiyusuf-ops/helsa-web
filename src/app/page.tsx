import { getCategories, getProducts } from "@/services/catalog";
import type { Metadata } from "next";
import { HomepageLite } from "@/components/home/HomepageLite";
import { InstagramSection } from "@/components/home/InstagramSection";
import { PodcastSection } from "@/components/home/PodcastSection";
import { RoozitehSection } from "@/components/home/RoozitehSection";

export const revalidate = 60;

export const metadata: Metadata = { alternates: { canonical: "/" } }; // خودارجاع — صفحهٔ اصلی
 // ISR — تازگی لیست/قیمت‌ها حداکثر با ۶۰ ثانیه تأخیر، بدون بار DB در هر بازدید

export default async function HomePage() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  return (
    <>
      <HomepageLite products={products} categories={categories} />
      <RoozitehSection />
      <PodcastSection />
      <InstagramSection />
    </>
  );
}
