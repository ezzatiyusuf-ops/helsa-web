#!/bin/bash
# ج۳۲ — API QA: password recovery (/api/auth/reset) — production build
B="http://localhost:3000"
DBURL() { grep '^DATABASE_URL=' /home/user/helsa/.env | cut -d= -f2-; }
PASS=0; FAIL=0
ck() { if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "PASS: $1"; else FAIL=$((FAIL+1)); echo "FAIL: $1 → got [$2] want [$3]"; fi; }
J() { local ip="$1"; shift; curl -s -D /tmp/j32-h.txt -w "\n%{http_code}" -H "Content-Type: application/json" -H "Origin: $B" -H "X-Forwarded-For: $ip" "$@"; }
CLEAN() { psql "$(DBURL)" -q -c "DELETE FROM auth_challenges WHERE identifier='$1';"; }
FIXTURE() { # phone code expires_in_min
  local HASH=$(printf "$2" | sha256sum | cut -d' ' -f1)
  psql "$(DBURL)" -q -c "INSERT INTO auth_challenges (purpose, identifier, code_hash, attempts, max_attempts, expires_at, created_at) VALUES ('password_reset','$1','$HASH',0,5, now() + interval '$3 minutes', now() - interval '20 minutes');"
}

echo "== 1. request: existing account (سارا) — generic response, no dev leaks =="
R=$(J 10.1.1.1 -X POST $B/api/auth/reset -d '{"step":"request","identifier":"09125556677"}')
BODY=$(echo "$R" | head -n -1); CODE=$(echo "$R" | tail -1)
ck "status 200" "$CODE" "200"
echo "$BODY" | grep -q '"ok":true' && { PASS=$((PASS+1)); echo "PASS: ok"; } || { FAIL=$((FAIL+1)); echo "FAIL: $BODY"; }
echo "$BODY" | grep -q "اگر حسابی با این مشخصات وجود داشته باشد" && { PASS=$((PASS+1)); echo "PASS: generic anti-enum message"; } || { FAIL=$((FAIL+1)); echo "FAIL: msg"; }
echo "$BODY" | grep -qiE "devCode|پیکربندی|محیط توسعه|SMS_PROVIDER" && { FAIL=$((FAIL+1)); echo "FAIL: dev info leaked"; } || { PASS=$((PASS+1)); echo "PASS: no dev/infra info"; }

echo "== 2. request: NON-existing account — identical shape =="
R=$(J 10.1.1.2 -X POST $B/api/auth/reset -d '{"step":"request","identifier":"09129988776"}')
BODY2=$(echo "$R" | head -n -1); CODE=$(echo "$R" | tail -1)
ck "status 200 (same)" "$CODE" "200"
echo "$BODY2" | grep -q "اگر حسابی با این مشخصات وجود داشته باشد" && { PASS=$((PASS+1)); echo "PASS: same generic message"; } || { FAIL=$((FAIL+1)); echo "FAIL"; }
echo "$BODY2" | grep -q '"demo":true' && echo "$BODY2" | grep -q '"demo":true' && [ "$(echo "$BODY" | grep -o '"demo":[a-z]*')" = "$(echo "$BODY2" | grep -o '"demo":[a-z]*')" ] && { PASS=$((PASS+1)); echo "PASS: indistinguishable response"; } || { FAIL=$((FAIL+1)); echo "FAIL: responses differ"; }

echo "== 3. invalid identifier → 400 =="
R=$(J 10.1.1.3 -X POST $B/api/auth/reset -d '{"step":"request","identifier":"123"}')
ck "status 400" "$(echo "$R" | tail -1)" "400"

echo "== 4. foreign origin → 403 (CSRF) =="
R=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -H "Origin: https://evil.example.com" -d '{"step":"request","identifier":"09125556677"}' $B/api/auth/reset)
ck "foreign origin blocked" "$R" "403"

echo "== 5. per-identifier creation cap (3 per 15 min, rotating IPs) =="
CAP=09121112233
CLEAN $CAP
for ip in 10.2.1.1 10.2.1.2 10.2.1.3 10.2.1.4; do
  R=$(J $ip -X POST $B/api/auth/reset -d "{\"step\":\"request\",\"identifier\":\"$CAP\"}")
  CODE=$(echo "$R" | tail -1); [ "$CODE" = "200" ] || echo "  (request $ip → $CODE)"
done
N=$(psql "$(DBURL)" -t -A -c "SELECT count(*) FROM auth_challenges WHERE identifier='$CAP' AND purpose='password_reset' AND created_at > now() - interval '15 minutes';")
ck "exactly 3 challenges created (4th silently skipped)" "$N" "3"
CLEAN $CAP

echo "== 6. wrong code → 401 'کد تأیید صحیح نیست.' =="
W=09124445566; CLEAN $W; FIXTURE $W 314159 10
R=$(J 10.3.1.1 -X POST $B/api/auth/reset -d "{\"step\":\"reset\",\"identifier\":\"$W\",\"code\":\"000000\",\"password\":\"NewPass#32\"}")
BODY=$(echo "$R" | head -n -1); CODE=$(echo "$R" | tail -1)
ck "status 401" "$CODE" "401"
echo "$BODY" | grep -q "کد تأیید صحیح نیست" && { PASS=$((PASS+1)); echo "PASS: invalid-code msg"; } || { FAIL=$((FAIL+1)); echo "FAIL: $BODY"; }

