#!/usr/bin/env python3
"""تست grabCut با کادر تنگ (rect-init) روی تک‌شیءها."""
import cv2
import numpy as np

SRC = "/home/user/uploads"
OUT = "/tmp/cut/gc2"

# (name, src, rect 5..10% margin inside a tight object box)
TESTS = [
    ("jar3588", "IMG_3588.jpeg", (1210, 1450, 1900, 2120)),
    ("bowl3587", "IMG_3587.jpeg", (930, 1330, 2210, 2700)),
    ("mulb3575", "IMG_3575.jpeg", (890, 320, 2210, 2020)),
    ("rais3608", "IMG_3608.jpeg", (880, 320, 1880, 1830)),
    ("jar3574", "IMG_3574.jpeg", (1010, 770, 2060, 1720)),
    ("jar3606", "IMG_3606.jpeg", (1130, 760, 1960, 1730)),
]


def grabcut(img, rect, iters=8):
    x1, y1, x2, y2 = rect
    crop = img[y1:y2, x1:x2].copy()
    h, w = crop.shape[:2]
    mask = np.zeros((h, w), np.uint8)
    bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    m = int(min(h, w) * 0.06)
    cv2.grabCut(crop, mask, (m, m, w - 2 * m, h - 2 * m), bgd, fgd, iters, cv2.GC_INIT_WITH_RECT)
    alpha = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    # تمیزکاری
    k = max(3, (min(h, w) // 200) | 1)
    alpha = cv2.morphologyEx(alpha, cv2.MORPH_OPEN, np.ones((k, k), np.uint8))
    alpha = cv2.morphologyEx(alpha, cv2.MORPH_CLOSE, np.ones((k * 3, k * 3), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(alpha, 8)
    keep = np.zeros_like(alpha)
    for i in range(1, n):
        if st[i, cv2.CC_STAT_AREA] > 0.01 * h * w:
            keep[lab == i] = 255
    return crop, cv2.GaussianBlur(keep, (0, 0), 1.0)


for name, src, rect in TESTS:
    img = cv2.imread(f"{SRC}/{src}")
    crop, a = grabcut(img, rect)
    pct = 100 * (a > 128).mean()
    print(f"{name:10} {crop.shape[1]}×{crop.shape[0]} fg={pct:5.1f}%")
    bg = np.full_like(crop, 245)
    al = (a.astype(np.float32) / 255)[:, :, None]
    comp = (crop.astype(np.float32) * al + bg.astype(np.float32) * (1 - al)).astype(np.uint8)
    s = 320 / comp.shape[1]
    cv2.imwrite(f"{OUT}_{name}.jpg", cv2.resize(comp, (320, int(comp.shape[0] * s))))
