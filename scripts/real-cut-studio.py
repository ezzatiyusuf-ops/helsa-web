#!/usr/bin/env python3
"""
real-cut-studio.py — «عکس مالک، بسته‌بندی دست‌نخورده» + پس‌زمینهٔ استودیویی

قاعدهٔ مالک (۲۰۲۶-۱۰-۲۰): هیچ پیکسلی از محصول/بسته‌بندی/برچسب بازسازی نشود.

روش:
  ۱. میدان آبی‌رنگِ زیرانداز (فرش) با شرط رنگ تشخیص داده می‌شود:
     B−R > 40، اشباع > 90، روشنایی > 70 — مرمر خاکستری، تخته چوبی،
     برچسب سبز/سفید، ظرف فلزی و خودِ محصول (قهوه‌ای/تیره/خنثی) در این شرط نیستند.
  ۲. فقط بزرگ‌ترین میدان نگه داشته می‌شود و حفره‌های ریزِ نقش (نه خود محصول) پر می‌شوند.
  ۳. همان ناحیه با پلاستر ماتِ هم‌سبک final-v2 جایگزین می‌شود؛ روشنایی موضعی
     (سایه/افت نور) از عکس اصلی گرفته می‌شود تا حجم و سایهٔ محصول حفظ شود.
  ۴. کادر هر عکس از «محصولِ داخل میدان» ساخته می‌شود (با حاشیهٔ تنفس) و ۱:۱ می‌شود.

خروجی: /home/user/helsa-photo-edits/final-v3/edited/ready/<name>.png  (۱۰۲۴×۱۰۲۴)
"""
import os

import cv2
import numpy as np
from PIL import Image

SRC = "/home/user/uploads"
OUT = "/home/user/helsa-photo-edits/final-v3/edited/ready"
REF = "/home/user/helsa-photo-edits/final-v2/13-tg1.jpg"
SIZE = 1024

JOBS = [
    ("date-coconut-sugar-1", "IMG_3587.jpeg"),
    ("date-coconut-sugar-2", "IMG_3588.jpeg"),
    ("date-coconut-sugar-3", "IMG_3589.jpeg"),
    ("date-coconut-sugar-4", "IMG_3590.jpeg"),
    ("mulberry-1", "IMG_3575.jpeg"),
    ("mulberry-2", "IMG_3574.jpeg"),
    ("mulberry-3", "IMG_3577.jpeg"),
    ("moiz-1", "IMG_3608.jpeg"),
    ("moiz-2", "IMG_3606.jpeg"),
    ("moiz-3", "IMG_3609.jpeg"),
]


def plaster_color():
    ref = cv2.resize(cv2.imread(REF), (256, 256))
    return ref[6:70].reshape(-1, 3).mean(0)


def blue_raw(bgr):
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    h, s, v = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]
    b = bgr[:, :, 0].astype(np.int16)
    r = bgr[:, :, 2].astype(np.int16)
    return (((b - r) > 40) & (s > 90) & (v > 70) & (h > 85) & (h < 125)).astype(np.uint8) * 255


def largest(mask, ratio=0.15):
    n, lab, st, _ = cv2.connectedComponentsWithStats(mask, 8)
    if n < 2:
        return np.zeros_like(mask)
    areas = st[1:, cv2.CC_STAT_AREA]
    best = 1 + int(np.argmax(areas))
    out = np.zeros_like(mask)
    for i in range(1, n):
        if st[i, cv2.CC_STAT_AREA] >= ratio * st[best, cv2.CC_STAT_AREA]:
            out[lab == i] = 255
    return out


def fill_small_holes(mask, max_frac=0.02):
    """حفره‌های ریز (نقش فرش) پر می‌شوند؛ حفرهٔ بزرگ = محصول، دست‌نخورده می‌ماند."""
    h, w = mask.shape
    inv = cv2.bitwise_not(mask)
    n, lab, st, _ = cv2.connectedComponentsWithStats(inv, 8)
    add = np.zeros_like(mask)
    for i in range(1, n):
        x, y, bw, bh, area = st[i]
        touches = x == 0 or y == 0 or x + bw == w or y + bh == h
        if not touches and area < max_frac * h * w:
            add[lab == i] = 255
    return cv2.bitwise_or(mask, add)


def carpet_mask(bgr):
    m = blue_raw(bgr)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((13, 13), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((7, 7), np.uint8))
    m = largest(m, 0.15)
    m = fill_small_holes(m, 0.02)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((41, 41), np.uint8))
    return cv2.GaussianBlur(m, (0, 0), 2.0)


def object_box(img, mask):
    """کادر محصول: حفره‌های بزرگ داخل میدان (خود محصول)."""
    h, w = img.shape[:2]
    inv = cv2.bitwise_not((mask > 110).astype(np.uint8) * 255)
    inv = cv2.bitwise_and(inv, (mask > 60).astype(np.uint8) * 255 | 0)  # داخل میدان
    inv = cv2.bitwise_not((mask > 110).astype(np.uint8) * 255)
    n, lab, st, _ = cv2.connectedComponentsWithStats(inv, 8)
    if n < 2:
        return None
    hb = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
    x, y, bw, bh, area = st[hb]
    if area < 0.01 * h * w:
        return None
    return x, y, bw, bh


def replace_carpet(crop, mask, base):
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY).astype(np.float32)
    k = max(41, (min(crop.shape[:2]) // 9) | 1)
    local = cv2.GaussianBlur(gray, (k, k), 0)
    ref_l = float(local[mask > 128].mean()) if (mask > 128).any() else 128.0
    ratio = np.clip(local / max(ref_l, 1e-3), 0.86, 1.08)[:, :, None]
    plaster = np.clip(np.asarray(base, np.float32)[None, None, :] * ratio, 0, 255)
    a = (mask.astype(np.float32) / 255.0)[:, :, None]
    return np.clip(crop.astype(np.float32) * (1 - a) + plaster * a, 0, 255).astype(np.uint8)


def to_square(img, base):
    h, w = img.shape[:2]
    side = max(h, w)
    canvas = np.zeros((side, side, 3), np.uint8)
    canvas[:, :] = base
    oy, ox = (side - h) // 2, (side - w) // 2
    canvas[oy:oy + h, ox:ox + w] = img
    return cv2.resize(canvas, (SIZE, SIZE), interpolation=cv2.INTER_AREA)


def main():
    os.makedirs(OUT, exist_ok=True)
    base = plaster_color()
    for name, src in JOBS:
        img = cv2.imread(f"{SRC}/{src}")
        mask_full = carpet_mask(img)
        box = object_box(img, mask_full)
        h, w = img.shape[:2]
        if box is None:
            print(f"✗ {name}: محصول داخل فرش پیدا نشد")
            continue
        x, y, bw, bh = box
        pad = int(max(bw, bh) * 0.22)
        x1, y1 = max(0, x - pad), max(0, y - pad)
        x2, y2 = min(w, x + bw + pad), min(h, y + bh + pad)
        crop = img[y1:y2, x1:x2].copy()
        mask = carpet_mask(crop)
        out = replace_carpet(crop, mask, base)
        out = to_square(out, base)
        Image.fromarray(cv2.cvtColor(out, cv2.COLOR_BGR2RGB)).save(f"{OUT}/{name}.png")
        print(f"✓ {name:22} {src} obj=({x},{y},{bw},{bh}) crop={x2-x1}×{y2-y1} carpet={100*(mask>128).mean():4.1f}%")


if __name__ == "__main__":
    main()
