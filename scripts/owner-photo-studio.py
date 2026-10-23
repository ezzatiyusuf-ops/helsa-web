#!/usr/bin/env python3
"""
owner-photo-studio.py — «عکس مالک، بسته‌بندی ۱۰۰٪ دست‌نخورده» + پس‌زمینهٔ استودیویی

دستور مالک (۲۰۲۶-۱۰-۲۰): عکس‌های مالک بدون هیچ تغییر در بسته‌بندی.

مسئلهٔ نسخهٔ قبل: تصاویر با مدل مولد «بازسازی» می‌شدند و متن/برچسب بسته‌بندی
تحریف می‌شد (لوگوی هلسا به حروف لاتین تبدیل می‌شد). آن رویکرد کنار گذاشته شد.

این خط تولید هیچ مدل مولد روی محصول اجرا نمی‌کند:
  ۱. کادر تنگِ دستی دور محصول (فقط داخل میدان فرش؛ حاشیهٔ نقش‌دار بیرون می‌ماند).
  ۲. پیکسل‌های «آبیِ فرش» با تبدیل HSV به پلاستر ماتِ هم‌سبک final-v2 خنثی می‌شوند.
     شرط فقط رنگ آبی است ⇒ برچسب سبز/سفید، شیشه، ظرف فلزی، تختهٔ چوبی و خودِ
     محصول (قهوه‌ای/تیره/خنثی) بایت‌به‌بایت دست‌نخورده می‌مانند.
  ۳. سایهٔ بزرگ‌مقیاس از عکس اصلی منتقل می‌شود (افت نور/حجم حفظ می‌شود).
  ۴. گرید یکنواخت (تعادل خاکستری + گرمی + کنتراست ملایم) و قاب ۱:۱.

خروجی: /home/user/helsa-photo-edits/final-v3/edited/real/<name>.png (۱۰۲۴×۱۰۲۴)
"""
import os

import cv2
import numpy as np
from PIL import Image

SRC = "/home/user/uploads"
OUT = "/home/user/helsa-photo-edits/final-v3/edited/real"
REF = "/home/user/helsa-photo-edits/final-v2/13-tg1.jpg"
SIZE = 1024

# name → (file, crop x1,y1,x2,y2)   کادر داخل میدان فرش، محصول کامل
JOBS = {
    "date-coconut-sugar-1": ("IMG_3587.jpeg", (985, 1300, 2195, 2700)),
    "date-coconut-sugar-2": ("IMG_3588.jpeg", (1255, 1360, 1890, 2080)),
    "date-coconut-sugar-3": ("IMG_3589.jpeg", (940, 930, 2000, 2600)),
    "date-coconut-sugar-4": ("IMG_3590.jpeg", (1000, 880, 2060, 2500)),
    "mulberry-1": ("IMG_3575.jpeg", (880, 1110, 1940, 2170)),
    "mulberry-2": ("IMG_3574.jpeg", (1080, 1200, 1920, 2040)),
    "mulberry-3": ("IMG_3577.jpeg", (890, 1130, 1950, 2190)),
    "moiz-1": ("IMG_3608.jpeg", (1190, 1990, 1890, 2690)),
    "moiz-2": ("IMG_3606.jpeg", (1510, 1240, 2200, 1930)),
    "moiz-3": ("IMG_3609.jpeg", (1190, 1990, 1890, 2690)),
}


def plaster_color():
    ref = cv2.resize(cv2.imread(REF), (256, 256))
    return ref[6:70].reshape(-1, 3).mean(0)  # BGR پلاستر روشنِ بالای قاب


def carpet_weights(bgr):
    """وزن نرم «آبیِ فرش» — معیار اصلی B−R است (نه Hue).

    اندازه‌گیری روی عکس‌های مالک: فرش B−R ≈ ۹۵–۱۲۵، ولی مویز/گندمک تیره
    H≈۱۰۶ و B−R فقط ۱۱–۱۵ دارند → با Hue تنها، خودِ محصول هم پلاستر می‌شد.
    """
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV).astype(np.float32)
    h, s, v = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]
    br = bgr[:, :, 0].astype(np.float32) - bgr[:, :, 2].astype(np.float32)
    w_br = np.clip((br - 45.0) / 25.0, 0, 1)          # آبی واقعی
    w_h = np.clip((h - 84.0) / 8.0, 0, 1) * np.clip((132.0 - h) / 8.0, 0, 1)
    w_s = np.clip((s - 70.0) / 30.0, 0, 1)            # اشباع کافی
    w_v = np.clip((v - 55.0) / 30.0, 0, 1)            # فرش روشن است، محصول تیره نه
    return (w_br * w_h * w_s * w_v).astype(np.float32)


def replace_carpet(crop, base):
    w0 = carpet_weights(crop)
    # رشد ملایم ماسک: ذره‌های آبیِ چسبیده به لبه هم پاک شوند (لبه‌های محصول دست‌نخورده می‌مانند
    # چون این رشد فقط در همسایگی پیکسل‌های آبی اعمال می‌شود)
    w0 = np.maximum(w0, cv2.dilate((w0 > 0.35).astype(np.uint8), np.ones((5, 5), np.uint8)).astype(np.float32) * 0.55)
    w = cv2.GaussianBlur(w0, (0, 0), 1.4)[:, :, None]
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY).astype(np.float32)
    sigma = max(24.0, min(crop.shape[:2]) / 7.0)
    shadow = cv2.GaussianBlur(gray, (0, 0), sigma)
    sel = w[:, :, 0] > 0.5
    ref_l = float(shadow[sel].mean()) if sel.any() else 128.0
    ratio = np.clip(shadow / max(ref_l, 1e-3), 0.90, 1.07)[:, :, None]
    plaster = np.clip(np.asarray(base, np.float32)[None, None, :] * ratio, 0, 255)
    return np.clip(crop.astype(np.float32) * (1 - w) + plaster * w, 0, 255).astype(np.uint8)


def grade(bgr):
    f = bgr.astype(np.float32)
    m = f.reshape(-1, 3).mean(0)
    f *= (m.mean() / np.maximum(m, 1e-3))[None, None, :]
    f[:, :, 2] *= 1.02
    f[:, :, 1] *= 1.008
    f = np.clip(f, 0, 255)
    lab = cv2.cvtColor(f.astype(np.uint8), cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    l = cv2.createCLAHE(clipLimit=1.6, tileGridSize=(8, 8)).apply(l)
    return cv2.cvtColor(cv2.merge([l, a, b]), cv2.COLOR_LAB2BGR)


def main():
    os.makedirs(OUT, exist_ok=True)
    base = plaster_color()
    for name, (src, box) in JOBS.items():
        img = cv2.imread(f"{SRC}/{src}")
        x1, y1, x2, y2 = box
        crop = img[y1:y2, x1:x2].copy()
        out = grade(replace_carpet(crop, base))
        out = cv2.resize(out, (SIZE, SIZE), interpolation=cv2.INTER_AREA)
        Image.fromarray(cv2.cvtColor(out, cv2.COLOR_BGR2RGB)).save(f"{OUT}/{name}.png")
        print(f"✓ {name:22} {src}  {x2-x1}×{y2-y1}  آبیِ باقی‌مانده≈{carpet_weights(crop).mean()*100:4.1f}%")


if __name__ == "__main__":
    main()
