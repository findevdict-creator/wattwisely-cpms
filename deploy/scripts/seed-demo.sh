#!/usr/bin/env bash
# Adds demo tenants, users, sites and chargers to a LOCAL trial, so you can try the login,
# team, sites and chargers flows.
#
#   Tenants: Acme Charging (acme-charging), Volt Hotels (volt-hotels)
#   Users (password: Wattwisely-demo-1):
#     owner@acme.test    Owner of Acme Charging (can invite people and change roles)
#     tech@acme.test     Technician at Acme Charging, only on the Riverside site (sees no Team page)
#     multi@demo.test    Operations at Acme Charging and Owner of Volt Hotels (tenant switcher)
#     nobody@demo.test   member of no tenant (shows the "No workspace" page)
#     admin@wattwisely.test    Wattwisely administrator in the admin console (module 9)
#     support@wattwisely.test  Wattwisely support in the admin console: looks after tenants, cannot touch plans or staff
#   Plans: Acme Charging on Growth with the Load management add-on, Volt Hotels on Starter
#   Sites of Acme Charging: Riverside Car Park (two chargers), Depot North (one charger, waiting)
#   Tariff of Acme Charging: Standard (off-peak 0.30, peak 0.40 per kWh from 17:00), on both sites
#   One finished session at Riverside: the worker prices it within a minute (8.80, the design's example)
#   Branding of Acme Charging: blue and orange, a logo, help@acme.test (drivers and e-mails see it)
#   Alerts (module 11): the worker opens them within a minute (a faulted plug, two chargers no longer connected);
#     Acme Charging has a weekly usage report e-mailed to owner@acme.test every Monday
#   Drivers of Acme Charging (module 13): Dana Driver with card DEMO-CARD-1 (the finished session is hers) in the
#     "Depot staff" access group that opens the private Depot North; Priya Patel with a lost card and its replacement;
#     Ben Blocked, blocked with every card refused. A simulator that authorises with DEMO-CARD-1 is accepted
#   Custom role of Acme Charging (module 14): "Depot supervisor", held by nobody yet, under Team > Roles and permissions
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

