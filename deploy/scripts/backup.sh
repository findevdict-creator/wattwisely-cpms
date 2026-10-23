#!/usr/bin/env bash
# Backs up everything needed to rebuild the platform into backups/<date-time>/:
#   - both Postgres databases (Wattwisely and Keycloak)
#   - OpenBao's encrypted data and the file storage
#   - .env and .secrets (passwords and the OpenBao unseal key)
# Each dump is read back once to catch a broken file, and SHA256SUMS lets restore-drill.sh
# and restore.sh check that nothing changed since. Backups older than BACKUP_KEEP_DAYS are
# deleted. Copy backups off the server too, and prove one restores with ./scripts/restore-drill.sh.
source "$(dirname "$0")/lib/common.sh"
require_env_file

STARTED_AT="$(date +%s)"
TARGET="$BACKUP_ROOT/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$TARGET" && chmod 700 "$TARGET"

backup_database() {
  info "Database $1"
  compose exec -T postgres pg_dump -U wattwisely --format=custom "$1" >"$TARGET/$1.dump"
  # pg_restore reads the whole archive's table of contents: a cut-off dump fails here.
  compose exec -T postgres pg_restore --list <"$TARGET/$1.dump" >/dev/null ||
    die "The dump of $1 cannot be read back. The backup in $TARGET is incomplete."
}

backup_volume() {
  local volume="$1"
  info "Volume $volume"
  docker run --rm -v "wattwisely_${volume}:/data:ro" -v "$TARGET:/backup" alpine:3.22 \
    tar czf "/backup/${volume}.tar.gz" -C /data .
}

write_checksums() {
  info "Checksums"
  local sums
  sums="$(cd "$TARGET" && find . -type f -print0 | sort -z | xargs -0 sha256sum)"
  printf '%s\n' "$sums" >"$TARGET/SHA256SUMS"
}

backup_database wattwisely
backup_database keycloak
backup_volume openbao-data
backup_volume object-storage-data

info "Settings and secrets"
cp "$ENV_FILE" "$TARGET/env"
[[ -d "$SECRETS_DIR" ]] && cp -r "$SECRETS_DIR" "$TARGET/secrets"
[[ -f "$DEPLOY_DIR/seaweedfs/s3.json" ]] && cp "$DEPLOY_DIR/seaweedfs/s3.json" "$TARGET/s3.json"
env_value WATTWISELY_VERSION >"$TARGET/VERSION"
write_checksums

KEEP_DAYS="$(env_value BACKUP_KEEP_DAYS)"
find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -mtime +"${KEEP_DAYS:-14}" -exec rm -rf {} +

# For the "no recent backup" alert (module 12).
begin_metrics backup
write_metric backup "When backup.sh last finished (Unix time)" wattwisely_backup_last_success_timestamp_seconds "$(date +%s)"
write_metric backup "How long the last backup took" wattwisely_backup_duration_seconds "$(($(date +%s) - STARTED_AT))"
write_metric backup "Size of the last backup" wattwisely_backup_size_bytes "$(($(du -sk "$TARGET" | cut -f1) * 1024))"
publish_metrics backup

info "Backup written to $TARGET ($(du -sh "$TARGET" | cut -f1))"
