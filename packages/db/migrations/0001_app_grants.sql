-- What the API's database role (wattwisely_app) may do with each table.
-- The role does not own the tables, so row-level security always applies to it.
-- deploy/scripts/lib/database.sh creates the role before migrations run.
GRANT USAGE ON SCHEMA public TO wattwisely_app;--> statement-breakpoint
-- Global tables: tenants are read-only to the API; people are created at invite or first login.
GRANT SELECT ON tenants TO wattwisely_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON user_accounts TO wattwisely_app;--> statement-breakpoint
-- Memberships are never deleted, only marked removed, so the audit log can still name people.
GRANT SELECT, INSERT, UPDATE ON tenant_memberships TO wattwisely_app;--> statement-breakpoint
-- System roles are changed only by migrations. Custom roles (M2) will add INSERT, UPDATE, DELETE.
GRANT SELECT ON roles, role_permissions TO wattwisely_app;--> statement-breakpoint
-- A member's roles are replaced as a whole: delete the old rows, insert the new ones.
GRANT SELECT, INSERT, DELETE ON membership_roles TO wattwisely_app;--> statement-breakpoint
-- Append-only: no UPDATE or DELETE, so nobody can rewrite history through the API.
GRANT SELECT, INSERT ON audit_log TO wattwisely_app;
