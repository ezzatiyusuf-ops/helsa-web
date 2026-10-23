#!/usr/bin/env python3
"""
HELSA QA — PART A step 6: Premium Tray Builder journey over the public API,
with INDEPENDENT price recomputation (constants mirrored from config, math
re-implemented here — if server and this script disagree, the test fails).
"""
import json
import sys
import urllib.request
import urllib.error

BASE = "http://localhost:3000"
PASS, FAIL = [], []

# config mirror (from src/config/tray-builder.ts)
SIZE = {"small": 950_000, "medium": 1_650_000, "large": 2_450_000, "xl": 3_400_000,
        "vip": 3_900_000, "corporate": 4_800_000, "event": 6_200_000, "custom": 800_000}
BASEPRICE = {"wood": 0, "stone": 180_000, "ceramic": 140_000, "acrylic": 150_000}
ITEM = {"dates-mazafati": 240_000, "dip-hummus": 130_000, "cheese-feta": 220_000,
        "nuts-pistachio": 340_000, "dates-kabkab": 210_000, "drink-coffee": 140_000}
DECOR = {"medallion": 50_000, "flower": 100_000, "candles": 80_000}
WRAP = {"none": 0, "box": 180_000, "lux": 320_000}
ARR, MSG, DEL, TAX = 150_000, 30_000, 120_000, 0.0
MIN_ITEMS, MAX_PORTIONS = 4, 24


def guest_factor(g):
    return 0.6 + g * 0.09


def expect(size, base, guests, items, decor, wrap, message):
    """independent re-implementation of the documented pricing model"""
    portions = sum(items.values())
    food_raw = sum(ITEM[k] * q for k, q in items.items()) * guest_factor(guests)
    food = round(food_raw / 10_000) * 10_000
    lines = [SIZE[size] + BASEPRICE[base], food, ARR]
    lines += [DECOR[d] for d in decor]
    if WRAP[wrap]:
        lines.append(WRAP[wrap])
    if message:
        lines.append(MSG)
    lines.append(DEL)
    if TAX > 0:
        sub = sum(lines)
        lines.append(round(sub * TAX / 10_000) * 10_000)
    return portions, sum(lines)


def check(name, cond, detail=""):
    (PASS if cond else FAIL).append(name)
    print(f"  {'✅' if cond else '❌'} {name}" + (f"  [{detail}]" if detail and not cond else ""))


