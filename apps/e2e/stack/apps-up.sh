#!/usr/bin/env bash
# Starts the apps on the host against the services of stack-up.sh, from the builds in dist/:
#
#   npx nx run-many -t build -p api ocpp-gateway worker charger-sim-cli portal driver admin mobile
#   apps/e2e/stack/apps-up.sh
#
# API :3000, OCPP gateway :3100, worker :3200, portal :4200, driver web app :4300,
# admin console :4400, the mobile app's web build :4500. Logs in dist/e2e-stack/logs.
# The frontends read the config.json their build copied from apps/<app>/public.
set -euo pipefail

E2E_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT_DIR="$(cd "$E2E_DIR/../.." && pwd)"
WORK_DIR="$ROOT_DIR/dist/e2e-stack"
DIST="$ROOT_DIR/dist/apps"
DATABASE_URL="postgres://wattwisely_app:e2e-app@localhost:5432/wattwisely"
: >"$WORK_DIR/pids"

# start <name> <env file> <command...>: runs it in the background with the env file's settings.
start() {
  local name="$1" env_file="$2"
  shift 2
  (
    set -a
    # shellcheck source=/dev/null
    source "$env_file"
    set +a
    exec "$@"
  ) >"$WORK_DIR/logs/$name.log" 2>&1 &
  echo $! >>"$WORK_DIR/pids"
}

# The example settings of each app, with the stack's database password, faster worker jobs and,
# as in production (deploy/.env.example), unknown RFID cards refused.
env_file() {
  local app="$1" file="$WORK_DIR/$1.env"
  sed -e "s|^DATABASE_URL=.*|DATABASE_URL=$DATABASE_URL|" \
    -e 's|_INTERVAL_MS=[0-9]*|_INTERVAL_MS=5000|' \
    -e 's|^OCPP_ACCEPT_UNKNOWN_ID_TAGS=.*|OCPP_ACCEPT_UNKNOWN_ID_TAGS=false|' \
    "$ROOT_DIR/apps/$app/.env.example" >"$file"
  echo "$file"
}

wait_for() {
  local name="$1" url="$2" waited=0
  until curl -fs -o /dev/null "$url"; do
    ((waited++ < 120)) || {
      echo "$name did not start; see $WORK_DIR/logs/$name.log" >&2
      exit 1
    }
    sleep 1
  done
  echo "$name ready on $url"
}

start api "$(env_file api)" node "$DIST/api/main.js"
start ocpp-gateway "$(env_file ocpp-gateway)" node "$DIST/ocpp-gateway/main.js"
start worker "$(env_file worker)" node "$DIST/worker/main.js"
for pair in portal:4200 driver:4300 admin:4400 mobile:4500; do
  app="${pair%%:*}" port="${pair##*:}"
  echo "PORT=$port" >"$WORK_DIR/$app-web.env"
  start "$app" "$WORK_DIR/$app-web.env" node "$E2E_DIR/stack/static-server.mjs" "$DIST/$app/browser" "$port"
done

wait_for api http://localhost:3000/health/ready
wait_for ocpp-gateway http://localhost:3100/health/ready
wait_for worker http://localhost:3200/health/ready
for port in 4200 4300 4400 4500; do wait_for "web $port" "http://localhost:$port/"; done
