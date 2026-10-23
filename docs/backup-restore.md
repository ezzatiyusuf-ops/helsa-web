# بکاپ و بازگردانی دیتابیس هلسا

## چی ساخته شده؟

| فایل | نقش |
|---|---|
| `scripts/backup-db.sh` | بکاپ کامل: `pg_dump` فشرده (-Fc) + نقش‌ها (`pg_dumpall --globals-only` از مسیر postgres) + چک‌سام SHA-256 + تأیید صحت آرشیو + سیاست نگهداری (پیش‌فرض ۷ نسخه) |
| `scripts/restore-db.sh` | بازگردانی با بررسی چک‌سام، ترمینیت اتصال‌های فعال، DROP/CREATE ادمینی (با `sudo -u postgres`) و گزارش تعداد ردیف‌ها |
| `backups/` | محل نگهداری (gitignore شده — داخل workspace است و در sandbox همراه پروژه زنده می‌ماند) |

**خروجی هر بکاپ:** `helsa-YYYYMMDD-HHMMSS.dump` + `…-roles.sql` + `….sha256`

## دستورات

```bash
npm run db:backup                                  # بکاپ فوری
KEEP=14 bash scripts/backup-db.sh                  # نگهداری ۱۴ نسخه
bash scripts/restore-db.sh backups/helsa-XXXX.dump # بازگردانی (قبل از بازنویسی سؤال می‌پرسد)
bash scripts/restore-db.sh backups/helsa-XXXX.dump --force   # بدون سؤال
TRG_DB=helsa_test bash scripts/restore-db.sh … --force        # بازگردانی به DB تست
```

## زمان‌بندی روی سرور واقعی

### لینوکس (cron — هر روز ساعت ۳ بامداد)

```bash
crontab -e
# خط زیر را اضافه کنید (مسیر پروژه را اصلاح کنید):
0 3 * * * cd /var/www/helsa && bash scripts/backup-db.sh >> backups/cron.log 2>&1
```

### ویندوز (Task Scheduler — چون محیط توسعه ویندوزی است)

```powershell
# یک بار در PowerShell ادمین:
$act = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-NoProfile -Command `"cd C:\path\to\helsa; bash scripts/backup-db.sh`""
$trg = New-ScheduledTaskTrigger -Daily -At 3am
Register-ScheduledTask -TaskName "HELSA DB Backup" -Action $act -Trigger $trg
```

> پیش‌نیاز ویندوز: `pg_dump` در PATH (نصب PostgreSQL) و Git-Bash. متغیرهای `DB_USER/DB_PASS/DB_HOST` را در ابتدای اسکریپت یا محیط تنظیم کنید.

## کپی خارج از سرور (off-site) — توصیهٔ امنیتی

بکاپ روی همان دیسک سرور در برابر خرابی دیسک محافظت نمی‌کند. روزانه sync کنید:

```bash
# مثال با rclone به هر S3/WebDAV/OneDrive:
rclone copy backups/ remote:helsa-backups/ --max-age 48h
```

## بازیابی در فاجعه (Disaster Recovery)

```bash
# ۱) پروژه و PostgreSQL را آماده کنید (روی سرور جدید)
# ۲) نقش‌ها (فقط سرور جدید — اختیاری):
psql -U postgres -f backups/helsa-XXXX-roles.sql
# ۳) بازگردانی کامل:
bash scripts/restore-db.sh backups/helsa-XXXX.dump --force
# ۴) بیلد و اجرا:
npm run build && npm start
```

## اثبات صحت (تست واقعی — ۱۴۰۵/۰۶/۲۱)

- بکاپ ۱۶۰KB فشرده، **۳۴ جدول دارای داده**، چک‌سام تأیید شد.
- بازگردانی به `helsa_db_restore_test`: **مقایسهٔ ۳۴ جدول، صفر مغایرت** (سفارش‌ها، مشتریان، لاگ‌های ادمین، تصاویر اصلاح‌شدهٔ کاتالوگ — همه).
- نمونهٔ صحت داده: `helsa-gift-pack → /images/opt/gift-pack.jpg` + nutrition کامل؛ صفر تصویر ناهم‌خوان.
- سیاست نگهداری: با `KEEP=1` دو بکاپ پشت‌سرهم → فقط آخرین نسخه ماند.
- `env-recover.sh`: اگر دیتابیس خالی باشد و بکاپ وجود داشته باشد، **به‌جای seed از آخرین بکاپ بازگردانی می‌کند** (حفظ داده‌های واقعی) و در پایان هر بازیابی، بکاپ تازه می‌گیرد.
