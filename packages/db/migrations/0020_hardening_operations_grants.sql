-- Module 12, hardening and operations: the worker's retention job (as wattwisely_app) may
-- delete what has outlived its use. Row-level security still applies, so the job deletes
-- inside one tenant at a time, like every other job.
--
-- The OCPP message log, the e-mail outbox (sent, failed and cancelled e-mails only), the
-- portal bell's lines and the rows of old exports are deleted by age. Driver addresses on
-- a charge (session_subscriptions) could already be deleted since module 11.
GRANT DELETE ON ocpp_messages, notifications, staff_notifications, report_exports TO wattwisely_app;--> statement-breakpoint
-- Webhook events are global (they arrive before their tenant is known); processed ones are
-- deleted by age too.
GRANT DELETE ON payment_webhook_events TO wattwisely_app;
