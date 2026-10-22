-- What the API's database role (wattwisely_app) may do with the assets module's tables.
-- Sites and chargers are never deleted, only marked deleted_at, so history keeps their names.
GRANT SELECT, INSERT, UPDATE ON sites, chargers TO wattwisely_app;--> statement-breakpoint
-- A connector added by mistake may be deleted until the charger has reported it (the API checks).
GRANT SELECT, INSERT, UPDATE, DELETE ON connectors TO wattwisely_app;
