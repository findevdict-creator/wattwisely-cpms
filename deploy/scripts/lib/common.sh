#!/usr/bin/env bash
# Shared helpers for the deploy scripts. Sourced, never run directly.
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$DEPLOY_DIR/.env"
# shellcheck disable=SC2034 # used by the scripts that source this file
SECRETS_DIR="$DEPLOY_DIR/.secrets"
# shellcheck disable=SC2034
BACKUP_ROOT="$DEPLOY_DIR/backups"

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
