#!/usr/bin/env bash
# make-download-package.sh — بازتولید پکیج دانلود کامل هلسا + سرور دانلود
# استفاده (در هر نوبت که پکیج لازم شد):  bash scripts/make-download-package.sh
# بعد از اجرا، سرور دانلود روی پورت 8899 بالا می‌آید و کاربر از پیش‌نمایش مرورگرش دانلود می‌کند.
# توجه: فایل‌ها در /tmp ساخته می‌شوند (خارج از سقف snapshot) — بین نوبت‌ها پاک می‌شوند،
#       پس این اسکریپت را دوباره اجرا کنید اگر لینک مرده بود.
set -euo pipefail
cd "$(dirname "$0")/.."

DL=/tmp/helsa-download
mkdir -p "$DL"

echo "[pkg] 1/3 ساخت helsa-complete.zip (کل پروژه + دامپ)…"
zip -qr "$DL/helsa-complete.zip" . -x "node_modules/*" ".next/*" ".git/*" ".env" "qa-shots/*" "backups/*" "uploads/*" "public/images/gen/*" -x "*.log" -x "missing-images.txt" -x "nohup.out"
[ -f /home/user/helsa-db-backup.sql ] && zip -qj "$DL/helsa-complete.zip" /home/user/helsa-db-backup.sql

echo "[pkg] 2/3 ساخت helsa-source-only.zip (کد بدون تصاویر)…"
zip -qr "$DL/helsa-source-only.zip" . -x "node_modules/*" ".next/*" ".git/*" ".env" "qa-shots/*" "backups/*" "uploads/*" "public/images/opt/*" "public/images/gen/*" -x "*.log" -x "missing-images.txt" -x "nohup.out"
cp /home/user/helsa-db-backup.sql "$DL/" 2>/dev/null || true
( cd "$DL" && sha256sum helsa-complete.zip helsa-source-only.zip > SHA256SUMS.txt )

echo "[pkg] 3/3 راستی‌آزمایی — تصاویر با manifest…"
python3 - <<'EOF'
import json, os
m = json.load(open("src/data/image-variants.json", encoding="utf8"))
missing = sum(1 for n, v in m.items() for ext in ("avif","webp") for w in v.get(ext,[])
              if not os.path.exists(f"public/images/opt/{n}.{ext}" if w==0 else f"public/images/opt/{n}-{w}.{ext}"))
missing += sum(1 for n, v in m.items() if v.get("jpg") and not os.path.exists(f"public/images/opt/{n}.jpg"))
print(f"تصاویر: کمبود {missing}" + (" ✅" if missing==0 else " ❌"))
EOF

echo "[pkg] ✔ پکیج آماده در $DL"
echo "برای سرو کردن:  python3 -m http.server 8899 --directory $DL --bind 0.0.0.0"
