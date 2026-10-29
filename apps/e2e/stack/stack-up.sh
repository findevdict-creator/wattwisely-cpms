#!/usr/bin/env bash
# Starts the services the end-to-end tests run against: Postgres, Keycloak and Mailpit in
# Docker, migrated and seeded with deploy/scripts/seed-demo.sh, the same demo data as a local
# trial. Then apps-up.sh starts the apps on the host. Run from anywhere:
#
#   apps/e2e/stack/stack-up.sh        start (or restart) and seed
#   apps/e2e/stack/stack-down.sh      stop everything and delete the data
#
# Needs Docker, the hosts line for *.localhost (README.md, "Try it on your machine") and a build
# of the API (npx nx build api), whose migrate.js applies the migrations.
set -euo pipefail

E2E_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT_DIR="$(cd "$E2E_DIR/../.." && pwd)"
WORK_DIR="$ROOT_DIR/dist/e2e-stack"

# deploy/scripts find docker-compose.yml and .env beside their own folder, so the stack lives in
# a folder that holds a copy of them with this compose file in place of the production one.
prepare_work_dir() {
  rm -rf "$WORK_DIR" && mkdir -p "$WORK_DIR/logs"
  cp -R "$ROOT_DIR/deploy/scripts" "$ROOT_DIR/deploy/keycloak" "$ROOT_DIR/deploy/postgres" "$WORK_DIR/"
  cp "$E2E_DIR/stack/docker-compose.yml" "$WORK_DIR/docker-compose.yml"
  # Fixed passwords: the stack is thrown away after each run and listens on 127.0.0.1 only.
  cat >"$WORK_DIR/.env" <<ENV
PUBLIC_SCHEME=http
PORTAL_HOST=localhost:4200
DRIVER_HOST=localhost:4300
ADMIN_HOST=localhost:4400
API_HOST=localhost:3000
POSTGRES_PASSWORD=e2e-postgres
KEYCLOAK_DB_PASSWORD=e2e-keycloak-db
KEYCLOAK_ADMIN_USER=admin
KEYCLOAK_ADMIN_PASSWORD=e2e-keycloak-admin
DB_MIGRATOR_PASSWORD=e2e-migrator
DB_APP_PASSWORD=e2e-app
ENV
}

prepare_work_dir
# shellcheck source=/dev/null
source "$WORK_DIR/scripts/lib/common.sh"
# shellcheck source=/dev/null
source "$WORK_DIR/scripts/lib/database.sh"

compose down --volumes --remove-orphans >/dev/null 2>&1 || true
info "Starting Postgres"
compose up -d postgres
wait_for_service postgres
ensure_database_roles
ensure_keycloak_database
info "Database migrations"
MIGRATION_DATABASE_URL="postgres://wattwisely_migrator:e2e-migrator@localhost:5432/wattwisely" \
  node "$ROOT_DIR/dist/apps/api/migrate.js"
info "Starting Keycloak and Mailpit"
compose up -d keycloak mailpit
wait_for_service keycloak
"$WORK_DIR/scripts/seed-demo.sh"
info "Services ready: Keycloak http://auth.localhost, Mailpit http://localhost:8025, Postgres localhost:5432"
