#!/usr/bin/env python3
"""
HELSA — QA سرتاسری (فاز ۱۰): ۱۲ سناریوی پذیرش روی سرور واقعی.

اجرا (سرور باید بالا باشد):
    NEXT_BASE=http://127.0.0.1:3000 python3 scripts/qa-e2e.py

پیش‌نیاز: توکن‌های تست در /tmp/tok-{customer,admin,other,identity}.txt
(اسکریپت scripts/qa-mint-tokens.mjs آن‌ها را می‌سازد.)
هر سناریو یا شاهد واقعی می‌دهد یا Fail می‌شود؛ هیچ نتیجه‌ای فرض نمی‌شود.
"""
from __future__ import annotations

import json
import os
import random
import string
import subprocess
import sys
import urllib.error
import urllib.request

BASE = os.environ.get("NEXT_BASE", "http://127.0.0.1:3000")
PASS = 0
FAIL = 0
FAILURES: list[str] = []


def tok(name: str) -> str:
    with open(f"/tmp/tok-{name}.txt", encoding="utf-8") as fh:
        return fh.read().strip()


CUS = tok("customer")
ADM = tok("admin")
OTH = tok("other")
IDT = tok("identity")


def req(method: str, path: str, cookie: str | None = None, body: dict | None = None,
        origin: str | None = BASE, raw: bool = False):
    url = BASE + path
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method)
    if cookie:
        r.add_header("Cookie", f"helsa_session={cookie}")
    if body is not None:
        r.add_header("Content-Type", "application/json")
    if origin:
        r.add_header("Origin", origin)
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            payload = resp.read()
            return resp.status, (payload if raw else json.loads(payload or b"{}"))
    except urllib.error.HTTPError as e:
        payload = e.read()
        try:
            return e.code, json.loads(payload or b"{}")
        except Exception:
            return e.code, {}


def chk(name: str, expected, actual) -> None:
    global PASS, FAIL
    if expected == actual:
        print(f"  \u2705 {name} \u2192 {actual}")
        PASS += 1
    else:
        print(f"  \u274c {name} \u2192 expected {expected!r} got {actual!r}")
        FAIL += 1
        FAILURES.append(f"{name} (expected {expected!r}, got {actual!r})")


def db_price(product_key: str) -> int:
    """قیمت از DB — قاعدهٔ پروژه: هیچ قیمتی در کد/آزمون hardcode نمی‌شود."""
    pid = product_key[2:] if product_key.startswith("p-") else product_key
    out = psql(f"select price from products where id = {int(pid)}")
    return int(out) if out.isdigit() else 0


def resolve_test_product() -> tuple[str, int, int]:
    """محصول آزمون: اول اسلاگ شناخته‌شده، وگرنه اولین محصول موجود — همیشه از DB."""
    # محصولی با بیشترین موجودی انتخاب می‌شود تا اجراهای تکراری سوئیت، موجودی را صفر نکنند
    row = psql("select id||'|'||price from products where stock > 5 order by (slug = 'sesame-date-sugar') desc, stock desc limit 1")
    pid, price = (row.split("|") + ["0"])[:2]
    ship = psql("select price from shipping_methods where code = 'standard' limit 1") or "85000"
    return f"p-{pid}", int(price), int(ship) if ship.isdigit() else 85000


def order_body(**over) -> dict:
    rid = "".join(random.choices(string.ascii_lowercase + string.digits, k=10))
    body = {
        "customer": {"firstName": "آزمون", "lastName": "یکپارچگی", "mobile": "09120000001", "email": "test-c2c@helsa.local"},
        "address": {"province": "تهران", "city": "تهران", "full": "خیابان آزمون، پلاک ۱",
                    "postal": "1234567890", "recipient": "آزمون", "phone": "09120000001"},
        "items": [{"key": TEST_KEY, "qty": 1}],
        "shippingMethod": "standard",
        "paymentMethod": "cod",
        "idempotencyKey": f"qa-{rid}",
        "identityToken": IDT,
    }
    body.update(over)
    return body


def psql(sql: str) -> str:
    env = dict(os.environ, PGPASSWORD="helsa_dev_pw")
    out = subprocess.run(
        ["psql", "-h", "127.0.0.1", "-U", "helsa", "-d", "helsa_db", "-tAc", sql],
        capture_output=True, text=True, env=env,
    )
    return out.stdout.strip()


def upload_receipt(order_code: str, path: str) -> dict:
    env = dict(os.environ)
    out = subprocess.run([
        "curl", "-s", "-X", "POST", "-H", f"Cookie: helsa_session={CUS}", "-H", f"Origin: {BASE}",
        "-F", f"orderCode={order_code}", "-F", "amount=%d" % (PRICE + SHIP), "-F", "trackingNumber=777000111",
        "-F", f"file=@{path};type=image/png", f"{BASE}/api/payments/card-receipt",
    ], capture_output=True, text=True, env=env)
    try:
        return json.loads(out.stdout)
    except Exception:
        return {}


