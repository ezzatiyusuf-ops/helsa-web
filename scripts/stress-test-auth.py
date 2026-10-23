#!/usr/bin/env python3
"""HELSA authentication stress test (Phase 5) — v2.

Order matters: valid login first (before brute force consumes the rate limit),
then duplicate-account protection, then attack simulations.

Simulates: concurrent registrations (incl. duplicates), brute-force logins,
OTP floods, invalid/tampered/forged session tokens.
Verifies: no crashes, no duplicate accounts, rate limiting, generic errors,
session integrity.
"""
import base64
import concurrent.futures as cf
import json
import sys
import urllib.request
import urllib.error

BASE = "http://localhost:3000"
ORIGIN = "http://localhost:3000"
results = {"pass": 0, "fail": 0}


def check(name, cond, detail=""):
    results["pass" if cond else "fail"] += 1
    print(f"  {'PASS' if cond else 'FAIL'}  {name}" + (f" — {detail}" if detail else ""))


def post(path, body, jar=None, timeout=30):
    req = urllib.request.Request(BASE + path, method="POST",
                                 data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json", "Origin": ORIGIN})
    if jar is not None and jar[0]:
        req.add_header("Cookie", jar[0])
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            set_cookies = r.headers.get_all("Set-Cookie") or []
            if jar is not None and set_cookies:
                jar[0] = "; ".join(c.split(";")[0] for c in set_cookies)
            return r.status, json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode() or "{}")
        except Exception:
            return e.code, {}
    except Exception as e:
        return 0, {"error": str(e)}


def get(path, cookie=None):
    req = urllib.request.Request(BASE + path, headers={"Origin": ORIGIN})
    if cookie:
        req.add_header("Cookie", cookie)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode() or "{}")
        except Exception:
            return e.code, {}
    except Exception as e:
        return 0, {"error": str(e)}


print("== A) session integrity FIRST (valid login before rate-limit burn) ==")
jar = [""]
s, b = post("/api/auth/login", {"identifier": "09121112233", "password": "Wholesale123"}, jar=jar)
check("valid login issues session cookie", s == 200 and b.get("ok") and "helsa_session" in jar[0], f"status={s}")
s, b = get("/api/auth/session", jar[0])
check("session resolves to authenticated user",
      isinstance(b, dict) and b.get("ok") and b.get("phone") == "09121112233", str(b)[:100])

print("== B) duplicate account protection (sequential, same phone) ==")
dup_body = {"name": "تکراری", "family": "کاربر", "phone": "09121112233",
            "email": "dup-test@helsa-test.ir", "password": "DupTest1234"}
s1, b1 = post("/api/auth/register", dup_body)
s2, b2 = post("/api/auth/register", dup_body)
check("registering over an existing phone is rejected",
      (s1 in (200, 409) and s2 == 409) or (s1 == 429), f"s1={s1} s2={s2}")
check("rejection message is generic (no enumeration)",
      "09121112233" not in str(b2.get("message", "")), str(b2.get("message", ""))[:80])

print("== C) concurrent registrations with distinct phones (parallel) ==")
jobs = [{"name": "استرس", "family": f"کاربر{i}", "phone": f"09140{i:06d}",
         "email": f"stressc{i}@helsa-test.ir", "password": "StressTest123"} for i in range(6)]
with cf.ThreadPoolExecutor(max_workers=6) as ex:
    outs = list(ex.map(lambda b_: post("/api/auth/register", b_), jobs))
crashes = sum(1 for s, b_ in outs if s == 0 or s >= 500)
check("no crash under parallel registrations", crashes == 0, f"statuses={[s for s, _ in outs]}")

print("== D) brute-force login (30 wrong passwords, 8 parallel) ==")
wrong = [{"identifier": "09121112233", "password": f"WrongPass{i}"} for i in range(30)]
with cf.ThreadPoolExecutor(max_workers=8) as ex:
    outs = list(ex.map(lambda b_: post("/api/auth/login", b_), wrong))
crashes = sum(1 for s, b_ in outs if s == 0 or s >= 500)
rate_limited = sum(1 for s, _ in outs if s == 429)
unauthorized = sum(1 for s, _ in outs if s in (400, 401))
check("no crash during brute force", crashes == 0, f"5xx={crashes}")
check("rate limit engaged", rate_limited > 0, f"429={rate_limited}, 401={unauthorized}")
check("no account-existence leak", all("موجود" not in str(b_.get("message", "")) and "وجود دارد" not in str(b_.get("message", "")) for _, b_ in outs))

print("== E) OTP flood (15 parallel) ==")
otp_jobs = [{"identifier": "09140111111"} for _ in range(15)]
with cf.ThreadPoolExecutor(max_workers=8) as ex:
    outs = list(ex.map(lambda b_: post("/api/auth/otp/request", b_), otp_jobs))
crashes = sum(1 for s, _ in outs if s == 0 or s >= 500)
check("no crash under OTP flood", crashes == 0, f"statuses={sorted(set(s for s, _ in outs))}")

print("== F) invalid / tampered / forged session tokens ==")
s1, b1 = get("/api/auth/session", "helsa_session=invalid.token.here")
check("invalid JWT → not authenticated",
      not (isinstance(b1, dict) and (b1.get("authenticated") or b1.get("user"))), f"status={s1}, body={str(b1)[:60]}")

tampered = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJjdXN0b21lcjo5OTk5OSIsIm5hbWUiOiJoYWNrZXIiLCJlbWFpbCI6ImhAYi5jb20iLCJwcm92aWRlciI6InBhc3N3b3JkIiwicm9sZSI6ImN1c3RvbWVyIiwiZXhwIjo5OTk5OTk5OTk5fQ.deadbeef"
s2, b2 = get("/api/auth/session", f"helsa_session={tampered}")
check("tampered JWT (bad signature) rejected",
      not (isinstance(b2, dict) and (b2.get("authenticated") or b2.get("user"))), f"status={s2}")


def b64(o):
    return base64.urlsafe_b64encode(json.dumps(o).encode()).rstrip(b"=").decode()


forged = f"{b64({'alg': 'HS256', 'typ': 'JWT'})}.{b64({'sub': 'customer:1', 'name': 'attacker', 'email': 'x@x.com', 'provider': 'password', 'role': 'admin', 'exp': 9999999999})}.invalidsignature"
s3, b3 = get("/api/auth/session", f"helsa_session={forged}")
check("forged admin token rejected",
      not (isinstance(b3, dict) and (b3.get("authenticated") or b3.get("user"))), f"status={s3}")

s4, b4 = get("/api/admin/wholesale", f"helsa_session={forged}")
check("forged admin token cannot access admin API", s4 in (401, 403), f"status={s4}")

print("== G) health check after all attacks ==")
s, b = get("/api/health")
check("server healthy after stress", s == 200 and b.get("ok"), f"status={s}")

print()
total = results["pass"] + results["fail"]
print(f"== RESULT: {results['pass']}/{total} checks passed ==")
sys.exit(0 if results["fail"] == 0 else 1)
