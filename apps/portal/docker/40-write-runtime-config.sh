#!/bin/sh
# Writes /config.json for the portal from environment variables, so the same
# image works on every server. Runs automatically when the nginx container starts.
set -eu

: "${PORTAL_API_URL:?PORTAL_API_URL is required}"
: "${PORTAL_KEYCLOAK_URL:?PORTAL_KEYCLOAK_URL is required}"

cat > /usr/share/nginx/html/config.json <<JSON
{
  "apiUrl": "${PORTAL_API_URL}",
  "keycloakUrl": "${PORTAL_KEYCLOAK_URL}",
  "keycloakRealm": "${PORTAL_KEYCLOAK_REALM:-wattwisely}",
  "keycloakClientId": "${PORTAL_KEYCLOAK_CLIENT_ID:-wattwisely-portal}",
  "adminUrl": "${PORTAL_ADMIN_URL:-}",
  "helpUrl": "${PORTAL_HELP_URL:-}"
}
JSON
echo "portal: wrote config.json for API ${PORTAL_API_URL}"
