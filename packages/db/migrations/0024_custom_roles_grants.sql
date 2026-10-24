-- Module 14, custom roles: a tenant creates, edits and deletes its own roles from the portal.
-- Migration 0001 gave the API SELECT only, because system roles are changed by migrations;
-- the roles_tenant_changes and role_permissions_tenant_changes policies (migration 0023)
-- limit these new rights to rows with the current tenant's id, so system roles stay as they are.
GRANT INSERT, UPDATE, DELETE ON roles TO wattwisely_app;--> statement-breakpoint
-- The permissions of a custom role are replaced as a whole: delete the old rows, insert the new ones.
GRANT INSERT, DELETE ON role_permissions TO wattwisely_app;
