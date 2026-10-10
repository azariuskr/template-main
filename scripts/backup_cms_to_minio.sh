#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/home/krisadmin/projects/better-tanstart-template/.worktrees/feat-cms-core"
PROJECT_NAME="better-tanstart-template"
TMP_DIR="/tmp/better-tanstart-cms-backups"
DB_NAME="blog3"
DB_USER="admin"
MINIO_ALIAS="local"
MINIO_URL="http://minio:9000"
MINIO_USER="minioadmin"
MINIO_PASS="minioadmin123"
MINIO_BUCKET="cms-backups"

mkdir -p "$TMP_DIR"
TS="$(date +%F_%H-%M-%S)"
DUMP_FILE="$TMP_DIR/cms_${DB_NAME}_${TS}.sql.gz"

cd "$PROJECT_DIR"

docker-compose -p "$PROJECT_NAME" up -d postgres minio >/dev/null

CMS_TABLES=$(docker exec postgres_api sh -lc "psql -U '$DB_USER' -d '$DB_NAME' -Atc \"select tablename from pg_tables where schemaname='public' and tablename like 'cms_%' order by 1;\"")

if [ -z "$CMS_TABLES" ]; then
  echo "[$(date '+%F %T')] No cms_* tables found in $DB_NAME. Skipping CMS dump (nothing to back up yet)."
  exit 0
fi

TABLE_ARGS=""
while IFS= read -r tbl; do
  [ -n "$tbl" ] && TABLE_ARGS="$TABLE_ARGS -t public.$tbl"
done <<< "$CMS_TABLES"

# shellcheck disable=SC2086
docker exec postgres_api sh -lc "pg_dump -U '$DB_USER' -d '$DB_NAME' $TABLE_ARGS" | gzip -9 > "$DUMP_FILE"

# Upload to MinIO
docker run --rm \
  --entrypoint /bin/sh \
  --network app-network \
  -v "$TMP_DIR":/backup \
  minio/mc -c "
    mc alias set $MINIO_ALIAS $MINIO_URL $MINIO_USER $MINIO_PASS >/dev/null 2>&1 &&
    mc mb -p $MINIO_ALIAS/$MINIO_BUCKET >/dev/null 2>&1 || true &&
    mc cp /backup/$(basename "$DUMP_FILE") $MINIO_ALIAS/$MINIO_BUCKET/
  "

# Local retention: keep latest 30
ls -1t "$TMP_DIR"/*.sql.gz 2>/dev/null | tail -n +31 | xargs -r rm -f

echo "[$(date '+%F %T')] CMS backup completed: $(basename "$DUMP_FILE")"
