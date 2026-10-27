-- Module 17, load management and messaging-app charging: what the API and the worker
-- (wattwisely_app) may do with the new tables. Row-level security (migration 0029) keeps each
-- tenant's policies, caps and chats apart; an inbound chat message finds its channel by the
-- provider's phone number id alone.
GRANT SELECT, INSERT, UPDATE, DELETE ON site_load_policies TO wattwisely_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON charger_load_settings TO wattwisely_app;--> statement-breakpoint
-- The worker writes the caps and removes the rows once a switched-off policy's caps are cleared.
GRANT SELECT, INSERT, UPDATE, DELETE ON charger_load_allocations TO wattwisely_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON messaging_channels TO wattwisely_app;--> statement-breakpoint
-- A removed channel takes its conversations and their messages with it (ON DELETE CASCADE).
GRANT SELECT, INSERT, UPDATE, DELETE ON messaging_conversations TO wattwisely_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON messaging_messages TO wattwisely_app;
