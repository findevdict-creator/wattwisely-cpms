-- What the API, the OCPP gateway and the worker (all wattwisely_app) may do with module 5's tables.
-- Tariffs are edited and archived, never deleted: old sessions point at their versions.
GRANT SELECT, INSERT, UPDATE ON tariffs TO wattwisely_app;--> statement-breakpoint
-- A tariff version never changes once written, and neither does a session's state history.
GRANT SELECT, INSERT ON tariff_versions, session_state_changes TO wattwisely_app;--> statement-breakpoint
-- Pricing a session again replaces its receipt lines.
GRANT SELECT, INSERT, DELETE ON session_line_items TO wattwisely_app;
