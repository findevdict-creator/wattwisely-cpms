-- Module 9, the admin console: what the API (wattwisely_app) may do with the plan tables,
-- the overview the console shows about each tenant, the launch plans and add-on prices,
-- and the permissions of the modules a plan can lock.
--
-- The catalogue tables are global: every request may read them; row-level security
-- (migration 0013) lets only admin console requests (app.platform_access) change them.
GRANT SELECT, INSERT, UPDATE ON plans, addons, tenant_subscriptions, platform_staff TO wattwisely_app;--> statement-breakpoint
-- Removing an add-on or override returns the tenant to its plan: the row goes.
GRANT SELECT, INSERT, UPDATE, DELETE ON tenant_entitlements TO wattwisely_app;--> statement-breakpoint
-- Tenants are created, suspended and deleted (marked, never removed) from the admin console.
GRANT INSERT, UPDATE ON tenants TO wattwisely_app;--> statement-breakpoint
-- What the admin console shows about each tenant's size (story ADM-04), without personal
-- data. The view belongs to wattwisely_migrator, which owns the tables and is not subject
-- to their row-level security, so it counts across every tenant; the API may only read it.
-- A connector whose current type is still unknown counts as AC, the cheaper connector fee.
CREATE VIEW platform_tenant_overview AS
SELECT
  t.id AS tenant_id,
  (SELECT count(*) FROM tenant_memberships m WHERE m.tenant_id = t.id AND m.status = 'active')::integer AS member_count,
  (SELECT count(*) FROM tenant_memberships m WHERE m.tenant_id = t.id AND m.status = 'invited')::integer AS invited_count,
  (SELECT count(*) FROM sites s WHERE s.tenant_id = t.id AND s.deleted_at IS NULL)::integer AS site_count,
  (SELECT count(*) FROM chargers c WHERE c.tenant_id = t.id AND c.deleted_at IS NULL)::integer AS charger_count,
  (SELECT count(*) FROM connectors k JOIN chargers c ON c.id = k.charger_id
    WHERE k.tenant_id = t.id AND c.deleted_at IS NULL AND k.current_type IS DISTINCT FROM 'dc')::integer AS ac_connector_count,
  (SELECT count(*) FROM connectors k JOIN chargers c ON c.id = k.charger_id
    WHERE k.tenant_id = t.id AND c.deleted_at IS NULL AND k.current_type = 'dc')::integer AS dc_connector_count,
  (SELECT max(cs.started_at) FROM charging_sessions cs WHERE cs.tenant_id = t.id) AS last_session_at
FROM tenants t;--> statement-breakpoint
GRANT SELECT ON platform_tenant_overview TO wattwisely_app;--> statement-breakpoint
-- The launch plans (PRD section 7, "Proposed launch plans"), in US cents per month. Prices
-- are configuration: the admin console changes them, so this is only the starting point.
-- Enterprise is priced per contract; its fees are set per tenant in the admin console.
INSERT INTO plans (id, code, name, description, platform_fee, ac_connector_fee, dc_connector_fee, revenue_share_bps, connector_limit, user_limit, module_keys, sort_order) VALUES
  ('00000000-0000-7000-8000-000000000101', 'flex', 'Flex', 'No fixed cost: 5 % of charging revenue. For new operators with up to 10 connectors.', 0, 0, 0, 500, 10, 2, '[]', 1),
  ('00000000-0000-7000-8000-000000000102', 'starter', 'Starter', 'Small sites, hotels and workplaces: up to 25 connectors and 5 users.', 4900, 1200, 1800, 0, 25, 5, '[]', 2),
  ('00000000-0000-7000-8000-000000000103', 'growth', 'Growth', 'Growing public networks: up to 500 connectors, unlimited users, full reports, custom roles and API keys.', 29900, 1000, 1600, 0, 500, NULL, '["advanced_reports", "custom_roles", "api_keys"]', 3),
  ('00000000-0000-7000-8000-000000000104', 'enterprise', 'Enterprise', 'Large operators and fleets: unlimited connectors and users, everything included, priced per contract.', 0, 0, 0, 0, NULL, NULL, '["advanced_reports", "custom_roles", "api_keys"]', 4);--> statement-breakpoint
-- The paid add-ons (PRD section 7): load management per connector, messaging-app charging per tenant.
INSERT INTO addons (id, key, price, pricing_unit, sort_order) VALUES
  ('00000000-0000-7000-8000-000000000201', 'load_management', 300, 'per_connector', 1),
  ('00000000-0000-7000-8000-000000000202', 'messaging_charging', 4900, 'per_tenant', 2);--> statement-breakpoint
-- The permissions of the modules a plan or add-on switches on (the API's ModuleCatalog).
-- A role may hold them in every tenant; a tenant without the module cannot use them
-- (the API answers "module not in plan"). Owner holds everything, as always.
INSERT INTO role_permissions (id, role_id, permission_key)
SELECT gen_random_uuid(), '00000000-0000-7000-8000-000000000001', key FROM unnest(ARRAY[
    'reports:read', 'reports:schedule', 'custom_roles:manage', 'load_management:read',
    'load_management:write', 'messaging:manage'
]) AS key;--> statement-breakpoint
-- Operations
INSERT INTO role_permissions (id, role_id, permission_key)
SELECT gen_random_uuid(), '00000000-0000-7000-8000-000000000002', key FROM unnest(ARRAY[
    'reports:read', 'load_management:read', 'load_management:write'
]) AS key;--> statement-breakpoint
-- Finance
INSERT INTO role_permissions (id, role_id, permission_key)
SELECT gen_random_uuid(), '00000000-0000-7000-8000-000000000003', key FROM unnest(ARRAY[
    'reports:read', 'reports:schedule'
]) AS key;--> statement-breakpoint
-- Technician
INSERT INTO role_permissions (id, role_id, permission_key)
SELECT gen_random_uuid(), '00000000-0000-7000-8000-000000000004', 'load_management:read';--> statement-breakpoint
-- Read-only
INSERT INTO role_permissions (id, role_id, permission_key)
SELECT gen_random_uuid(), '00000000-0000-7000-8000-000000000005', 'reports:read';
