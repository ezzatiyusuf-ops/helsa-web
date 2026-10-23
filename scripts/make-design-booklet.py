#!/usr/bin/env python3
"""HELSA — ساخت PDF رسمی کتابچهٔ دیزاین‌سیستم (برای ارائه).
MD → HTML برندشده (RTL/Vazirmatn/لوگو) → چاپ PDF با Playwright.
اجرا: python3 scripts/make-design-booklet.py  (سپس node scripts/print-booklet.mjs)
"""
import re
from datetime import datetime

SRC = "HELSA-DESIGN-DEVELOPMENT-GUIDELINES.md"
OUT = "docs/helsa-design-guidelines.booklet.html"


def inline(t: str) -> str:
    t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
    t = re.sub(r"`([^`]+)`", r'<code>\1</code>', t)
    t = re.sub(r"\[(.+?)\]\((.+?)\)", r'<a href="\2">\1</a>', t)
    return t


def md_to_html(md: str) -> tuple[str, list]:
    lines = md.split("\n")
    html, i = [], 0
    toc = []
    # h1 اول را رد کن (جلد رسمی جایگزینش است)
    if lines and lines[0].startswith("# "):
        lines = lines[1:]
    while i < len(lines):
        ln = lines[i]
        if ln.startswith("```"):
            code, i = [], i + 1
            while i < len(lines) and not lines[i].startswith("```"):
                code.append(lines[i]); i += 1
            i += 1
            html.append('<pre class="code">' + "\n".join(code) + "</pre>")
        elif ln.startswith("## "):
            title = ln[3:].strip()
            m = re.match(r"(\d+)\.\s*(.+)", title)
            num, txt = (m.group(1), m.group(2)) if m else ("", title)
            toc.append((num, re.sub(r"<[^>]+>", "", txt)))
            html.append(f'<h2><span class="secnum">{num}</span>{inline(txt)}</h2>')
        elif ln.startswith("> "):
            html.append(f'<blockquote>{inline(ln[2:])}</blockquote>')
        elif ln.strip() == "---":
            html.append('<hr class="sep">')
        elif ln.startswith("|"):
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
                if not all(re.fullmatch(r":?-{2,}:?", c or "---") for c in cells):
                    rows.append(cells)
                i += 1
            if rows:
                head = "".join(f"<th>{inline(c)}</th>" for c in rows[0])
                body = "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in rows[1:])
                html.append(f'<table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table>')
            continue
        elif re.match(r"^\d+\.\s", ln):
            html.append(f'<div class="li n">{inline(ln)}</div>')
        elif ln.startswith("- "):
            html.append(f'<div class="li">• {inline(ln[2:])}</div>')
        elif ln.strip():
            html.append(f"<p>{inline(ln)}</p>")
        i += 1
    return "\n".join(html), toc