echo "== 7. max attempts (5 wrong → TOO_MANY_ATTEMPTS) =="
M=09124445577; CLEAN $M; FIXTURE $M 271828 10
LAST=""
for i in 1 2 3 4 5 6; do
  R=$(J 10.3.2.$i -X POST $B/api/auth/reset -d "{\"step\":\"reset\",\"identifier\":\"$M\",\"code\":\"00000$i\",\"password\":\"NewPass#32\"}")
  LAST=$(echo "$R" | head -n -1)
done
ck "6th attempt → 429 (5 allowed)" "$(echo "$R" | tail -1)" "429"
echo "$LAST" | grep -q "بیش از حد مجاز" && { PASS=$((PASS+1)); echo "PASS: rate msg"; } || { FAIL=$((FAIL+1)); echo "FAIL: $LAST"; }

echo "== 8. expired code → 401 'منقضی' =="
E=09124445588; CLEAN $E
HASH=$(printf '999111' | sha256sum | cut -d' ' -f1)
psql "$(DBURL)" -q -c "INSERT INTO auth_challenges (purpose, identifier, code_hash, attempts, max_attempts, expires_at, created_at) VALUES ('password_reset','$E','$HASH',0,5, now() - interval '2 minutes', now() - interval '12 minutes');"
R=$(J 10.3.3.1 -X POST $B/api/auth/reset -d "{\"step\":\"reset\",\"identifier\":\"$E\",\"code\":\"999111\",\"password\":\"NewPass#32\"}")
BODY=$(echo "$R" | head -n -1); CODE=$(echo "$R" | tail -1)
ck "status 401" "$CODE" "401"
echo "$BODY" | grep -q "منقضی" && { PASS=$((PASS+1)); echo "PASS: expired msg"; } || { FAIL=$((FAIL+1)); echo "FAIL: $BODY"; }

echo "== 9. weak password → 400 =="
W2=09124445599; CLEAN $W2; FIXTURE $W2 424242 10
R=$(J 10.3.4.1 -X POST $B/api/auth/reset -d "{\"step\":\"reset\",\"identifier\":\"$W2\",\"code\":\"424242\",\"password\":\"short\"}")
BODY=$(echo "$R" | head -n -1); CODE=$(echo "$R" | tail -1)
ck "status 400" "$CODE" "400"
echo "$BODY" | grep -q "امنیت کافی ندارد" && { PASS=$((PASS+1)); echo "PASS: weak-password msg"; } || { FAIL=$((FAIL+1)); echo "FAIL: $BODY"; }

echo "== 10. successful reset + code reuse blocked + old session revoked =="
S=09125556677  # سارا — real account with real password
CLEAN $S
# login first to get a pre-reset session
R=$(J 10.4.0.1 -X POST $B/api/auth/login -d "{\"identifier\":\"09125556677\",\"password\":\"SaraQa#2026\"}")
OLDSESS=$(grep -i "^set-cookie" /tmp/j32-h.txt | grep -o "helsa_session=[^;]*" | head -1)
ck "pre-reset login 200" "$(echo "$R" | tail -1)" "200"
sleep 2
FIXTURE $S 515253 10
R=$(J 10.4.1.1 -X POST $B/api/auth/reset -d "{\"step\":\"reset\",\"identifier\":\"$S\",\"code\":\"515253\",\"password\":\"SaraNew#32x\"}")
BODY=$(echo "$R" | head -n -1); CODE=$(echo "$R" | tail -1)
ck "reset 200" "$CODE" "200"
echo "$BODY" | grep -q "تغییر کرد" && { PASS=$((PASS+1)); echo "PASS: success msg"; } || { FAIL=$((FAIL+1)); echo "FAIL: $BODY"; }
# code reuse → invalid
R=$(J 10.4.1.2 -X POST $B/api/auth/reset -d "{\"step\":\"reset\",\"identifier\":\"$S\",\"code\":\"515253\",\"password\":\"Other#Pass1\"}")
ck "reuse of consumed code → 401" "$(echo "$R" | tail -1)" "401"
# old session revoked
R=$(curl -s -H "Cookie: $OLDSESS" $B/api/auth/session)
echo "$R" | grep -q '"ok":false' && { PASS=$((PASS+1)); echo "PASS: pre-reset session revoked"; } || { FAIL=$((FAIL+1)); echo "FAIL: $R"; }
# login with new password
R=$(J 10.4.2.1 -X POST $B/api/auth/login -d "{\"identifier\":\"09125556677\",\"password\":\"SaraNew#32x\"}")
ck "login with NEW password 200" "$(echo "$R" | tail -1)" "200"
# restore سارا's original QA password for future sessions
node -e '
const { scrypt, randomBytes } = require("crypto"); const { promisify } = require("util");
(async () => { const salt = randomBytes(16).toString("hex");
  const d = await promisify(scrypt)("SaraQa#2026", salt, 64);
  console.log(`scrypt$${salt}$${d.toString("hex")}`); })();' > /tmp/sara-hash.txt
psql "$(DBURL)" -q -c "UPDATE customers SET password_hash='$(cat /tmp/sara-hash.txt)', password_updated_at = now() - interval '1 hour' WHERE phone='09125556677';"
CLEAN $S

echo "== 11. per-IP rate limit: 11 rapid requests → 429 =="
RL=09127770011; CLEAN $RL
LAST=""
for i in $(seq 1 11); do
  LAST=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -H "Origin: $B" -H "X-Forwarded-For: 10.9.9.9" -d "{\"step\":\"request\",\"identifier\":\"$RL\"}" $B/api/auth/reset)
done
ck "429 after abuse" "$LAST" "429"
CLEAN $RL

echo ""
echo "═══ API RESULT: PASS=$PASS FAIL=$FAIL ═══"
