-- What the API and the worker (both wattwisely_app) may do with module 6's tables.
-- Payments and accounts are updated as the provider reports; nothing is ever deleted.
GRANT SELECT, INSERT, UPDATE ON payment_accounts, payments, refunds TO wattwisely_app;--> statement-breakpoint
-- Webhook events are written once by the API and marked processed by the API or the worker.
GRANT SELECT, INSERT, UPDATE ON payment_webhook_events TO wattwisely_app;--> statement-breakpoint
-- Refunds above the approval limit need a second person (Stripe Payments design, "Refunds").
-- Owner and Finance may approve; Operations may only request.
INSERT INTO role_permissions (id, role_id, permission_key)
SELECT gen_random_uuid(), role_id, 'payments:approve_refund' FROM unnest(ARRAY[
    '00000000-0000-7000-8000-000000000001'::uuid,
    '00000000-0000-7000-8000-000000000003'::uuid
]) AS role_id;
