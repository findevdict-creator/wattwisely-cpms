#!/bin/sh
# Writes /config.json for the driver app from environment variables, so the same
# image works on every server. Runs automatically when the nginx container starts.
set -eu

: "${DRIVER_API_URL:?DRIVER_API_URL is required}"
: "${DRIVER_KEYCLOAK_URL:?DRIVER_KEYCLOAK_URL is required}"

cat > /usr/share/nginx/html/config.json <<JSON
{
  "apiUrl": "${DRIVER_API_URL}",
  "keycloakUrl": "${DRIVER_KEYCLOAK_URL}",
  "keycloakRealm": "${DRIVER_KEYCLOAK_REALM:-wattwisely}",
  "keycloakClientId": "${DRIVER_KEYCLOAK_CLIENT_ID:-wattwisely-driver}"
}
JSON
echo "driver: wrote config.json for API ${DRIVER_API_URL}"
