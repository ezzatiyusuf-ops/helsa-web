/**
 * HELSA — Instagram feed service.
 * دو منبع صادقانه:
 *  1) LIVE: Instagram Graph API — اعتبارنامه از جدول site_settings (پنل ادمین،
 *     بدون ری‌استارت) با پشتیبان env. پست‌ها از edge «media» و استوری‌های
 *     فعال ۲۴ ساعته از edge «stories» خوانده می‌شوند.
 *  2) CURATED: پست‌ها/استوری‌های منتخبِ مدیریت‌شده از پنل ادمین (جدول instagram_posts).
 *  هیچ‌گاه دادهٔ جعلی (لایک/کامنت ساختگی) تولید نمی‌شود؛ در خطا fallback صادقانه.
 */
import { asc, desc, eq, and } from "drizzle-orm";
import { db, isDatabaseConfigured } from "@/db";
import { FALLBACK_INSTAGRAM_POSTS, FALLBACK_INSTAGRAM_STORIES } from "@/data/instagram";
import { instagramPosts, siteSettings } from "@/db/schema";

const GRAPH = "https://graph.instagram.com/v23.0";
const CRED_TTL = 60_000; // اعتبارنامهٔ DB تا ۶۰ ثانیه کش می‌شود
const FEED_TTL = 30 * 60_000; // پست‌های زنده ۳۰ دقیقه
const STORIES_TTL = 5 * 60_000; // استوری‌های زنده ۵ دقیقه (فقط ۲۴ ساعت فعال‌اند)

export interface InstagramPost {
  id: number;
  imageUrl: string;
  caption: string;
  permalink: string | null;
  productSlug: string | null;
  likes: number | null;
  comments: number | null;
  postedAt: string;
}

export interface InstagramStory {
  id: number;
  imageUrl: string;
  title: string | null;
  permalink: string | null;
  productSlug: string | null;
  postedAt: string;
}

export type FeedSource = "live" | "curated";

/* ————————————— اعتبارنامهٔ زمان-اجرا (DB → env) ————————————— */

type Creds = { token: string; userId: string; source: "db" | "env" } | null;

let credsCache: { ts: number; creds: Creds } | null = null;

export async function loadInstagramCredentials(force = false): Promise<Creds> {
  if (!force && credsCache && Date.now() - credsCache.ts < CRED_TTL) return credsCache.creds;
  let creds: Creds = null;
  if (isDatabaseConfigured) {
    try {
      const rows = await db
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.key, "instagram_access_token"));
      const token = rows[0]?.value?.trim();
      if (token) {
        const uid = await db
          .select()
          .from(siteSettings)
          .where(eq(siteSettings.key, "instagram_user_id"));
        const userId = uid[0]?.value?.trim();
        if (userId) creds = { token, userId, source: "db" };
      }
    } catch {
      /* جدول هنوز ساخته نشده — env را امتحان کن */
    }
  }
  if (!creds && process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_USER_ID) {
    creds = {
      token: process.env.INSTAGRAM_ACCESS_TOKEN,
      userId: process.env.INSTAGRAM_USER_ID,
      source: "env",
    };
  }
  credsCache = { ts: Date.now(), creds };
  return creds;
}

export async function saveInstagramCredentials(token: string, userId: string): Promise<void> {
  await db
    .insert(siteSettings)
    .values({ key: "instagram_access_token", value: token })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: token, updatedAt: new Date() },
    });
  await db
    .insert(siteSettings)
    .values({ key: "instagram_user_id", value: userId })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: userId, updatedAt: new Date() },
    });
  resetInstagramCaches();
}

export async function removeInstagramCredentials(): Promise<void> {
  await db.delete(siteSettings).where(eq(siteSettings.key, "instagram_access_token"));
  await db.delete(siteSettings).where(eq(siteSettings.key, "instagram_user_id"));
  resetInstagramCaches();
}

export function maskToken(token: string): string {
  if (token.length <= 12) return "xxxxxx";
  return `xxxxxx…${token.slice(-4)}`;
}

export async function getInstagramCredentialsMasked(): Promise<{
  configured: boolean;
  tokenMasked: string | null;
  userId: string | null;
  source: "db" | "env" | null;
}> {
  const c = await loadInstagramCredentials();
  if (!c) return { configured: false, tokenMasked: null, userId: null, source: null };
  return { configured: true, tokenMasked: maskToken(c.token), userId: c.userId, source: c.source };
}

export function resetInstagramCaches(): void {
  credsCache = null;
  liveFeedCache = null;
  liveStoriesCache = null;
}

export async function instagramLiveEnabled(): Promise<boolean> {
  return Boolean(await loadInstagramCredentials());
}

