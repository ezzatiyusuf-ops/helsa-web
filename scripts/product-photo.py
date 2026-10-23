#!/usr/bin/env python3
"""
product-photo.py — پورت پایتونیِ product-photo.mjs (وقتی sharp/node_modules نیست)
────────────────────────────────────────────────────────────────────────────────
همان الگوی ثابت عکس محصول هلسا، با همان پارامترها و همان خروجی‌ها:
  ۱) اصلاح جهت EXIF
  ۲) ادیت فتوگرافیک: روشنایی ×۱٫۰۷ · اشباع ×۱٫۲۸ · کنتراست ×۱٫۰۹ حول ۱۲۸
  ۳) کارت شناور: گوشهٔ گرد ۳۰px + خط مویی + سایهٔ نرم (blur 26, dy 16, alpha 0.16)
  ۴) بوم مربع ۱۴۰۰×۱۴۰۰ کرم #FAF7F0؛ کارت در جعبهٔ ۹۴٪ (fit inside، بدون برش)
  ۵) منبع gen/{name}.jpg + واریانت‌های opt (jpg/webp/avif + -480/-768/-1080)

اجرا: python3 scripts/product-photo.py <عکس-ورودی> <نام> [--no-manifest]
"""
from __future__ import annotations
import base64, json, sys
from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parent.parent
CANVAS = 1400
MARGIN = 0.94
BG = (250, 247, 240)          # #FAF7F0
WIDTHS = [480, 768, 1080]
BRIGHTNESS, SATURATION, CONTRAST = 1.07, 1.28, 1.09
RADIUS, SHADOW_BLUR, SHADOW_DY, SHADOW_OPACITY = 30, 26, 16, 0.16


def rounded_mask(size: tuple[int, int]) -> Image.Image:
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=RADIUS, fill=255)
    return m


def main(argv: list[str]) -> int:
    args = [a for a in argv if not a.startswith("--")]
    if len(args) < 2:
        print("استفاده: python3 scripts/product-photo.py <عکس-ورودی> <نام> [--no-manifest]")
        return 1
    src, name = Path(args[0]), args[1]
    if not src.exists():
        print(f"✗ فایل ورودی پیدا نشد: {src}")
        return 1
    update_manifest = "--no-manifest" not in argv

    gen_dir = ROOT / "public/images/gen"
    opt_dir = ROOT / "public/images/opt"
    gen_dir.mkdir(parents=True, exist_ok=True)
    opt_dir.mkdir(parents=True, exist_ok=True)

    # ۱) EXIF + اندازهٔ کارت (fit inside ۹۴٪)
    im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    box = round(CANVAS * MARGIN)
    im.thumbnail((box, box), Image.LANCZOS)
    w, h = im.size
    print(f"  کارت عکس: {w}×{h}")

    # ۲) ادیت فتوگرافیک
    im = ImageEnhance.Brightness(im).enhance(BRIGHTNESS)
    im = ImageEnhance.Color(im).enhance(SATURATION)
    im = ImageEnhance.Contrast(im).enhance(CONTRAST)
    im = im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=3))

    # ۳) گوشهٔ گرد
    mask = rounded_mask((w, h))
    card = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    card.paste(im, (0, 0), mask)

    # ۴) سایهٔ نرم
    shadow = Image.new("RGBA", (w + SHADOW_BLUR * 4, h + SHADOW_BLUR * 4), (0, 0, 0, 0))
    sh = Image.new("RGBA", (w, h), (0, 0, 0, int(255 * SHADOW_OPACITY)))
    sh.putalpha(mask.point(lambda v: int(v * SHADOW_OPACITY)))
    shadow.paste(sh, (SHADOW_BLUR * 2, SHADOW_BLUR * 2), sh)
    shadow = shadow.filter(ImageFilter.GaussianBlur(SHADOW_BLUR))

    # ۵) بوم کرم + چیدمان مرکزی
    canvas = Image.new("RGB", (CANVAS, CANVAS), BG)
    x, y = (CANVAS - w) // 2, (CANVAS - h) // 2
    canvas.paste(shadow, (x - SHADOW_BLUR * 2, y - SHADOW_BLUR * 2 + SHADOW_DY), shadow)

    # خط مویی ظریف دور کارت (روی بوم RGB آلفا نادیده گرفته می‌شود ⇒ رنگِ از پیش ترکیب‌شده)
    hair = ImageDraw.Draw(canvas)
    hair.rounded_rectangle([x, y, x + w - 1, y + h - 1], radius=RADIUS, outline=(226, 217, 201), width=2)
    canvas.paste(card, (x, y), card)

    canvas.save(gen_dir / f"{name}.jpg", "JPEG", quality=88, optimize=True, progressive=True)

    # ۶) واریانت‌ها
    for f in [f"{name}.jpg", f"{name}.webp", f"{name}.avif"]:
        p = opt_dir / f
        if p.exists():
            p.unlink()
    canvas.save(opt_dir / f"{name}.jpg", "JPEG", quality=82, optimize=True, progressive=True)
    canvas.save(opt_dir / f"{name}.webp", "WEBP", quality=78, method=4)
    canvas.save(opt_dir / f"{name}.avif", "AVIF", quality=50, speed=4)
    for wv in WIDTHS:
        r = canvas.resize((wv, wv), Image.LANCZOS)
        r.save(opt_dir / f"{name}-{wv}.webp", "WEBP", quality=78, method=4)
        r.save(opt_dir / f"{name}-{wv}.avif", "AVIF", quality=50, speed=4)

    if update_manifest:
        vp = ROOT / "src/data/image-variants.json"
        bp = ROOT / "src/data/image-blur.json"
        variants = json.loads(vp.read_text(encoding="utf-8"))
        blur = json.loads(bp.read_text(encoding="utf-8"))
        variants[name] = {"avif": [0, *WIDTHS], "webp": [0, *WIDTHS], "jpg": True}
        lq = canvas.resize((16, 16), Image.LANCZOS)
        tmp = opt_dir / f".lqip-{name}.webp"
        lq.save(tmp, "WEBP", quality=40, method=3)
        blur[name] = "data:image/webp;base64," + base64.b64encode(tmp.read_bytes()).decode()
        tmp.unlink()
        vp.write_text(json.dumps(variants, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        bp.write_text(json.dumps(blur, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"  ✓ {name} → opt/{name}.jpg|webp|avif + 480/768/1080")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
