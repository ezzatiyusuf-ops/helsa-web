#!/usr/bin/env python3
"""
final-v2-look.py — همان ظاهر عکس‌های قبلی (final-v2)، بدون بازسازی محصول

هدف: خروجی «مثل قبلی‌ها» دیده شود:
  • محصول جدا، وسط قاب مربع، با فضای تنفس
  • پلاستر گرم + نور بالا-چپ + سایهٔ نرم پایین-راست
  • گرید یکنواخت گرم

قاعدهٔ سخت (دستور مالک): برچسب/متن/بسته‌بندی بازسازی نمی‌شود.
  → محصول با «کلید آبیِ فرش» یا مدل isnet از عکس خود مالک برش می‌خورد
    (پیکسل‌ها همان پیکسل‌های عکس اصلی‌اند؛ فقط پس‌زمینه عوض می‌شود).
  → هر جا ماسک مشکوک باشد (پوشش خیلی کم/زیاد یا چسبیده به لبه) رد می‌شود
    و در گزارش با  ✗  علامت می‌گیرد تا کادر/روش دستی اصلاح شود.

اجرا: python3 scripts/final-v2-look.py
خروجی: /home/user/helsa-photo-edits/final-v3/edited/look/<name>.png (۱۰۲۴²)
"""
import os
import sys

import cv2
import numpy as np
from PIL import Image

SRC = "/home/user/uploads"
OUT = "/home/user/helsa-photo-edits/final-v3/edited/look"
REF = "/home/user/helsa-photo-edits/final-v2/13-tg1.jpg"
SIZE = 1024
FILL = 0.62          # سهم محصول از قاب (مثل final-v2)

# name → (file, crop box, method)   method: "rembg" | "bluekey"
JOBS = [
    ("date-coconut-sugar-1", "IMG_3587.jpeg", (760, 660, 2400, 3300), "bluekey"),
    ("date-coconut-sugar-2", "IMG_3588.jpeg", (400, 350, 2400, 3500), "bluekey"),
    ("date-coconut-sugar-3", "IMG_3589.jpeg", (450, 400, 2400, 3300), "bluekey"),
    ("date-coconut-sugar-4", "IMG_3590.jpeg", (450, 400, 2400, 3300), "bluekey"),
    ("mulberry-1", "IMG_3575.jpeg", (550, 800, 2400, 3300), "bluekey"),
    ("mulberry-2", "IMG_3574.jpeg", (500, 450, 2350, 3500), "bluekey"),
    ("mulberry-3", "IMG_3577.jpeg", (300, 250, 2350, 3450), "bluekey"),
    ("moiz-1", "IMG_3608.jpeg", (900, 800, 2200, 3500), "bluekey"),
    ("moiz-2", "IMG_3606.jpeg", (900, 400, 2400, 3400), "bluekey"),
    ("moiz-3", "IMG_3609.jpeg", (700, 250, 2350, 3450), "bluekey"),
]


