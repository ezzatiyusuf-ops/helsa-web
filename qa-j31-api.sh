#!/bin/bash
# ج۳۱ — API QA: real auth endpoints (production build)
B="http://localhost:3000"
J() { curl -s -D /tmp/j31-h.txt -w "\n%{http_code}" -H "Content-Type: application/json" -H "Origin: http://localhost:3000" "$@"; }
PASS=0; FAIL=0
ck() { if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "PASS: $1"; else FAIL=$((FAIL+1)); echo "FAIL: $1 → got [$2] want [$3]"; fi; }

SFX=$(( (RANDOM % 9 + 1) * 1000 + RANDOM % 1000 ))
PHONE="0912$(printf '%07d' $SFX)"
EMAIL="qa-j31-$SFX@helsa-test.ir"
echo "QA user: $PHONE / $EMAIL"
PW="HelsaTest#2026"

echo "=== 1. login wrong password (existing-style id, wrong pw) ==="
R=$(J -X POST $B/api/auth/login -d '{"identifier":"09125556677","password":"wrong-pass-x"}')
BODY=$(echo "$R" | head -n -1); CODE=$(echo "$R" | tail -1)
ck "status 401" "$CODE" "401"
echo "$BODY" | grep -q "صحیح نیست" && { PASS=$((PASS+1)); echo "PASS: persian msg"; } || { FAIL=$((FAIL+1)); echo "FAIL: msg=$BODY"; }

echo "=== 2. login unknown user ==="
R=$(J -X POST $B/api/auth/login -d '{"identifier":"09129999999","password":"whatever1"}')
CODE=$(echo "$R" | tail -1); ck "status 401" "$CODE" "401"
echo "$R" | head -n -1 | grep -q "صحیح نیست" && { PASS=$((PASS+1)); echo "PASS: same msg (anti-enumeration)"; } || { FAIL=$((FAIL+1)); echo "FAIL: enumeration leak"; }

echo "=== 3. CSRF: foreign origin rejected ==="
R=$(J -X POST $B/api/auth/login -H "Origin: https://evil.example.com" -d '{"identifier":"09125556677","password":"x"}')
CODE=$(echo "$R" | tail -1); ck "foreign origin blocked" "$CODE" "403"

echo "=== 4. registration success ==="
R=$(J -X POST $B/api/auth/register -d "{\"name\":\"کیوای\",\"family\":\"هلسا\",\"phone\":\"$PHONE\",\"email\":\"$EMAIL\",\"password\":\"$PW\"}")
BODY=$(echo "$R" | head -n -1); CODE=$(echo "$R" | tail -1)
ck "status 200" "$CODE" "200"
echo "$BODY" | grep -q '"ok":true' && { PASS=$((PASS+1)); echo "PASS: ok:true"; } || { FAIL=$((FAIL+1)); echo "FAIL: $BODY"; }
COOKIE=$(grep -i "^set-cookie" /tmp/j31-h.txt | grep -o "helsa_session=[^;]*" | head -1)
[ -n "$COOKIE" ] && { PASS=$((PASS+1)); echo "PASS: session cookie set"; } || { FAIL=$((FAIL+1)); echo "FAIL: no cookie"; }

echo "=== 5. duplicate registration ==="
R=$(J -X POST $B/api/auth/register -d "{\"name\":\"دوباره\",\"family\":\"تست\",\"phone\":\"$PHONE\",\"email\":\"other-$EMAIL\",\"password\":\"$PW\"}")
CODE=$(echo "$R" | tail -1); ck "status 409" "$CODE" "409"

echo "=== 6. login with correct credentials ==="
R=$(J -X POST $B/api/auth/login -d "{\"identifier\":\"$PHONE\",\"password\":\"$PW\"}")
CODE=$(echo "$R" | tail -1); ck "status 200" "$CODE" "200"
SESSION=$(grep -i "^set-cookie" /tmp/j31-h.txt | grep -o "helsa_session=[^;]*" | head -1)
[ -n "$SESSION" ] && { PASS=$((PASS+1)); echo "PASS: cookie issued"; } || { FAIL=$((FAIL+1)); echo "FAIL"; }

echo "=== 7. session endpoint ==="
R=$(curl -s -H "Cookie: $SESSION" $B/api/auth/session)
echo "$R" | grep -q '"ok":true' && { PASS=$((PASS+1)); echo "PASS: session valid"; } || { FAIL=$((FAIL+1)); echo "FAIL: $R"; }
R=$(curl -s $B/api/auth/session); echo "$R" | grep -q '"ok":false' && { PASS=$((PASS+1)); echo "PASS: anonymous rejected"; } || { FAIL=$((FAIL+1)); echo "FAIL"; }

