#!/usr/bin/env python3
"""
gen-image-variants.py — بازسازی واریانت‌های تصویر (معادل پایتونی gen-image-variants.mjs)
────────────────────────────────────────────────────────────────────────────────────
از این اسکریپت وقتی استفاده می‌شود که sharp نصب نباشد (node_modules موجود نیست)
ولی باید خروجی بایت‌به‌بایت معادل همان قالب در public/images/opt ساخته شود.

منبع:  public/images/gen/{name}.jpg   (یا هر مسیر داده‌شده با --src)
خروجی: public/images/opt/{name}.jpg · .webp · .avif
        + {name}-{480,768,1080,1400}.webp/.avif
        + به‌روزرسانی src/data/image-variants.json و src/data/image-blur.json (LQIP)

اجرا:  python3 scripts/gen-image-variants.py name1 name2 ...
       python3 scripts/gen-image-variants.py --src /path/folder --from-file scripts/owner-image-map.txt
"""
from __future__ import annotations
import json, sys
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public/images/opt"
GEN = ROOT / "public/images/gen"
WIDTHS = [480, 768, 1080, 1400]
BASE_MAX = 1400


def load_json(p: Path) -> dict:
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}


def main(argv: list[str]) -> int:
    src_dir = GEN
    args = [a for a in argv if not a.startswith("--")]
    names: list[str] = []
    i = 0
    while i < len(argv):
        a = argv[i]
        if a == "--src":
            src_dir = Path(argv[i + 1]).resolve()
            i += 2
            continue
        if a == "--from-file":
            for line in Path(argv[i + 1]).read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line and not line.startswith("#"):
                    names.append(line.split()[0])
            i += 2
            continue
        i += 1
    names = list(dict.fromkeys(names + args))
    if not names:
        print("استفاده: python3 scripts/gen-image-variants.py <name...> | --src <dir> --from-file <map>")
        return 1

    vpath = ROOT / "src/data/image-variants.json"
    bpath = ROOT / "src/data/image-blur.json"
    variants = load_json(vpath)
    blur = load_json(bpath)
    OUT.mkdir(parents=True, exist_ok=True)

    ok = bad = 0
    for name in names:
        src = src_dir / f"{name}.jpg"
        if not src.exists():
            print(f"✗ منبع نیست: {src}")
            bad += 1
            continue

        # پاک‌سازی واریانت‌های قبلی — تغییر محتوا نباید فایل کهنه بگذارد
        stale = [f"{name}.jpg", f"{name}.webp", f"{name}.avif"]
        for w in WIDTHS:
            stale += [f"{name}-{w}.webp", f"{name}-{w}.avif"]
        for f in stale:
            p = OUT / f
            if p.exists():
                p.unlink()

        im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
        base_w = min(im.width, BASE_MAX)
        base = im if base_w == im.width else im.resize(
            (base_w, round(im.height * base_w / im.width)), Image.LANCZOS
        )

        base.save(OUT / f"{name}.jpg", "JPEG", quality=82, optimize=True, progressive=True)
        base.save(OUT / f"{name}.webp", "WEBP", quality=78, method=4)
        base.save(OUT / f"{name}.avif", "AVIF", quality=50, speed=4)

        made = []
        for w in WIDTHS:
            if im.width <= w:
                continue
            r = base if w == base_w else im.resize(
                (w, round(im.height * w / im.width)), Image.LANCZOS
            )
            r.save(OUT / f"{name}-{w}.webp", "WEBP", quality=78, method=4)
            r.save(OUT / f"{name}-{w}.avif", "AVIF", quality=50, speed=4)
            made.append(w)

        variants[name] = {"avif": [0, *made], "webp": [0, *made], "jpg": True}

        lqip = im.resize((16, max(1, round(im.height * 16 / im.width))), Image.LANCZOS)
        tmp = OUT / f".lqip-{name}.webp"
        lqip.save(tmp, "WEBP", quality=40, method=3)
        import base64
        blur[name] = "data:image/webp;base64," + base64.b64encode(tmp.read_bytes()).decode()
        tmp.unlink()

        print(f"  ✓ {name} ({im.width}x{im.height} → {base_w}w · {'/'.join(map(str, made)) or '-'})")
        ok += 1

    vpath.write_text(json.dumps(variants, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    bpath.write_text(json.dumps(blur, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"[variants] {ok} نام ساخته شد · {bad} خطا · manifest به‌روز شد")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
