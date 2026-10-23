# Talking to Keycloak from the scripts, through kcadm inside the container.

kcadm() {
  compose exec -T keycloak /opt/keycloak/bin/kcadm.sh "$@"
}

keycloak_login() {
  kcadm config credentials --server http://localhost:8080 --realm master \
    --user "$(env_value KEYCLOAK_ADMIN_USER)" --password "$(env_value KEYCLOAK_ADMIN_PASSWORD)" >/dev/null 2>&1
}

# Module 9 added the admin console and its login client, wattwisely-admin. Keycloak reads the
# realm file only when the realm is first created, so a server installed earlier gets the
# client here, once. Nothing happens when it exists already.
ensure_admin_client() {
  local scheme admin_url dev_url
  scheme="$(env_value PUBLIC_SCHEME)"
  admin_url="$scheme://$(env_value ADMIN_HOST)"
  dev_url="$(env_value ADMIN_DEV_URL)"
  dev_url="${dev_url:-$admin_url}"
  if ! keycloak_login; then
    warn "Could not sign in to Keycloak to check the admin console's login client; add wattwisely-admin by hand if staff cannot log in."
    return 0
  fi
  if [[ -n "$(kcadm get clients -r wattwisely -q clientId=wattwisely-admin --fields id --format csv --noquotes 2>/dev/null)" ]]; then
    return 0
  fi
  info "Adding the admin console's login client (wattwisely-admin) to Keycloak"
  kcadm create clients -r wattwisely -f - >/dev/null <<JSON
{
  "clientId": "wattwisely-admin",
  "name": "Wattwisely admin console",
  "description": "The Angular admin console for Wattwisely staff (module 9). Public client with PKCE, like the portal; the API decides who is staff.",
  "enabled": true,
  "publicClient": true,
  "standardFlowEnabled": true,
  "implicitFlowEnabled": false,
  "directAccessGrantsEnabled": false,
  "serviceAccountsEnabled": false,
  "frontchannelLogout": true,
  "rootUrl": "$admin_url",
  "baseUrl": "/",
  "redirectUris": ["$admin_url/*", "$dev_url/*"],
  "webOrigins": ["$admin_url", "$dev_url"],
  "attributes": {
    "pkce.code.challenge.method": "S256",
    "post.logout.redirect.uris": "$admin_url/*##$dev_url/*"
  },
  "protocolMappers": [
    {
      "name": "wattwisely-api audience",
      "protocol": "openid-connect",
      "protocolMapper": "oidc-audience-mapper",
      "config": {
        "included.client.audience": "wattwisely-api",
        "access.token.claim": "true",
        "id.token.claim": "false",
        "introspection.token.claim": "true"
      }
    }
  ]
}
JSON
}