echo "=== 8. OTP request in PRODUCTION: code must NOT be exposed ==="
R=$(J -X POST $B/api/auth/otp/request -d "{\"phone\":\"$PHONE\"}")
BODY=$(echo "$R" | head -n -1); CODE=$(echo "$R" | tail -1)
ck "status 200" "$CODE" "200"
echo "$BODY" | grep -q '"devCode"' && { FAIL=$((FAIL+1)); echo "FAIL: devCode leaked in production!"; } || { PASS=$((PASS+1)); echo "PASS: no devCode in prod"; }
echo "$BODY" | grep -q '"expiresAt"' && { PASS=$((PASS+1)); echo "PASS: expiresAt present"; } || { FAIL=$((FAIL+1)); echo "FAIL: $BODY"; }
echo "$BODY" | grep -q '"demo":true' && { PASS=$((PASS+1)); echo "PASS: demo flag honest"; } || { FAIL=$((FAIL+1)); echo "FAIL"; }

echo "=== 9. OTP verify with wrong code ==="
R=$(J -X POST $B/api/auth/otp/verify -d "{\"phone\":\"$PHONE\",\"code\":\"000000\"}")
BODY=$(echo "$R" | head -n -1); CODE=$(echo "$R" | tail -1)
ck "status 401" "$CODE" "401"
echo "$BODY" | grep -q "صحیح نیست" && { PASS=$((PASS+1)); echo "PASS: invalid-code msg"; } || { FAIL=$((FAIL+1)); echo "FAIL: $BODY"; }

echo "=== 10. expired OTP → distinct message (fixture: known code, past expiry) ==="
HASH=$(printf '654321' | sha256sum | cut -d' ' -f1)
psql "$(grep '^DATABASE_URL=' /home/user/helsa/.env | cut -d= -f2-)" -q -c "DELETE FROM auth_challenges WHERE identifier='$PHONE'; INSERT INTO auth_challenges (purpose, identifier, code_hash, attempts, max_attempts, expires_at, created_at) VALUES ('otp_login','$PHONE','$HASH',0,5, now() - interval '1 minute', now() - interval '6 minutes');"
R=$(J -X POST $B/api/auth/otp/verify -d "{\"phone\":\"$PHONE\",\"code\":\"654321\"}")
BODY=$(echo "$R" | head -n -1); CODE=$(echo "$R" | tail -1)
ck "status 401" "$CODE" "401"
echo "$BODY" | grep -q "منقضی" && { PASS=$((PASS+1)); echo "PASS: expired-code msg"; } || { FAIL=$((FAIL+1)); echo "FAIL: $BODY"; }

echo "=== 11. OTP verify success (fixture: known code, live) ==="
HASH=$(printf '123456' | sha256sum | cut -d' ' -f1)
psql "$(grep '^DATABASE_URL=' /home/user/helsa/.env | cut -d= -f2-)" -q -c "DELETE FROM auth_challenges WHERE identifier='$PHONE'; INSERT INTO auth_challenges (purpose, identifier, code_hash, attempts, max_attempts, expires_at, created_at) VALUES ('otp_login','$PHONE','$HASH',0,5, now() + interval '5 minutes', now());"
R=$(J -X POST $B/api/auth/otp/verify -d "{\"phone\":\"$PHONE\",\"code\":\"123456\"}")
BODY=$(echo "$R" | head -n -1); CODE=$(echo "$R" | tail -1)
ck "status 200" "$CODE" "200"
echo "$BODY" | grep -q '"ok":true' && { PASS=$((PASS+1)); echo "PASS: otp login ok"; } || { FAIL=$((FAIL+1)); echo "FAIL: $BODY"; }
OTP_SESSION=$(grep -i "^set-cookie" /tmp/j31-h.txt | grep -o "helsa_session=[^;]*" | head -1)
USED=$(psql "$(grep '^DATABASE_URL=' /home/user/helsa/.env | cut -d= -f2-)" -t -A -c "SELECT count(*) FROM auth_challenges WHERE identifier='$PHONE' AND consumed_at IS NOT NULL;")
ck "challenge consumed (single-use)" "$USED" "1"

echo "=== 12. password reset: request (no enumeration) ==="
R=$(J -X POST $B/api/auth/reset -d "{\"step\":\"request\",\"identifier\":\"$PHONE\"}")
BODY=$(echo "$R" | head -n -1); CODE=$(echo "$R" | tail -1)
ck "status 200" "$CODE" "200"
echo "$BODY" | grep -q '"devCode"' && { FAIL=$((FAIL+1)); echo "FAIL: reset devCode leaked in prod"; } || { PASS=$((PASS+1)); echo "PASS: no reset devCode"; }
R=$(J -X POST $B/api/auth/reset -d '{"step":"request","identifier":"09128888777"}')
CODE=$(echo "$R" | tail -1); ck "unknown id same 200" "$CODE" "200"

