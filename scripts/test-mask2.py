#!/usr/bin/env python3
"""تست ماسک مرحله‌ای: میدان آبی فرش → ناحیهٔ داخلی → اشیای غیرآبی → مؤلفه‌های اصلی."""
import cv2
import numpy as np

SRC = "/home/user/uploads"
OUT = "/tmp/cut/m2"
NAMES = ['IMG_3587', 'IMG_3588', 'IMG_3589', 'IMG_3590', 'IMG_3575',
         'IMG_3574', 'IMG_3577', 'IMG_3608', 'IMG_3606', 'IMG_3609']


def blue_field(hsv):
    m = cv2.inRange(hsv, (70, 30, 15), (140, 255, 255))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((61, 61), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((31, 31), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
    if n < 2:
        return np.zeros_like(m)
    i = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
    return (lab == i).astype(np.uint8) * 255


def fill_holes(mask):
    inv = cv2.bitwise_not(mask)
    ff = inv.copy()
    h, w = inv.shape
    mm = np.zeros((h + 2, w + 2), np.uint8)
    st = max(1, min(h, w) // 80)
    for x in range(0, w, st):
        if ff[0, x] == 255: cv2.floodFill(ff, mm, (x, 0), 128)
        if ff[h - 1, x] == 255: cv2.floodFill(ff, mm, (x, h - 1), 128)
    for y in range(0, h, st):
        if ff[y, 0] == 255: cv2.floodFill(ff, mm, (0, y), 128)
        if ff[y, w - 1] == 255: cv2.floodFill(ff, mm, (w - 1, y), 128)
    return cv2.bitwise_or(mask, (ff == 255).astype(np.uint8) * 255)


def objects(img, erode_frac=0.055):
    h, w = img.shape[:2]
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    field = blue_field(hsv)
    sil = fill_holes(field)
    k = max(31, int(min(h, w) * erode_frac) | 1)
    interior = cv2.erode(sil, np.ones((k, k), np.uint8))
    nonblue = cv2.bitwise_not(cv2.inRange(hsv, (62, 25, 12), (145, 255, 255)))
    obj = cv2.bitwise_and(nonblue, interior)
    obj = cv2.morphologyEx(obj, cv2.MORPH_OPEN, np.ones((13, 13), np.uint8))
    obj = cv2.morphologyEx(obj, cv2.MORPH_CLOSE, np.ones((45, 45), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(obj, 8)
    keep = np.zeros_like(obj)
    for i in range(1, n):
        a = st[i, cv2.CC_STAT_AREA]
        if a >= 0.006 * h * w:
            keep[lab == i] = 255
    keep = fill_holes(keep)
    return keep, interior


for n in NAMES:
    img = cv2.imread(f"{SRC}/{n}.jpeg")
    m, interior = objects(img)
    ys, xs = np.where(m > 128)
    bb = (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())) if len(xs) else None
    print(f"{n} cover={100*(m>128).mean():5.1f}%  bbox={bb}")
    small = cv2.resize(img, (330, int(330 * img.shape[0] / img.shape[1])))
    ms = cv2.resize(m, (330, int(330 * img.shape[0] / img.shape[1])))
    vis = small.copy()
    vis[ms > 128] = (vis[ms > 128] * 0.30 + np.array([30, 235, 30]) * 0.70).astype(np.uint8)
    mask_only = cv2.cvtColor(ms, cv2.COLOR_GRAY2BGR)
    cv2.imwrite(f"{OUT}_{n}.jpg", np.hstack([vis, mask_only]))
