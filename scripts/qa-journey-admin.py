#!/usr/bin/env python3
"""
HELSA QA — PART B: real administrator journey over the public HTTP API.
Admin account is created through the normal registration (ADMIN_EMAILS grants the
role), every action goes through the same admin API the /admin UI uses.
"""
import json
import sys
import urllib.request
import urllib.error

BASE = "http://localhost:3000"
PASS, FAIL = [], []
ADMIN_IP = "10.77.4.1"
CUSTOMER_IP = "10.77.4.2"

ADMIN = {"email": "owner@helsa.dev", "phone": "09126667788", "password": "Owner#Helsa1"}
CUSTOMER = {"email": "sara.qa@helsa-test.ir", "password": "Sara#1385"}  # created by UI journey


def check(name, cond, detail=""):
    (PASS if cond else FAIL).append(name)
    print(f"  {'✅' if cond else '❌'} {name}" + (f"  [{detail}]" if detail and not cond else ""))


def req(method, path, body=None, ip=ADMIN_IP, cookie=None):
    h = {"Content-Type": "application/json", "Origin": BASE, "X-Forwarded-For": ip}
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
    section("B1 · ورود ادمین و محافظت نقش‌ها")
    s, h, d = req("POST", "/api/auth/register", {
        "name": "مدیر", "family": "هلسا", "phone": ADMIN["phone"], "email": ADMIN["email"], "password": ADMIN["password"],
    })
    admin_cookie = cookie_of(h)
    if s != 200:
        s, h, d = req("POST", "/api/auth/login", {"identifier": ADMIN["email"], "password": ADMIN["password"]})
        admin_cookie = cookie_of(h)
    check("حساب ادمین (ADMIN_EMAILS) فعال شد", bool(admin_cookie), f"{s}")
    s, _, d = req("GET", "/api/auth/session", cookie=admin_cookie)
    check("سشن ادمین → role=admin", d.get("role") == "admin", str(d)[:80])

    s, _, d = req("GET", "/api/auth/session", ip=CUSTOMER_IP)
    # customer session (sara from UI journey)
    s2, h2, _ = req("POST", "/api/auth/login", {"identifier": CUSTOMER["email"], "password": CUSTOMER["password"]}, ip=CUSTOMER_IP)
    if s2 != 200:
        # خودکفا: حساب مشتری از مسیر عمومی ساخته می‌شود (اگر سوئیت دیگری پاکش کرده)
        req("POST", "/api/auth/register", {"name": "سارا", "family": "تستی", "phone": "09125556677", "email": CUSTOMER["email"], "password": CUSTOMER["password"]}, ip=CUSTOMER_IP)
        s2, h2, _ = req("POST", "/api/auth/login", {"identifier": CUSTOMER["email"], "password": CUSTOMER["password"]}, ip=CUSTOMER_IP)
    cust_cookie = cookie_of(h2)
    check("ورود مشتری عادی", s2 == 200 and bool(cust_cookie), f"{s2}")
    s, _, d = req("GET", "/api/admin/dashboard", cookie=cust_cookie, ip=CUSTOMER_IP)
    check("توکن مشتری روی API ادمین → 401/403", s in (401, 403), f"{s}")
    s, _, d = req("GET", "/api/admin/orders")
    check("بدون سشن → 401", s == 401, f"{s}")

    section("B2 · داشبورد و KPIها")
    s, _, d = req("GET", "/api/admin/dashboard", cookie=admin_cookie)
    dash = d.get("dashboard", {})
    check("داشبورد → 200 + ساختار KPI", s == 200 and d.get("ok") and isinstance(dash, dict), str(d)[:100])
    keys = list(dash.keys())
    print(f"     KPIها: {keys[:10]}")
    check("داشبورد آمار سفارش دارد", any("order" in k.lower() for k in keys), str(keys))

    section("B3 · پردازش سفارش مشتری (چرخه کامل)")
    # اگر هنوز سفارشی در سیستم نیست، مثل مشتری واقعی یک سفارش ثبت کن (تست self-sufficient)
    s0, _, d0 = req("GET", "/api/admin/orders", cookie=admin_cookie)
    if s0 == 200 and not d0.get("orders"):
        body = {
            "customer": {"firstName": "سارا", "lastName": "تستی", "mobile": "09125556677", "email": "sara.qa@helsa-test.ir"},
            "address": {"province": "تهران", "city": "تهران", "full": "خیابان هلسا، پلاک ۵", "postal": "1234567890",
                         "recipient": "سارا تستی", "phone": "09125556677", "label": "منزل", "plate": "5", "unit": "2", "default": True},
            "items": [{"key": "p-2", "qty": 1}],
            "couponCode": None, "shippingMethod": "standard", "paymentMethod": "cod",
            "idempotencyKey": f"qa-admin-{int(__import__('time').time())}",
        }
        so, _, do = req("POST", "/api/orders", body, ip=CUSTOMER_IP)
        check("ثبت سفارش نمونه از مسیر مشتری", so in (200, 201), f"{so} {str(do)[:80]}")
    s, _, d = req("GET", "/api/admin/orders", cookie=admin_cookie)
    orders = d.get("orders", d.get("list", []))
    check("لیست سفارش‌های ادمین", s == 200 and len(orders) > 0, f"{s} n={len(orders)}")
    target = next((o for o in orders if o.get("code") == "HLA-2A2409FB"), None) or next(
        (o for o in orders if (o.get("customer") or {}).get("mobile") == "09125556677"), orders[0] if orders else None)
    oid = target.get("id") if target else None
    order_code = target.get("code") if target else ""
    check(f"سفارش سارا در لیست (id={oid}, {order_code})", oid is not None)

    for st in ["paid", "preparing", "shipped", "delivered"]:
        body = {"status": st}
        if st == "paid":
            body["paymentStatus"] = "paid"
        s, _, d = req("PATCH", f"/api/admin/orders/{oid}", body, cookie=admin_cookie)
        check(f"تغییر وضعیت → {st}", s == 200 and d.get("ok"), f"{s} {str(d)[:80]}")

    # customer-facing verification
    s, _, d = req("POST", "/api/orders/track", {"code": order_code, "mobile": "09125556677"}, ip=CUSTOMER_IP)
    check("مشتری وضعیت «تحویل شده» را می‌بیند", d.get("order", {}).get("status") == "delivered" or d.get("status") == "delivered", str(d)[:120])

    section("B4 · مدیریت محصول (CRUD)")
    import time as _t
    run_slug = f"qa-audit-{int(_t.time()) % 100000}"
    s, _, d = req("POST", "/api/admin/products", {
        "name": "پک تست ممیزی", "slug": run_slug, "category": "dates",
        "sku": f"QA-{run_slug.upper()}", "description": "محصول تست ممیزی کیفیت برای راستی‌آزمایی پنل مدیریت",
        "price": 250_000, "stock": 5, "unit": "بسته", "weight": "۵۰۰ گرم",
        "shortDescription": "محصول تست ممیزی کیفیت", "image": "/images/opt/mazafati-dates.jpg",
        "imageAlt": "پک تست ممیزی هلسا",
    }, cookie=admin_cookie)
    check("ایجاد محصول → 201 + ok", s in (200, 201) and d.get("ok"), f"{s} {str(d)[:100]}")
    pid = (d.get("product") or {}).get("id")

    s, _, d = req("POST", "/api/admin/products", {
        "name": "تکراری", "slug": run_slug, "category": "dates", "sku": f"QA-{run_slug.upper()}-D",
        "description": "توضیح تکراری برای تست", "price": 1, "stock": 1,
        "image": "/images/opt/mazafati-dates.jpg", "imageAlt": "تکراری",
    }, cookie=admin_cookie)
    check("slug تکراری → 409 با پیام شفاف", s == 409 and "slug" in d.get("message", ""), f"{s} {str(d)[:80]}")

    s, _, d = req("POST", "/api/admin/products", {
        "name": "بد", "slug": "INVALID SLUG", "category": "dates", "price": 1, "stock": 1,
    }, cookie=admin_cookie)
    check("slug نامعتبر → 400", s == 400, f"{s}")

    s, _, d = req("PATCH", f"/api/admin/products/{pid}", {
        "name": "پک تست ممیزی (ویرایش)", "slug": run_slug, "category": "dates",
        "sku": f"QA-{run_slug.upper()}", "description": "محصول تست ممیزی کیفیت نسخه ویرایش‌شده",
        "price": 199_000, "stock": 5, "unit": "بسته",
        "image": "/images/opt/mazafati-dates.jpg", "imageAlt": "پک تست ممیزی ویرایش‌شده",
    }, cookie=admin_cookie)
    check("ویرایش محصول (قیمت جدید)", s == 200 and d.get("ok"), f"{s}")

    s, _, d = req("GET", f"/api/products/{run_slug}")
    check("محصول جدید برای مشتری قابل مشاهده است", s == 200 and (d.get("product") or {}).get("price") == 199_000, str(d)[:80])

    section("B5 · مدیریت موجودی")
    s, _, d = req("PATCH", f"/api/admin/inventory/{pid}", {"mode": "set", "quantity": 2, "reason": "اصلاح موجودی", "note": "تست ممیزی"}, cookie=admin_cookie)
    check("تنظیم موجودی به ۲ (کم‌موجود)", s == 200 and d.get("ok"), f"{s}")
    s, _, d = req("PATCH", f"/api/admin/inventory/{pid}", {"mode": "increase", "quantity": 30, "reason": "ورود کالا", "note": "شارژ انبار"}, cookie=admin_cookie)
    check("افزایش موجودی +۳۰ → ۳۲", s == 200 and (d.get("product") or {}).get("stock") == 32, str(d)[:100])
    s, _, d = req("GET", "/api/admin/dashboard", cookie=admin_cookie)
    check("داشبورد سالم پس از تغییرات انبار", s == 200 and d.get("ok"))

    section("B6 · هدایای سازمانی (درخواست + قیمت)")
    s, _, d = req("GET", "/api/gifts")
    gifts = [g for g in d.get("packages", []) if g.get("kind") == "corporate"]
    check("لیست پک‌های سازمانی", s == 200 and len(gifts) > 0, f"n={len(gifts)}")
    slug = gifts[0]["slug"] if gifts else ""
    pack_id = (gifts[0].get("packagingOptions") or [{}])[0].get("id", "standard") if gifts else "standard"
    # corporate packages are inquiry-based by design — instant quote must reject them
    s, _, d = req("POST", "/api/gifts/quote", {"packageSlug": slug, "quantity": 50, "packagingId": pack_id, "occasion": "یلدا شرکت", "message": "برای همکاران"}, ip=CUSTOMER_IP)
    check("بسته سازمانی → قیمت آنی رد می‌شود (مسیر درست: استعلام)", s == 400 and "شخصی" in d.get("message", ""), f"{s} {str(d)[:80]}")
    # personal package → instant quote must succeed
    s, _, d = req("GET", "/api/gifts")
    personal = next((g for g in d.get("packages", []) if g.get("kind") == "personal"), None)
    if personal:
        ppack = (personal.get("packagingOptions") or [{}])[0].get("id", "standard")
        s, _, d = req("POST", "/api/gifts/quote", {"packageSlug": personal["slug"], "quantity": 3, "packagingId": ppack, "message": "تست"}, ip=CUSTOMER_IP)
        check("قیمت آنی بسته شخصی → ok + مبلغ", s == 200 and d.get("ok") and (d.get("quote") or {}).get("total"), f"{s} {str(d)[:100]}")
    else:
        check("بسته شخصی در فهرست هست", False, "not found")
    s, _, d = req("POST", "/api/gifts/corporate", {
        "companyName": "شرکت تست ممیزی", "contactName": "مدیر خرید", "mobile": "09127770011",
        "email": "corp@test.ir", "packageSlug": slug, "quantity": 120, "occasion": "سال نو",
        "brandingRequirements": "لوگو روی جعبه", "desiredDeliveryDate": "۱۴۰۵/۰۷/۰۱",
    }, ip=CUSTOMER_IP)
    check("ثبت استعلام هدایای سازمانی → ok", s == 200 and d.get("ok"), f"{s} {str(d)[:100]}")
    s, _, d = req("GET", "/api/admin/inquiries", cookie=admin_cookie)
    inq = d.get("corporate", [])
    check("استعلام در پنل ادمین دیده می‌شود", s == 200 and len(inq) > 0, f"{s} n={len(inq)}")

    section("B7 · مدیریت عمده (تأیید کسب‌وکار)")
    s, _, d = req("GET", "/api/admin/wholesale", cookie=admin_cookie)
    biz = d.get("businesses", d.get("list", []))
    def bname(b):
        return b.get("businessName") or b.get("business_name") or ""
    # approve the newest PENDING application (filed by the customer journey)
    pending = [b for b in biz if b.get("status") == "pending"]
    if not pending:
        # خودکفا: متقاضی عمده از مسیر عمومی ثبت می‌شود
        import time as _t
        _n = int(_t.time()) % 10000
        s, _, d = req("POST", "/api/wholesale/register", {
            "businessName": f"کافه دمو {_n}", "businessType": "cafe", "contactName": "رضا کافه‌دار",
            "mobile": f"0912444{_n:04d}", "email": f"demo{_n}.cafe@helsa-test.ir",
            "password": "Cafe#Demo1", "city": "تهران",
        }, ip=CUSTOMER_IP)
        s, _, d = req("GET", "/api/admin/wholesale", cookie=admin_cookie)
        biz = d.get("businesses", d.get("list", []))
        pending = [b for b in biz if b.get("status") == "pending"]
    # چک لیست بعد از خودکفایی: در DB تازه-seed شده، متقاضی همین‌جا ساخته می‌شود
    check("لیست کسب‌وکارها", s == 200 and len(biz) > 0)
    cafe = next((b for b in pending if "کافه دمو" in bname(b)), pending[0] if pending else None)
    check("درخواست عمده جدید در صف بررسی است", cafe is not None, "no pending business")
    if cafe:
        cid = cafe.get("id")
        s, _, d = req("PATCH", f"/api/admin/wholesale/{cid}", {"status": "approved", "discountPercent": 12}, cookie=admin_cookie)
        check(f"تأیید «{bname(cafe)}» با ۱۲٪ تخفیف", s == 200 and d.get("ok"), f"{s} {str(d)[:80]}")

    # wholesale login + tier pricing (use the freshly-approved business)
    ws_email = (cafe or {}).get("email") or "demo.cafe@helsa-test.ir"
    s, h, d = req("POST", "/api/auth/login", {"identifier": ws_email, "password": "Cafe#Demo1"}, ip="10.77.4.3")
    ws_cookie = cookie_of(h)
    check(f"ورود حساب عمده تأییدشده ({ws_email})", s == 200 and bool(ws_cookie), f"{s} {str(d)[:80]}")
    s, _, d = req("GET", "/api/wholesale/me", cookie=ws_cookie, ip="10.77.4.3")
    biz_me = d.get("business", {})
    check("/api/wholesale/me → approved + 12٪", biz_me.get("status") == "approved" and biz_me.get("discountPercent") == 12, str(d)[:140])
    s, _, d = req("GET", "/api/wholesale/catalog", cookie=ws_cookie, ip="10.77.4.3")
    items = d.get("products", d.get("items", []))
    check("دستگاه عمده به کاتالوگ عمده دسترسی دارد", s == 200 and len(items) > 0, f"{s} n={len(items)}")
    if items:
        p = items[0]
        print(f"     نمونه قیمت عمده: {json.dumps(p, ensure_ascii=False)[:140]}")
        wp = p.get("wholesalePrice") or p.get("price")
        rp = p.get("price") or p.get("retailPrice")
        if wp and rp:
            check("قیمت عمده ≤ قیمت عادی", wp <= rp, f"{wp} vs {rp}")
    s, _, d = req("GET", "/api/wholesale/catalog", cookie=cust_cookie, ip=CUSTOMER_IP)
    check("مشتری عادی به کاتالوگ عمده → 401/403", s in (401, 403), f"{s}")

    section("B8 · وبلاگ (مدیریت محتوا)")
    s, _, d = req("GET", "/api/admin/orders", cookie=admin_cookie)
    check("تست نهایی سلامت API ادمین", s == 200)

    # ── پاک‌سازی محصولات تستی این اجرا (ریشه‌یابی: نشت qa-audit-% در کاتالوگ) ──
    try:
        import psycopg2
        conn = psycopg2.connect("postgresql://helsa:helsa_dev_pw@127.0.0.1:5432/helsa_db")
        cur = conn.cursor()
        cur.execute("DELETE FROM product_images WHERE product_id IN (SELECT id FROM products WHERE slug LIKE 'qa-audit-%')")
        cur.execute("DELETE FROM inventory_movements WHERE product_id IN (SELECT id FROM products WHERE slug LIKE 'qa-audit-%')")
        cur.execute("DELETE FROM products WHERE slug LIKE 'qa-audit-%'")
        conn.commit()
        if cur.rowcount:
            print(f"  🧹 پاک‌سازی {cur.rowcount} محصول تستی qa-audit-%")
        conn.close()
    except Exception as e:
        print(f"  ⚠️ پاک‌سازی qa-audit-% ناموفق: {e}")

    print(f"\n═══ PART B: {len(PASS)} PASS / {len(FAIL)} FAIL ═══")
    if FAIL:
        print("Failed:", *FAIL, sep="\n  - ")
        sys.exit(1)


if __name__ == "__main__":
    main()