echo "=== 13. password reset: expired code message ==="
HASH=$(printf '999999' | sha256sum | cut -d' ' -f1)
psql "$(grep '^DATABASE_URL=' /home/user/helsa/.env | cut -d= -f2-)" -q -c "DELETE FROM auth_challenges WHERE identifier='$PHONE' AND purpose='password_reset'; INSERT INTO auth_challenges (purpose, identifier, code_hash, attempts, max_attempts, expires_at, created_at) VALUES ('password_reset','$PHONE','$HASH',0,5, now() - interval '2 minutes', now() - interval '12 minutes');"
R=$(J -X POST $B/api/auth/reset -d "{\"step\":\"reset\",\"identifier\":\"$PHONE\",\"code\":\"999999\",\"password\":\"NewPass#2026\"}")
BODY=$(echo "$R" | head -n -1); CODE=$(echo "$R" | tail -1)
ck "status 401" "$CODE" "401"
echo "$BODY" | grep -q "منقضی" && { PASS=$((PASS+1)); echo "PASS: reset expired msg"; } || { FAIL=$((FAIL+1)); echo "FAIL: $BODY"; }

echo "=== 14. password reset: full success + old sessions revoked ==="
sleep 2  # ensure issued-at is strictly before the reset timestamp (JWT iat has 1s resolution)
HASH=$(printf '777777' | sha256sum | cut -d' ' -f1)
psql "$(grep '^DATABASE_URL=' /home/user/helsa/.env | cut -d= -f2-)" -q -c "DELETE FROM auth_challenges WHERE identifier='$PHONE' AND purpose='password_reset'; INSERT INTO auth_challenges (purpose, identifier, code_hash, attempts, max_attempts, expires_at, created_at) VALUES ('password_reset','$PHONE','$HASH',0,5, now() + interval '10 minutes', now());"
R=$(J -X POST $B/api/auth/reset -d "{\"step\":\"reset\",\"identifier\":\"$PHONE\",\"code\":\"777777\",\"password\":\"NewPass#2026\"}")
BODY=$(echo "$R" | head -n -1); CODE=$(echo "$R" | tail -1)
ck "status 200" "$CODE" "200"
echo "$BODY" | grep -q "تغییر کرد" && { PASS=$((PASS+1)); echo "PASS: reset done msg"; } || { FAIL=$((FAIL+1)); echo "FAIL: $BODY"; }
R=$(curl -s -H "Cookie: $SESSION" $B/api/auth/session)
echo "$R" | grep -q '"ok":false' && { PASS=$((PASS+1)); echo "PASS: pre-reset session revoked"; } || { FAIL=$((FAIL+1)); echo "FAIL: old session still valid: $R"; }
R=$(J -X POST $B/api/auth/login -d "{\"identifier\":\"$PHONE\",\"password\":\"NewPass#2026\"}")
CODE=$(echo "$R" | tail -1); ck "login with NEW password" "$CODE" "200"
SESSION=$(grep -i "^set-cookie" /tmp/j31-h.txt | grep -o "helsa_session=[^;]*" | head -1)

echo "=== 15. GET /api/orders: ownership ==="
R=$(curl -s -o /dev/null -w "%{http_code}" $B/api/orders); ck "anonymous 401" "$R" "401"
R=$(curl -s -H "Cookie: $SESSION" $B/api/orders)
echo "$R" | grep -q '"ok":true' && { PASS=$((PASS+1)); echo "PASS: session list ok"; } || { FAIL=$((FAIL+1)); echo "FAIL: $R"; }
echo "$R" | grep -q '\[' && { PASS=$((PASS+1)); echo "PASS: orders array"; } || { FAIL=$((FAIL+1)); echo "FAIL"; }
R=$(curl -s -H "Cookie: $OTP_SESSION" $B/api/auth/session)
echo "$R" | grep -q '"ok":false' && { PASS=$((PASS+1)); echo "PASS: otp session also revoked after pw change"; } || { FAIL=$((FAIL+1)); echo "note: otp session state"; }

echo "=== 16. logout ==="
R=$(curl -s -D /tmp/j31-h.txt -X POST -H "Origin: http://localhost:3000" -H "Cookie: $SESSION" -o /dev/null -w "%{http_code}" $B/api/auth/logout)
ck "logout 200" "$R" "200"
grep -i "^set-cookie" /tmp/j31-h.txt | grep -q "helsa_session=;" && { PASS=$((PASS+1)); echo "PASS: cookie cleared server-side"; } || { FAIL=$((FAIL+1)); echo "FAIL: no clear header"; }
# NOTE (documented limitation): JWT is stateless — an already-stolen token stays valid until expiry; revocation exists via password change (iat check).

echo "=== 17. rate limit: 11 rapid login attempts → 429 ==="
LAST=""
for i in $(seq 1 11); do
  LAST=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -H "Origin: http://localhost:3000" -d "{\"identifier\":\"09121112233\",\"password\":\"x$i\"}" $B/api/auth/login)
done
ck "429 after abuse" "$LAST" "429"

echo ""
echo "═══ RESULT: PASS=$PASS FAIL=$FAIL ═══"
