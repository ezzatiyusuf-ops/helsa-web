#!/usr/bin/env bash
# ==========================================================
# HELSA — local development environment bootstrap
# Idempotent: safe to run repeatedly. Sets up PostgreSQL,
# applies the Drizzle schema and seeds catalog data.
# ==========================================================
set -euo pipefail
cd "$(dirname "$0")/.."

DB_USER="${DB_USER:-helsa}"
DB_PASS="${DB_PASS:-helsa_dev_pw}"
DB_NAME="${DB_NAME:-helsa_db}"
DB_URL="postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}"

log() { printf '\033[1;32m[helsa-dev]\033[0m %s\n' "$1"; }

# ---------- 1. PostgreSQL server ----------
if ! command -v pg_ctlcluster >/dev/null 2>&1; then
  log "PostgreSQL not found — installing (requires sudo)…"
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql
fi

if ! pg_isready -q -h 127.0.0.1 -p 5432 2>/dev/null; then
  log "Starting PostgreSQL cluster…"
  sudo pg_ctlcluster 17 main start 2>/dev/null || sudo pg_ctlcluster 16 main start 2>/dev/null || true
  for i in $(seq 1 10); do
    pg_isready -q -h 127.0.0.1 -p 5432 && break
    sleep 1
  done
fi
pg_isready -q -h 127.0.0.1 -p 5432 || { echo "PostgreSQL did not become ready"; exit 1; }

# ---------- 2. Database + user ----------
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1; then
  log "Creating role ${DB_USER}…"
  sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';"
fi
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  log "Creating database ${DB_NAME}…"
  sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
fi

# ---------- 3. .env ----------
if [ ! -f .env ]; then
  log "Creating .env from .env.example…"
  cp .env.example .env
fi
# Ensure the local DB URL is present (keep other values untouched).
if ! grep -q "^DATABASE_URL=" .env; then
  printf '\nDATABASE_URL=%s\n' "$DB_URL" >> .env
fi
log "Database URL: ${DB_URL}"

# ---------- 4. Schema + seed ----------
log "Applying Drizzle schema…"
npx drizzle-kit push --force

log "Seeding core data (products, trays)…"
npx tsx --env-file=.env scripts/seed.ts

log "Seeding catalog (additive, 149 products)…"
npx tsx --env-file=.env scripts/seed-catalog.ts || true

log "Seeding gift packages…"
npx tsx --env-file=.env scripts/seed-gifts.ts || true

log "Done. Start the dev server with: npm run dev"
