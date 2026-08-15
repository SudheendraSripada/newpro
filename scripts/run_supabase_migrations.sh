#!/usr/bin/env bash
set -euo pipefail

# Usage:
# export DATABASE_URL="postgres://user:pass@host:port/db"
# ./scripts/run_supabase_migrations.sh

MIGRATION_FILE="supabase/migrations/20260815120000_add_dpdp_tables.sql"

if [ -z "${DATABASE_URL-}" ]; then
  echo "ERROR: DATABASE_URL is not set. Export your Postgres connection string first." >&2
  echo "Example: export DATABASE_URL=\"postgres://user:pass@host:5432/dbname\"" >&2
  exit 2
fi

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "Migration file not found: $MIGRATION_FILE" >&2
  exit 2
fi

echo "Applying migration: $MIGRATION_FILE"
psql "$DATABASE_URL" -f "$MIGRATION_FILE"

echo "Migration applied. Verify tables with:"
echo "  psql \"$DATABASE_URL\" -c \"\dt public.dpdp_*\""
