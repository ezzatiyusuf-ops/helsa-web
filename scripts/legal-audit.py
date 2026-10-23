#!/usr/bin/env python3
"""
legal-audit.py — ممیزی محتوای حقوقی (فاز ۹)
─────────────────────────────────────────────────────────────────────────────
وجود/نبودِ موضوع‌های الزامی در صفحات حقوقی و — مهم‌تر — ادعاهای پرخطر
(نماد اعتماد، مجوز، معافیت مالیاتی، تأییدیه‌ای که وجود ندارد).
این ابزار متن حقوقی نمی‌نویسد و جای بازبینی حقوقی را نمی‌گیرد؛ فقط شکاف را آشکار می‌کند.
اجرا: python3 scripts/legal-audit.py [baseUrl]
"""
from __future__ import annotations

import re
import sys
import urllib.parse
import urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:3000"

REQUIRED = [
    ("شناسه/هویت فروشنده (نام حقوقی، شماره ثبت یا شناسه ملی)", r"(شماره ثبت|شناسه ملی|شناسهٔ ملی)", ["/terms"]),
    ("شرایط پرداخت (درگاه و کارت‌به‌کارت)", r"(درگاه|کارت‌به‌کارت|کارت به کارت)", ["/terms"]),
    ("تأیید رسید ≠ پرداخت (فرایند بررسی رسید)", r"(رسید|تأیید کارشناس|بررسی کارشناس)", ["/terms"]),
    ("حق انصراف / مهلت مرجوعی", r"(۷ روز|انصراف|مرجوع)", ["/terms", "/refund"]),
    ("روند بازگشت وجه و زمان‌بندی", r"(بازگشت وجه|بازگردانده|باز می‌گردد)", ["/refund"]),
    ("رسیدگی به شکایات (کانال + مهلت)", r"شکایت", ["/terms"]),
    ("هزینه و زمان ارسال", r"(هزینه ارسال|زمان‌بندی|۲ تا ۴ روز)", ["/shipping"]),
    ("حریم خصوصی: پرداخت و کوکی", r"(کوکی|حافظه مرورگر)", ["/privacy"]),
    ("حریم خصوصی: حقوق کاربر و درخواست داده", r"(حق دسترسی|درخواست داده|حذف داده)", ["/privacy"]),
    ("روزیته: قاعدهٔ انتشار پس از بررسی", r"(بدون این تأیید|پس از ثبت درخواست|منتشر)", ["/terms"]),
    ("روزیته: مسئولیت صحت اطلاعات تولیدکننده", r"بر عهدهٔ او", ["/terms"]),
    ("ایمنی غذا و برچسب‌گذاری", r"(برچسب|تاریخ تولید و انقضا)", ["/terms"]),
]

RISKY = [
    ("ادعای نماد اعتماد الکترونیکی", r"(نماد اعتماد|اینماد|enamad)"),
    ("ادعای مجوز رسمی/پروانه", r"(مجوز رسمی|پروانهٔ کسب|دارای مجوز)"),
    ("ادعای معافیت مالیاتی", r"(معاف از مالیات|معافیت مالیاتی)"),
    ("ادعای تأییدیهٔ وزارت بهداشت", r"(تأیید وزارت بهداشت|تأییدیهٔ وزارت)"),
    ("ادعای ضمانت بازگشت «بدون قید و شرط»", r"بدون قید و شرط"),
]


def text_of(path: str) -> str:
    url = BASE + urllib.parse.quote(path, safe="/?=&%")
    req = urllib.request.Request(url, headers={"User-Agent": "helsa-legal-audit"})
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            html = r.read().decode("utf-8", "replace")
    except Exception:  # noqa: BLE001
        return ""
    html = re.sub(r"<script[\s\S]*?</script>|<style[\s\S]*?</style>", " ", html)
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html))


def main() -> int:
    pages = {p: text_of(p) for p in ["/terms", "/privacy", "/refund", "/shipping"]}
    missing, risky, ok = [], [], []

    for label, pattern, scope in REQUIRED:
        found = any(re.search(pattern, pages.get(p, "")) for p in scope)
        (ok if found else missing).append(f"{label} — {'/'.join(scope)}")

    for label, pattern in RISKY:
        for p, body in pages.items():
            m = re.search(pattern, body)
            if m:
                risky.append(f"{label} در {p}: «…{body[max(0, m.start() - 40):m.end() + 40]}…»")

    print("── موضوع‌های حاضر ──")
    for o in ok:
        print("  ✓", o)
    if missing:
        print("\n── شکاف‌ها (نیازمند متن حقوقی/دادهٔ مالک) ──")
        for m in missing:
            print("  ✗", m)
    if risky:
        print("\n── ادعاهای پرخطر (باید حذف یا مستند شود) ──")
        for r in risky:
            print("  ▲", r)
    else:
        print("\n✓ هیچ ادعای پرخطر بدون پشتوانه (نماد اعتماد/مجوز/معافیت مالیاتی) در صفحات حقوقی نیست")
    print(f"\nنتیجه: {len(ok)} موضوع حاضر · {len(missing)} شکاف · {len(risky)} ادعای پرخطر")
    return 0


if __name__ == "__main__":
    sys.exit(main())
