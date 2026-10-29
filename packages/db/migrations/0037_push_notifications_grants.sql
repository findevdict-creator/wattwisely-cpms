-- Module 34, push notifications: what the API and the worker (wattwisely_app) may do with the
-- phones of driver accounts and the pushes sent. driver_devices is a global table, like
-- driver_accounts: signing out, or a token moving to another account, deletes its row.
-- push_deliveries stays inside its tenant through row-level security (migration 0036).
GRANT SELECT, INSERT, UPDATE, DELETE ON driver_devices TO wattwisely_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON push_deliveries TO wattwisely_app;