def main():
    md = open(SRC, encoding="utf8").read()
    body, toc = md_to_html(md)
    now = datetime.now()
    toc_html = "".join(
        f'<div class="toc-row"><span class="toc-num">{n}</span><span class="toc-t">{t}</span></div>'
        for n, t in toc
    )
    html = f"""<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<title>کتابچهٔ رسمی برند و دیزاین‌سیستم هلسا</title>
<style>
  @font-face {{ font-family:"Vazirmatn"; src:url("../public/fonts/Vazirmatn-Variable.woff2") format("woff2"); font-weight:100 900; font-display:block; }}
  @page {{ size: A4 portrait; margin: 16mm 15mm 18mm; }}
  @page cover {{ margin: 0; }}
  * {{ box-sizing: border-box; }}
  body {{ font-family:"Vazirmatn",Tahoma,sans-serif; color:#201f1b; font-size:10pt; line-height:1.95; margin:0; background:#fff; }}
  /* ── جلد ── */
  .cover {{ page: cover; page-break-after: always; position:relative; min-height:297mm; background:linear-gradient(165deg,#0b5f3b 0%,#08422c 52%,#06301f 100%); color:#fffdf9; padding:28mm 24mm; }}
  .cover::before {{ content:""; position:absolute; inset:0; opacity:.55;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'%3E%3Cg fill='none' stroke='%23faf7f0' stroke-opacity='0.07' stroke-width='1'%3E%3Cpath d='M48 6l10 16 18-5-5 18 16 10-16 10 5 18-18-5-10 16-10-16-18 5 5-18-16-10 16-10-5-18 18 5z'/%3E%3Ccircle cx='48' cy='48' r='7'/%3E%3C/g%3E%3C/svg%3E"); }}
  .cover .logo-plate {{ position:relative; display:inline-block; background:#fffdf9; border-radius:18px; padding:10px 22px; box-shadow:0 14px 40px -16px rgba(0,0,0,.45); }}
  .cover .logo-plate img {{ height:22mm; display:block; }}
  .cover .brand {{ position:relative; margin-top:14mm; font-size:12pt; font-weight:800; letter-spacing:.35em; color:#e2cf94; }}
  .cover h1 {{ position:relative; font-size:27pt; font-weight:900; margin:8mm 0 4mm; line-height:1.6; }}
  .cover .sub {{ position:relative; font-size:11.5pt; color:#ffffffcc; max-width:150mm; line-height:2.1; }}
  .cover .rule {{ position:relative; width:34mm; height:2px; margin:8mm 0; background:linear-gradient(to left,transparent,#b3922f,transparent); }}
  .cover .chips {{ position:relative; display:flex; flex-wrap:wrap; gap:3.5mm; margin-top:10mm; }}
  .cover .chip {{ border:1px solid rgba(250,247,240,.35); border-radius:999px; padding:2mm 5.5mm; font-size:9pt; font-weight:700; color:#faf7f0; }}
  .cover .meta {{ position:absolute; bottom:16mm; right:24mm; left:24mm; display:flex; justify-content:space-between; font-size:9pt; color:#ffffffaa; border-top:1px solid rgba(250,247,240,.25); padding-top:5mm; }}
  /* ── فهرست ── */
  .toc {{ page-break-after: always; }}
  .toc h2 {{ border:none !important; padding:0 !important; background:none !important; color:#08422c !important; }}
  .toc-grid {{ display:grid; grid-template-columns:1fr 1fr; gap:0 8mm; margin-top:6mm; }}
  .toc-row {{ display:flex; align-items:baseline; gap:3mm; padding:1.1mm 0; border-bottom:1px dotted #e6ddcb; font-size:9.5pt; }}
  .toc-num {{ min-width:7mm; font-weight:900; color:#b3922f; font-size:8.5pt; }}
  .toc-t {{ color:#403d36; }}
  /* ── محتوا ── */
  h2 {{ display:flex; align-items:center; gap:3.5mm; font-size:15.5pt; font-weight:900; color:#fffdf9; background:linear-gradient(100deg,#0a5236,#0b5f3b); border-radius:14px; padding:4.5mm 6mm; margin:9mm 0 4.5mm; break-after:avoid; page-break-after:avoid; }}
  h2 .secnum {{ background:#b3922f; color:#fffdf9; min-width:9mm; text-align:center; border-radius:8px; font-size:10.5pt; padding:1mm 2mm; }}
  h2:first-of-type {{ margin-top:0; }}
  p {{ margin:2mm 0; text-align:justify; }}
  b {{ font-weight:800; }}
  code {{ font-family:inherit; background:#faf7f0; border:1px solid #f3eee3; border-radius:5px; padding:0 1.6mm; font-size:8.7pt; color:#0a5236; direction:ltr; display:inline-block; }}
  pre.code {{ direction:ltr; text-align:left; background:#faf7f0; border:1px solid #e6ddcb; border-right:3px solid #0b5f3b; border-radius:10px; padding:4mm 5mm; font-size:8.6pt; line-height:1.8; white-space:pre-wrap; break-inside:avoid; page-break-inside:avoid; margin:3.5mm 0; }}
  table {{ width:100%; border-collapse:collapse; margin:3.5mm 0; font-size:8.9pt; break-inside:auto; }}
  th {{ background:#0b5f3b; color:#fffdf9; font-weight:800; padding:2.2mm 2.8mm; text-align:right; border:1px solid #08422c; }}
  td {{ padding:2mm 2.8mm; border:1px solid #e6ddcb; vertical-align:top; }}
  tbody tr:nth-child(even) td {{ background:#faf7f0; }}
  tr {{ break-inside:avoid; page-break-inside:avoid; }}
  blockquote {{ background:#faf7f0; border-right:3px solid #b3922f; border-radius:10px; padding:3.5mm 5mm; margin:3.5mm 0; font-weight:700; color:#08422c; break-inside:avoid; }}
  .li {{ margin:1.2mm 0; padding-right:2mm; }}
  .li.n {{ font-weight:700; }}
  hr.sep {{ border:none; border-top:1px solid #e6ddcb; margin:6mm 0; }}
  a {{ color:#0a5236; text-decoration:none; }}
</style>
</head>
<body>
<div class="cover">
  <div class="logo-plate"><img src="../public/brand/helsa-logo.png" alt="لوگوی هلسا ایرانیان"></div>
  <div class="brand">H E L S A</div>
  <h1>کتابچهٔ رسمی برند، UI/UX<br>و دیزاین‌سیستم هلسا</h1>
  <div class="sub">منبع یگانهٔ حقیقت (Single Source of Truth) برای هویت بصری، رفتار رابط کاربری، الگوهای تجربهٔ کاربر و استانداردهای توسعهٔ فرانت‌اند — تمامی مقادیر این سند از کد واقعی پروژه استخراج و راستی‌آزمایی شده است.</div>
  <div class="rule"></div>
  <div class="chips">
    <span class="chip">۵۱ سکشن</span>
    <span class="chip">۵۷ کامپوننت</span>
    <span class="chip">۱۱۰+ توکن دیزاین</span>
    <span class="chip">راستی‌آزمایی‌شده با کد</span>
    <span class="chip">نسخهٔ ۱.۰</span>
  </div>
  <div class="meta">
    <span>بازرگانی هلسا ایرانیان · واحد محصول و طراحی</span>
    <span>نسخهٔ ۱.۰ — شهریور ۱۴۰۵ / سپتامبر ۲۰۲۶</span>
  </div>
</div>
<div class="toc">
  <h2>فهرست سکشن‌ها</h2>
  <div class="toc-grid">{toc_html}</div>
</div>
{body}
</body>
</html>"""
    open(OUT, "w", encoding="utf8").write(html)
    print(f"HTML ساخته شد: {OUT} ({len(toc)} سکشن، {len(html)//1024}KB)")


if __name__ == "__main__":
    main()
