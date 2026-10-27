-- Module 19, driver accounts: what the API (wattwisely_app) may do with the new tables, and the
-- permission that lets staff invite a driver to the app. Row-level security (migration 0032)
-- keeps invitations inside their tenant; driver_accounts is a global table, like user_accounts.
--
-- Nothing is deleted: a closed invitation keeps its row for the driver's page, and an account
-- stays once created (unlinking clears drivers.driver_account_id instead).
GRANT SELECT, INSERT, UPDATE ON driver_accounts, driver_invitations TO wattwisely_app;--> statement-breakpoint
-- drivers:invite (story DRV-04): send, resend and cancel an invitation, unlink a login. Owner
-- and Operations hold it, as they hold drivers:write; the Managed operator does too (module 10).
INSERT INTO role_permissions (id, role_id, permission_key)
SELECT gen_random_uuid(), role_id, 'drivers:invite' FROM unnest(ARRAY[
    '00000000-0000-7000-8000-000000000001'::uuid,
    '00000000-0000-7000-8000-000000000002'::uuid,
    '00000000-0000-7000-8000-000000000006'::uuid
]) AS role_id;
