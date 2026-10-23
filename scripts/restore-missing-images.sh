#!/usr/bin/env bash
# ==========================================================
# HELSA — restore-missing-images.sh
# بازیابی تصاویر گمشدهٔ public/images/opt از پکیج دانلود /tmp
#
# چرا این اسکریپت لازم است؟
#   snapshot مرز نوبت سقف حجم (~۱۲۸MB) دارد. اگر محتوای workspace
#   از سقف عبور کند، snapshot انتهای لیست فایل‌ها را قطع می‌کند و
#   در نوبت بعد تصاویر ۴۰۴ می‌شوند (رفع ریشه‌ای: وزن را زیر سقف
#   نگه دارید — see CHANGELOG 1.13.2). این اسکریپت لایهٔ اضطراری است.
#
# استفاده:  bash scripts/restore-missing-images.sh
# منبع:     /tmp/helsa-download/complete.zip (اگر پاک شده، اول
#           make-download-package.sh را در یک نوبت سالم اجرا کنید)
# ==========================================================
set -euo pipefail
cd "$(dirname "$0")/.."

ZIP=/tmp/helsa-download/complete.zip
[ -f "$ZIP" ] || { echo "خطا: $ZIP موجود نیست — پکیج را از نو بسازید (make-download-package.sh)"; exit 1; }

python3 - <<'EOF' > /tmp/helsa-missing-images.txt
import os, zipfile
z = zipfile.ZipFile('/tmp/helsa-download/complete.zip')
zipped = {n for n in z.namelist() if n.startswith('public/') and not n.endswith('/')}
missing = sorted(n for n in zipped if not os.path.exists(n))
for n in missing: print(n)
print(f"# گمشده: {len(missing)}", file=__import__('sys').stderr)
EOF
COUNT=$(grep -c . /tmp/helsa-missing-images.txt || true)
if [ "$COUNT" -eq 0 ]; then
  echo "✔ همهٔ فایل‌های public سالم‌اند — نیازی به بازیابی نیست"
else
  echo "… بازیابی $COUNT فایل از پکیج"
  unzip -o -q "$ZIP" $(cat /tmp/helsa-missing-images.txt | tr '\n' ' ')
  echo "✔ بازیابی شد — راستی‌آزمایی:"
  python3 - <<'EOF'
import json, os
m = json.load(open('src/data/image-variants.json', encoding='utf8'))
missing = []
for n, v in m.items():
    for ext in ('avif','webp'):
        for w in v.get(ext, []):
            p = f'public/images/opt/{n}-{w}.{ext}' if w else f'public/images/opt/{n}.{ext}'
            if not os.path.exists(p): missing.append(p)
    if v.get('jpg') and not os.path.exists(f'public/images/opt/{n}.jpg'): missing.append(f'public/images/opt/{n}.jpg')
print('غایب از manifest:', len(missing))
EOF
fi