# Tenants, memberships, subscriptions and staff live in the Wattwisely database. Accounts are matched to
# Keycloak users by their (verified) e-mail at first login. Runs as the database superuser.
seed_database() {
  compose exec -T postgres psql -X -q -v ON_ERROR_STOP=1 -U wattwisely -d wattwisely >/dev/null <<'SQL'
INSERT INTO tenants (id, name, slug, status) VALUES
  ('01900000-0000-7000-8000-00000000a001', 'Acme Charging', 'acme-charging', 'active'),
  ('01900000-0000-7000-8000-00000000a002', 'Volt Hotels', 'volt-hotels', 'active')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO sites (id, tenant_id, name, address, latitude, longitude, time_zone, opening_hours, visibility, power_limit_kw, parking_notes) VALUES
  ('01900000-0000-7000-8000-00000000c001', '01900000-0000-7000-8000-00000000a001', 'Riverside Car Park',
   '{"line1": "12 Thames Path", "city": "London", "postal_code": "SE1 2AA", "country": "GB"}', 51.5055, -0.0754, 'Europe/London',
   '{"mon": [{"opens": "07:00", "closes": "22:00"}], "tue": [{"opens": "07:00", "closes": "22:00"}], "wed": [{"opens": "07:00", "closes": "22:00"}], "thu": [{"opens": "07:00", "closes": "22:00"}], "fri": [{"opens": "07:00", "closes": "22:00"}], "sat": [{"opens": "09:00", "closes": "18:00"}]}',
   'public', 600, 'Level -1, bays 40 to 46'),
  ('01900000-0000-7000-8000-00000000c002', '01900000-0000-7000-8000-00000000a001', 'Depot North',
   '{"line1": "3 Industrial Way", "city": "Leeds", "postal_code": "LS9 8AB", "country": "GB"}', 53.8008, -1.5491, 'Europe/London',
   NULL, 'private', NULL, 'Staff only, badge at the gate')
ON CONFLICT DO NOTHING;
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
INSERT INTO membership_roles (id, tenant_id, membership_id, role_id, site_id)
SELECT gen_random_uuid(), added.tenant_id, added.id, r.id,
  CASE WHEN m.role_key = 'technician' THEN '01900000-0000-7000-8000-00000000c001'::uuid END
FROM added
JOIN tenants t ON t.id = added.tenant_id
JOIN user_accounts a ON a.id = added.user_account_id
JOIN member m ON m.tenant_slug = t.slug AND m.email = lower(a.email)
JOIN roles r ON r.key = m.role_key;
INSERT INTO chargers (id, tenant_id, site_id, ocpp_identity, vendor, model, auth_mode, password_hash) VALUES
  ('01900000-0000-7000-8000-00000000d001', '01900000-0000-7000-8000-00000000a001', '01900000-0000-7000-8000-00000000c001',
   'WW-7KQ4M2XR9T', 'Alfen', 'Eve Double Pro-line', 'none', NULL),
  ('01900000-0000-7000-8000-00000000d002', '01900000-0000-7000-8000-00000000a001', '01900000-0000-7000-8000-00000000c001',
   'WW-3NB8TF5D2W', 'ABB', 'Terra 184', 'none', NULL),
  ('01900000-0000-7000-8000-00000000d003', '01900000-0000-7000-8000-00000000a001', '01900000-0000-7000-8000-00000000c002',
   'SN-AB129934', 'Wallbox', 'Pulsar Plus', 'none', NULL)
ON CONFLICT DO NOTHING;
INSERT INTO tariffs (id, tenant_id, name, currency) VALUES
  ('01900000-0000-7000-8000-00000000f001', '01900000-0000-7000-8000-00000000a001', 'Standard', 'GBP')
ON CONFLICT DO NOTHING;
INSERT INTO tariff_versions (id, tenant_id, tariff_id, number, tax_rate, is_tax_included, start_fee,
  idle_grace_minutes, idle_fee_cap, is_free_without_energy, bands, note) VALUES
  ('01900000-0000-7000-8000-00000000f101', '01900000-0000-7000-8000-00000000a001', '01900000-0000-7000-8000-00000000f001',
   1, 2000, true, 0, 15, 1000, true,
   '[{"name": "Off-peak", "days": ["mon", "tue", "wed", "thu", "fri", "sat", "sun"], "start": "00:00", "end": "17:00", "energyPricePerKwh": 3000, "timePricePerHour": 0, "idleFeePerMinute": 1000},
     {"name": "Peak", "days": ["mon", "tue", "wed", "thu", "fri", "sat", "sun"], "start": "17:00", "end": "24:00", "energyPricePerKwh": 4000, "timePricePerHour": 0, "idleFeePerMinute": 1000}]',
   'Demo prices')
ON CONFLICT DO NOTHING;
UPDATE sites SET tariff_id = '01900000-0000-7000-8000-00000000f001'
WHERE tenant_id = '01900000-0000-7000-8000-00000000a001' AND tariff_id IS NULL;
-- Two chargers have reported in (so the sites show a status); the third is still waiting.
UPDATE chargers SET last_boot_at = now(), last_heartbeat_at = now(), last_seen_at = now(),
  ocpp_version = '1.6', registration_status = 'accepted', heartbeat_interval_s = 300
WHERE id IN ('01900000-0000-7000-8000-00000000d001', '01900000-0000-7000-8000-00000000d002');
INSERT INTO connectors (id, tenant_id, charger_id, ocpp_connector_id, type, current_type, max_power_kw, label, status, status_changed_at) VALUES
  ('01900000-0000-7000-8000-00000000e001', '01900000-0000-7000-8000-00000000a001', '01900000-0000-7000-8000-00000000d001', 1, 'type2', 'ac', 22, 'A', 'available', now()),
  ('01900000-0000-7000-8000-00000000e002', '01900000-0000-7000-8000-00000000a001', '01900000-0000-7000-8000-00000000d001', 2, 'type2', 'ac', 22, 'B', 'charging', now()),
  ('01900000-0000-7000-8000-00000000e003', '01900000-0000-7000-8000-00000000a001', '01900000-0000-7000-8000-00000000d002', 1, 'ccs2', 'dc', 180, 'A', 'available', now()),
  ('01900000-0000-7000-8000-00000000e004', '01900000-0000-7000-8000-00000000a001', '01900000-0000-7000-8000-00000000d002', 2, 'chademo', 'dc', 50, 'B', 'faulted', now()),
  ('01900000-0000-7000-8000-00000000e005', '01900000-0000-7000-8000-00000000a001', '01900000-0000-7000-8000-00000000d003', 1, 'type2', 'ac', 7.4, 'A', 'unknown', NULL)
