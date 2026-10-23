#!/usr/bin/env bash
set -uo pipefail
cd /home/user/helsa

echo "═══ 1) نصب postgres ═══"
if ! command -v psql >/dev/null 2>&1 && ! ls /usr/lib/postgresql/*/bin/psql >/dev/null 2>&1; then
  sudo apt-get update -qq >/tmp/apt1.log 2>&1
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql postgresql-contrib >/tmp/apt2.log 2>&1
fi
PGBIN=$(dirname "$(ls /usr/lib/postgresql/*/bin/psql | head -1)")
echo "PGBIN=$PGBIN"
"$PGBIN/psql" --version

echo "═══ 2) راه‌اندازی کلاستر ═══"
PGDATA=/var/lib/postgresql/helsa
if ! pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
  sudo mkdir -p "$PGDATA" /var/run/postgresql
  sudo chown -R postgres:postgres "$PGDATA" /var/run/postgresql
  if [ ! -f "$PGDATA/PG_VERSION" ]; then
    sudo -u postgres "$PGBIN/initdb" -D "$PGDATA" -A trust >/tmp/initdb.log 2>&1 || { tail -20 /tmp/initdb.log; exit 1; }
  fi
  sudo -u postgres "$PGBIN/pg_ctl" -D "$PGDATA" -l /tmp/pg.log -o "-p 5432 -h 127.0.0.1" start >/tmp/pgstart.log 2>&1
  sleep 4
fi
pg_isready -h 127.0.0.1 -p 5432

echo "═══ 3) کاربر/دیتابیس ═══"
export PATH="$PGBIN:$PATH"
su_psql() { sudo -u postgres "$PGBIN/psql" -p 5432 "$@"; }
if ! su_psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='helsa'" | grep -q 1; then
  su_psql -c "CREATE ROLE helsa LOGIN SUPERUSER PASSWORD 'helsa_dev_pw';"
fi
if ! su_psql -tAc "SELECT 1 FROM pg_database WHERE datname='helsa_db'" | grep -q 1; then
  su_psql -c "CREATE DATABASE helsa_db OWNER helsa;"
fi

export PGPASSWORD=helsa_dev_pw
U="postgresql://helsa:helsa_dev_pw@127.0.0.1:5432/helsa_db"
psql "$U" -tAc "select 'db-ok', current_database()"

echo "═══ 4) restore dump ═══"
bash scripts/restore-db.sh backups/helsa-20260928-images.dump --force 2>&1 | tail -25

echo "═══ 5) وضعیت نهایی ═══"
psql "$U" -tAc "select 'total=' || count(*) from products"
psql "$U" -F' | ' -tAc "select slug,name,price,weight,stock,image from products where slug in ('moiz-uzbek','dried-mulberries','date-coconut-sugar')"
psql "$U" -tAc "select 'gallery-count=' || jsonb_array_length(gallery) from products where slug='date-coconut-sugar'"
