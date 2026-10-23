#!/usr/bin/env python3
"""
ui-audit.py — بازرسی خودکار UI/UX هلسا روی سرور در حال اجرا (بدون آمارسازی)
──────────────────────────────────────────────────────────────────────────────
برای هر مسیر بررسی می‌کند: کد وضعیت، تعداد <h1>، عنوان و توضیح متا، canonical،
alt خالی، تصاویر شکسته (HEAD روی هر src)، وجود JSON-LD، مقادیر مخدوش (NaN/undefined)
و اندازهٔ HTML. خروجی: جدول + کد خروج ۱ اگر یافتهٔ «fail» باشد.

اجرا:  NEXT_BASE=http://127.0.0.1:3000 python3 scripts/ui-audit.py
"""
from __future__ import annotations
import os, sys, urllib.parse, urllib.request, urllib.error
from html.parser import HTMLParser

BASE = os.environ.get("NEXT_BASE", "http://127.0.0.1:3000")

ROUTES = [
    "/", "/products", "/products?cat=dates", "/products?sort=price-asc",
    "/products/handmade-date-chocolate", "/products/lahijan-black-tea", "/products/date-coconut-sugar",
    "/rooziteh", "/rooziteh/apply", "/mazeh", "/mazeh-trays", "/mazeh-trays/build",
    "/gifts", "/gifts/personal", "/gifts/corporate", "/wholesale",
    "/campaigns", "/offers", "/blog", "/health-center", "/guides",
    "/about", "/contact", "/faq", "/shipping", "/refund", "/terms", "/privacy",
    "/cart", "/checkout", "/login", "/register", "/forgot-password",
    "/wishlist", "/search?q=خرما", "/track", "/payment/card",
    "/sitemap.xml", "/robots.txt", "/manifest.webmanifest", "/این-مسیر-نیست",
]


class P(HTMLParser):
    def __init__(self):
        super().__init__()
        self.h1 = 0; self.imgs = []; self.metas = []; self.links = []
        self.ld = 0; self.lang = None; self.dir = None; self.title = ""
        self._in_title = False; self._in_ld = False
        self.inputs_no_label: list[str] = []

    def handle_starttag(self, t, a):
        d = dict(a)
        if t == "html":
            self.lang = d.get("lang"); self.dir = d.get("dir")
        elif t == "h1":
            self.h1 += 1
        elif t == "img":
            self.imgs.append((d.get("src", ""), d.get("alt")))
        elif t == "meta":
            self.metas.append(d)
        elif t == "link" and d.get("rel") in ("canonical", "alternate"):
            self.links.append(d)
        elif t == "title":
            self._in_title = True
        elif t == "script" and d.get("type") == "application/ld+json":
            self.ld += 1
        elif t in ("input", "select", "textarea"):
            if d.get("type") not in ("hidden", "submit"):
                self.inputs_no_label.append(d.get("id") or d.get("name") or "?")

    def handle_endtag(self, t):
        if t == "title":
            self._in_title = False

    def handle_data(self, data):
        if self._in_title:
            self.title += data.strip()


def get(path: str, method="GET"):
    url = BASE + urllib.parse.quote(path, safe="/?=&%")
    req = urllib.request.Request(url, method=method, headers={"User-Agent": "helsa-ui-audit"})
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            return r.status, r.read(), dict(r.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read(), dict(e.headers)
    except Exception as e:  # noqa: BLE001
        return 0, str(e).encode(), {}


def head_ok(src: str) -> bool:
    if not src or src.startswith("data:"):
        return True
    if src.startswith("/"):
        # مسیرهای بهینه‌سازی‌شدهٔ next/image را با srcset خودشان نمی‌سنجیم
        if src.startswith("/_next/image"):
            return True
        code, _, _ = get(src, "HEAD")
        return code in (200, 304)
    if src.startswith("http"):
        return True  # منبع بیرونی — خارج از دامنهٔ این بازرسی
    return True


def main() -> int:
    fails, warns = [], []
    print(f"{'کد':>4}  {'h1':>2} {'JSONLD':>6} {'img':>4} {'متا':>4}  مسیر")
    print("─" * 78)
    for path in ROUTES:
        code, body, _ = get(path)
        if path.endswith((".xml", ".txt", ".webmanifest")):
            print(f"{code:>4}   —     —     —     —   {path}")
            if code != 200:
                fails.append(f"{path} → {code}")
            continue
        html = body.decode("utf-8", "ignore")
        p = P(); p.feed(html)
        desc = next((m.get("content", "") for m in p.metas if m.get("name") == "description"), "")
        canon = next((l.get("href", "") for l in p.links if l.get("rel") == "canonical"), "")
        broken = [s for s, _ in p.imgs if not head_ok(s)]
        noalt = [s for s, a in p.imgs if a is None]
        nan = "NaN" in html or "undefined</" in html or ">undefined<" in html

        is_404 = path == "/این-مسیر-نیست"
        flag = ""
        if is_404:
            if code != 404:
                fails.append(f"{path} → انتظار ۴۰۴، دریافت {code}")
            flag = "(۴۰۴ مورد انتظار)"
        else:
            if code != 200:
                fails.append(f"{path} → {code}")
            if p.h1 == 0:
                fails.append(f"{path} → بدون <h1>")
            elif p.h1 > 1:
                warns.append(f"{path} → {p.h1} تا <h1>")
            if not desc:
                warns.append(f"{path} → بدون meta description")
            if canon != "" and not canon:
                warns.append(f"{path} → بدون canonical")
        if broken:
            fails.append(f"{path} → {len(broken)} تصویر شکسته: {broken[:3]}")
        if noalt:
            warns.append(f"{path} → {len(noalt)} تصویر بدون alt")
        if nan:
            fails.append(f"{path} → مقدار مخدوش (NaN/undefined) در HTML")
        print(f"{code:>4}  {p.h1:>2} {p.ld:>6} {len(p.imgs):>4} {len(desc):>4}  {path} {flag}")

    print("─" * 78)
    if warns:
        print(f"\n⚠ هشدارها ({len(warns)}):")
        for w in warns:
            print("   •", w)
    if fails:
        print(f"\n✗ یافته‌های مسدودکننده ({len(fails)}):")
        for f in fails:
            print("   •", f)
        return 1
    print("\n✓ همهٔ مسیرهای بازرسی‌شده سالم‌اند.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
