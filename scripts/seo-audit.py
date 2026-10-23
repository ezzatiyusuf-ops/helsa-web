#!/usr/bin/env python3
"""
seo-audit.py — ممیزی واقعی SEO/متادیتا (فاز ۹)
─────────────────────────────────────────────────────────────────────────────
برای هر مسیر، HTML واقعی سرور را می‌خواند و می‌سنجد:
  · title / description: وجود، طول، و یکتا بودن بین مسیرها
  · canonical مطلق (برای صفحات ایندکس‌پذیر)
  · Open Graph + Twitter card
  · robots meta روی مسیرهای خصوصی = noindex
  · دقیقاً یک <h1> · lang/dir روی <html>
  · JSON-LD: قابل تجزیه و دارای @context/@type
  · تصاویر بدون alt
  · sitemap (ریشه + نقشه‌های فرزند) · robots.txt
اجرا: python3 scripts/seo-audit.py [baseUrl]
"""
from __future__ import annotations

import json
import re
import sys
import urllib.parse
import urllib.request
from html.parser import HTMLParser

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:3000"

PUBLIC = [
    "/", "/products", "/mazeh", "/mazeh-trays", "/mehmani", "/rooziteh", "/offers",
    "/campaigns", "/gifts", "/gifts/corporate", "/gifts/personal", "/blog", "/guides",
    "/about", "/founder", "/contact", "/faq", "/shipping", "/refund", "/terms", "/privacy",
    "/wholesale", "/health-center", "/podcast", "/videocast", "/instagram", "/compare",
    "/products/mazafati-dates", "/blog/persian-healthy-lifestyle", "/guides/herbal-teas",
]
PRIVATE = ["/cart", "/checkout", "/login", "/register", "/forgot-password", "/account", "/wishlist", "/search", "/track"]