ON CONFLICT DO NOTHING;
-- A charge that stopped and whose car has left: 10 kWh before 17:00, 12 kWh after, 25 minutes idle.
INSERT INTO charging_sessions (id, tenant_id, site_id, charger_id, connector_id, ocpp_transaction_id, id_tag,
  status, time_zone, started_at, ended_at, unplugged_at, meter_start_wh, meter_stop_wh, energy_wh,
  tariff_version_id, currency, stop_reason, last_event_at) VALUES
  ('01900000-0000-7000-8000-000000005001', '01900000-0000-7000-8000-00000000a001', '01900000-0000-7000-8000-00000000c001',
   '01900000-0000-7000-8000-00000000d001', '01900000-0000-7000-8000-00000000e001', nextval('ocpp_transaction_id_seq'),
   'DEMO-CARD-1', 'stopping', 'Europe/London', '2026-03-10 16:30Z', '2026-03-10 17:30Z', '2026-03-10 17:55Z',
   100000, 122000, 22000, '01900000-0000-7000-8000-00000000f101', 'GBP', 'EVDisconnected', '2026-03-10 17:55Z')
ON CONFLICT DO NOTHING;
INSERT INTO session_state_changes (id, tenant_id, session_id, from_status, to_status, event, occurred_at) VALUES
  ('01900000-0000-7000-8000-000000005101', '01900000-0000-7000-8000-00000000a001', '01900000-0000-7000-8000-000000005001',
   NULL, 'charging', 'transaction_started', '2026-03-10 16:30Z'),
  ('01900000-0000-7000-8000-000000005102', '01900000-0000-7000-8000-00000000a001', '01900000-0000-7000-8000-000000005001',
   'charging', 'stopping', 'transaction_ended', '2026-03-10 17:30Z'),
  ('01900000-0000-7000-8000-000000005103', '01900000-0000-7000-8000-00000000a001', '01900000-0000-7000-8000-000000005001',
   'stopping', 'stopping', 'unplugged', '2026-03-10 17:55Z')
ON CONFLICT DO NOTHING;
INSERT INTO meter_values (id, tenant_id, charger_id, session_id, measured_at, energy_wh, samples) VALUES
  ('01900000-0000-7000-8000-000000005201', '01900000-0000-7000-8000-00000000a001', '01900000-0000-7000-8000-00000000d001',
   '01900000-0000-7000-8000-000000005001', '2026-03-10 17:00Z', 110000, '[]')
ON CONFLICT DO NOTHING;
-- Acme Charging has set up its brand (module 8): the driver's page, receipts and e-mails show it.
-- The logo is a small SVG; the etag is what the API computes for it (sha256, first 16 hex digits).
WITH logo AS (
  SELECT convert_to('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 40"><rect width="140" height="40" rx="8" fill="#ff8f00"/><path d="M24 5 11 23h9l-4 12 14-19h-9z" fill="#fff"/><text x="44" y="28" font-family="Arial, Helvetica, sans-serif" font-size="21" font-weight="700" fill="#fff">ACME</text></svg>', 'UTF8') AS data
)
INSERT INTO tenant_branding (id, tenant_id, display_name, primary_color, accent_color, support_email, support_phone,
  support_url, logo_content_type, logo_data, logo_etag, logo_size_bytes, version)
