#!/usr/bin/env bash
# Restores a backup made by backup.sh. This REPLACES all current data.
#
#   ./scripts/restore.sh backups/20261022T020000Z
#   ./scripts/restore.sh backups/20261022T020000Z --yes   (no confirmation question)
source "$(dirname "$0")/lib/common.sh"
source "$(dirname "$0")/lib/openbao.sh"

SOURCE="${1:-}"
[[ -n "$SOURCE" && -d "$SOURCE" ]] || die "Usage: ./scripts/restore.sh <backup directory> [--yes]"
SOURCE="$(cd "$SOURCE" && pwd)"

if [[ "${2:-}" != "--yes" ]]; then
  read -r -p "This replaces ALL current data with the backup in $SOURCE. Type 'restore' to continue: " answer
  [[ "$answer" == "restore" ]] || die "Cancelled"
fi

restore_settings() {
  info "Settings and secrets"
  cp "$SOURCE/env" "$ENV_FILE" && chmod 600 "$ENV_FILE"
  [[ -d "$SOURCE/secrets" ]] && rm -rf "$SECRETS_DIR" && cp -r "$SOURCE/secrets" "$SECRETS_DIR"
  [[ -f "$SOURCE/s3.json" ]] && cp "$SOURCE/s3.json" "$DEPLOY_DIR/seaweedfs/s3.json"
  return 0
}

restore_volume() {
  local volume="$1"
  info "Volume $volume"
  docker run --rm -v "wattwisely_${volume}:/data" -v "$SOURCE:/backup:ro" alpine:3.22 \
    sh -c "rm -rf /data/* /data/..?* /data/.[!.]* 2>/dev/null; tar xzf /backup/${volume}.tar.gz -C /data"
}

restore_database() {
  info "Database $1"
  compose exec -T postgres pg_restore -U wattwisely --clean --if-exists --no-owner --role="$2" -d "$1" <"$SOURCE/$1.dump"
}

restore_settings
info "Stopping applications"
compose stop caddy api portal keycloak openbao object-storage
restore_volume openbao-data
restore_volume object-storage-data
compose up -d postgres
wait_for_service postgres
restore_database wattwisely wattwisely
restore_database keycloak keycloak
info "Starting everything again"
"$(dirname "$0")/up.sh" --no-pull
