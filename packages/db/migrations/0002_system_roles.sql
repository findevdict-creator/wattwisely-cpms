-- The five default roles every tenant gets (PRD Architecture, section 4).
-- They have no tenant_id, so they are shared by all tenants and a later migration
-- that changes one changes it for everyone. The API's PermissionCatalog lists every key;
-- a test checks that each key below is in it and that Owner holds all of them.
INSERT INTO roles (id, key, name, description, is_system) VALUES
  ('00000000-0000-7000-8000-000000000001', 'owner', 'Owner', 'Runs the company account: team, settings, payments and everything else.', true),
  ('00000000-0000-7000-8000-000000000002', 'operations', 'Operations', 'Runs sites and chargers day to day, sets prices and helps drivers.', true),
  ('00000000-0000-7000-8000-000000000003', 'finance', 'Finance', 'Refunds, reconciliation, invoices and financial reports.', true),
  ('00000000-0000-7000-8000-000000000004', 'technician', 'Technician', 'Diagnoses and repairs chargers, usually on chosen sites only.', true),
  ('00000000-0000-7000-8000-000000000005', 'read-only', 'Read-only', 'Sees everything in scope and changes nothing.', true);--> statement-breakpoint
-- Owner
INSERT INTO role_permissions (id, role_id, permission_key)
SELECT gen_random_uuid(), '00000000-0000-7000-8000-000000000001', key FROM unnest(ARRAY[
    'team:read', 'team:manage', 'audit:read', 'settings:read', 'settings:write',
    'settings:payments', 'api_keys:manage', 'sites:read', 'sites:write', 'sites:delete',
    'stickers:print', 'chargers:read', 'chargers:write', 'chargers:delete',
    'chargers:command', 'chargers:config', 'chargers:firmware', 'tariffs:read',
    'tariffs:write', 'tariffs:delete', 'sessions:read', 'sessions:export',
    'sessions:close_stuck', 'drivers:read', 'drivers:read_personal', 'drivers:write',
    'drivers:block', 'drivers:delete', 'payments:read', 'payments:refund',
    'payments:reconcile', 'invoices:read', 'invoices:reissue', 'alerts:read',
    'alerts:acknowledge'
]) AS key;--> statement-breakpoint
-- Operations
INSERT INTO role_permissions (id, role_id, permission_key)
SELECT gen_random_uuid(), '00000000-0000-7000-8000-000000000002', key FROM unnest(ARRAY[
    'sites:read', 'sites:write', 'sites:delete', 'stickers:print', 'chargers:read',
    'chargers:write', 'chargers:delete', 'chargers:command', 'chargers:config',
    'chargers:firmware', 'tariffs:read', 'tariffs:write', 'tariffs:delete',
    'sessions:read', 'sessions:export', 'sessions:close_stuck', 'drivers:read',
    'drivers:read_personal', 'drivers:write', 'drivers:block', 'payments:read',
    'payments:refund', 'alerts:read', 'alerts:acknowledge', 'settings:read'
]) AS key;--> statement-breakpoint
-- Finance
INSERT INTO role_permissions (id, role_id, permission_key)
SELECT gen_random_uuid(), '00000000-0000-7000-8000-000000000003', key FROM unnest(ARRAY[
    'sites:read', 'chargers:read', 'tariffs:read', 'sessions:read', 'sessions:export',
    'drivers:read', 'drivers:read_personal', 'payments:read', 'payments:refund',
    'payments:reconcile', 'invoices:read', 'invoices:reissue', 'alerts:read',
    'settings:read'
]) AS key;--> statement-breakpoint
-- Technician
INSERT INTO role_permissions (id, role_id, permission_key)
SELECT gen_random_uuid(), '00000000-0000-7000-8000-000000000004', key FROM unnest(ARRAY[
    'sites:read', 'chargers:read', 'chargers:command', 'chargers:config',
    'chargers:firmware', 'tariffs:read', 'sessions:read', 'drivers:read', 'alerts:read',
    'alerts:acknowledge'
]) AS key;--> statement-breakpoint
-- Read-only
INSERT INTO role_permissions (id, role_id, permission_key)
SELECT gen_random_uuid(), '00000000-0000-7000-8000-000000000005', key FROM unnest(ARRAY[
    'sites:read', 'chargers:read', 'tariffs:read', 'sessions:read', 'drivers:read',
    'payments:read', 'invoices:read', 'alerts:read', 'settings:read'
]) AS key;
