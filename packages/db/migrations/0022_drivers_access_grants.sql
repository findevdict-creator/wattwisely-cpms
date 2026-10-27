-- Module 13, drivers: what the API and the OCPP gateway (both wattwisely_app) may do with
-- the new tables. Row-level security (migration 0021) keeps every row inside its tenant.
--
-- Drivers are soft-deleted and cards are never deleted: sessions keep pointing at the card
-- that started them, so a lost card is marked lost. The gateway updates a card's last use.
GRANT SELECT, INSERT, UPDATE ON drivers, rfid_cards, access_groups TO wattwisely_app;--> statement-breakpoint
-- A group can be deleted, and the sites and drivers of a group are replaced as a whole.
GRANT SELECT, INSERT, UPDATE, DELETE ON access_group_sites, access_group_members TO wattwisely_app;--> statement-breakpoint
GRANT DELETE ON access_groups TO wattwisely_app;
