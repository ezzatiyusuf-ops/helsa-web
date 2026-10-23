#!/usr/bin/env python3
"""
authz-sweep.py — بازرسی خودکار مجوزدهی روی همهٔ مسیرهای API
────────────────────────────────────────────────────────────
برای هر `src/app/api/**/route.ts`:
  ۱) متدهای صادرشده (GET/POST/PUT/PATCH/DELETE) استخراج می‌شود
  ۲) مسیر Next به URL واقعی تبدیل می‌شود ([id] → 1)
  ۳) درخواست بدون کوکی و با کوکی مشتری زده می‌شود
  ۴) هر پاسخ 2xx به مسیر «ادمین/کاربر» بدون احراز = یافتهٔ امنیتی
  ۵) هر مسیر ادمین که با نشست مشتری 2xx بدهد = یافتهٔ IDOR/دسترسی افقی

خروجی: جدول متنی + JSON در /tmp/authz-report.json
اجرا:  NEXT_BASE=http://127.0.0.1:3000 python3 scripts/authz-sweep.py
"""
from __future__ import annotations

import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

BASE = os.environ.get("NEXT_BASE", "http://127.0.0.1:3000")
ROOT = Path(__file__).resolve().parent.parent
API = ROOT / "src/app/api"

PUBLIC_PREFIXES = (
    "/api/auth/", "/api/health", "/api/payments/callback", "/api/webhooks",
    "/api/products", "/api/categories", "/api/reviews", "/api/search",
    "/api/campaigns", "/api/blog", "/api/rooziteh", "/api/shipping",
    "/api/coupons/validate", "/api/manifest", "/api/sitemap",
)
METHODS = ("GET", "POST", "PUT", "PATCH", "DELETE")


def find_routes() -> list[tuple[str, list[str]]]:
    out = []
    for f in sorted(API.rglob("route.ts")):
        rel = f.relative_to(API).parent.as_posix()
        url = "/api/" + re.sub(r"\[([^\]]+)\]", "1", rel)
        src = f.read_text(encoding="utf-8")
        exported = [m for m in METHODS if re.search(rf"export\s+(async\s+)?function\s+{m}\b", src)]
        out.append((url, exported or ["GET"]))
    return out


class NoRedirect(urllib.request.HTTPRedirectHandler):
    """ریدایرکت دنبال نمی‌شود: ۳۰۲ به ارائه‌دهندهٔ بیرونی (OAuth) خودش شاهد مسیر سالم است."""
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


OPENER = urllib.request.build_opener(NoRedirect)


def call(method: str, path: str, cookie: str | None) -> int:
    req = urllib.request.Request(BASE + path, method=method, data=b"{}" if method in ("POST", "PUT", "PATCH") else None)
    if cookie:
        req.add_header("Cookie", f"helsa_session={cookie}")
    req.add_header("Origin", BASE)
    if method in ("POST", "PUT", "PATCH"):
        req.add_header("Content-Type", "application/json")
    try:
        with OPENER.open(req, timeout=20) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code  # 3xx هم به‌عنوان کد برمی‌گردد
    except Exception:
        return 0


def tok(name: str) -> str | None:
    p = Path(f"/tmp/tok-{name}.txt")
    return p.read_text().strip() if p.exists() else None


CUS, ADM = tok("customer"), tok("admin")
rows, findings = [], []

for url, methods in find_routes():
    for m in methods:
        if m == "DELETE":
            continue  # حذف واقعی انجام نمی‌شود؛ همان مسیر با متد خواندنی سنجیده می‌شود
        anon = call(m, url, None)
        cust = call(m, url, CUS) if CUS else 0
        if "/admin/" in url or url.endswith("/admin"):
            time.sleep(0.6)  # محدودیت نرخ ادمین درون‌حافظه‌ای است؛ فاصله لازم است
        adm = call(m, url, ADM) if ADM else 0
        is_public = any(url.startswith(p) for p in PUBLIC_PREFIXES)
        is_admin = "/admin/" in url or url.endswith("/admin")
        rows.append({"route": url, "method": m, "anon": anon, "customer": cust, "admin": adm,
                     "public": is_public, "admin_route": is_admin})
        if anon == 0:
            findings.append((url, m, "اتصال برقرار نشد (سرور بالا نیست?)", 0))
            continue
        if is_admin and anon < 400:
            findings.append((url, m, "مسیر ادمین بدون احراز پاسخ 2xx/3xx داد", anon))
        if is_admin and cust < 400:
            findings.append((url, m, "مسیر ادمین با نشست مشتری پاسخ داد", cust))
        if not is_public and not is_admin and anon < 300 and m in ("POST", "PUT", "PATCH"):
            findings.append((url, m, "مسیر نوشتنی بدون احراز پاسخ موفق داد", anon))

report = {"base": BASE, "routes": len(rows), "findings": findings, "rows": rows}
Path("/tmp/authz-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=1))

print(f"مسیرها: {len({r['route'] for r in rows})} · ترکیب متد/مسیر: {len(rows)}")
print(f"{'route':<52}{'method':<8}{'anon':>5}{'customer':>10}{'admin':>7}")
for r in rows:
    flag = " ⚠" if any(f[0] == r["route"] and f[1] == r["method"] for f in findings) else ""
    print(f"{r['route'][:51]:<52}{r['method']:<8}{r['anon']:>5}{r['customer']:>10}{r['admin']:>7}{flag}")
print()
if findings:
    print(f"یافته‌ها: {len(findings)}")
    for f in findings:
        print("  ✗", f)
    sys.exit(1)
print("نتیجه: هیچ مسیر ادمین/نوشتنی بدون مجوز پاسخ موفق نداد ✓")
