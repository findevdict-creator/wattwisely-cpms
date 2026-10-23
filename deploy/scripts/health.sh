#!/usr/bin/env bash
# Checks that every service is up and answering. Exit code 0 = all healthy.
# Safe to run from cron or a monitoring tool.
source "$(dirname "$0")/lib/common.sh"
require_env_file

FAILURES=0

report() {
  local name="$1" result="$2"
  if [[ "$result" == "ok" ]]; then
    printf '  \033[32m✔\033[0m %-28s ok\n' "$name"
  else
    printf '  \033[31m✘\033[0m %-28s %s\n' "$name" "$result"
    FAILURES=$((FAILURES + 1))
  fi
}

container_state() {
  local id
  id="$(compose ps -q "$1" 2>/dev/null)"
  [[ -n "$id" ]] || { echo "not running"; return; }
  docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$id"
}

# Calls a URL from inside the Docker network (through the Caddy container), so no DNS is needed.
http_check() {
  if compose exec -T caddy wget -q -T 5 -O /dev/null "$1" 2>/dev/null; then echo ok; else echo "no answer from $1"; fi
}

services=(caddy api portal driver ocpp-gateway worker keycloak postgres valkey openbao object-storage)
is_profile_on monitoring && services+=(prometheus alertmanager grafana node-exporter)

info "Containers"
for service in "${services[@]}"; do
  state="$(container_state "$service")"
  if [[ "$state" == "healthy" || "$state" == "running" ]]; then
    report "$service" ok
  else
    report "$service" "$state"
  fi
done

info "Endpoints"
report "API ready" "$(http_check http://api:3000/health/ready)"
report "Portal" "$(http_check http://portal:8080/healthz)"
report "Driver app" "$(http_check http://driver:8080/healthz)"
report "OCPP gateway ready" "$(http_check http://ocpp-gateway:3100/health/ready)"
report "Worker ready" "$(http_check http://worker:3200/health/ready)"
report "Keycloak realm" "$(http_check http://keycloak:8080/realms/wattwisely/.well-known/openid-configuration)"
if is_profile_on monitoring; then
  report "Prometheus ready" "$(http_check http://prometheus:9090/-/ready)"
  report "Alertmanager ready" "$(http_check http://alertmanager:9093/-/ready)"
  report "Grafana" "$(http_check http://grafana:3000/api/health)"
  firing="$(compose exec -T caddy wget -q -T 5 -O - 'http://prometheus:9090/api/v1/alerts' 2>/dev/null |
    grep -o '"state":"firing"' | wc -l | tr -d ' ' || true)"
  if [[ "${firing:-0}" == "0" ]]; then report "Alerts firing" ok; else report "Alerts firing" "$firing (see Grafana or http://localhost:9090/alerts)"; fi
fi
sealed="$(compose exec -T openbao bao status -format=json 2>/dev/null | grep -o '"sealed": *[a-z]*' || true)"
if [[ "$sealed" == *false ]]; then
  report "OpenBao unsealed" ok
else
  report "OpenBao unsealed" "sealed - run ./scripts/up.sh"
fi

if ((FAILURES > 0)); then
  die "$FAILURES check(s) failed"
fi
info "All checks passed"
