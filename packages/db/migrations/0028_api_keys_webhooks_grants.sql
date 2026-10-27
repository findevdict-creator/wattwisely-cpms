-- Module 16, API keys and webhooks: what the API and the worker (wattwisely_app) may do with the
-- new tables. Row-level security (migration 0027) keeps each tenant's keys and endpoints apart;
-- a request with a token finds its key by the token's hash alone.
-- Keys are never deleted: a revoked key keeps its row for the audit trail.
GRANT SELECT, INSERT, UPDATE ON api_keys TO wattwisely_app;--> statement-breakpoint
-- An endpoint the tenant removes goes, and its deliveries with it (ON DELETE CASCADE).
GRANT SELECT, INSERT, UPDATE, DELETE ON webhook_endpoints TO wattwisely_app;--> statement-breakpoint
-- The worker queues and sends deliveries; the retention job deletes old ones (module 12).
GRANT SELECT, INSERT, UPDATE, DELETE ON webhook_deliveries TO wattwisely_app;