/** تست واقعی اتصال به Instagram Graph API (بدون ذخیره‌سازی). */
export async function testInstagramConnection(
  token?: string,
  userId?: string,
): Promise<{ ok: boolean; username?: string; mediaCount?: number; userId?: string; error?: string }> {
  const creds = await loadInstagramCredentials();
  const t = token ?? creds?.token;
  const u = userId ?? creds?.userId;
  if (!t || !u) return { ok: false, error: "توکن یا User ID تنظیم نشده است" };
  try {
    const res = await fetch(
      `${GRAPH}/${u}?fields=user_id,username,media_count&access_token=${encodeURIComponent(t)}`,
      { cache: "no-store", signal: AbortSignal.timeout(10_000) },
    );
    const data = (await res.json().catch(() => null)) as
      | { user_id?: string; username?: string; media_count?: number; error?: { message?: string } }
      | null;
    if (!res.ok || !data?.user_id) {
      return { ok: false, error: data?.error?.message ?? `پاسخ درگاه: HTTP ${res.status}` };
    }
    return {
      ok: true,
      username: data.username,
      mediaCount: data.media_count,
      userId: data.user_id,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "خطای ناشناخته در اتصال" };
  }
}

/* ————————————— LIVE: Instagram Graph API ————————————— */

async function graphGet<T>(path: string, creds: NonNullable<Creds>): Promise<T | null> {
  try {
    const res = await fetch(`${GRAPH}/${path}${path.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(creds.token)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

let liveFeedCache: { ts: number; posts: InstagramPost[] } | null = null;
let liveStoriesCache: { ts: number; stories: InstagramStory[] } | null = null;

async function fetchLivePosts(creds: NonNullable<Creds>): Promise<InstagramPost[]> {
  if (liveFeedCache && Date.now() - liveFeedCache.ts < FEED_TTL) return liveFeedCache.posts;
  type Media = {
    id: string;
    caption?: string;
    media_type: string;
    media_url?: string;
    thumbnail_url?: string;
    permalink?: string;
    timestamp?: string;
    like_count?: number;
    comments_count?: number;
  };
  const data = await graphGet<{ data?: Media[] }>(
    `${creds.userId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=48`,
    creds,
  );
  const posts = (data?.data ?? [])
    .filter((m) => m.media_type === "IMAGE" || m.media_type === "CAROUSEL_ALBUM" || m.media_type === "VIDEO")
    .map((m) => ({
      id: Number(m.id) || 0,
      imageUrl: m.media_type === "VIDEO" ? m.thumbnail_url ?? m.media_url ?? "" : m.media_url ?? "",
      caption: m.caption ?? "",
      permalink: m.permalink ?? null,
      productSlug: null,
      likes: typeof m.like_count === "number" ? m.like_count : null,
      comments: typeof m.comments_count === "number" ? m.comments_count : null,
      postedAt: m.timestamp ?? new Date().toISOString(),
    }))
    .filter((p) => p.imageUrl);
  liveFeedCache = { ts: Date.now(), posts };
  return posts;
}

async function fetchLiveStories(creds: NonNullable<Creds>): Promise<InstagramStory[]> {
  if (liveStoriesCache && Date.now() - liveStoriesCache.ts < STORIES_TTL) return liveStoriesCache.stories;
  type Story = {
    id: string;
    media_type: string;
    media_url?: string;
    thumbnail_url?: string;
    permalink?: string;
    timestamp?: string;
  };
  const data = await graphGet<{ data?: Story[] }>(
    `${creds.userId}/stories?fields=id,media_type,media_url,thumbnail_url,permalink,timestamp`,
    creds,
  );
  const stories = (data?.data ?? [])
    .map((s) => ({
      id: Number(s.id) || 0,
      imageUrl: s.media_type === "VIDEO" ? s.thumbnail_url ?? s.media_url ?? "" : s.media_url ?? "",
      title: null,
      permalink: s.permalink ?? null,
      productSlug: null,
      postedAt: s.timestamp ?? new Date().toISOString(),
    }))
    .filter((s) => s.imageUrl);
  liveStoriesCache = { ts: Date.now(), stories };
  return stories;
}

/* ————————————— CURATED: پنل ادمین ————————————— */

async function getCuratedPosts(limit: number): Promise<InstagramPost[]> {
  // §دیتای آفلاین: بدون DB هم پست‌های واقعیِ منتخب (export‌شده از همین DB) نمایش داده می‌شوند
  if (!isDatabaseConfigured) return FALLBACK_INSTAGRAM_POSTS.slice(0, limit).map((p) => ({ ...p }));
  try {
    const rows = await db
      .select()
      .from(instagramPosts)
      .where(and(eq(instagramPosts.isActive, true), eq(instagramPosts.kind, "post")))
      .orderBy(asc(instagramPosts.sortOrder), desc(instagramPosts.postedAt))
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      imageUrl: r.imageUrl,
      caption: r.caption,
      permalink: r.permalink,
      productSlug: r.productSlug,
      likes: r.likes,
      comments: r.comments,
      postedAt: r.postedAt.toISOString(),
    }));
  } catch {
    // DB در دسترس نیست (مثلاً بیلد بدون دیتابیس یا قطعی موقت) — fallback آفلاین
    return FALLBACK_INSTAGRAM_POSTS.slice(0, limit).map((p) => ({ ...p }));
  }
}

async function getCuratedStories(): Promise<InstagramStory[]> {
  // §دیتای آفلاین: بدون DB هم استوری‌های واقعیِ منتخب نمایش داده می‌شوند
  if (!isDatabaseConfigured) return FALLBACK_INSTAGRAM_STORIES.map((st) => ({ ...st }));
  try {
    const rows = await db
      .select()
      .from(instagramPosts)
      .where(and(eq(instagramPosts.isActive, true), eq(instagramPosts.kind, "story")))
      .orderBy(asc(instagramPosts.sortOrder), desc(instagramPosts.postedAt))
      .limit(24);
    return rows.map((r) => ({
      id: r.id,
      imageUrl: r.imageUrl,
      title: r.title,
      permalink: r.permalink,
      productSlug: r.productSlug,
      postedAt: r.postedAt.toISOString(),
    }));
  } catch {
    // DB در دسترس نیست — fallback آفلاین
    return FALLBACK_INSTAGRAM_STORIES.map((st) => ({ ...st }));
  }
}

/* ————————————— API عمومی ————————————— */

export async function getInstagramFeed(
  limit = 8,
): Promise<{ source: FeedSource; posts: InstagramPost[] }> {
  const creds = await loadInstagramCredentials();
  if (creds) {
    const live = await fetchLivePosts(creds);
    if (live.length) return { source: "live", posts: live.slice(0, limit) };
    // توکن هست ولی درگاه پاسخ نداد → fallback صادقانه به منتخب‌ها
  }
  return { source: "curated", posts: await getCuratedPosts(limit) };
}

export async function getInstagramStories(): Promise<{ source: FeedSource; stories: InstagramStory[] }> {
  const creds = await loadInstagramCredentials();
  if (creds) {
    const live = await fetchLiveStories(creds);
    if (live.length) return { source: "live", stories: live };
  }
  return { source: "curated", stories: await getCuratedStories() };
}

/* ————————————— CRUD پنل ادمین ————————————— */

export interface InstagramPostInput {
  imageUrl: string;
  caption: string;
  kind?: "post" | "story";
  title?: string | null;
  permalink?: string | null;
  productSlug?: string | null;
  likes?: number | null;
  comments?: number | null;
  sortOrder?: number;
  isActive?: boolean;
}

export async function listInstagramPostsAdmin() {
  if (!isDatabaseConfigured) return [];
  const rows = await db
    .select()
    .from(instagramPosts)
    .orderBy(asc(instagramPosts.kind), asc(instagramPosts.sortOrder), desc(instagramPosts.postedAt));
  return rows.map((r) => ({
    id: r.id,
    imageUrl: r.imageUrl,
    caption: r.caption,
    kind: r.kind,
    title: r.title,
    permalink: r.permalink,
    productSlug: r.productSlug,
    likes: r.likes,
    comments: r.comments,
    sortOrder: r.sortOrder,
    isActive: r.isActive,
    postedAt: r.postedAt.toISOString(),
  }));
}

export async function createInstagramPost(input: InstagramPostInput) {
  const [row] = await db
    .insert(instagramPosts)
    .values({
      imageUrl: input.imageUrl,
      caption: input.caption,
      kind: input.kind ?? "post",
      title: input.title ?? null,
      permalink: input.permalink ?? null,
      productSlug: input.productSlug ?? null,
      likes: input.likes ?? null,
      comments: input.comments ?? null,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
    })
    .returning();
  return row;
}

export async function updateInstagramPost(id: number, patch: Partial<InstagramPostInput>) {
  const [row] = await db
    .update(instagramPosts)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(instagramPosts.id, id))
    .returning();
  return row ?? null;
}

export async function deleteInstagramPost(id: number) {
  const rows = await db.delete(instagramPosts).where(eq(instagramPosts.id, id)).returning({ id: instagramPosts.id });
  return rows.length > 0;
}
