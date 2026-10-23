#!/usr/bin/env python3
"""
make-banner.py — ساخت بنر عریض از عکس واقعی مالک (برش هوشمند + گرادیان برند)
────────────────────────────────────────────────────────────────────────────
بدون تولید تصویر تازه: فقط برش/تغییر اندازهٔ عکس مالک و افزودن گرادیان برای
خوانایی متن روی بنر. سمت متن (چپ/راست) با آرگومان --side انتخاب می‌شود.

اجرا:
  python3 scripts/make-banner.py <عکس-مالک> <نام> [--w 1600] [--h 620] [--side right|left|center|none] [--zoom 1.0] [--y 0.5]
خروجی: public/images/gen/<نام>.jpg + واریانت‌های opt (همان manifest سایت)
"""
from __future__ import annotations
import base64, json, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parent.parent
opt = ROOT / "public/images/opt"
gen = ROOT / "public/images/gen"
WIDTHS = [480, 768, 1080, 1400]


def main(argv: list[str]) -> int:
    args = [a for a in argv if not a.startswith("--")]
    kw = {}
    for i, a in enumerate(argv):
        if a.startswith("--"):
            kw[a[2:]] = argv[i + 1] if i + 1 < len(argv) and not argv[i + 1].startswith("--") else True

    src, name = Path(args[0]), args[1]
    W = int(kw.get("w", 1600))
    H = int(kw.get("h", 620))
    side = kw.get("side", "right")          # سمتی که متن می‌نشیند (گرادیان تیره‌تر همان‌جا)
    zoom = float(kw.get("zoom", 1.0))
    posy = float(kw.get("y", 0.5))

    im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    # مقیاس: پوشاندن کامل کادر بنر (cover) با امکان زوم
    scale = max(W / im.width, H / im.height) * zoom
    rw, rh = round(im.width * scale), round(im.height * scale)
    im = im.resize((rw, rh), Image.LANCZOS)
    left = (rw - W) // 2
    top = int((rh - H) * posy)
    im = im.crop((left, top, left + W, top + H))

    if side != "none":
        # گرادیان برای خوانایی متن — بدون دست‌کاری محتوای عکس
        grad = Image.new("L", (W, 1))
        px = grad.load()
        for x in range(W):
            t = x / (W - 1)
            # چگالی گرادیان: سمت متن تیره‌تر
            if side == "right":
                v = int(215 * (t ** 1.25))
            elif side == "left":
                v = int(215 * ((1 - t) ** 1.25))
            else:
                v = int(120 * (1 - abs(t - 0.5) * 1.2))
            px[x, 0] = max(0, min(255, v))
        mask = grad.resize((W, H), Image.BILINEAR)
        dark = Image.new("RGB", (W, H), (18, 22, 34))  # سرمه‌ای برند #2F3755 نزدیک
        im = Image.composite(dark, im, mask.point(lambda v: int(v * 1.0)))

    gen.mkdir(parents=True, exist_ok=True)
    opt.mkdir(parents=True, exist_ok=True)
    im.save(gen / f"{name}.jpg", "JPEG", quality=88, optimize=True, progressive=True)
    im.save(opt / f"{name}.jpg", "JPEG", quality=82, optimize=True, progressive=True)
    im.save(opt / f"{name}.webp", "WEBP", quality=80, method=4)
    im.save(opt / f"{name}.avif", "AVIF", quality=52, speed=4)
    for w in WIDTHS:
        if w >= W:
            continue
        r = im.resize((w, round(H * w / W)), Image.LANCZOS)
        r.save(opt / f"{name}-{w}.webp", "WEBP", quality=80, method=4)
        r.save(opt / f"{name}-{w}.avif", "AVIF", quality=52, speed=4)
    # به‌روزرسانی manifest سایت (srcset/avif/webp + LQIP) تا SmartImage بنر را بهینه سرو کند
    vp = ROOT / "src/data/image-variants.json"
    bp = ROOT / "src/data/image-blur.json"
    variants = json.loads(vp.read_text(encoding="utf-8")) if vp.exists() else {}
    blur = json.loads(bp.read_text(encoding="utf-8")) if bp.exists() else {}
    made = [w for w in WIDTHS if w < W]
    variants[name] = {"avif": [0, *made], "webp": [0, *made], "jpg": True}
    lq = im.resize((16, max(1, round(H * 16 / W))), Image.LANCZOS)
    tmp = opt / f".lqip-{name}.webp"
    lq.save(tmp, "WEBP", quality=40, method=3)
    blur[name] = "data:image/webp;base64," + base64.b64encode(tmp.read_bytes()).decode()
    tmp.unlink()
    vp.write_text(json.dumps(variants, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    bp.write_text(json.dumps(blur, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"✓ {name} {W}×{H} ← {src.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
