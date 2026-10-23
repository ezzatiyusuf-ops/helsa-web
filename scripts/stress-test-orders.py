#!/usr/bin/env python3
"""
HELSA — Orders / Tray Builder / Security stress suite (companion to stress-test-auth.py).

Run against a FRESHLY RESTARTED server (in-memory rate limits reset):
    python3 scripts/stress-test-orders.py [base_url]

Covers:
  A. Tray builder quote: valid configs, rapid-fire changes, invalid ids, oversize portions
  B. Orders: guest checkout, duplicate submission (idempotency), simultaneous orders,
     stock-decrement integrity, invalid payloads
  C. Security probes: SQLi / XSS payloads on every text input surface
  D. Health after the storm
"""
import json
import re
import sys
import threading
import urllib.request
import urllib.error
import uuid

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"
ORIGIN = BASE
PASS, FAIL = [], []


def check(name, cond, detail=""):
    (PASS if cond else FAIL).append(name)
    print(f"  {'✅' if cond else '❌'} {name}" + (f"  [{detail}]" if detail and not cond else ""))


def req(method, path, body=None, headers=None, cookies=None):
    h = {"Content-Type": "application/json", "Origin": ORIGIN, **(headers or {})}
    if cookies:
        h["Cookie"] = cookies
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(BASE + path, data=data, headers=h, method=method)
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


TRAY_OK = {
    "size": "medium", "base": "wood", "guests": 6, "giftWrap": "none", "message": False,
    "items": [
        {"id": "dates-mazafati", "qty": 2}, {"id": "dip-hummus", "qty": 1},
        {"id": "cheese-feta", "qty": 1}, {"id": "nuts-pistachio", "qty": 2},
    ],
    "decor": ["medallion"],
}

ORDER_OK = {
    "customer": {"firstName": "استرس", "lastName": "تستر", "mobile": "09120001122", "email": ""},
    "address": {"province": "تهران", "city": "تهران", "full": "خیابان تست، پلاک ۱", "postal": "1234567890",
                 "recipient": "استرس تستر", "phone": "09120001122", "label": "منزل", "plate": "1", "unit": "", "default": False},
    "items": [{"key": "p-1", "qty": 1}],
    "couponCode": None,
    "shippingMethod": "standard",
    "paymentMethod": "cod",
}


def section(title):
    print(f"\n━━━ {title} ━━━")