SELECT '01900000-0000-7000-8000-000000008001', '01900000-0000-7000-8000-00000000a001', 'Acme Charging', '#0d47a1', '#ff8f00',
  'help@acme.test', '+44 20 7946 0000', 'https://acme.test/help',
  'image/svg+xml', data, left(encode(sha256(data), 'hex'), 16), length(data), 2
FROM logo
ON CONFLICT (tenant_id) DO NOTHING;
-- Module 9: two Wattwisely staff for the admin console, and a plan for each tenant.
INSERT INTO user_accounts (id, email, name) VALUES
  ('01900000-0000-7000-8000-00000000b004', 'admin@wattwisely.test', 'Ada Admin'),
  ('01900000-0000-7000-8000-00000000b005', 'support@wattwisely.test', 'Sam Support')
ON CONFLICT (lower(email)) DO NOTHING;
INSERT INTO platform_staff (id, user_account_id, role)
SELECT gen_random_uuid(), a.id, s.role::platform_role
FROM (VALUES ('admin@wattwisely.test', 'admin'), ('support@wattwisely.test', 'support')) AS s (email, role)
JOIN user_accounts a ON lower(a.email) = s.email
ON CONFLICT (user_account_id) DO NOTHING;
-- Module 15: both plans started three months ago, so the worker drafts last month's invoices in full;
-- Acme pays 20 % tax on them, Volt Hotels none.
INSERT INTO tenant_subscriptions (id, tenant_id, plan_id, status, billing_email, billing_name, started_at, tax_rate_bps) VALUES
  ('01900000-0000-7000-8000-000000009001', '01900000-0000-7000-8000-00000000a001', '00000000-0000-7000-8000-000000000103', 'active', 'accounts@acme.test', 'Acme Charging Ltd', now() - interval '3 months', 2000),
  ('01900000-0000-7000-8000-000000009002', '01900000-0000-7000-8000-00000000a002', '00000000-0000-7000-8000-000000000102', 'active', NULL, NULL, now() - interval '3 months', 0)
ON CONFLICT (tenant_id) DO NOTHING;
INSERT INTO tenant_entitlements (id, tenant_id, feature_key, source, note) VALUES
  ('01900000-0000-7000-8000-000000009101', '01900000-0000-7000-8000-00000000a001', 'load_management', 'addon', 'Demo add-on')
ON CONFLICT (tenant_id, feature_key) DO NOTHING;
-- Module 10: Wattwisely runs Volt Hotels' charging. Its Owner (Mia) accepted the managed service; Sam Support
-- is the account manager and works in the tenant as its Managed operator (the reserved role from migration 0016).
INSERT INTO managed_services (id, tenant_id, status, account_manager_id, is_tariff_approval_required,
  monthly_fee, agreement_reference, offered_by, offered_at, accepted_by, accepted_at)
SELECT '01900000-0000-7000-8000-00000000a101', '01900000-0000-7000-8000-00000000a002', 'active', s.id, true,
  25000, 'MSA-DEMO-001', ad.id, now() - interval '3 months', o.id, now() - interval '3 months'
FROM platform_staff s
JOIN user_accounts a ON a.id = s.user_account_id AND lower(a.email) = 'support@wattwisely.test'
JOIN user_accounts ad ON lower(ad.email) = 'admin@wattwisely.test'
JOIN user_accounts o ON lower(o.email) = 'multi@demo.test'
WHERE NOT EXISTS (SELECT 1 FROM managed_services WHERE tenant_id = '01900000-0000-7000-8000-00000000a002');
WITH operator AS (
  INSERT INTO tenant_memberships (id, tenant_id, user_account_id, status, joined_at)
  SELECT '01900000-0000-7000-8000-00000000a102', '01900000-0000-7000-8000-00000000a002', a.id, 'active', now()
  FROM user_accounts a WHERE lower(a.email) = 'support@wattwisely.test'
  ON CONFLICT (tenant_id, user_account_id) DO NOTHING
  RETURNING id, tenant_id, user_account_id
), granted AS (
  INSERT INTO membership_roles (id, tenant_id, membership_id, role_id)
  SELECT gen_random_uuid(), tenant_id, id, '00000000-0000-7000-8000-000000000006' FROM operator
)
INSERT INTO managed_operators (id, tenant_id, managed_service_id, user_account_id, membership_id, assigned_by)
SELECT gen_random_uuid(), operator.tenant_id, '01900000-0000-7000-8000-00000000a101', operator.user_account_id,
  operator.id, ad.id
