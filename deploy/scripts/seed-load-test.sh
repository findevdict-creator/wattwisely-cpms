#!/usr/bin/env bash
# Registers chargers for a load test (module 12) in a tenant of their own, "Load test".
#
#   ./scripts/seed-load-test.sh 1000             chargers LOAD-0001 to LOAD-1000 (no password, plain ws allowed)
#   ./scripts/seed-load-test.sh 1000 --prefix X  chargers X-0001 to X-1000
#   ./scripts/seed-load-test.sh --remove         deletes the Load test tenant and everything it recorded
#
# Then, from a machine that can reach the gateway (see README.md, "Load test"):
#   npm run load-test -- --url wss://ocpp.example.com/ocpp --count 1000 --ramp 120 --duration 600
# Meant for a staging server: on a real server it asks first, unless you pass --yes.
source "$(dirname "$0")/lib/common.sh"
require_env_file

TENANT_ID=01900000-0000-7000-8000-0000000010ad
SITE_ID=01900000-0000-7000-8000-0000000011ad
COUNT="" PREFIX=LOAD IS_REMOVING=false IS_CONFIRMED=false
while (($#)); do
  case "$1" in
    --prefix) PREFIX="$2"; shift 2 ;;
    --remove) IS_REMOVING=true; shift ;;
    --yes) IS_CONFIRMED=true; shift ;;
    -h | --help) sed -n '2,12p' "$0"; exit 0 ;;
    *) COUNT="$1"; shift ;;
  esac
done

confirm() {
  [[ "$(env_value PUBLIC_SCHEME)" == "http" ]] && return 0
  $IS_CONFIRMED && return 0
  read -r -p "This server uses https. $1 Type 'load-test' to continue: " answer
  [[ "$answer" == "load-test" ]] || die "Cancelled"
}

psql_superuser() {
  compose exec -T postgres psql -X -q -v ON_ERROR_STOP=1 -U wattwisely -d wattwisely "$@"
}

add_chargers() {
  if [[ ! "$COUNT" =~ ^[0-9]+$ ]] || ((COUNT < 1 || COUNT > 10000)); then
    die "Give the number of chargers, 1 to 10000 (see --help)."
  fi
  [[ "$PREFIX" =~ ^[A-Za-z0-9_-]+$ ]] || die "The prefix may only hold letters, digits, - and _."
  confirm "It adds a Load test tenant with $COUNT chargers."
  info "Registering $PREFIX-0001 to $PREFIX-$(printf '%04d' "$COUNT")"
  psql_superuser -v tenant_id="$TENANT_ID" -v site_id="$SITE_ID" -v prefix="$PREFIX" -v count="$COUNT" <<'SQL'
INSERT INTO tenants (id, name, slug, status) VALUES (:'tenant_id', 'Load test', 'load-test', 'active')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO sites (id, tenant_id, name, address, latitude, longitude, time_zone, visibility)
VALUES (:'site_id', :'tenant_id', 'Load test',
  '{"line1": "1 Test Street", "city": "London", "postal_code": "E1 6AN", "country": "GB"}',
  51.5, -0.07, 'Europe/London', 'private')
ON CONFLICT DO NOTHING;
INSERT INTO chargers (id, tenant_id, site_id, ocpp_identity, vendor, model, auth_mode, allow_plain_ws)
SELECT gen_random_uuid(), :'tenant_id', :'site_id', :'prefix' || '-' || lpad(n::text, 4, '0'),
  'Wattwisely', 'Load test', 'none', true
FROM generate_series(1, :count) AS n
ON CONFLICT DO NOTHING;
SQL
  info "Done. The gateway accepts 100 new connections per address and minute by default:"
  echo "  for more, set OCPP_RATE_LIMIT_PER_IP in .env and run ./scripts/up.sh --no-pull."
}

# Deletes every row of the tenant in every table with a tenant_id, then the tenant itself.
# Foreign keys are switched off for this one transaction: all the rows involved go together.
remove_tenant() {
  confirm "It deletes the Load test tenant and all its chargers, sessions and messages."
  info "Removing the Load test tenant"
  psql_superuser -v tenant_id="$TENANT_ID" <<'SQL'
BEGIN;
SET LOCAL session_replication_role = replica;
SELECT format('DELETE FROM %I.%I WHERE tenant_id = %L', table_schema, table_name, :'tenant_id')
FROM information_schema.columns
WHERE column_name = 'tenant_id' AND table_schema = 'public'
  AND table_name IN (SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE')
\gexec
DELETE FROM tenants WHERE id = :'tenant_id';
COMMIT;
SQL
  info "Removed"
}

if $IS_REMOVING; then remove_tenant; else add_chargers; fi
