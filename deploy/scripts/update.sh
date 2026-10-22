#!/usr/bin/env bash
# Updates to a new version with a safety backup first.
#
#   ./scripts/update.sh 0.2.0     switch to version 0.2.0
#   ./scripts/update.sh           pull the current version again (e.g. "main")
source "$(dirname "$0")/lib/common.sh"
require_env_file

if [[ -n "${1:-}" ]]; then
  info "Switching to version $1"
  set_env_value WATTWISELY_VERSION "$1"
fi

info "Safety backup before updating"
"$(dirname "$0")/backup.sh"

info "Pulling images"
compose pull --quiet

run_migrations() {
  # Database migrations arrive with module 2 (tenancy). From then on this runs
  # "compose run --rm api node migrate.js" before the new API starts.
  info "No database migrations yet"
}
run_migrations

info "Restarting with the new images"
"$(dirname "$0")/up.sh"
"$(dirname "$0")/health.sh"
