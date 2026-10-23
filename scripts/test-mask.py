#!/usr/bin/env python3
"""تست ماسک: محصول = اجزای غیرآبی داخل میدان آبی فرش (بدون برش دستی)."""
import cv2, numpy as np, sys
from PIL import Image

SRC='/home/user/uploads'
OUT='/tmp/cut'

def blue_field(bgr):
    hsv=cv2.cvtColor(bgr,cv2.COLOR_BGR2HSV)
    m=cv2.inRange(hsv,(72,40,25),(132,255,255))
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((121,121),np.uint8))
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((41,41),np.uint8))
    n,lab,st,_=cv2.connectedComponentsWithStats(m,8)
    if n<2: return np.zeros_like(m)
    i=1+int(np.argmax(st[1:,cv2.CC_STAT_AREA]))
    field=np.zeros_like(m); field[lab==i]=255
    ff=field.copy(); mm=np.zeros((field.shape[0]+2,field.shape[1]+2),np.uint8)
    cv2.floodFill(ff,mm,(0,0),255)                 # سوراخ‌های داخل فرش (محصول) را پر کن
    field=cv2.bitwise_or(field,cv2.bitwise_not(ff))
    return field

def product_mask(bgr):
    h,w=bgr.shape[:2]
    field=blue_field(bgr)
    inner=cv2.erode(field,np.ones((161,161),np.uint8))
    hsv=cv2.cvtColor(bgr,cv2.COLOR_BGR2HSV)
    blue=cv2.inRange(hsv,(68,35,20),(135,255,255))
    obj=cv2.bitwise_and(cv2.bitwise_not(blue),inner)
    obj=cv2.morphologyEx(obj,cv2.MORPH_CLOSE,np.ones((51,51),np.uint8))
    obj=cv2.morphologyEx(obj,cv2.MORPH_OPEN,np.ones((15,15),np.uint8))
    n,lab,st,_=cv2.connectedComponentsWithStats(obj,8)
    keep=np.zeros_like(obj)
    for i in range(1,n):
        if st[i,cv2.CC_STAT_AREA] > 0.004*h*w: keep[lab==i]=255
    ff=keep.copy(); mm=np.zeros((h+2,w+2),np.uint8)
    cv2.floodFill(ff,mm,(0,0),255)
    keep=cv2.bitwise_or(keep,cv2.bitwise_not(ff))
    keep=cv2.bitwise_and(keep,inner)
    return cv2.GaussianBlur(keep,(0,0),1.2), field

names=['IMG_3587','IMG_3588','IMG_3589','IMG_3590','IMG_3575','IMG_3574','IMG_3577','IMG_3608','IMG_3606','IMG_3609']
for n in names:
    img=cv2.imread(f'{SRC}/{n}.jpeg')
    m,f=product_mask(img)
    ys,xs=np.where(m>128)
    bb=(xs.min(),ys.min(),xs.max(),ys.max()) if len(xs) else None
    print(f"{n} fg={100*(m>128).mean():5.1f}%  bbox={bb}")
    small=cv2.resize(img,(360,int(360*img.shape[0]/img.shape[1])))
    ms=cv2.resize(m,(360,int(360*img.shape[0]/img.shape[1])))
    vis=small.copy()
    vis[ms>128]=(vis[ms>128]*0.35+np.array([40,220,40])*0.65).astype(np.uint8)
    cv2.imwrite(f'{OUT}/mask_{n}.jpg',vis)
print('ok')
