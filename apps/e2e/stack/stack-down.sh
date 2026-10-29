#!/usr/bin/env bash
# Stops the apps started by apps-up.sh and the Docker services of stack-up.sh, and deletes the data.
set -euo pipefail
E2E_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK_DIR="$(cd "$E2E_DIR/../.." && pwd)/dist/e2e-stack"
if [[ -f "$WORK_DIR/pids" ]]; then
  while read -r pid; do kill "$pid" 2>/dev/null || true; done <"$WORK_DIR/pids"
  rm -f "$WORK_DIR/pids"
fi
if [[ -f "$WORK_DIR/docker-compose.yml" ]]; then
  docker compose --project-directory "$WORK_DIR" --env-file "$WORK_DIR/.env" -f "$WORK_DIR/docker-compose.yml" \
    down --volumes --remove-orphans
fi
