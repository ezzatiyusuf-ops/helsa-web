/**
 * ⚠️ فایل AUTO-GENERATED — ویرایش دستی نکنید.
 * منبع: دیتابیس (پست‌ها/استوری‌های منتخب فعال اینستاگرام) — بازتولید: npm run catalog:export
 * نقش: دیتای آفلاین سکشن اینستاگرام صفحهٔ اصلی وقتی DB در دسترس نیست.
 * محتوا همان رکوردهای واقعیِ منتخب است — هیچ دادهٔ جعلی (لایک/کامنت ساختگی) تولید نمی‌شود.
 */
export interface OfflineInstagramPost {
  id: number; imageUrl: string; caption: string; permalink: string | null; productSlug: string | null;
  likes: number | null; comments: number | null; postedAt: string;
}
export interface OfflineInstagramStory {
  id: number; imageUrl: string; title: string | null; permalink: string | null; productSlug: string | null; postedAt: string;
}

export const FALLBACK_INSTAGRAM_POSTS: OfflineInstagramPost[] = [];

export const FALLBACK_INSTAGRAM_STORIES: OfflineInstagramStory[] = [];
