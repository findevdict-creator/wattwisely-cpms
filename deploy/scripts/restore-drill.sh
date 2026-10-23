#!/usr/bin/env bash
# Proves a backup can be restored, without touching the running platform (module 12).
#
#   ./scripts/restore-drill.sh                            the newest backup
#   ./scripts/restore-drill.sh backups/20261022T020000Z   a given one
#
# It checks the files against SHA256SUMS, restores both databases into a throw-away Postgres
# container with no network (removed afterwards), runs a few sanity queries, reads the volume
# archives through, and prints how long the restore took: the time to plan a real recovery with.
# Run it monthly; Prometheus warns when the last successful drill is older than 35 days.
source "$(dirname "$0")/lib/common.sh"
require_env_file

POSTGRES_IMAGE=postgres:16.15-alpine
CONTAINER="wattwisely-restore-drill-$$"

pick_backup() {
  local source="${1:-}"
  if [[ -z "$source" ]]; then
    source="$(find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d | sort | tail -n 1)"
    [[ -n "$source" ]] || die "No backups in $BACKUP_ROOT. Run ./scripts/backup.sh first."
  fi
  [[ -d "$source" ]] || die "Usage: ./scripts/restore-drill.sh [backup directory]"
  (cd "$source" && pwd)
}

start_scratch_database() {
  info "Starting a throw-away Postgres ($POSTGRES_IMAGE, no network)"
  docker run -d --rm --name "$CONTAINER" --network none -e POSTGRES_PASSWORD=drill "$POSTGRES_IMAGE" >/dev/null
  local waited=0
  # The image's first start runs initdb and restarts once; wait for the final server.
  until docker exec "$CONTAINER" pg_isready -U postgres -h 127.0.0.1 -q 2>/dev/null; do
    ((waited < 60)) || die "The scratch Postgres did not start"
    sleep 1
    waited=$((waited + 1))
  done
  scratch_sql postgres <<'SQL'
CREATE ROLE wattwisely_migrator;
CREATE ROLE wattwisely_app;
CREATE ROLE keycloak;
CREATE DATABASE wattwisely;
CREATE DATABASE keycloak;
SQL
}

scratch_sql() {
  docker exec -i "$CONTAINER" psql -X -q -At -v ON_ERROR_STOP=1 -h 127.0.0.1 -U postgres -d "$1"
}

restore_into_scratch() {
  info "Restoring database $1"
  [[ -f "$SOURCE/$1.dump" ]] || die "$SOURCE has no $1.dump"
  docker exec -i "$CONTAINER" pg_restore --exit-on-error --no-owner -h 127.0.0.1 -U postgres -d "$1" <"$SOURCE/$1.dump"
}

# Prints "name value" lines and fails when the database looks empty or half-restored.
check_wattwisely() {
  local report
  report="$(scratch_sql wattwisely <<'SQL'
SELECT 'migrations applied', count(*) FROM drizzle.__drizzle_migrations;
SELECT 'tables with row-level security', count(*) FROM pg_class WHERE relrowsecurity;
SELECT 'tenants', count(*) FROM tenants;
SELECT 'user accounts', count(*) FROM user_accounts;
SELECT 'sites', count(*) FROM sites;
SELECT 'chargers', count(*) FROM chargers;
SELECT 'charging sessions', count(*) FROM charging_sessions;
SELECT 'payments', count(*) FROM payments;
SELECT 'audit log entries', count(*) FROM audit_log;
SELECT 'newest audit entry', coalesce(max(occurred_at)::text, 'none') FROM audit_log;
SQL
)"
  printf '%s\n' "$report" | awk -F '|' '{ printf "  %-32s %s\n", $1, $2 }'
  [[ "$(printf '%s\n' "$report" | awk -F '|' '$1 == "migrations applied" { print $2 }')" -gt 0 ]] ||
    die "No migrations recorded: the Wattwisely database did not restore."
  [[ "$(printf '%s\n' "$report" | awk -F '|' '$1 == "tables with row-level security" { print $2 }')" -gt 0 ]] ||
    die "No table has row-level security: the restore is incomplete."
}

check_keycloak() {
  local realms
  realms="$(scratch_sql keycloak <<<"SELECT count(*) FROM realm WHERE name = 'wattwisely';")"
  printf '  %-32s %s\n' "Keycloak realm wattwisely" "$([[ "$realms" == 1 ]] && echo present || echo MISSING)"
  [[ "$realms" == 1 ]] || die "The Keycloak backup has no wattwisely realm: logins would not work."
}

check_archives() {
  local archive
  for archive in openbao-data object-storage-data; do
    [[ -f "$SOURCE/$archive.tar.gz" ]] || die "$SOURCE has no $archive.tar.gz"
    printf '  %-32s %s files\n' "$archive" "$(tar -tzf "$SOURCE/$archive.tar.gz" | grep -vc '/$')"
  done
  [[ -f "$SOURCE/env" ]] || die "$SOURCE has no copy of .env: the passwords would be lost."
  [[ -d "$SOURCE/secrets" ]] || warn "$SOURCE has no secrets folder: OpenBao could not be unsealed."
}

cleanup() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
}

SOURCE="$(pick_backup "${1:-}")"
info "Drill with $SOURCE (version $(cat "$SOURCE/VERSION" 2>/dev/null || echo unknown))"
verify_backup_checksums "$SOURCE"
trap cleanup EXIT
STARTED_AT="$(date +%s)"
start_scratch_database
restore_into_scratch wattwisely
restore_into_scratch keycloak
RESTORE_SECONDS=$(($(date +%s) - STARTED_AT))

info "What the backup holds"
check_wattwisely
check_keycloak
check_archives

begin_metrics restore-drill
write_metric restore-drill "When restore-drill.sh last succeeded (Unix time)" \
  wattwisely_restore_drill_last_success_timestamp_seconds "$(date +%s)"
write_metric restore-drill "How long restoring both databases took in the last drill" \
  wattwisely_restore_drill_duration_seconds "$RESTORE_SECONDS"
write_metric restore-drill "Age of the backup the last drill restored" \
  wattwisely_restore_drill_backup_age_seconds "$(($(date +%s) - $(stat -c %Y "$SOURCE/SHA256SUMS" 2>/dev/null || stat -c %Y "$SOURCE")))"
publish_metrics restore-drill

info "Drill passed: the databases restored in ${RESTORE_SECONDS}s. A real restore: ./scripts/restore.sh $SOURCE"