class Head(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title = ""
        self.meta: dict[str, str] = {}
        self.links: dict[str, str] = {}
        self.html_attrs: dict[str, str] = {}
        self.h1 = 0
        self.imgs_no_alt = 0
        self.imgs = 0
        self.jsonld: list[str] = []
        self._in_title = False
        self._in_ld = False
        self._ld_buf: list[str] = []

    def handle_starttag(self, tag, attrs):
        a = {k.lower(): (v or "") for k, v in attrs}
        if tag == "html":
            self.html_attrs = a
        elif tag == "title":
            self._in_title = True
        elif tag == "meta":
            if a.get("name"):
                self.meta[a["name"].lower()] = a.get("content", "")
            if a.get("property"):
                self.meta[a["property"].lower()] = a.get("content", "")
        elif tag == "link":
            self.links[a.get("rel", "").lower()] = a.get("href", "")
        elif tag == "h1":
            self.h1 += 1
        elif tag == "img":
            self.imgs += 1
            if "alt" not in a:
                self.imgs_no_alt += 1
        elif tag == "script" and a.get("type") == "application/ld+json":
            self._in_ld = True
            self._ld_buf = []

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False
        elif tag == "script" and self._in_ld:
            self._in_ld = False
            self.jsonld.append("".join(self._ld_buf))

    def handle_data(self, data):
        if self._in_title:
            self.title += data
        if self._in_ld:
            self._ld_buf.append(data)


def get(path: str) -> tuple[int, str]:
    url = BASE + urllib.parse.quote(path, safe="/?=&%")
    req = urllib.request.Request(url, headers={"User-Agent": "helsa-seo-audit"})
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")
    except Exception as e:  # noqa: BLE001
        return 0, f"__ERR__ {e}"


def parse(html: str) -> Head:
    p = Head()
    p.feed(html)
    return p


def strip_tags(s: str) -> str:
    return re.sub(r"<[^>]+>", "", s).strip()


def main() -> int:
    fails: list[str] = []
    warns: list[str] = []
    oks: list[str] = []
    titles: dict[str, list[str]] = {}
    descs: dict[str, list[str]] = {}
    sitemap_urls: set[str] = set()

    # نقشهٔ سایت: ریشه + نقشه‌های فرزند (products/blog/guides/gifts/mazeh-trays)
    st, xml = get("/sitemap.xml")
    if st == 200:
        locs = re.findall(r"<loc>([^<]+)</loc>", xml)
        child = [u for u in locs if u.endswith(".xml")]
        page_locs = [u for u in locs if not u.endswith(".xml")]
        for cu in child:
            path = "/" + cu.split("//", 1)[-1].split("/", 1)[-1] if "//" in cu else cu
            cst, cxml = get(path)
            if cst == 200:
                page_locs += [u for u in re.findall(r"<loc>([^<]+)</loc>", cxml) if not u.endswith(".xml")]
            else:
                warns.append(f"نقشهٔ سایت فرزند {path} پاسخ {cst}")
        sitemap_urls = {"/" + u.split("//", 1)[-1].split("/", 1)[-1] for u in page_locs if "//" in u}
        oks.append(f"sitemap: {len(sitemap_urls)} آدرس در {1 + len(child)} نقشه")
    else:
        fails.append(f"sitemap.xml پاسخ {st}")

    st, robots = get("/robots.txt")
    if st == 200:
        if "Sitemap:" not in robots:
            fails.append("robots.txt خط Sitemap ندارد")
        for p in ("/account", "/admin", "/api"):
            if not re.search(rf"Disallow:\s*{re.escape(p)}", robots):
                warns.append(f"robots.txt مسیر {p} را نمی‌بندد")
        m = re.search(r"Sitemap:\s*(\S+)", robots)
        if m:
            if "localhost" in m.group(1) or "127.0.0.1" in m.group(1):
                warns.append(f"robots.txt دامنهٔ واقعی ندارد: {m.group(1)}")
            oks.append(f"robots.txt Sitemap → {m.group(1)}")

    for path in PUBLIC + PRIVATE:
        code, html = get(path)
        if code != 200:
            fails.append(f"{path}: پاسخ {code}")
            continue
        h = parse(html)
        title = strip_tags(h.title)
        desc = h.meta.get("description", "")
        robots_meta = h.meta.get("robots", "").lower()

        if not title:
            fails.append(f"{path}: بدون <title>")
        elif not (15 <= len(title) <= 70):
            warns.append(f"{path}: طول title {len(title)} («{title[:40]}…»)")
        titles.setdefault(title, []).append(path)

        if not desc:
            fails.append(f"{path}: بدون meta description")
        elif not (50 <= len(desc) <= 175):
            warns.append(f"{path}: طول description {len(desc)}")
        else:
            descs.setdefault(desc, []).append(path)

        if path in PRIVATE:
            if "noindex" not in robots_meta:
                fails.append(f"{path} (خصوصی): robots meta بدون noindex → صفحهٔ حساس ایندکس‌پذیر")
        elif "noindex" in robots_meta:
            warns.append(f"{path}: noindex روی صفحهٔ عمومی")

        canon = h.links.get("canonical", "")
        if not canon and path in PRIVATE and "noindex" in robots_meta:
            pass  # صفحهٔ خصوصیِ noindex عمداً بدون canonical است (سیگنال متناقض نمی‌دهیم)
        elif not canon:
            fails.append(f"{path}: بدون canonical")
        elif not canon.startswith("http"):
            fails.append(f"{path}: canonical نسبی ({canon})")

        og_img = h.meta.get("og:image", "")
        for key in ("og:title", "og:description", "og:type"):
            if not h.meta.get(key):
                warns.append(f"{path}: {key} ندارد")
        if not og_img:
            warns.append(f"{path}: og:image ندارد")
        elif not og_img.startswith("http"):
            fails.append(f"{path}: og:image نسبی ({og_img})")
        if not h.meta.get("twitter:card"):
            warns.append(f"{path}: twitter:card ندارد")

        if h.h1 != 1:
            fails.append(f"{path}: تعداد <h1> = {h.h1} (باید دقیقاً ۱ باشد)")
        if h.imgs_no_alt:
            fails.append(f"{path}: {h.imgs_no_alt} تصویر بدون alt")
        if not h.html_attrs.get("lang"):
            fails.append(f"{path}: <html lang> ندارد")
        if h.html_attrs.get("dir") != "rtl":
            fails.append(f"{path}: <html dir> باید rtl باشد")

        for i, raw in enumerate(h.jsonld):
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                fails.append(f"{path}: JSON-LD شمارهٔ {i + 1} قابل تجزیه نیست")
                continue
            items = data if isinstance(data, list) else [data]
            for it in items:
                if not isinstance(it, dict):
                    continue
                if "@context" not in it:
                    fails.append(f"{path}: JSON-LD بدون @context")
                if "@type" not in it and "@graph" not in it:
                    fails.append(f"{path}: JSON-LD بدون @type")

        if (
            path in PUBLIC
            and path not in sitemap_urls
            and not path.startswith(("/products/", "/blog/", "/guides/"))
        ):
            warns.append(f"{path}: در sitemap نیست")

    for title, paths in titles.items():
        if len(paths) > 1:
            warns.append(f"title تکراری «{title[:34]}…» در {len(paths)} مسیر: {', '.join(paths[:4])}")
    for paths in descs.values():
        if len(paths) > 1:
            warns.append(f"description تکراری در {len(paths)} مسیر: {', '.join(paths[:4])}")

    print("── سالم ──")
    for o in oks:
        print("  ✓", o)
    if warns:
        print("\n── هشدار ──")
        for w in warns:
            print("  ▲", w)
    if fails:
        print("\n── ناموفق ──")
        for f in fails:
            print("  ✗", f)
    print(f"\nنتیجه: {len(oks)} سالم · {len(warns)} هشدار · {len(fails)} ناموفق")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
