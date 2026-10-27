#!/bin/sh
# Writes /config.json for the admin console from environment variables, so the same
# image works on every server. Runs automatically when the nginx container starts.
set -eu

: "${ADMIN_API_URL:?ADMIN_API_URL is required}"
: "${ADMIN_KEYCLOAK_URL:?ADMIN_KEYCLOAK_URL is required}"

cat > /usr/share/nginx/html/config.json <<JSON
{
  "apiUrl": "${ADMIN_API_URL}",
  "keycloakUrl": "${ADMIN_KEYCLOAK_URL}",
  "keycloakRealm": "${ADMIN_KEYCLOAK_REALM:-wattwisely}",
  "keycloakClientId": "${ADMIN_KEYCLOAK_CLIENT_ID:-wattwisely-admin}",
  "portalUrl": "${ADMIN_PORTAL_URL:-}"
}
JSON
echo "admin: wrote config.json for API ${ADMIN_API_URL}"
