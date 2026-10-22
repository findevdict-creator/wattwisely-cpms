#!/usr/bin/env bash
# Starts (or restarts) the whole platform and waits until it is healthy.
#
#   ./scripts/up.sh           use the released images from GitHub's registry
#   ./scripts/up.sh --build   build the API and portal images from this checkout instead
#   ./scripts/up.sh --no-pull use images already on this machine (e.g. loaded with docker load)
source "$(dirname "$0")/lib/common.sh"
source "$(dirname "$0")/lib/openbao.sh"

require_env_file

if [[ "${1:-}" == "--build" ]]; then
  info "Building images from source"
  compose build
  compose up -d
elif [[ "${1:-}" == "--no-pull" ]]; then
  compose up -d --no-build
else
  info "Pulling images (version $(env_value WATTWISELY_VERSION))"
  compose pull --quiet ||
    die "Could not pull the images. For a private repository run 'docker login ghcr.io' first, or use --build."
  compose up -d --no-build
fi

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
