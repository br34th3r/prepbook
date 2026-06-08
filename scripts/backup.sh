#!/usr/bin/env bash
# Back up the local Supabase Postgres database to ./backups.
#
# Uses pg_dump inside the running Supabase database container, so you don't
# need a local psql/pg_dump install. Restore with:
#   gunzip -c backups/<file>.sql.gz | \
#     docker exec -i supabase_db_prepbook psql -U postgres -d postgres
set -euo pipefail

CONTAINER="${SUPABASE_DB_CONTAINER:-supabase_db_prepbook}"
OUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/backups"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_FILE="$OUT_DIR/mealplan-$STAMP.sql.gz"

mkdir -p "$OUT_DIR"

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "Supabase DB container '${CONTAINER}' is not running. Run 'supabase start' first." >&2
  exit 1
fi

echo "Dumping database from ${CONTAINER}…"
docker exec "$CONTAINER" pg_dump -U postgres -d postgres | gzip > "$OUT_FILE"
echo "Backup written to ${OUT_FILE}"
