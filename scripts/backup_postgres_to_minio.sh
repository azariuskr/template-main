#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/home/krisadmin/projects/better-tanstart-template/.worktrees/feat-cms-core"
PROJECT_NAME="better-tanstart-template"
TMP_DIR="/tmp/better-tanstart-backups"
DB_NAME="blog3"
DB_USER="admin"
MINIO_ALIAS="local"
MINIO_URL="http://minio:9000"
MINIO_USER="minioadmin"
MINIO_PASS="minioadmin123"
MINIO_BUCKET="db-backups"

mkdir -p "$TMP_DIR"
TS="$(date +%F_%H-%M-%S)"
DUMP_FILE="$TMP_DIR/${DB_NAME}_${TS}.sql.gz"

cd "$PROJECT_DIR"

# Ensure required services are running
docker-compose -p "$PROJECT_NAME" up -d postgres minio >/dev/null

# Create compressed SQL dump from postgres container
docker exec postgres_api sh -lc "pg_dump -U '$DB_USER' -d '$DB_NAME'" | gzip -9 > "$DUMP_FILE"

# Upload dump to MinIO bucket using MinIO client container
docker run --rm \
  --entrypoint /bin/sh \
  --network app-network \
  -v "$TMP_DIR":/backup \
  minio/mc -c "
    mc alias set $MINIO_ALIAS $MINIO_URL $MINIO_USER $MINIO_PASS >/dev/null 2>&1 &&
    mc mb -p $MINIO_ALIAS/$MINIO_BUCKET >/dev/null 2>&1 || true &&
    mc cp /backup/$(basename "$DUMP_FILE") $MINIO_ALIAS/$MINIO_BUCKET/
  "

# Keep only last 14 local backup files
ls -1t "$TMP_DIR"/*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm -f

echo "[$(date '+%F %T')] Backup completed: $(basename "$DUMP_FILE")"