FROM operator JOIN user_accounts ad ON lower(ad.email) = 'admin@wattwisely.test';
-- Module 11: Acme Charging (Growth, so Advanced reports) e-mails a usage report to its Owner every Monday.
-- The faulted plug B on the ABB charger, and the two chargers that reported in but are not connected, raise alerts by themselves.
INSERT INTO drivers (id, tenant_id, name, email, phone, reference, notes, status, blocked_at, block_reason) VALUES
  ('01900000-0000-7000-8000-000000007001', '01900000-0000-7000-8000-00000000a001', 'Dana Driver', 'dana@acme.test',
   '+44 7700 900123', 'EMP-0042', 'Drives the depot van', 'active', NULL, ''),
  ('01900000-0000-7000-8000-000000007002', '01900000-0000-7000-8000-00000000a001', 'Priya Patel', 'priya@acme.test',
   NULL, 'EMP-0058', '', 'active', NULL, ''),
  ('01900000-0000-7000-8000-000000007003', '01900000-0000-7000-8000-00000000a001', 'Ben Blocked', NULL,
   NULL, 'EMP-0077', '', 'blocked', now() - interval '2 days', 'Left the company')
ON CONFLICT DO NOTHING;
INSERT INTO rfid_cards (id, tenant_id, driver_id, id_tag, label, status, last_used_at) VALUES
  ('01900000-0000-7000-8000-000000008001', '01900000-0000-7000-8000-00000000a001', '01900000-0000-7000-8000-000000007001',
   'DEMO-CARD-1', 'Van key fob', 'active', '2026-03-10 16:30Z'),
  ('01900000-0000-7000-8000-000000008002', '01900000-0000-7000-8000-00000000a001', '01900000-0000-7000-8000-000000007002',
   'DEMO-CARD-2', 'First card', 'lost', NULL),
  ('01900000-0000-7000-8000-000000008003', '01900000-0000-7000-8000-00000000a001', '01900000-0000-7000-8000-000000007002',
   'DEMO-CARD-3', 'Replacement', 'active', NULL),
  ('01900000-0000-7000-8000-000000008004', '01900000-0000-7000-8000-00000000a001', '01900000-0000-7000-8000-000000007003',
   'DEMO-CARD-4', '', 'blocked', NULL)
ON CONFLICT DO NOTHING;
INSERT INTO access_groups (id, tenant_id, name, description) VALUES
  ('01900000-0000-7000-8000-000000009001', '01900000-0000-7000-8000-00000000a001', 'Depot staff', 'May charge at Depot North')
ON CONFLICT DO NOTHING;
INSERT INTO access_group_sites (tenant_id, group_id, site_id) VALUES
  ('01900000-0000-7000-8000-00000000a001', '01900000-0000-7000-8000-000000009001', '01900000-0000-7000-8000-00000000c002')
ON CONFLICT DO NOTHING;
INSERT INTO access_group_members (tenant_id, group_id, driver_id) VALUES
  ('01900000-0000-7000-8000-00000000a001', '01900000-0000-7000-8000-000000009001', '01900000-0000-7000-8000-000000007001')
ON CONFLICT DO NOTHING;
UPDATE charging_sessions SET driver_id = '01900000-0000-7000-8000-000000007001', rfid_card_id = '01900000-0000-7000-8000-000000008001'
  WHERE id = '01900000-0000-7000-8000-000000005001' AND driver_id IS NULL;
-- Module 14: a custom role of Acme Charging (its Growth plan includes custom roles). Nobody holds it, so it can be
-- given, changed and deleted from the matrix. Volt Hotels is on Starter and sees the five built-in roles only.
INSERT INTO roles (id, tenant_id, key, name, description, is_system) VALUES
  ('01900000-0000-7000-8000-00000000e001', '01900000-0000-7000-8000-00000000a001', NULL, 'Depot supervisor',
   'Runs the depot: commands chargers, keeps the driver list, acknowledges alerts.', false)
