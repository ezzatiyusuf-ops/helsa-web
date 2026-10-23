#!/usr/bin/env python3
"""تست: خنثی‌سازی رنگ آبیِ فرش به‌صورت سراسری (بدون ماسک روی محصول)."""
import cv2
import numpy as np

SRC = '/home/user/uploads'


def plasterize(bgr):
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV).astype(np.float32)
    h, s, v = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]
    # آبی‌ها (H≈85–140، اشباع کم‌وبیش) → خنثی و روشن
    w = np.clip((h - 82) / 12.0, 0, 1) * np.clip((148 - h) / 12.0, 0, 1)
    w = w * np.clip((s - 18) / 35.0, 0, 1)
    new_s = s * (1 - w) + (s * 0.10) * w
    new_v = v * (1 - w) + (v * 0.42 + 218 * 0.58) * w
    out = np.dstack([h, new_s, new_v]).astype(np.uint8)
    out = cv2.cvtColor(out, cv2.COLOR_HSV2BGR)
    # گرید نهایی: کمی گرم‌تر + کنتراست ملایم
    f = out.astype(np.float32)
    f[:, :, 1] *= 1.01   # G
    f[:, :, 2] *= 1.02   # R
    f = np.clip(f, 0, 255).astype(np.uint8)
    lab = cv2.cvtColor(f, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    l = cv2.createCLAHE(clipLimit=1.6, tileGridSize=(8, 8)).apply(l)
    return cv2.cvtColor(cv2.merge([l, a, b]), cv2.COLOR_LAB2BGR)


for n in ['IMG_3587', 'IMG_3588', 'IMG_3589', 'IMG_3575', 'IMG_3608']:
    img = cv2.imread(f'{SRC}/{n}.jpeg')
    out = plasterize(img)
    cv2.imwrite(f'/tmp/cut/pz_{n}.jpg', cv2.resize(out, (380, int(380 * out.shape[0] / out.shape[1]))))
    print('✓', n)
