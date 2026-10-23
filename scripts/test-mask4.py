#!/usr/bin/env python3
"""ماسک v4: کادر دستی + ماسک فرش با پرکردن حفره‌ها + حذف لکه‌های ریز."""
import cv2
import numpy as np

SRC = '/home/user/uploads'


def carpet_mask(bgr):
    h, w = bgr.shape[:2]
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    m = cv2.inRange(hsv, (55, 25, 8), (150, 255, 255))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((11, 11), np.uint8))
    # پرکردن حفره‌های کوچک داخل فرش (نقش‌ها) — نه شیء اصلی
    ff = m.copy()
    mm = np.zeros((h + 2, w + 2), np.uint8)
    for x in range(0, w, max(1, w // 60)):
        if ff[0, x] == 255: cv2.floodFill(ff, mm, (x, 0), 128)
        if ff[h - 1, x] == 255: cv2.floodFill(ff, mm, (x, h - 1), 128)
    for y in range(0, h, max(1, h // 60)):
        if ff[y, 0] == 255: cv2.floodFill(ff, mm, (0, y), 128)
        if ff[y, w - 1] == 255: cv2.floodFill(ff, mm, (w - 1, y), 128)
    holes = (ff == 255).astype(np.uint8) * 255
    # فقط حفره‌های کوچک (نقش فرش) پر شوند، نه خود محصول
    n, lab, st, _ = cv2.connectedComponentsWithStats(holes, 8)
    small = np.zeros_like(holes)
    for i in range(1, n):
        if st[i, cv2.CC_STAT_AREA] < 0.012 * h * w:
            small[lab == i] = 255
    m = cv2.bitwise_or(m, small)
    return cv2.GaussianBlur(m, (0, 0), 1.6)


TESTS = [
    ("jar", 'IMG_3588', (1150, 1250, 2020, 2260)),
    ("bowl", 'IMG_3587', (940, 1200, 2300, 2820)),
    ("mulb2", 'IMG_3574', (1080, 830, 2120, 1790)),
    ("rais", 'IMG_3608', (800, 1100, 2000, 2000)),
    ("group", 'IMG_3589', (700, 600, 2600, 2850)),
]
for tag, n, box in TESTS:
    img = cv2.imread(f'{SRC}/{n}.jpeg')
    x1, y1, x2, y2 = box
    crop = img[y1:y2, x1:x2].copy()
    m = carpet_mask(crop)
    base = np.array([184, 208, 231], np.float32)  # BGR پلاستر
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY).astype(np.float32)
    k = max(41, (min(crop.shape[:2]) // 10) | 1)
    local = cv2.GaussianBlur(gray, (k, k), 0)
    ml = float(local[m > 128].mean()) if (m > 128).any() else 128
    ratio = np.clip(local / max(ml, 1e-3), 0.80, 1.15)[:, :, None]
    plas = np.clip(base[None, None, :] * ratio, 0, 255)
    a = (m.astype(np.float32) / 255)[:, :, None]
    out = np.clip(crop.astype(np.float32) * (1 - a) + plas * a, 0, 255).astype(np.uint8)
    print(f"{tag:6} {n} {x2-x1}×{y2-y1} carpet={100*(m>128).mean():4.1f}%")
    cv2.imwrite(f'/tmp/cut/m4_{tag}.jpg', cv2.resize(out, (400, int(400 * out.shape[0] / out.shape[1]))))
