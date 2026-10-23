/*
 * HELSA IRANIAN — service worker
 *
 * Caching policy (privacy-first):
 *  - PRECACHE: the offline fallback + brand icons only.
 *  - Static build assets (/_next/static, /icons, /images): cache-first (immutable).
 *  - Navigations: network-first with an offline fallback page.
 *  - NEVER cached: /api/*, anything with an Authorization header, non-GET requests,
 *    account/checkout/payment routes — these may contain personal or payment data.
 */
const VERSION = "helsa-v3";
const PRECACHE = `${VERSION}-precache`;
const RUNTIME = `${VERSION}-runtime`;
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [
  OFFLINE_URL,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

/** Paths that must never be stored in any cache. */
const NEVER_CACHE = [
  "/api/",
  "/account",
  "/admin",
  "/checkout",
  "/payment",
  "/login",
  "/register",
  "/forgot-password",
  "/verify",
  "/track",
  "/wishlist",
];

function isNeverCached(pathname) {
  return NEVER_CACHE.some((p) => pathname === p || pathname.startsWith(p));
}

function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/fonts/") ||
    pathname === "/icon.svg"
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// allow the page to trigger an immediate update
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // let third-party requests pass through
  if (isNeverCached(url.pathname)) return; // never intercept sensitive routes
  if (request.headers.has("Authorization")) return;

  // static build output — cache first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(RUNTIME).then((cache) => cache.put(request, copy)).catch(() => undefined);
            }
            return response;
          }),
      ),
    );
    return;
  }

  // page navigations — network first, fall back to cache, then offline page
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(RUNTIME).then((cache) => cache.put(request, copy)).catch(() => undefined);
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) ?? (await caches.match(OFFLINE_URL)) ?? Response.error()),
    );
  }
});
