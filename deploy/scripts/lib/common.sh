#!/usr/bin/env bash
# Shared helpers for the deploy scripts. Sourced, never run directly.
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$DEPLOY_DIR/.env"
# shellcheck disable=SC2034 # used by the scripts that source this file
SECRETS_DIR="$DEPLOY_DIR/.secrets"
# shellcheck disable=SC2034
BACKUP_ROOT="$DEPLOY_DIR/backups"
# Metrics the scripts leave for node-exporter's textfile collector (module 12), such as when
# the last backup finished. Readable by the monitoring containers, unlike backups/.
METRICS_DIR="$DEPLOY_DIR/monitoring/textfile"

info() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33mwarning:\033[0m %s\n' "$*" >&2; }
die() {
  printf '\033[1;31merror:\033[0m %s\n' "$*" >&2
  exit 1
}

# Runs docker compose for this deployment, from any working directory.
compose() {
  docker compose --project-directory "$DEPLOY_DIR" --env-file "$ENV_FILE" -f "$DEPLOY_DIR/docker-compose.yml" "$@"
}

require_env_file() {
  [[ -f "$ENV_FILE" ]] || die "No .env found. Run ./scripts/install.sh first."
}

# Reads one value from .env, e.g. env_value PUBLIC_SCHEME
env_value() {
  grep -E "^$1=" "$ENV_FILE" | tail -n 1 | cut -d '=' -f 2-
}

# Sets one value in .env, adding the line if it is missing.
set_env_value() {
  local key="$1" value="$2"
  if grep -qE "^${key}=" "$ENV_FILE"; then
    sed -i.bak "s|^${key}=.*|${key}=${value}|" "$ENV_FILE" && rm -f "$ENV_FILE.bak"
  else
    printf '%s=%s\n' "$key" "$value" >>"$ENV_FILE"
  fi
}

# True when COMPOSE_PROFILES in .env lists the profile, e.g. is_profile_on monitoring
is_profile_on() {
  [[ ",$(env_value COMPOSE_PROFILES | tr -d ' ')," == *",$1,"* ]]
}

# Metrics for Prometheus, one file per script, replaced in one step so a scrape never sees
# half of it:  begin_metrics backup; write_metric backup "<help>" <name> <value>; publish_metrics backup
begin_metrics() {
  mkdir -p "$METRICS_DIR" && chmod 755 "$METRICS_DIR"
  rm -f "$METRICS_DIR/$1.prom.tmp"
}

write_metric() {
  local file="$1" help="$2" name="$3" value="$4"
  printf '# HELP %s %s\n# TYPE %s gauge\n%s %s\n' "$name" "$help" "$name" "$name" "$value" >>"$METRICS_DIR/$file.prom.tmp"
}

# Publishes what write_metric collected for this file.
publish_metrics() {
  chmod 644 "$METRICS_DIR/$1.prom.tmp" && mv "$METRICS_DIR/$1.prom.tmp" "$METRICS_DIR/$1.prom"
}

# Checks a backup directory against the SHA256SUMS backup.sh wrote. Older backups have none.
verify_backup_checksums() {
  local directory="$1"
  if [[ ! -f "$directory/SHA256SUMS" ]]; then
    warn "$directory has no SHA256SUMS (made before module 12): its files cannot be checked."
    return 0
  fi
  (cd "$directory" && sha256sum --check --quiet SHA256SUMS) ||
    die "Files in $directory do not match SHA256SUMS: the backup was changed or damaged."
}

random_secret() {
  openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c "${1:-32}"
}

# Waits until a compose service reports healthy (or running, if it has no health check).
wait_for_service() {
  local service="$1" timeout="${2:-300}" waited=0 state
  while ((waited < timeout)); do
    state="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
      "$(compose ps -q "$service")" 2>/dev/null || echo starting)"
    [[ "$state" == "healthy" || "$state" == "running" ]] && return 0
    sleep 5
    waited=$((waited + 5))
  done
  die "$service did not become healthy within ${timeout}s. See: ./scripts/logs.sh $service"
}
