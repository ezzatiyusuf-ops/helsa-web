#!/usr/bin/env python3
"""
contrast-audit.py — سنجش واقعی کنتراست WCAG 2.1 برای توکن‌های رنگ هلسا
─────────────────────────────────────────────────────────────────────────
رنگ‌ها از src/app/globals.css خوانده می‌شوند (همان منبعی که سایت استفاده می‌کند)،
سپس جفت‌های متن/پس‌زمینهٔ پرکاربرد سنجیده می‌شوند. هیچ عددی حدس زده نمی‌شود.
اجرا: python3 scripts/contrast-audit.py
"""
from __future__ import annotations
import re, sys
from pathlib import Path

CSS = (Path(__file__).resolve().parent.parent / "src/app/globals.css").read_text(encoding="utf-8")


def tokens(block: str) -> dict[str, str]:
    return dict(re.findall(r"--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})", block))


# توکن‌ها در بلوک @theme تعریف می‌شوند؛ تم تیره در :root[data-theme="dark"] بازتعریف می‌شود.
theme_block = CSS.split("@theme", 1)[1].split("\n}", 1)[0] if "@theme" in CSS else CSS
light = tokens(theme_block)
dark = dict(light)
if '[data-theme="dark"] {' in CSS:
    seg = CSS.split('[data-theme="dark"] {', 1)[1]
    # بلوک را تا اولین '}' هم‌سطح بخوان
    depth, buf = 1, []
    for ch in seg:
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                break
        buf.append(ch)
    dark.update(tokens("".join(buf)))


def lum(hexv: str) -> float:
    v = hexv.lstrip("#")
    if len(v) == 3:
        v = "".join(c * 2 for c in v)
    v = v[:6]
    ch = [int(v[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    ch = [c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4 for c in ch]
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]


def ratio(a: str, b: str) -> float:
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


PAIRS = [
    ("heading", "canvas"), ("body", "canvas"), ("muted", "canvas"), ("faint", "canvas"),
    ("heading", "surface"), ("body", "surface"), ("muted", "surface"), ("faint", "surface"),
    ("muted", "surface2"), ("body", "surface2"), ("inverse", "brand-950"), ("gold-400", "brand-950"),
    ("accent-600", "canvas"), ("accent-600", "surface"), ("accent-600", "surface2"), ("accent-700", "canvas"),
]

failed = 0
for theme, tk in (("روشن", light), ("تیره", dark)):
    print(f"\n── تم {theme} ──")
    for fg, bg in PAIRS:
        if fg not in tk or bg not in tk:
            continue
        r = ratio(tk[fg], tk[bg])
        need = 4.5
        ok = r >= need
        if not ok:
            failed += 1
        print(f"  {'✓' if ok else '✗'} {fg:>9} روی {bg:<9} = {r:5.2f}:1  (حد AA متن معمولی ۴٫۵)")
print(f"\nنتیجه: {failed} جفت زیر حد AA")
sys.exit(1 if failed else 0)
