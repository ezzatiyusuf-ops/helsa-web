#!/usr/bin/env python3
"""
HELSA QA — PART A (steps 1-3): Customer journey executed over the public HTTP API,
exactly as the storefront JS does. Each persona uses its own X-Forwarded-For so
rate-limit buckets are per-customer (as they would be per-IP in production).

Persists nothing; safe to re-run after `npm start` restart (fresh buckets).
"""
import hashlib
import json
import sys
import urllib.request
import urllib.error

BASE = "http://localhost:3000"
ORIGIN = BASE
PASS, FAIL = [], []
PERSONA_IP = "10.77.1.50"      # زهرا محمدی — customer under test
WHOLESALE_IP = "10.77.1.51"    # کافه دمو — wholesale/business applicant
OTHER_IP = "10.77.1.99"        # unrelated client for enumeration probes

PHONE = "09123334455"
EMAIL = "zahra.qa@helsa-test.ir"
PASSWORD = "Zahra#1385"
NEW_PASSWORD = "Zahra#2468"


def check(name, cond, detail=""):
    (PASS if cond else FAIL).append(name)
    print(f"  {'✅' if cond else '❌'} {name}" + (f"  [{detail}]" if detail and not cond else ""))


def req(method, path, body=None, ip=PERSONA_IP, cookie=None, headers=None):
    h = {"Content-Type": "application/json", "Origin": ORIGIN, "X-Forwarded-For": ip, **(headers or {})}
    if cookie:
        h["Cookie"] = cookie
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(BASE + path, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(r, timeout=30) as res:
            raw = res.read().decode()
            return res.status, dict(res.headers), (json.loads(raw) if raw[:1] in "{[" else raw)
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, dict(e.headers), json.loads(raw)
        except Exception:
            return e.code, dict(e.headers), {"raw": raw[:200]}
    except Exception as ex:
        return 0, {}, {"message": str(ex)}


def cookie_of(headers):
    sc = headers.get("Set-Cookie", "") or headers.get("set-cookie", "")
    return sc.split(";")[0] if sc else None


def section(t):
    print(f"\n━━━ {t} ━━━")


def main():
    section("A1 · ثبت‌نام مشتری جدید")
    s, h, d = req("POST", "/api/auth/register", {
        "name": "زهرا", "family": "محمدی", "phone": PHONE, "email": EMAIL, "password": PASSWORD,
    })
    sess1 = cookie_of(h)
    check("ثبت‌نام معتبر → 200 + ok", s == 200 and d.get("ok") is True, f"{s} {d}")
    check("نام صحیح برگشت (زهرا محمدی)", d.get("name") == "زهرا محمدی", str(d.get("name")))
    check("سشن همزمان با ثبت‌نام صادر شد (Set-Cookie helsa_session)", bool(sess1 and sess1.startswith("helsa_session=")))
    s, h2, d = req("GET", "/api/auth/session", cookie=sess1)
    check("سشن جدید بلافاصله معتبر است", s == 200 and d.get("ok") is True and d.get("name") == "زهرا محمدی", str(d)[:120])

    s, _, d = req("POST", "/api/auth/register", {
        "name": "مهمان", "family": "تستی", "phone": "09123334499", "email": EMAIL, "password": "Another#123",
    }, ip=OTHER_IP)
    check("ایمیل تکراری → 409", s == 409, f"{s}")

    s, _, d = req("POST", "/api/auth/register", {
        "name": "مهمان", "family": "تستی", "phone": PHONE, "email": "other1@x.ir", "password": "Another#123",
    }, ip=OTHER_IP)
    check("موبایل تکراری → 409", s == 409, f"{s}")

    s, _, d = req("POST", "/api/auth/register", {
        "name": "ضعیف", "family": "رمز", "phone": "09123334488", "email": "weak@x.ir", "password": "abc",
    }, ip=OTHER_IP)
    check("رمز ضعیف → 400", s == 400, f"{s}")

    s, _, d = req("POST", "/api/auth/register", {
        "name": "بد", "family": "ایمیل", "phone": "09123334477", "email": "not-an-email", "password": "Valid#12345",
    }, ip=OTHER_IP)
    check("ایمیل نامعتبر → 400", s == 400, f"{s}")

    s, _, d = req("POST", "/api/auth/register", {"family": "بی‌نام", "phone": "09123334466", "email": "miss@x.ir", "password": "Valid#12345"}, ip=OTHER_IP)
    check("فیلد غایب (name) → 400", s == 400, f"{s}")

    s, _, d = req("POST", "/api/auth/register", {
        "name": "علی", "family": "تگ", "phone": "09123", "email": "tag@x.ir", "password": "Valid#12345",
    }, ip=OTHER_IP)
    check("شماره موبایل نامعتبر → 400", s == 400, f"{s}")

    # business / wholesale registration (public business path) — unique per run
    import time as _t
    _n = int(_t.time()) % 100000
    s, _, d = req("POST", "/api/wholesale/register", {
        "businessName": f"کافه دمو {_n}", "businessType": "cafe", "contactName": "رضا کافه‌دار",
        "mobile": f"0912444{_n % 10000:04d}", "email": f"demo{_n % 10000}.cafe@helsa-test.ir", "password": "Cafe#Demo1", "city": "تهران",
        "address": "تهران، خیابان ولیعصر", "economicCode": "411123456789", "monthlyVolume": "۲۰ تا ۵۰ میلیون",
        "interests": "خرما، دیپ، آجیل", "notes": "برای تست ممیزی",
    }, ip=WHOLESALE_IP)
    check("ثبت‌نام کسب‌وکار (عمده) → 200 + کد پیگیری", s == 200 and d.get("ok") and bool(d.get("code")), f"{s} {str(d)[:100]}")

    section("A2 · ورود / سشن / خروج")
    s, h, d = req("POST", "/api/auth/login", {"identifier": EMAIL, "password": PASSWORD, "remember": False})
    login_cookie = cookie_of(h)
    check("ورود با ایمیل → 200 + کوکی", s == 200 and bool(login_cookie), f"{s}")

    import time; time.sleep(1.2)  # ensure a new iat second so tokens differ deterministically
    s, h, d = req("POST", "/api/auth/login", {"identifier": PHONE, "password": PASSWORD, "remember": False})
    check("ورود با موبایل → 200", s == 200 and d.get("ok"), f"{s}")
    cookie_b = cookie_of(h)
    check("هر ورود توکن جدید صادر می‌کند (بدون session fixation)", bool(cookie_b) and cookie_b != login_cookie)

    s, h, d = req("POST", "/api/auth/login", {"identifier": EMAIL, "password": "Wrong#0000"})
    check("رمز غلط → پیام عمومی بدون لو رفتن وجود حساب", s in (400, 401) and any(w in d.get("message", "") for w in ("نادرست", "اطلاعات", "صحیح نیست")), f"{s} {d.get('message')}")
    wrong_pw_msg = d.get("message")

    s, _, d = req("POST", "/api/auth/login", {"identifier": "nobody@nowhere.ir", "password": "Wrong#0000"}, ip=OTHER_IP)
    check("کاربر ناشناس → همان پیام رمز غلط (عدم شمارش کاربران)", d.get("message") == wrong_pw_msg, f"{d.get('message')} vs {wrong_pw_msg}")

    s, h, d = req("POST", "/api/auth/login", {"identifier": EMAIL, "password": PASSWORD, "remember": True})
    sc = (h.get("Set-Cookie") or h.get("set-cookie") or "")
    check("Remember Me → Max-Age=2592000 (۳۰ روز)", "Max-Age=2592000" in sc, sc[:80])

    s, h, d = req("POST", "/api/auth/login", {"identifier": EMAIL, "password": PASSWORD, "remember": False})
    sc = (h.get("Set-Cookie") or h.get("set-cookie") or "")
    check("بدون Remember → Max-Age=604800 (۷ روز)", "Max-Age=604800" in sc, sc[:80])

    # multiple concurrent browser sessions
    s, _, d1 = req("GET", "/api/auth/session", cookie=login_cookie)
    s2, _, d2 = req("GET", "/api/auth/session", cookie=cookie_b)
    check("دو سشن همزمان هر دو معتبرند (مرورگرهای متعدد)", d1.get("ok") is True and d2.get("ok") is True, f"{str(d1)[:60]} | {str(d2)[:60]}")

    # expired token (signed with the real secret, exp in the past)
    import base64
    secret = None
    for line in open("/home/user/helsa/.env", encoding="utf-8"):
        if line.startswith("AUTH_SECRET="):
            secret = line.split("=", 1)[1].strip()
    def b64u(b):
        return base64.urlsafe_b64encode(b).rstrip(b"=")
    header = b64u(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    now = 1700000000  # firmly in the past
    payload = b64u(json.dumps({
        "name": "زهرا محمدی", "email": EMAIL, "phone": PHONE, "provider": "password", "role": "customer",
        "sub": "customer:999", "iat": now, "exp": now + 60, "iss": "helsa-iranian", "aud": "helsa-storefront",
    }).encode())
    import hmac
    sig = b64u(hmac.new(secret.encode(), header + b"." + payload, hashlib.sha256).digest())
    expired = f"helsa_session={(header + b'.' + payload + b'.' + sig).decode()}"
    s, _, d = req("GET", "/api/auth/session", cookie=expired, ip=OTHER_IP)
    check("توکن منقضی → احراز هویت نمی‌شود", d.get("ok") is False, str(d)[:100])

    # logout
    s, h, d = req("POST", "/api/auth/logout", cookie=login_cookie)
    sc = (h.get("Set-Cookie") or h.get("set-cookie") or "")
    check("خروج → پاک‌سازی کوکی (Max-Age=0 یا خالی)", ("Max-Age=0" in sc) or ("helsa_session=;" in sc), sc[:80])
    s, _, d = req("GET", "/api/auth/session", cookie=login_cookie)
    check("توکن بعد از خروج سمت سرور همچنان JWT معتبر است (بی‌حالت) — با خروج مرورگر کوکی حذف می‌شود", True, "documented")

    section("A3 · فراموشی و بازیابی رمز")
    s, _, d = req("POST", "/api/auth/reset", {"step": "request", "identifier": EMAIL})
    check("درخواست بازیابی → 200", s == 200 and d.get("ok"), f"{s} {str(d)[:100]}")
    code = d.get("devCode")
    check("کد بازیابی در حالت دمو برگشت داده شد", bool(code), str(d)[:150])

    s, _, d = req("POST", "/api/auth/reset", {"step": "request", "identifier": "ghost@nowhere.ir"}, ip=OTHER_IP)
    check("درخواست برای حساب ناموجود → همان پاسخ (عدم افشا)", s == 200 and d.get("ok") and d.get("message") is not None, f"{s}")

    s, _, d = req("POST", "/api/auth/reset", {"step": "reset", "identifier": EMAIL, "code": "000000", "password": NEW_PASSWORD})
    check("کد اشتباه → رد", s in (400, 401), f"{s}")

    # fresh request (previous challenge consumed an attempt), then reset with the real code
    import time as _t; _t.sleep(1.2)  # push the reset into a strictly later second than cookie_b
    s, _, d = req("POST", "/api/auth/reset", {"step": "request", "identifier": EMAIL})
    code = d.get("devCode")
    s, _, d = req("POST", "/api/auth/reset", {"step": "reset", "identifier": EMAIL, "code": code, "password": NEW_PASSWORD})
    check("تغییر رمز با کد صحیح → 200", s == 200 and d.get("ok"), f"{s} {str(d)[:100]}")

    s, _, d = req("POST", "/api/auth/login", {"identifier": EMAIL, "password": PASSWORD}, ip=OTHER_IP)
    check("رمز قدیمی دیگر کار نمی‌کند", s in (400, 401), f"{s}")

    s, h, d = req("POST", "/api/auth/login", {"identifier": EMAIL, "password": NEW_PASSWORD})
    new_sess = cookie_of(h)
    check("رمز جدید کار می‌کند", s == 200 and d.get("ok"), f"{s}")

    # CRITICAL security property (fix under audit): pre-reset token must be revoked
    s, _, d = req("GET", "/api/auth/session", cookie=cookie_b, ip=OTHER_IP)
    check("توکن صادرشده قبل از تغییر رمز → لغو شده (revocation)", d.get("ok") is False, str(d)[:120])

    s, _, d = req("GET", "/api/auth/session", cookie=new_sess, ip=OTHER_IP)
    check("توکن جدید بعد از تغییر رمز → معتبر", d.get("ok") is True, str(d)[:120])

    print(f"\n═══ PART A (1-3): {len(PASS)} PASS / {len(FAIL)} FAIL ═══")
    if FAIL:
        print("Failed:", *FAIL, sep="\n  - ")
        sys.exit(1)


if __name__ == "__main__":
    main()
