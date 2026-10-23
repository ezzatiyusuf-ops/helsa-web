#!/usr/bin/env python3
"""تست ماسک v3: بذر از دل میدان آبی، رشد به کل شیء (بدون حاشیهٔ نقش‌دار فرش)."""
import cv2
import numpy as np

SRC = "/home/user/uploads"
NAMES = ['IMG_3587', 'IMG_3588', 'IMG_3589', 'IMG_3590', 'IMG_3575',
         'IMG_3574', 'IMG_3577', 'IMG_3608', 'IMG_3606', 'IMG_3609']


def blue_field(hsv):
    m = cv2.inRange(hsv, (68, 25, 12), (142, 255, 255))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((81, 81), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((41, 41), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
    if n < 2:
        return np.zeros_like(m)
    i = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
    return (lab == i).astype(np.uint8) * 255


def product_mask(img):
    h, w = img.shape[:2]
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    field = blue_field(hsv)
    nonblue = cv2.bitwise_not(cv2.inRange(hsv, (60, 22, 10), (148, 255, 255)))
    nonblue = cv2.morphologyEx(nonblue, cv2.MORPH_OPEN, np.ones((7, 7), np.uint8))
    nonblue = cv2.morphologyEx(nonblue, cv2.MORPH_CLOSE, np.ones((21, 21), np.uint8))

    n, lab, st, _ = cv2.connectedComponentsWithStats(nonblue, 8)
    # حلقهٔ اطراف هر مؤلفه: اگر بیشترش آبیِ فرش بود ⇒ شیء روی فرش است
    ring_k = max(15, int(min(h, w) * 0.012) | 1)
    keep = np.zeros_like(nonblue)
    for i in range(1, n):
        area = st[i, cv2.CC_STAT_AREA]
        if area < 0.004 * h * w:
            continue
        comp = (lab == i).astype(np.uint8) * 255
        ring = cv2.subtract(cv2.dilate(comp, np.ones((ring_k, ring_k), np.uint8)), comp)
        if np.count_nonzero(cv2.bitwise_and(ring, field)) > 0.55 * np.count_nonzero(ring):
            keep[comp > 0] = 255
    # پرکردن حفره‌های داخلی
    ff = keep.copy()
    mm = np.zeros((h + 2, w + 2), np.uint8)
    for x in range(0, w, max(1, w // 80)):
        if ff[0, x] == 255: cv2.floodFill(ff, mm, (x, 0), 128)
        if ff[h - 1, x] == 255: cv2.floodFill(ff, mm, (x, h - 1), 128)
    for y in range(0, h, max(1, h // 80)):
        if ff[y, 0] == 255: cv2.floodFill(ff, mm, (0, y), 128)
        if ff[y, w - 1] == 255: cv2.floodFill(ff, mm, (w - 1, y), 128)
    keep = cv2.bitwise_or(keep, (ff == 255).astype(np.uint8) * 255)
    # حذف مؤلفه‌های چسبیده به لبهٔ تصویر (سنگ مرمر/حاشیه)
    n, lab, st, _ = cv2.connectedComponentsWithStats(keep, 8)
    final = np.zeros_like(keep)
    for i in range(1, n):
        x, y, bw, bh, area = st[i]
        touches = x <= 2 or y <= 2 or x + bw >= w - 2 or y + bh >= h - 2
        if area > 0.004 * h * w and not (touches and area > 0.25 * h * w):
            final[lab == i] = 255
    return cv2.GaussianBlur(final, (0, 0), 1.2), field


if __name__ == "__main__":
    for n in NAMES:
        img = cv2.imread(f"{SRC}/{n}.jpeg")
        m, f = product_mask(img)
        ys, xs = np.where(m > 128)
        bb = (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())) if len(xs) else None
        print(f"{n} cover={100*(m>128).mean():5.1f}% bbox={bb}")
        s = 330 / img.shape[1]
        small = cv2.resize(img, (330, int(img.shape[0] * s)))
        ms = cv2.resize(m, (330, int(img.shape[0] * s)))
        vis = small.copy()
        vis[ms > 128] = (vis[ms > 128] * 0.3 + np.array([30, 235, 30]) * 0.7).astype(np.uint8)
        cv2.imwrite(f"/tmp/cut/m3_{n}.jpg", np.hstack([vis, cv2.cvtColor(ms, cv2.COLOR_GRAY2BGR)]))