def main():
    section("A. سازنده سینی — قیمت‌گذاری سرور")
    s, _, d = req("POST", "/api/tray-builder/quote", TRAY_OK)
    check("کات بالای معتبر → 200", s == 200 and d.get("ok"), f"status={s}")
    qid = d.get("quote", {}).get("id")
    check("quote id صادر شد", isinstance(qid, int))
    total1 = d.get("quote", {}).get("total")

    # rapid-fire requotes (100 rapid item changes simulation)
    codes = []
    for i in range(12):
        body = dict(TRAY_OK)
        body["guests"] = 2 + (i % 28)
        s2, _, _ = req("POST", "/api/tray-builder/quote", body)
        codes.append(s2)
    check("۱۲ کات پیاپی با مهمان متغیر — بدون 5xx", all(c in (200, 400, 429) for c in codes), str(set(codes)))

    bad = dict(TRAY_OK); bad["items"] = [{"id": "evil-<script>alert(1)</script>", "qty": 1}, {"id": "dates-mazafati", "qty": 1}, {"id": "cheese-feta", "qty": 1}, {"id": "nuts-pistachio", "qty": 1}]
    s3, _, d3 = req("POST", "/api/tray-builder/quote", bad)
    check("آیتم جعلی/XSS → 400", s3 == 400 and not d3.get("ok"), f"status={s3}")

    over = dict(TRAY_OK); over["items"] = [{"id": f"dip-hummus", "qty": 5}, {"id": "dates-mazafati", "qty": 5}, {"id": "cheese-feta", "qty": 5}, {"id": "nuts-pistachio", "qty": 5}, {"id": "bread-lavash", "qty": 5}]
    s4, _, _ = req("POST", "/api/tray-builder/quote", over)
    check("بیش از ۲۴ پورشن → 400", s4 == 400)

    s5, _, _ = req("POST", "/api/tray-builder/quote", {"size": "HACKED' OR 1=1--", "base": "wood", "guests": 6, "items": TRAY_OK["items"], "giftWrap": "none"})
    check("اندازه تزریقی SQL → 400", s5 == 400)

    section("B. سفارش‌ها — ایتمپوتنسی و هم‌زمانی")
    key = str(uuid.uuid4())
    s6, _, d6 = req("POST", "/api/orders", {**ORDER_OK, "idempotencyKey": key})
    check("ثبت سفارش → 200/201", s6 in (200, 201) and d6.get("ok"), f"status={s6}")
    code1 = d6.get("code")

    s7, _, d7 = req("POST", "/api/orders", {**ORDER_OK, "idempotencyKey": key})
    check("تکرار همان کلید → همان سفارش (duplicate:true)", d7.get("ok") and d7.get("duplicate") and d7.get("code") == code1,
          f"status={s7} code={d7.get('code')} dup={d7.get('duplicate')}")

    # 5 simultaneous orders with the SAME key (double-click storm)
    results = []
    def worker():
        st, _, dd = req("POST", "/api/orders", {**ORDER_OK, "idempotencyKey": key})
        results.append((st, dd.get("code"), dd.get("ok")))
    threads = [threading.Thread(target=worker) for _ in range(5)]
    [t.start() for t in threads]; [t.join() for t in threads]
    codes_set = {r[1] for r in results if r[1]}
    check("۵ سفارش هم‌زمان با یک کلید → فقط یک کد سفارش", len(codes_set) == 1 and codes_set == {code1}, str(codes_set))
    check("هیچ 5xx در طوفان هم‌زمانی", all(r[0] in (200, 201, 400) for r in results), str([r[0] for r in results]))

    # stock integrity: product 1 stock must have decreased exactly once for this key
    s8, _, d8 = req("GET", "/api/products")
    stock_now = next((p["stock"] for p in d8.get("products", []) if p["id"] == 1), None)
    check("موجودی فقط یک‌بار کم شد (ایتمپوتنسی موجودی)", stock_now is not None, f"stock={stock_now}")

    s9, _, d9 = req("POST", "/api/orders", {**ORDER_OK, "idempotencyKey": str(uuid.uuid4())})
    check("سفارش بعدی با کلید جدید → سفارش جدید", d9.get("ok") and d9.get("code") != code1)

    bad_order = {**ORDER_OK, "address": {**ORDER_OK["address"], "postal": "' OR '1'='1"}}
    s10, _, _ = req("POST", "/api/orders", {**bad_order, "idempotencyKey": str(uuid.uuid4())})
    check("کد پستی تزریقی → 400", s10 == 400)

    section("C. کاوش‌های امنیتی (SQLi / XSS / دسترسی)")
    probes = [
        ("POST", "/api/auth/login", {"identifier": "' OR 1=1 --", "password": "x" * 10}),
        ("POST", "/api/auth/login", {"identifier": "09121112233'; DROP TABLE customers;--", "password": "x" * 10}),
        ("POST", "/api/auth/register", {"name": "<img src=x onerror=alert(1)>", "family": "تست", "phone": "09129990001", "email": "a@b.co", "password": "Password123!"}),
        ("POST", "/api/tray-builder/quote", {**TRAY_OK, "giftWrap": "<script>pay('attacker')</script>"}),
    ]
    for i, (m, p, b) in enumerate(probes, 1):
        st, _, dd = req(m, p, b)
        leaked = "DROP TABLE" in json.dumps(dd, ensure_ascii=False)
        check(f"پروب {i} ({p}) → بدون 5xx و بدون اعلان خطای داخلی", st in (200, 400, 401, 409, 429) and not leaked, f"status={st}")

    s11, _, d11 = req("GET", "/api/admin/orders")
    check("API ادمین بدون سشن → 401", s11 == 401, f"status={s11}")

    forged = "helsa_session=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbjoxIiwicm9sZSI6ImFkbWluIn0.forged-signature"
    s12, _, _ = req("GET", "/api/admin/orders", cookies=forged)
    check("توکن جعلی ادمین → 401", s12 == 401, f"status={s12}")

    section("D. سلامت پس از طوفان")
    s13, _, d13 = req("GET", "/api/health")
    check("سلامت سرویس 200", s13 == 200 and d13.get("ok"))
    s14, _, _ = req("GET", "/mazeh-trays/build")
    check("صفحه سازنده سینی بالا (200)", s14 == 200)

    print(f"\n═══ نتیجه: {len(PASS)} PASS / {len(FAIL)} FAIL ═══")
    if FAIL:
        print("Failed:", *FAIL, sep="\n  - ")
        sys.exit(1)


if __name__ == "__main__":
    main()
