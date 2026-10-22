#!/usr/bin/env bash
# Adds demo tenants and users to a LOCAL trial, so you can try the login and team flows.
#
#   Tenants: Acme Charging (acme-charging), Volt Hotels (volt-hotels)
#   Users (password: Wattwisely-demo-1):
#     owner@acme.test    Owner of Acme Charging (can invite people and change roles)
#     tech@acme.test     Technician at Acme Charging (sees no Team page)
#     multi@demo.test    Operations at Acme Charging and Owner of Volt Hotels (tenant switcher)
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

# Tenants and memberships live in the Wattwisely database. Accounts are matched to
# Keycloak users by their (verified) e-mail at first login. Runs as the database superuser.
seed_database() {
  compose exec -T postgres psql -X -q -v ON_ERROR_STOP=1 -U wattwisely -d wattwisely >/dev/null <<'SQL'
INSERT INTO tenants (id, name, slug, status) VALUES
  ('01900000-0000-7000-8000-00000000a001', 'Acme Charging', 'acme-charging', 'active'),
  ('01900000-0000-7000-8000-00000000a002', 'Volt Hotels', 'volt-hotels', 'active')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO user_accounts (id, email, name) VALUES
  ('01900000-0000-7000-8000-00000000b001', 'owner@acme.test', 'Olivia Owner'),
  ('01900000-0000-7000-8000-00000000b002', 'tech@acme.test', 'Theo Tech'),
  ('01900000-0000-7000-8000-00000000b003', 'multi@demo.test', 'Mia Multi')
ON CONFLICT (lower(email)) DO NOTHING;
WITH member (tenant_slug, email, role_key) AS (VALUES
  ('acme-charging', 'owner@acme.test', 'owner'),
  ('acme-charging', 'tech@acme.test', 'technician'),
  ('acme-charging', 'multi@demo.test', 'operations'),
  ('volt-hotels', 'multi@demo.test', 'owner')
), added AS (
  INSERT INTO tenant_memberships (id, tenant_id, user_account_id, status, joined_at)
  SELECT gen_random_uuid(), t.id, a.id, 'active', now()
  FROM member m JOIN tenants t ON t.slug = m.tenant_slug JOIN user_accounts a ON lower(a.email) = m.email
  ON CONFLICT (tenant_id, user_account_id) DO NOTHING
  RETURNING id, tenant_id, user_account_id
)
INSERT INTO membership_roles (id, tenant_id, membership_id, role_id)
SELECT gen_random_uuid(), added.tenant_id, added.id, r.id
FROM added
JOIN tenants t ON t.id = added.tenant_id
JOIN user_accounts a ON a.id = added.user_account_id
JOIN member m ON m.tenant_slug = t.slug AND m.email = lower(a.email)
JOIN roles r ON r.key = m.role_key;
SQL
}

info "Signing in to Keycloak"
login
info "Creating users"
user_id owner@acme.test Olivia Owner >/dev/null
user_id tech@acme.test Theo Tech >/dev/null
user_id multi@demo.test Mia Multi >/dev/null
user_id nobody@demo.test Nora Nobody >/dev/null
info "Creating tenants and memberships"
seed_database

info "Demo data ready. Log in at $(env_value PUBLIC_SCHEME)://$(env_value PORTAL_HOST) with password $DEMO_PASSWORD"