def quote(body):
    r = urllib.request.Request(BASE + "/api/tray-builder/quote", data=json.dumps(body).encode(),
                               headers={"Content-Type": "application/json", "Origin": BASE, "X-Forwarded-For": "10.77.2.10"}, method="POST")
    try:
        with urllib.request.urlopen(r, timeout=30) as res:
            return res.status, json.loads(res.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")


def main():
    print("━━━ A6 · سازنده سینی — دقت قیمت در هر تغییر ━━━")
    # 1. initial tray
    cfg = dict(size="small", base="wood", guests=6,
               items={"dates-mazafati": 1, "dip-hummus": 1, "cheese-feta": 1, "nuts-pistachio": 1},
               decor=[], wrap="none", message=False)
    s, d = quote({**cfg, "items": [{"id": k, "qty": q} for k, q in cfg["items"].items()],
                  "decor": cfg["decor"], "giftWrap": cfg["wrap"], "message": cfg["message"]})
    p, total = expect(**{k: cfg[k] for k in ("size", "base", "guests", "items", "decor", "wrap", "message")})
    check("۱) سینی اولیه (small/wood/۶نفره) ثبت شد", s == 200 and d.get("ok"))
    check(f"۱) قیمت = {total:,} (محاسبه مستقل)", d.get("quote", {}).get("total") == total,
          f"server={d.get('quote', {}).get('total')} local={total}")

    # 2. add two items (kabkab×2, coffee×1)
    cfg["items"]["dates-kabkab"] = 2
    cfg["items"]["drink-coffee"] = 1
    s, d = quote({**cfg, "items": [{"id": k, "qty": q} for k, q in cfg["items"].items()],
                  "decor": cfg["decor"], "giftWrap": cfg["wrap"], "message": cfg["message"]})
    p, total = expect(**{k: cfg[k] for k in ("size", "base", "guests", "items", "decor", "wrap", "message")})
    check("۲) افزودن ۲ قلم جدید", s == 200 and d.get("quote", {}).get("total") == total,
          f"server={d.get('quote', {}).get('total')} local={total} portions={p}")

    # 3. quantity change pistachio 1→3
    cfg["items"]["nuts-pistachio"] = 3
    s, d = quote({**cfg, "items": [{"id": k, "qty": q} for k, q in cfg["items"].items()],
                  "decor": cfg["decor"], "giftWrap": cfg["wrap"], "message": cfg["message"]})
    p, total = expect(**{k: cfg[k] for k in ("size", "base", "guests", "items", "decor", "wrap", "message")})
    check("۳) تغییر تعداد پسته ۱→۳", s == 200 and d.get("quote", {}).get("total") == total,
          f"server={d.get('quote', {}).get('total')} local={total} portions={p}")

    # 4. remove hummus
    del cfg["items"]["dip-hummus"]
    s, d = quote({**cfg, "items": [{"id": k, "qty": q} for k, q in cfg["items"].items()],
                  "decor": cfg["decor"], "giftWrap": cfg["wrap"], "message": cfg["message"]})
    p, total = expect(**{k: cfg[k] for k in ("size", "base", "guests", "items", "decor", "wrap", "message")})
    check("۴) حذف حمص", s == 200 and d.get("quote", {}).get("total") == total,
          f"server={d.get('quote', {}).get('total')} local={total}")

    # 5. size/base/guests/decor/wrap/message all changed at once
    cfg.update(size="corporate", base="stone", guests=20, decor=["flower", "candles"], wrap="lux", message=True)
    s, d = quote({**cfg, "items": [{"id": k, "qty": q} for k, q in cfg["items"].items()],
                  "decor": cfg["decor"], "giftWrap": cfg["wrap"], "message": cfg["message"]})
    p, total = expect(**{k: cfg[k] for k in ("size", "base", "guests", "items", "decor", "wrap", "message")})
    qd = d.get("quote", {})
    check("۵) تغییر هم‌زمان اندازه/پایه/مهمان/تزئین/بسته/پیام", s == 200 and qd.get("total") == total,
          f"server={qd.get('total')} local={total}")
    check("۵) برچسب اندازه درست (سازمانی · سنگی)", qd.get("sizeLabel") == "سازمانی · سنگی", qd.get("sizeLabel"))
    check("۵) ردیف‌های فاکتور شامل تزئین/بسته/پیام است",
          any("گل طبیعی" in l["label"] for l in qd.get("lines", [])) and any("کادوی لوکس" in l["label"] for l in qd.get("lines", [])) and any("کارت پیام" in l["label"] for l in qd.get("lines", [])))
    quote_id = qd.get("id")

    # 6. guards
    s, d = quote({"size": "small", "base": "wood", "guests": 6, "giftWrap": "none",
                  "items": [{"id": "dates-mazafati", "qty": 1}, {"id": "cheese-feta", "qty": 1}, {"id": "nuts-pistachio", "qty": 1}]})
    check("۶) کمتر از ۴ قلم متمایز → 400", s == 400, f"{s}")
    s, d = quote({"size": "event", "base": "wood", "guests": 30, "giftWrap": "none",
                  "items": [{"id": k, "qty": 5} for k in ["dates-mazafati", "cheese-feta", "nuts-pistachio", "drink-coffee", "dates-kabkab"]]})
    check("۶) بیش از ۲۴ پورشن → 400", s == 400, f"{s}")
    s, d = quote({"size": "gigantic", "base": "wood", "guests": 6, "giftWrap": "none",
                  "items": [{"id": k, "qty": 1} for k in ["dates-mazafati", "cheese-feta", "nuts-pistachio", "drink-coffee"]]})
    check("۶) اندازه نامعتبر → 400", s == 400, f"{s}")
    s, d = quote({"size": "small", "base": "wood", "guests": 99, "giftWrap": "none",
                  "items": [{"id": k, "qty": 1} for k in ["dates-mazafati", "cheese-feta", "nuts-pistachio", "drink-coffee"]]})
    check("۶) مهمان خارج از محدوده → 400", s == 400, f"{s}")

    print(f"\n═══ A6: {len(PASS)} PASS / {len(FAIL)} FAIL ═══ quote_id={quote_id}")
    if FAIL:
        print("Failed:", *FAIL, sep="\n  - ")
        sys.exit(1)


if __name__ == "__main__":
    main()
