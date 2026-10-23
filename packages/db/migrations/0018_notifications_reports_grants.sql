-- Module 11, notifications and reports: what the API and the worker (both wattwisely_app)
-- may do with the new tables. Row-level security (migration 0017) keeps every row inside
-- its tenant.
--
-- Alerts are opened, updated and closed, never deleted: a closed alert is the charger's
-- history. The outbox, the staff inbox, quiet hours and the exports change
-- state as they are sent, read or built; an expired export keeps its row without its file.
GRANT SELECT, INSERT, UPDATE ON alerts, notifications, staff_notifications, member_notification_settings, report_exports TO wattwisely_app;--> statement-breakpoint
-- Saving the alert routing replaces a tenant's rules, a schedule can be deleted, and a driver
-- can take their address off a charge.
GRANT SELECT, INSERT, UPDATE, DELETE ON alert_rules, report_schedules, session_subscriptions TO wattwisely_app;
