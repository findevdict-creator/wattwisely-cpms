-- What the API (wattwisely_app) may do with module 8's table: read a tenant's branding,
-- create it on the first save and change it afterwards. Nothing is ever deleted; removing
-- the logo clears its columns.
GRANT SELECT, INSERT, UPDATE ON tenant_branding TO wattwisely_app;
