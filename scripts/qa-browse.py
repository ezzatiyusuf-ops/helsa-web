#!/usr/bin/env python3
"""
HELSA QA — PART A step 4 (+ PART E input): full-store browse crawl.
Visits every public route, verifies: HTTP 200, RTL direction, viewport meta,
title + meta description, every <img>/og:image asset resolves, every internal
link resolves. Reports per-page timing (performance input).
"""
import re
import sys
import urllib.request
import urllib.error

BASE = "http://localhost:3000"

STATIC_ROUTES = [
    "/", "/about", "/blog", "/campaigns", "/cart", "/checkout", "/compare", "/contact",
    "/experience", "/faq", "/gifts", "/gifts/corporate", "/gifts/corporate/inquiry",
    "/gifts/personal", "/forgot-password", "/login", "/mazeh", "/mazeh-trays",
    "/mazeh-trays/build", "/mehmani", "/offers", "/offline", "/privacy", "/products",
    "/refund", "/register", "/shipping", "/terms", "/track", "/verify",
    "/wholesale", "/wholesale/register", "/wholesale/dashboard", "/wishlist",
]


def get(url, method="GET"):
    r = urllib.request.Request(url, method=method)
    try:
        with urllib.request.urlopen(r, timeout=30) as res:
            return res.status, res.read().decode("utf-8", "ignore"), res.headers.get("Content-Type", "")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "ignore"), e.headers.get("Content-Type", "")
    except Exception as ex:
        return 0, str(ex), ""


def slug_list(api, key):
    try:
        import json
        s, body, _ = get(BASE + api)
        d = json.loads(body)
        return [x["slug"] for x in (d.get(key) or [])][:4]
    except Exception:
        return []


def main():
    pages = list(STATIC_ROUTES)
    pages += [f"/products/{s}" for s in slug_list("/api/products?limit=8", "products")]
    pages += [f"/mazeh-trays/{s}" for s in slug_list("/api/trays", "trays")]
    pages += [f"/gifts/personal/{s}" for s in slug_list("/api/gifts?type=personal", "gifts")]
    pages += [f"/gifts/corporate/{s}" for s in slug_list("/api/gifts?type=corporate", "gifts")]
    # blog slugs from the blog index
    s, body, _ = get(BASE + "/blog")
    pages += [f"/blog/{m}" for m in dict.fromkeys(re.findall(r'href="/blog/([^"#?]+)"', body))]

    issues = []
    all_links, all_assets = set(), set()
    print(f"خزیدن روی {len(pages)} صفحه…\n")

    for page in sorted(set(pages)):
        s, body, ct = get(BASE + page)
        ms = get(BASE + page)  # second hit = warm timing
        if s != 200:
            issues.append(f"❌ {page} → HTTP {s}")
            continue
        if "text/html" not in ct:
            issues.append(f"❌ {page} → not HTML ({ct})")
            continue
        if 'dir="rtl"' not in body and "dir:rtl" not in body:
            issues.append(f"❌ {page} → dir=rtl غایب")
        if 'name="viewport"' not in body:
            issues.append(f"❌ {page} → meta viewport غایب")
        if "<title>" not in body or "</title>" in body and body.count("<title>") == 0:
            issues.append(f"❌ {page} → title غایب")
        if 'name="description"' not in body:
            issues.append(f"page-note {page} → meta description غایب")
        # collect assets + links
        for src in re.findall(r'(?:src|href|content)="(/(?:images|icons|favicon)[^"]*)"', body):
            all_assets.add(src)
        for m in re.findall(r'href="(/[^"#:]*?)(?:\?[^"]*)?"', body):
            if not re.search(r"\.(css|js|png|jpg|webp|avif|svg|ico|woff2?|xml|txt|mp4)$", m):
                all_links.add(m)

    # verify assets
    for a in sorted(all_assets):
        s, _, _ = get(BASE + a, method="HEAD")
        if s not in (200, 301, 308):
            issues.append(f"❌ asset {a} → HTTP {s}")

    # verify internal links (sample of unique non-page targets too)
    for l in sorted(all_links):
        s, _, ct = get(BASE + l)
        if s != 200:
            issues.append(f"❌ لینک {l} → HTTP {s}")

    if issues:
        print("\n".join(issues))
    else:
        print("هیچ مشكلی در خزش یافت نشد ✅")

    # timing table (PART E input)
    print("\n── زمان بارگذاری (دومین درخواست/گرم) ──")
    import time
    for page in ["/", "/products", "/products/mazafati-dates", "/mazeh-trays", "/mazeh-trays/build",
                 "/gifts/corporate", "/blog", "/checkout", "/cart", "/login", "/track", "/wholesale"]:
        best = 99
        for _ in range(3):
            t0 = time.time()
            get(BASE + page)
            best = min(best, time.time() - t0)
        print(f"  {page:32s} {best*1000:7.1f} ms")

    return 1 if any(i.startswith("❌") for i in issues) else 0


if __name__ == "__main__":
    sys.exit(main())
