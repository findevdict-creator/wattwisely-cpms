#!/usr/bin/env bash
# Adds demo tenants and users to a LOCAL trial, so you can try the login flow.
#
#   Tenants (Keycloak organizations): acme-charging, volt-hotels
#   Users (password: Wattwisely-demo-1):
#     owner@acme.test    member of acme-charging
#     multi@demo.test    member of both tenants (shows the tenant switcher)
#     nobody@demo.test   member of no tenant (shows the "No workspace" page)
#
# Every user is asked to set up an authenticator app at first login (two-factor is required).
source "$(dirname "$0")/lib/common.sh"
require_env_file

[[ "$(env_value PUBLIC_SCHEME)" == "http" || "${1:-}" == "--force" ]] ||
  die "This looks like a real server (https). Demo users are for local trials only; pass --force to add them anyway."

DEMO_PASSWORD="Wattwisely-demo-1"
REALM=wattwisely

kcadm() {
  compose exec -T keycloak /opt/keycloak/bin/kcadm.sh "$@"
}

login() {
  kcadm config credentials --server http://localhost:8080 --realm master \
    --user "$(env_value KEYCLOAK_ADMIN_USER)" --password "$(env_value KEYCLOAK_ADMIN_PASSWORD)" >/dev/null 2>&1
}

# Prints the id of an existing organization, or creates it.
organization_id() {
  local alias="$1" id
  id="$(kcadm get organizations -r "$REALM" -q search="$alias" --fields id,alias --format csv --noquotes | awk -F, -v a="$alias" '$2==a {print $1}')"
  if [[ -z "$id" ]]; then
    id="$(kcadm create organizations -r "$REALM" -s name="$2" -s alias="$alias" -s enabled=true \
      -s "domains=[{\"name\":\"$alias.test\"}]" -i)"
  fi
  echo "$id"
}

# Prints the id of an existing user, or creates it with the demo password.
user_id() {
  local email="$1" id
  id="$(kcadm get users -r "$REALM" -q email="$email" -q exact=true --fields id --format csv --noquotes)"
  if [[ -z "$id" ]]; then
    id="$(kcadm create users -r "$REALM" -s username="$email" -s email="$email" -s emailVerified=true \
      -s enabled=true -s firstName="$2" -s lastName="$3" -i)"
    kcadm set-password -r "$REALM" --userid "$id" --new-password "$DEMO_PASSWORD" >/dev/null
  fi
  echo "$id"
}

add_member() {
  kcadm create "organizations/$1/members" -r "$REALM" -b "\"$2\"" >/dev/null 2>&1 || true
}

info "Signing in to Keycloak"
login
info "Creating tenants"
ACME="$(organization_id acme-charging 'Acme Charging')"
VOLT="$(organization_id volt-hotels 'Volt Hotels')"
info "Creating users"
OWNER="$(user_id owner@acme.test Olivia Owner)"
MULTI="$(user_id multi@demo.test Mia Multi)"
user_id nobody@demo.test Nora Nobody >/dev/null
add_member "$ACME" "$OWNER"
add_member "$ACME" "$MULTI"
add_member "$VOLT" "$MULTI"

info "Demo data ready. Log in at $(env_value PUBLIC_SCHEME)://$(env_value PORTAL_HOST) with password $DEMO_PASSWORD"
