-- Module 15, invoicing: what the API and the worker (wattwisely_app) may do with the invoice
-- tables. Row-level security (migration 0025) lets a tenant read its own issued invoices and
-- their lines; only platform access (the admin console, the worker's monthly run) writes.
GRANT SELECT, INSERT, UPDATE ON invoices TO wattwisely_app;--> statement-breakpoint
-- Regenerating a draft replaces its fee lines, and staff can take a line out of a draft.
GRANT SELECT, INSERT, UPDATE, DELETE ON invoice_lines TO wattwisely_app;--> statement-breakpoint
-- Issuing an invoice takes the next number of the year. The platform permissions behind the
-- console's Invoices pages live in code (PlatformRoleCatalog); the tenant's own view of its
-- invoices uses invoices:read, which Owner, Finance and Read-only have held since migration 0002.
GRANT SELECT, INSERT, UPDATE ON invoice_sequences TO wattwisely_app;
