#!/usr/bin/env python3
"""HELSA — PART G: Inventory stress test.
سناریو: خرید هم‌زمان ۱۰ مشتری روی موجودی محدود → بدون oversell/منفی؛ لغو → بازگردانی.
"""
import json
import os
import threading
import urllib.request
import uuid

BASE = os.environ.get("HELSA_BASE", "http://localhost:3000")
PASS = 0
FAIL = 0
LOCK = threading.Lock()


def check(name, cond, detail=""):
    global PASS, FAIL
    with LOCK:
        print(f"  {'✅' if cond else '❌'} {name}" + (f"  [{detail}]" if detail else ""))
        PASS += 1 if cond else 0
        FAIL += 0 if cond else 1


def req(method, path, body=None, cookies=None, ip="10.31.0.%d" % (uuid.uuid4().int % 200 + 5)):
    r = urllib.request.Request(BASE + path, method=method)
    r.add_header("Content-Type", "application/json")
    r.add_header("Origin", BASE)
    r.add_header("X-Forwarded-For", ip)
    if cookies:
        r.add_header("Cookie", cookies)
    data = json.dumps(body).encode() if body is not None else None
    if data:
        r.data = data
    try:
        with urllib.request.urlopen(r, timeout=30) as res:
            raw = res.read().decode()
            return res.status, dict(res.headers), (json.loads(raw) if raw.startswith(("{", "[")) else raw)
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, dict(e.headers), json.loads(raw)
        except Exception:
            return e.code, dict(e.headers), {"message": raw[:200]}
    except Exception as ex:
        return 0, {}, {"message": str(ex)}


def cookie_of(headers):
    for k, v in headers.items():
        if k.lower() == "set-cookie" and "helsa_session" in v:
            return v.split(";")[0]
    return None


def admin_login():
    s, h, d = req("POST", "/api/auth/login", {"identifier": "owner@helsa.dev", "password": "Owner#2026"}, ip="10.31.9.9")
    assert s == 200, f"admin login {s}"
    return cookie_of(h)


def product_by_slug(slug):
    s, _, d = req("GET", "/api/products")
    for p in d["products"]:
        if p["slug"] == slug:
            return p
    return None


def stock_of(pid, admin):
    s, _, d = req("GET", "/api/admin/inventory", cookies=admin)
    if s != 200:
        return None
    for it in d.get("inventory") or []:
        if it.get("id") == pid:
            return it.get("stock")
    return None


def set_stock(pid, qty, admin, reason="اصلاح موجودی"):
    s, _, d = req("PATCH", f"/api/admin/inventory/{pid}", {"mode": "set", "quantity": qty, "reason": reason}, cookies=admin)
    return s, d


def order(qty, pid, mobile):
    body = {
        "customer": {"firstName": "استرس", "lastName": "انبار", "mobile": mobile, "email": ""},
        "address": {"province": "تهران", "city": "تهران", "full": "خیابان تست، پلاک ۱", "postal": "1234567890",
                     "recipient": "استرس انبار", "phone": mobile, "label": "منزل", "plate": "1", "unit": "", "default": False},
        "items": [{"key": f"p-{pid}", "qty": qty}],
        "couponCode": None,
        "shippingMethod": "standard",
        "paymentMethod": "cod",
        "idempotencyKey": str(uuid.uuid4()),
    }
    return req("POST", "/api/orders", body, ip="10.31.1.%d" % (uuid.uuid4().int % 200 + 5))


def main():
    print("── PART G: استرس انبار ──")
    admin = admin_login()
    check("لاگین ادمین", bool(admin))

    # محصول کم‌ریسک با موجودی کافی
    p = product_by_slug("lentils")
    pid = p["id"]
    orig = p["stock"]

    # ۱) ست کردن موجودی روی ۲۰
    s, d = set_stock(pid, 20, admin)
    check("ست موجودی = ۲۰ از پنل ادمین", s == 200, f"{s}")
    s2 = stock_of(pid, admin)
    check("موجودی ادمین = ۲۰", s2 == 20, f"{s2}")

    # ۲) ۱۰ مشتری هم‌زمان × qty 3 (تقاضا ۳۰ > موجودی ۲۰)
    results = []
    def worker(i):
        st, _, dd = order(3, pid, f"0914%07d" % (3000000 + i))
        results.append((st, dd))
    threads = [threading.Thread(target=worker, args=(i,)) for i in range(10)]
    for t in threads: t.start()
    for t in threads: t.join()
    ok = [r for r in results if r[0] in (200, 201)]
    rejected = [r for r in results if r[0] not in (200, 201)]
    check("دقیقاً ۶ سفارش موفق (۱۸ از ۲۰)", len(ok) == 6, f"ok={len(ok)} rejected={len(rejected)}")
    check("۴ سفارش به‌درستی رد شد", len(rejected) == 4, f"{[r[0] for r in rejected]}")
    final = stock_of(pid, admin)
    check("موجودی نهایی = ۲ (بدون oversell)", final == 2, f"{final}")
    check("هیچ موجودی منفی", (final or 0) >= 0, f"{final}")

    # ۳) سفارش بیشتر از باقی‌مانده → رد
    st, _, d = order(3, pid, "09143334441")
    check("سفارش qty 3 با ۲ باقی‌مانده → رد", st not in (200, 201), f"{st}")
    st2, _, d2 = order(2, pid, "09143334442")
    check("سفارش qty 2 → موفق", st2 in (200, 201), f"{st2}")
    check("موجودی = ۰", stock_of(pid, admin) == 0, f"{stock_of(pid, admin)}")

    # ۴) سفارش روی موجودی صفر → رد تمیز
    st3, _, d3 = order(1, pid, "09143334443")
    check("سفارش روی موجودی صفر → رد (نه کرش)", st3 not in (200, 201) and st3 != 500, f"{st3} {str(d3)[:60]}")

    # ۵) لغو یک سفارش → بازگردانی موجودی
    code = None
    if ok:
        code = ok[0][1].get("order", {}).get("code") or ok[0][1].get("code")
    if code:
        soid = None
        s, _, d = req("GET", "/api/admin/orders?limit=50", cookies=admin)
        for o in (d.get("orders") or []):
            if o.get("code") == code:
                soid = o.get("id")
                break
        if soid:
            st, _, dd = req("PATCH", f"/api/admin/orders/{soid}", {"status": "cancelled", "paymentStatus": "pending"}, cookies=admin)
            check("لغو سفارش موفق", st == 200, f"{st}")
            after = stock_of(pid, admin)
            check("بازگردانی موجودی پس از لغو (+3 → ۳)", after == 3, f"{after}")
        else:
            check("یافتن سفارش در پنل ادمین", False, code)
    else:
        check("حداقل یک سفارش برای تست لغو", False)

    # ۶) تراز نهایی inventory_movements
    check("موجودی نهایی منفی نیست", (stock_of(pid, admin) or 0) >= 0)

    # ۷) بازگردانی موجودی اولیه
    s, d = set_stock(pid, orig, admin)
    check(f"بازگردانی موجودی اولیه ({orig})", s == 200)

    print(f"\n═══ INVENTORY STRESS: {PASS} PASS / {FAIL} FAIL ═══")
    exit(1 if FAIL else 0)


main()
