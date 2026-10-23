#!/usr/bin/env bash
# Starts (or restarts) the whole platform and waits until it is healthy.
#
#   ./scripts/up.sh           use the released images from GitHub's registry
#   ./scripts/up.sh --build   build the Wattwisely images from this checkout instead
#   ./scripts/up.sh --no-pull use images already on this machine (e.g. loaded with docker load)
source "$(dirname "$0")/lib/common.sh"
source "$(dirname "$0")/lib/openbao.sh"
source "$(dirname "$0")/lib/database.sh"
source "$(dirname "$0")/lib/keycloak.sh"

require_env_file

# Module 3 added the charger connection addresses, module 4 the hosts Caddy routes to the
# gateway, module 7 the driver app's host and module 9 the admin console's; a .env from an
# earlier install gets defaults derived from its API host.
ensure_ocpp_settings() {
  local domain
  domain="$(env_value API_HOST)"
  domain="${domain#api.}"
  if [[ -z "$(env_value OCPP_URL)" ]]; then
    if [[ "$(env_value PUBLIC_SCHEME)" == "https" ]]; then
      set_env_value OCPP_URL "wss://ocpp.$domain/ocpp"
    else
      set_env_value OCPP_URL "ws://ocpp.$domain/ocpp"
    fi
    set_env_value OCPP_PLAIN_URL "ws://ocpp-plain.$domain/ocpp"
  fi
  [[ -n "$(env_value OCPP_HOST)" ]] || set_env_value OCPP_HOST "$(host_of "$(env_value OCPP_URL)")"
  [[ -n "$(env_value OCPP_PLAIN_HOST)" ]] || set_env_value OCPP_PLAIN_HOST "$(host_of "$(env_value OCPP_PLAIN_URL)")"
  if [[ -z "$(env_value OCPP_REQUIRE_TLS)" ]]; then
    if [[ "$(env_value PUBLIC_SCHEME)" == "https" ]]; then set_env_value OCPP_REQUIRE_TLS true; else set_env_value OCPP_REQUIRE_TLS false; fi
  fi
  [[ -n "$(env_value DRIVER_HOST)" ]] || set_env_value DRIVER_HOST "charge.$domain"
  [[ -n "$(env_value ADMIN_HOST)" ]] || set_env_value ADMIN_HOST "admin.$domain"
}

# Module 12: servers installed earlier have no Grafana password yet. The textfile folder
# must exist before node-exporter starts, or Docker creates it owned by root.
ensure_monitoring_settings() {
  [[ -n "$(env_value GRAFANA_ADMIN_PASSWORD)" ]] || set_env_value GRAFANA_ADMIN_PASSWORD "$(random_secret 32)"
  mkdir -p "$METRICS_DIR" && chmod 755 "$METRICS_DIR"
}

# "wss://ocpp.example.com/ocpp" -> "ocpp.example.com"
host_of() {
  local url="${1#*://}"
  echo "${url%%/*}"
}
ensure_ocpp_settings
ensure_monitoring_settings

if [[ "${1:-}" == "--build" ]]; then
  info "Building images from source"
  compose build
elif [[ "${1:-}" != "--no-pull" ]]; then
  info "Pulling images (version $(env_value WATTWISELY_VERSION))"
  compose pull --quiet ||
    die "Could not pull the images. For a private repository run 'docker login ghcr.io' first, or use --build."
fi

# The database comes first: the API starts only after its migrations have run.
ensure_database_secrets
compose up -d --no-build postgres
wait_for_service postgres
ensure_database_roles
run_migrations
compose up -d --no-build

info "Waiting for services to become healthy"
services=(postgres valkey keycloak api portal driver admin ocpp-gateway worker)
is_profile_on monitoring && services+=(prometheus alertmanager grafana node-exporter)
for service in "${services[@]}"; do
  wait_for_service "$service"
done
openbao_unseal
ensure_admin_client

scheme="$(env_value PUBLIC_SCHEME)"
info "Wattwisely is running"
echo "  Portal:          $scheme://$(env_value PORTAL_HOST)"
if [[ "$(env_value API_DOCS_ENABLED)" == "true" ]]; then
  echo "  API:             $scheme://$(env_value API_HOST)/docs"
else
  echo "  API:             $scheme://$(env_value API_HOST)  (reference at /docs is off: API_DOCS_ENABLED=true in .env)"
fi
echo "  Drivers:         $scheme://$(env_value DRIVER_HOST)  (QR codes on the chargers open this)"
echo "  Admin console:   $scheme://$(env_value ADMIN_HOST)  (Wattwisely staff; ./scripts/add-platform-admin.sh <email> adds the first)"
echo "  Chargers:        $(env_value OCPP_URL)/<charger id>"
echo "  Keycloak admin:  $scheme://$(env_value AUTH_HOST)/admin  (user $(env_value KEYCLOAK_ADMIN_USER))"
if is_profile_on monitoring; then
  echo "  Monitoring:      http://localhost:3300 on this server (user admin; ssh -L 3300:localhost:3300 from your laptop)"
else
  echo "  Monitoring:      off (add monitoring to COMPOSE_PROFILES in .env)"
fi
