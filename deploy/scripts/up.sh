#!/usr/bin/env bash
# Starts (or restarts) the whole platform and waits until it is healthy.
#
#   ./scripts/up.sh           use the released images from GitHub's registry
#   ./scripts/up.sh --build   build the API and portal images from this checkout instead
#   ./scripts/up.sh --no-pull use images already on this machine (e.g. loaded with docker load)
source "$(dirname "$0")/lib/common.sh"
source "$(dirname "$0")/lib/openbao.sh"
source "$(dirname "$0")/lib/database.sh"

require_env_file

# Module 3 added the charger connection addresses; a .env from an earlier install gets defaults.
ensure_ocpp_urls() {
  [[ -z "$(env_value OCPP_URL)" ]] || return 0
  local domain
  domain="$(env_value API_HOST)"
  domain="${domain#api.}"
  if [[ "$(env_value PUBLIC_SCHEME)" == "https" ]]; then
    set_env_value OCPP_URL "wss://ocpp.$domain/ocpp"
    set_env_value OCPP_PLAIN_URL "ws://ocpp-plain.$domain/ocpp"
  else
    set_env_value OCPP_URL "ws://ocpp.$domain/ocpp"
    set_env_value OCPP_PLAIN_URL "ws://ocpp.$domain/ocpp"
  fi
}
ensure_ocpp_urls

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
for service in postgres valkey keycloak api portal; do
  wait_for_service "$service"
done
openbao_unseal

scheme="$(env_value PUBLIC_SCHEME)"
info "Wattwisely is running"
echo "  Portal:          $scheme://$(env_value PORTAL_HOST)"
echo "  API:             $scheme://$(env_value API_HOST)/docs"
echo "  Keycloak admin:  $scheme://$(env_value AUTH_HOST)/admin  (user $(env_value KEYCLOAK_ADMIN_USER))"
