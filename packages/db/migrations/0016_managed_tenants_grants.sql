-- Module 10, managed tenants: what the API (wattwisely_app) may do with the managed service
-- tables, the Managed operator system role, and the two permissions the stories give the Owner.
--
-- Agreements and operator assignments are written from the admin console and read by the
-- tenant; row-level security (migration 0015) decides who sees which rows. Nothing deletes
-- a row: an ended agreement and a removed operator keep their history.
GRANT SELECT, INSERT, UPDATE ON managed_services, managed_operators, tariff_proposals TO wattwisely_app;--> statement-breakpoint
-- The Managed operator role (story MGT-02): Wattwisely staff looking after a managed tenant
-- run its sites, chargers, tariffs, sessions, refunds, alerts and drivers. It never holds
-- team management, payment account settings or tenant deletion, and no tenant user can
-- assign, edit or remove it: only the admin console does.
INSERT INTO roles (id, key, name, description, is_system) VALUES
  ('00000000-0000-7000-8000-000000000006', 'managed-operator', 'Managed operator', 'Wattwisely staff running the account under a managed service agreement. Assigned from the admin console only.', true);--> statement-breakpoint
INSERT INTO role_permissions (id, role_id, permission_key)
SELECT gen_random_uuid(), '00000000-0000-7000-8000-000000000006', key FROM unnest(ARRAY[
    'sites:read', 'sites:write', 'sites:delete', 'stickers:print', 'chargers:read',
    'chargers:write', 'chargers:delete', 'chargers:command', 'chargers:config',
    'chargers:firmware', 'tariffs:read', 'tariffs:write', 'tariffs:delete',
    'sessions:read', 'sessions:export', 'sessions:close_stuck', 'drivers:read',
    'drivers:read_personal', 'drivers:write', 'drivers:block', 'payments:read',
    'payments:refund', 'payments:approve_refund', 'alerts:read', 'alerts:acknowledge',
    'settings:read', 'audit:read', 'reports:read', 'load_management:read',
    'load_management:write'
]) AS key;--> statement-breakpoint
-- The Owner decides on the managed service (accepts it, gives notice: story MGT-01 and
-- MGT-05) and approves the tariff changes a Managed operator proposes (story MGT-03).
INSERT INTO role_permissions (id, role_id, permission_key)
SELECT gen_random_uuid(), '00000000-0000-7000-8000-000000000001', key FROM unnest(ARRAY[
    'managed_service:manage', 'tariffs:approve'
]) AS key;