# ── پیش‌آزمون: محدودیت نرخ درون‌حافظه‌ای است؛ اجرای پیاپی سوئیت آن را پر می‌کند
# و بقیهٔ سناریوها آبشاری Fail می‌شوند. این‌جا صریح اعلام می‌کنیم، نه ۳۸ خطای گمراه‌کننده.
_s, _r = req("POST", "/api/orders", CUS, {"items": [], "shippingMethod": "standard", "paymentMethod": "cod"})
if _s == 429:
    print("\n⛔ محدودیت نرخ فعال است (۱۰ سفارش / ۱۵ دقیقه).")
    print("   سرور را ری‌استارت کنید و سپس این سوئیت را یک بار اجرا کنید:")
    print("   pkill -f 'next start' && npx next start -p 3000 &")
    sys.exit(2)

TEST_KEY, PRICE, SHIP = resolve_test_product()
print(f"[setup] محصول آزمون {TEST_KEY} · قیمت از DB {PRICE} · ارسال {SHIP}")
print("── سناریو ۱: قیمت دستکاری‌شدهٔ کلاینت نادیده گرفته می‌شود ──")
s, r = req("POST", "/api/orders", CUS, order_body(items=[{"key": TEST_KEY, "qty": 1, "price": 1000}], total=1000, subtotal=1000))
chk("subtotal از DB نه کلاینت", PRICE, r.get("subtotal"))
chk(f"جمع = کالا {PRICE} + ارسال {SHIP}", PRICE + SHIP, r.get("total"))

print("── سناریو ۲: سبد خالی پذیرفته نمی‌شود (هزینهٔ ارسال صفر) ──")
s, r = req("POST", "/api/orders", CUS, order_body(items=[]))
chk("سبد خالی رد می‌شود", False, r.get("ok", False))
chk("وضعیت ۴۰۰", 400, s)

print("── سناریو ۳: مشارکت حمایتی — پیش‌فرض صفر، حداقل رعایت می‌شود ──")
s, r = req("POST", "/api/orders", CUS, order_body())
chk("بدون مشارکت → صفر", 0, r.get("supportContribution"))
s, r = req("POST", "/api/orders", CUS, order_body(supportContribution=100))
chk("مشارکت ۱۰۰ تومان رد می‌شود", False, r.get("ok", False))
s, r = req("POST", "/api/orders", CUS, order_body(supportContribution=25000))
chk("مشارکت ۲۵٬۰۰۰ پذیرفته و در جمع", PRICE + SHIP + 25000, r.get("total"))
chk("مشارکت جدا ثبت شده", 25000, r.get("supportContribution"))

print("── سناریو ۴: سفارش کارت‌به‌کارت در وضعیت در انتظار واریز ──")
s, r = req("POST", "/api/orders", CUS, order_body(paymentMethod="card"))
CARD = r.get("code", "")
chk("payState=pending", "pending", r.get("payState"))
s, st = req("GET", f"/api/payments/card-receipt?code={CARD}", CUS)
chk("وضعیت رسید: awaiting_payment", "awaiting_payment", st.get("state"))
chk("سفارش پرداخت‌نشده", False, st.get("orderPaid"))

print("── سناریو ۵: آپلود رسید، سفارش را پرداخت‌شده نمی‌کند ──")
up = upload_receipt(CARD, "/home/user/helsa-audit/orders-card-button-mobile.png")
RID = up.get("receiptId", 0)
chk("رسید ثبت شد", True, up.get("ok", False))
s, st = req("GET", f"/api/payments/card-receipt?code={CARD}", CUS)
chk("سفارش هنوز پرداخت‌نشده", False, st.get("orderPaid"))
chk("وضعیت رسید receipt_submitted", "receipt_submitted", st.get("state"))

print("── سناریو ۶: دسترسی‌ها (IDOR / authz سمت سرور) ──")
s, _ = req("GET", f"/api/orders/{CARD}", OTH)
chk("کاربر دیگر سفارش را نمی‌بیند", 404, s)
s, _ = req("GET", f"/api/payments/card-receipt?code={CARD}", OTH)
chk("کاربر دیگر رسید را نمی‌بیند", 404, s)
s, _ = req("PATCH", f"/api/admin/receipts/{RID}", CUS, {"action": "verify"})
chk("مشتری نمی‌تواند واریز را تأیید کند", 401, s)
s, _ = req("GET", f"/api/admin/receipts/{RID}/file")
chk("فایل رسید بدون احراز بسته است", 401, s)

