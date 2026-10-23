import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * HELSA — OpenNext (Cloudflare) configuration.
 *
 * پیش‌فرضِ ساده و مطمئن: بدون سرویس اضافه. صفحات ISR (خانه/محصول) بدون
 * کشِ خارجی هم درست کار می‌کنند (رندر در لحظه + Cache-Control).
 *
 * فعال‌سازی اختیاری کش ISR روی R2 (بعد از ساخت bucket و binding
 * NEXT_INC_CACHE_R2 در wrangler.jsonc):
 *
 *   import { defineCloudflareConfig, R2IncrementalCache } from "@opennextjs/cloudflare";
 *   export default defineCloudflareConfig({
 *     incrementalCache: new R2IncrementalCache(),
 *   });
 */
export default defineCloudflareConfig();