# ── پس‌زمینهٔ final-v2 ──────────────────────────────────────────────────────
def final_v2_backdrop(size=SIZE):
    """پلاستر گرم با گرادیان بالا → پایین + نور ملایم از بالا-چپ + بافت ریز."""
    ref = cv2.imread(REF)
    ref = cv2.resize(ref, (256, 256))
    top = ref[10:70].reshape(-1, 3).mean(0)      # BGR ~ (187,212,229)
    bot = ref[190:250].reshape(-1, 3).mean(0)

    yy = np.linspace(0, 1, size)[:, None, None]
    xx = np.linspace(0, 1, size)[None, :, None]
    t = np.clip(0.55 * yy + 0.45 * xx, 0, 1)
    bg = top[None, None, :] * (1 - t) + bot[None, None, :] * t

    # بافت پلاستر (نویز کم‌فرکانس، بسیار ملایم مثل final-v2)
    rng = np.random.default_rng(5)
    low = cv2.GaussianBlur(rng.normal(0, 1, (size // 16 + 2, size // 16 + 2)), (0, 0), 3)
    low = cv2.resize(low, (size, size), interpolation=cv2.INTER_CUBIC)
    low = low / (np.abs(low).max() + 1e-6)
    bg = bg + low[:, :, None] * 2.0
    return np.clip(bg, 0, 255).astype(np.uint8)


# ── برش محصول ──────────────────────────────────────────────────────────────
def bluekey_mask(crop):
    """محصولِ داخل میدان آبی فرش — نه نقش‌های حاشیهٔ فرش.

    ۱) میدان آبی (بزرگ‌ترین مؤلفهٔ آبی) پیدا می‌شود.
    ۲) فقط مؤلفه‌های غیرآبی که «داخل» میدان‌اند (۷۵٪ محیطشان آبی است) نگه داشته می‌شوند
       → حاشیهٔ نقش‌دار و مرمرِ بیرون فرش خودبه‌خود حذف می‌شوند.
    """
    h, w = crop.shape[:2]
    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
    hh, ss, vv = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]
    br = crop[:, :, 0].astype(np.int16) - crop[:, :, 2].astype(np.int16)
    blue = ((br > 30) & (ss > 45) & (vv > 30) & (hh > 80) & (hh < 155)).astype(np.uint8) * 255
    blue = cv2.morphologyEx(blue, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))
    blue = cv2.morphologyEx(blue, cv2.MORPH_OPEN, np.ones((11, 11), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(blue, 8)
    if n < 2:
        return mask_cleanup(cv2.bitwise_not(blue))
    field = (lab == 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))).astype(np.uint8) * 255
    field = cv2.morphologyEx(field, cv2.MORPH_CLOSE, np.ones((61, 61), np.uint8))

    nonblue = cv2.bitwise_not(blue)
    nonblue = cv2.morphologyEx(nonblue, cv2.MORPH_OPEN, np.ones((7, 7), np.uint8))
    n2, lab2, st2, _ = cv2.connectedComponentsWithStats(nonblue, 8)
    keep = np.zeros_like(nonblue)
    big = max(1, int(np.max(st2[1:, cv2.CC_STAT_AREA]))) if n2 > 1 else 1
    for i in range(1, n2):
        area = st2[i, cv2.CC_STAT_AREA]
        if area < 0.004 * h * w:
            continue
        x_, y_, bw_, bh_ = st2[i, :4]
        edge = x_ <= 1 or y_ <= 1 or x_ + bw_ >= w - 1 or y_ + bh_ >= h - 1
        if edge and area > 0.55 * h * w:
            continue                      # حاشیهٔ فرش/مرمر که تمام قاب را می‌پوشاند
        if area < 0.12 * big:
            continue                      # نقش‌های ریز حاشیه
        comp = (lab2 == i).astype(np.uint8) * 255
        ring = cv2.subtract(cv2.dilate(comp, np.ones((45, 45), np.uint8)), comp)
        ring_blue = np.count_nonzero(cv2.bitwise_and(ring, field)) / max(1, np.count_nonzero(ring))
        if ring_blue >= 0.70:
            keep[comp > 0] = 255
    return mask_cleanup(keep)


def rembg_mask(crop):
    """isnet روی نسخهٔ کوچک (صرفه‌جویی حافظه) و برگرداندن ماسک به ابعاد اصلی."""
    from rembg import new_session, remove
    global _SESSION
    try:
        _SESSION
    except NameError:
        _SESSION = new_session("isnet-general-use")
    h, w = crop.shape[:2]
    scale = 760.0 / max(h, w)
    small = cv2.resize(crop, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA) if scale < 1 else crop
    pil = Image.fromarray(cv2.cvtColor(small, cv2.COLOR_BGR2RGB))
    out = remove(pil, session=_SESSION, post_process_mask=True)
    m = np.array(out)[:, :, 3]
    if m.shape[:2] != (h, w):
        m = cv2.resize(m, (w, h), interpolation=cv2.INTER_LINEAR)
    return m


def mask_cleanup(m):
    """حذف تکه‌های ریز + پرکردن حفره‌های داخلی + نرم‌کردن لبه."""
    h, w = m.shape
    n, lab, st, _ = cv2.connectedComponentsWithStats((m > 127).astype(np.uint8), 8)
    keep = np.zeros_like(m)
    for i in range(1, n):
        if st[i, cv2.CC_STAT_AREA] > 0.004 * h * w:
            keep[lab == i] = 255
    ff = keep.copy()
    mm = np.zeros((h + 2, w + 2), np.uint8)
    for x in range(0, w, max(1, w // 60)):
        if ff[0, x] == 255: cv2.floodFill(ff, mm, (x, 0), 128)
        if ff[h - 1, x] == 255: cv2.floodFill(ff, mm, (x, h - 1), 128)
    for y in range(0, h, max(1, h // 60)):
        if ff[y, 0] == 255: cv2.floodFill(ff, mm, (0, y), 128)
        if ff[y, w - 1] == 255: cv2.floodFill(ff, mm, (w - 1, y), 128)
    keep = cv2.bitwise_or(keep, (ff == 255).astype(np.uint8) * 255)
    return cv2.GaussianBlur(keep, (0, 0), max(1.0, min(h, w) / 700))


def despill(bgr, alpha):
    out = bgr.astype(np.float32)
    e = cv2.GaussianBlur(alpha, (0, 0), 3).astype(np.float32) / 255.0
    e = np.clip(e * (1 - e) * 4, 0, 1)
    b, g, r = out[:, :, 0], out[:, :, 1], out[:, :, 2]
    out[:, :, 0] = b - np.clip(b - (g + r) / 2, 0, None) * e
    return np.clip(out, 0, 255).astype(np.uint8)


def trim(rgba):
    a = rgba[:, :, 3]
    ys, xs = np.where(a > 16)
    if len(ys) == 0:
        return None
    return rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


# ── ترکیب نهایی ────────────────────────────────────────────────────────────
def compose(sub, bg):
    sh, sw = sub.shape[:2]
    a = sub[:, :, 3].astype(np.float32) / 255.0
    ox, oy = (SIZE - sw) // 2, int(SIZE * 0.47 - sh / 2)
    oy = max(0, min(oy, SIZE - sh))

    # سایهٔ نرم پایین-راست (مثل final-v2)
    sm = np.zeros((SIZE, SIZE), np.float32)
    sm[oy:oy + sh, ox:ox + sw] = a
    sm = cv2.GaussianBlur(sm, (0, 0), SIZE / 55)
    M = np.float32([[1, 0, SIZE * 0.018], [0, 1, SIZE * 0.030]])
    sm = cv2.warpAffine(sm, M, (SIZE, SIZE))
    out = bg.astype(np.float32) * (1 - np.clip(sm * 0.30, 0, 0.30))[:, :, None]

    fg = sub[:, :, :3].astype(np.float32)
    region = out[oy:oy + sh, ox:ox + sw]
    out[oy:oy + sh, ox:ox + sw] = fg * a[:, :, None] + region * (1 - a[:, :, None])

    out = np.clip(out, 0, 255)
    # گرید گرم یکنواخت مثل final-v2
    lab = cv2.cvtColor(out.astype(np.uint8), cv2.COLOR_BGR2LAB)
    l, aa, bb = cv2.split(lab)
    l = cv2.createCLAHE(clipLimit=1.2, tileGridSize=(8, 8)).apply(l)
    out = cv2.cvtColor(cv2.merge([l, aa, bb]), cv2.COLOR_LAB2BGR)
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    bg = final_v2_backdrop(SIZE)
    bad = []
    for name, src, box, method in JOBS:
        img = cv2.imread(f"{SRC}/{src}")
        x1, y1, x2, y2 = box
        crop = img[y1:y2, x1:x2].copy()
        alpha = rembg_mask(crop) if method == "rembg" else bluekey_mask(crop)
        cov = float((alpha > 128).mean())
        h, w = alpha.shape
        ys, xs = np.where(alpha > 128)
        touches = len(ys) and (ys.min() <= 1 or xs.min() <= 1 or ys.max() >= h - 2 or xs.max() >= w - 2)
        status = "✓"
        if cov < 0.06 or cov > 0.92 or (touches and cov > 0.55):
            status = "✗"
            bad.append((name, round(cov * 100, 1), method, "لبه" if touches else "پوشش"))
            continue
        crop = despill(crop, alpha)
        rgba = trim(np.dstack([crop, alpha]))
        if rgba is None:
            bad.append((name, 0, method, "خالی")); continue
        ah, aw = rgba.shape[:2]
        target = int(SIZE * FILL)
        s = min(target / aw, target / ah)
        sub = cv2.resize(rgba, (max(1, int(aw * s)), max(1, int(ah * s))), interpolation=cv2.INTER_AREA)
        out = compose(sub, bg)
        Image.fromarray(cv2.cvtColor(out, cv2.COLOR_BGR2RGB)).save(f"{OUT}/{name}.png")
        print(f"{status} {name:22} {method:8} پوشش={cov*100:5.1f}%  {aw}×{ah}")
    if bad:
        print("\n— نیازمند اصلاح:")
        for b in bad:
            print("   ", b)


if __name__ == "__main__":
    main()
