#!/usr/bin/env bash
# Backs up everything needed to rebuild the platform into backups/<date-time>/:
#   - both Postgres databases (Wattwisely and Keycloak)
#   - OpenBao's encrypted data and the file storage
#   - .env and .secrets (passwords and the OpenBao unseal key)
# Backups older than BACKUP_KEEP_DAYS are deleted. Copy backups off the server too.
source "$(dirname "$0")/lib/common.sh"
require_env_file

TARGET="$BACKUP_ROOT/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$TARGET" && chmod 700 "$TARGET"

backup_database() {
  info "Database $1"
  compose exec -T postgres pg_dump -U wattwisely --format=custom "$1" >"$TARGET/$1.dump"
}

backup_volume() {
  local volume="$1"
  info "Volume $volume"
  docker run --rm -v "wattwisely_${volume}:/data:ro" -v "$TARGET:/backup" alpine:3.22 \
    tar czf "/backup/${volume}.tar.gz" -C /data .
}

backup_database wattwisely
backup_database keycloak
backup_volume openbao-data
backup_volume object-storage-data

info "Settings and secrets"
cp "$ENV_FILE" "$TARGET/env"
[[ -d "$SECRETS_DIR" ]] && cp -r "$SECRETS_DIR" "$TARGET/secrets"
[[ -f "$DEPLOY_DIR/seaweedfs/s3.json" ]] && cp "$DEPLOY_DIR/seaweedfs/s3.json" "$TARGET/s3.json"

KEEP_DAYS="$(env_value BACKUP_KEEP_DAYS)"
find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -mtime +"${KEEP_DAYS:-14}" -exec rm -rf {} +

info "Backup written to $TARGET ($(du -sh "$TARGET" | cut -f1))"
