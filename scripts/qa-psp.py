#!/usr/bin/env python3
"""
HELSA — PSP QA (درگاه پرداخت آنلاین زرین‌پال)
حالت A (درگاه پیکربندی نشده): صدق رفتار صادقانه — سفارش online رد، COD اوکی، هیچ موفقیت جعلی
حالت B (درگاه پیکربندی شده — هر کلیدی، حتی نامعتبر): مسیر واقعی request.json → خطای graceful بدون کرش
خودکار تشخیص می‌دهد. Run: python3 scripts/qa-psp.py
"""
import json
import sys
import time
import urllib.request
import urllib.error

BASE = "http://localhost:3000"
IP = "10.77.5.30"
PASS, FAIL = [], []


def check(name, cond, detail=""):
    mark = "✅" if cond else "❌"
    print(f"  {mark} {name}" + ("" if cond or not detail else f"  | {detail}"))
    (PASS if cond else FAIL).append(name)


def req(method, path, body=None, cookie=None, ip=IP):
    url = BASE + path
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method)
    r.add_header("Content-Type", "application/json")
    r.add_header("Origin", BASE)
    r.add_header("X-Forwarded-For", ip)
    if cookie:
        r.add_header("Cookie", cookie)
    try:
        with urllib.request.urlopen(r, timeout=25) as resp:
            return resp.status, resp.headers.get("Set-Cookie", ""), json.loads(resp.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, "", json.loads(e.read().decode() or "{}")
        except Exception:
            return e.code, "", {}


def cookie_of(headers):
    return (headers or "").split(";")[0] if headers else ""


def main():
    ts = int(time.time()) % 100000
    print("━━━ PSP-0 · آماده‌سازی مشتری تست ━━━")
    s, h, d = req("POST", "/api/auth/register", {
        "name": "پرداخت", "family": "تستی", "phone": f"0912330{ts % 10000:04d}",
        "email": f"psp-{ts}@helsa-test.ir", "password": "Psp#Test1",
    })
    cookie = ""
    if s in (200, 201) and d.get("ok", True):
        cookie = cookie_of(h) or "helsa_session="
    if not cookie:
        s, h, d = req("POST", "/api/auth/login", {"identifier": f"psp-{ts}@helsa-test.ir", "password": "Psp#Test1"})
        cookie = cookie_of(h)
    check("مشتری تست آماده (سشن فعال)", bool(cookie), f"{s}")

    # یک محصول واقعی برای سبد
    s, _, d = req("GET", "/api/products")
    pid = d["products"][0]["id"]
    order_body = {
        "customer": {"firstName": "پرداخت", "lastName": "تستی", "mobile": f"0912330{ts % 10000:04d}", "email": f"psp-{ts}@helsa-test.ir"},
        "address": {"province": "تهران", "city": "تهران", "full": "خیابان تست پرداخت، پلاک ۱۲", "postal": "1234567890",
                     "recipient": "پرداخت تستی", "phone": f"0912330{ts % 10000:04d}", "label": "منزل", "default": False},
        "items": [{"key": f"p-{pid}", "qty": 1}],
        "shippingMethod": "standard",
        "idempotencyKey": f"qa-psp-{ts}-A",
    }

    print("━━━ PSP-A · حالت بدون کانفیگ درگاه (صدق) ━━━")
    # تشخیص حالت: درگاه کانفیگ شده؟
    s, _, d = req("POST", "/api/orders", {**order_body, "paymentMethod": "online"}, cookie=cookie)
    gateway_configured = s == 200 and d.get("ok")
    if not gateway_configured:
        check("سفارش online بدون درگاه → رد صادقانه (503)", s == 503, f"{s} {str(d)[:60]}")
    else:
        print("  ℹ️ درگاه کانفیگ است → چک حالت A معاف؛ سفارش online در PSP-B بررسی می‌شود")

    s, _, d = req("POST", "/api/orders", {**order_body, "paymentMethod": "cod"}, cookie=cookie)
    check("سفارش COD ثبت می‌شود", s == 200 and d.get("ok") and d.get("code"), f"{s} {str(d)[:60]}")
    cod_code = d.get("code", "")

    s, _, d = req("GET", f"/api/payments/verify?code={cod_code}", cookie=cookie)
    check("GET لینک درگاه → بدون URL جعلی (خطای صادقانه)", s in (200, 503) and not d.get("ok"), f"{s} {str(d)[:60]}")

    s, _, d = req("POST", "/api/payments/verify", {"code": cod_code, "method": "online", "remoteRef": "A0000-FAKE-AUTH"}, cookie=cookie)
    check("verify با authority جعلی → هرگز success", d.get("state") != "success", f"{s} state={d.get('state')}")

    s, _, d = req("POST", "/api/payments/verify", {"code": cod_code, "method": "online"}, cookie=None)
    check("verify بدون سشن → 401", s == 401, f"{s}")

    # اگر درگاه از بیرون کانفیگ شده باشد (حالت B)
    if gateway_configured:
        # سفارش online همان اولِ تشخیص حالت ساخته شده؛ فراخوانی مجدد idempotent همان کد را برمی‌گرداند
        s, _, d = req("POST", "/api/orders", {**order_body, "paymentMethod": "online"}, cookie=cookie)
        online_code = d.get("code", "")
        print("━━━ PSP-B · حالت درگاه کانفیگ‌شده (مسیر واقعی) ━━━")
        check("سفارش online ثبت می‌شود", bool(online_code), f"{s}")
        s2, _, d2 = req("GET", f"/api/payments/verify?code={online_code}", cookie=cookie)
        # با merchant نامعتبر، زرین‌پال باید رد کند → graceful error؛ هرگز URL با کد سفارش
        graceful = (s2 == 200 and not d2.get("ok") and "url" not in d2) or (s2 in (502, 503))
        check("request.json واقعی به درگاه → پاسخ graceful (بدون کرش/بدون URL جعلی)", graceful, f"{s2} {str(d2)[:80]}")
        s3, _, d3 = req("POST", "/api/payments/verify", {"code": online_code, "method": "online", "remoteRef": "A0000-FAKE"}, cookie=cookie)
        check("verify با authority جعلی → هرگز success", d3.get("state") != "success", f"{s3} state={d3.get('state')}")
        # سفارش تستی online را لغو کنیم تا در صف آماده‌سازی نماند
        print(f"  ℹ️ سفارش تستی online: {online_code} (pending می‌ماند — در پنل ادمین لغو شود)")
    else:
        print("━━━ PSP-B · رد شد (درگاه کانفیگ نشده — طبق حالت A انتظار می‌رفت) ━━━")

    print(f"\n═══ PSP QA: {len(PASS)} PASS / {len(FAIL)} FAIL ═══")
    if FAIL:
        print("Failed:", *FAIL, sep="\n  - ")
        sys.exit(1)


if __name__ == "__main__":
    main()
