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

info "Restarting with the new images (up.sh runs the database migrations first)"
"$(dirname "$0")/up.sh" --no-pull
"$(dirname "$0")/health.sh"