ON CONFLICT DO NOTHING;
INSERT INTO role_permissions (id, role_id, tenant_id, permission_key)
SELECT gen_random_uuid(), '01900000-0000-7000-8000-00000000e001', '01900000-0000-7000-8000-00000000a001', key FROM unnest(ARRAY[
    'sites:read', 'chargers:read', 'chargers:command', 'sessions:read', 'drivers:read', 'drivers:write',
    'alerts:read', 'alerts:acknowledge'
]) AS key
ON CONFLICT DO NOTHING;
-- Module 16: an API key of Acme Charging (its Growth plan includes API keys), made by Olivia, read-only. Only the
-- hash is stored; the token is wwk_demo-fleet-tool-0000000000000000000000000000 (printed below).
INSERT INTO api_keys (id, tenant_id, name, description, key_hash, key_hint, permission_keys, created_by)
VALUES ('01900000-0000-7000-8000-00000000f001', '01900000-0000-7000-8000-00000000a001', 'Demo fleet tool',
  'Reads sites, chargers and sessions for the demo.',
  encode(sha256('wwk_demo-fleet-tool-0000000000000000000000000000'::bytea), 'hex'), '0000',
  '["sites:read", "chargers:read", "sessions:read"]', '01900000-0000-7000-8000-00000000b001')
ON CONFLICT DO NOTHING;
INSERT INTO report_schedules (id, tenant_id, name, frequency, group_by, recipients, time_zone, next_run_at)
VALUES ('01900000-0000-7000-8000-000000006001', '01900000-0000-7000-8000-00000000a001', 'Weekly usage',
  'weekly', 'site', '["owner@acme.test"]', 'Europe/London',
  (date_trunc('week', now() AT TIME ZONE 'Europe/London') + interval '7 days') AT TIME ZONE 'Europe/London')
ON CONFLICT DO NOTHING;
SQL
}

info "Signing in to Keycloak"
login
info "Creating users"
user_id owner@acme.test Olivia Owner >/dev/null
user_id tech@acme.test Theo Tech >/dev/null
user_id multi@demo.test Mia Multi >/dev/null
user_id nobody@demo.test Nora Nobody >/dev/null
user_id admin@wattwisely.test Ada Admin >/dev/null
user_id support@wattwisely.test Sam Support >/dev/null
info "Creating tenants and memberships"
seed_database

info "Demo data ready. Log in at $(env_value PUBLIC_SCHEME)://$(env_value PORTAL_HOST) with password $DEMO_PASSWORD"
info "Wattwisely staff log in at $(env_value PUBLIC_SCHEME)://$(env_value ADMIN_HOST) as admin@wattwisely.test or support@wattwisely.test"
info "Volt Hotels is managed by Wattwisely: support@wattwisely.test works in it as Managed operator, multi@demo.test approves its tariff changes"
info "Acme Charging has the API key 'Demo fleet tool': Authorization: Bearer wwk_demo-fleet-tool-0000000000000000000000000000"
info "Drivers (module 13): owner@acme.test sees Dana Driver, Priya Patel and Ben Blocked under Drivers; a simulator authorising with DEMO-CARD-1 at Riverside is accepted, DEMO-CARD-4 is blocked"
info "Invoices (module 15): within an hour the worker drafts last month's invoices; admin@wattwisely.test checks and issues them under Invoices in the console, owner@acme.test and multi@demo.test read theirs under Settings > Invoices"
info "Roles (module 14): owner@acme.test shapes the Depot supervisor role under Team > Roles and permissions; multi@demo.test sees Volt Hotels' built-in roles only (Starter plan)"
info "Drivers see plug A of the Riverside charger at $(env_value PUBLIC_SCHEME)://$(env_value DRIVER_HOST)/c/WW-7KQ4M2XR9T/1 (the QR code on the charger page); it shows as offline until a charger or the simulator connects with that identity"