print("── سناریو ۷: گردش تأیید ادمین + تفکیک حسابداری ──")
s, _ = req("PATCH", f"/api/admin/receipts/{RID}", ADM, {"action": "verify"})
chk("verify بدون claim ممنوع", 409, s)
req("PATCH", f"/api/admin/receipts/{RID}", ADM, {"action": "claim"})
s, v = req("PATCH", f"/api/admin/receipts/{RID}", ADM, {"action": "verify"})
chk("تأیید واریز موفق", True, v.get("ok", False))
s, st = req("GET", f"/api/payments/card-receipt?code={CARD}", CUS)
chk("سفارش پرداخت‌شده شد", True, st.get("orderPaid"))
s, _ = req("PATCH", f"/api/admin/receipts/{RID}", ADM, {"action": "verify"})
chk("تأیید تکراری ممنوع", 409, s)
chk("حسابداری SALE", str(PRICE + SHIP), psql(f"select amount from accounting_transactions where reference_id='{CARD}' and type='SALE'"))
chk("فاکتور صادر شد", "1", psql(f"select count(*) from invoices where number='INV-{CARD.replace('HLA-', '')}'"))

print("── سناریو ۸: CSRF — Origin الزامی ──")
s, _ = req("PATCH", f"/api/admin/receipts/{RID}", ADM, {"action": "claim"}, origin=None)
chk("بدون Origin رد می‌شود", 403, s)
s, _ = req("PATCH", f"/api/admin/receipts/{RID}", ADM, {"action": "claim"}, origin="https://evil.example")
chk("Origin بیگانه رد می‌شود", 403, s)

print("── سناریو ۹: روزیته — انتشار بدون تأیید ممنوع ──")
s, plist = req("GET", "/api/admin/producers", ADM)
producers = plist.get("producers", [])
if not producers:
    # پایهٔ آزمون: یک درخواست واقعی روزیته ثبت می‌شود تا مسیر moderation سنجیده شود
    _as, _ap = req("POST", "/api/rooziteh/apply", CUS, {
        "displayName": "کارگاه آزمون", "region": "یزد", "craft": "خوراک",
        "bio": "کارگاه خانگی آزمون برای سنجش گردش تأیید؛ دادهٔ ساختگی برای فروشگاه عمومی نیست.",
        "story": "این رکورد فقط برای آزمون سرتاسری ساخته می‌شود و پیش از انتشار عمومی حذف می‌شود.",
        "contactName": "آزمون", "contactPhone": "09120000001", "contactEmail": "qa-customer@helsa.test",
    })
    if _as >= 400:
        print(f"  ⚠️ ثبت درخواست روزیته ناموفق ({_as}): {_ap.get('message','')}")
    s, plist = req("GET", "/api/admin/producers", ADM)
    producers = plist.get("producers", [])
PID = producers[0]["id"] if producers else 1
s, _ = req("PATCH", f"/api/admin/producers/{PID}", ADM, {"action": "publish"})
chk("publish بدون approve ممنوع", 409, s)
s, _ = req("PATCH", f"/api/admin/producers/{PID}", ADM, {"action": "take_down"})
chk("take_down بدون دلیل ممنوع", 409, s)

print("── سناریو ۱۰: /api/health اطلاعات حساس افشا نمی‌کند ──")
s, h = req("GET", "/api/health")
chk("پاسخ عمومی بدون checks", False, "checks" in h)
chk("وضعیت سلامت مشخص است", True, "status" in h)
s, h2 = req("GET", "/api/health?detail=1")
chk("detail بدون ادمین هم جزئیات نمی‌دهد", False, "checks" in h2)

print("── سناریو ۱۱: محدودیت نرخ روی مسیر بی‌احراز ──")
limited = 0
for _ in range(25):
    s, _ = req("POST", "/api/auth/apple/callback", None, None, raw=True)
    if s == 429:
        limited += 1
chk("apple callback محدود شد (429 دیده شد)", True, limited > 0)

print("── سناریو ۱۲: PWA و مسیرهای عمومی ──")
for name, path in [("manifest", "/manifest.webmanifest"), ("service worker", "/sw.js"),
                   ("آیکون maskable", "/icons/icon-512-maskable.png"), ("صفحهٔ آفلاین", "/offline"),
                   ("صفحهٔ پرداخت کارت", f"/payment/card?code={CARD}"), ("روزیته", "/rooziteh")]:
    s, _ = req("GET", path, None, None, raw=True)
    chk(f"{name} پاسخ ۲۰۰", 200, s)

print()
print(f"RESULT: PASS={PASS} FAIL={FAIL}")
if FAILURES:
    print("FAILURES:")
    for f in FAILURES:
        print("  -", f)
sys.exit(0 if FAIL == 0 else 1)
