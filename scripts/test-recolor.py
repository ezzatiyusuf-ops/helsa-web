#!/usr/bin/env python3
"""تست: تبدیل فرش آبی → پلاستر گرم، بدون دست‌زدن به پیکسل محصول."""
import cv2
import numpy as np

SRC = '/home/user/uploads'
REF = '/home/user/helsa-photo-edits/final-v2/13-tg1.jpg'


def blue_field(hsv):
    m = cv2.inRange(hsv, (62, 30, 12), (145, 255, 255))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((31, 31), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((15, 15), np.uint8))
    return cv2.GaussianBlur(m, (0, 0), 2)


def plaster_from_luma(luma, mask):
    """رنگ پلاستر گرم بر اساس روشنایی موضعی فرش (بافت ملایم حفظ می‌شود)."""
    ref = np.array(cv2.cvtColor(cv2.imread(REF), cv2.COLOR_BGR2RGB)).astype(np.float32)
    top = ref[10:120].reshape(-1, 3).mean(0)     # ~ (185,211,229) BGR-ish? care
    v = luma.astype(np.float32)
    mean_l = v[mask > 0].mean() if (mask > 0).any() else 128
    ratio = np.clip(v / max(mean_l, 1e-3), 0.82, 1.12)[:, :, None]
    base = np.array([182, 205, 228], np.float32)  # BGR پلاستر (~#E4CDB6 → BGR)
    return np.clip(base[None, None, :] * ratio, 0, 255)


for n in ['IMG_3588', 'IMG_3589', 'IMG_3587', 'IMG_3608']:
    img = cv2.imread(f'{SRC}/{n}.jpeg')
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    mask = blue_field(hsv)
    luma = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    plaster = plaster_from_luma(luma, mask)
    a = (mask.astype(np.float32) / 255)[:, :, None]
    out = np.clip(img.astype(np.float32) * (1 - a) + plaster * a, 0, 255).astype(np.uint8)
    cv2.imwrite(f'/tmp/cut/rc_{n}.jpg', cv2.resize(out, (400, int(400 * out.shape[0] / out.shape[1]))))
    print(n, 'mask%', round(100 * (mask > 128).mean(), 1))
