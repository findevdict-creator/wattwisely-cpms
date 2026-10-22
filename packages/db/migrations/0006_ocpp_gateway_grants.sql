-- What the API and the OCPP gateway (both wattwisely_app) may do with the gateway's tables.
-- A connection lease comes and goes with the socket, so it may be deleted.
GRANT SELECT, INSERT, UPDATE, DELETE ON charger_connections TO wattwisely_app;--> statement-breakpoint
-- Commands and sessions are updated as the charger answers; nothing is ever deleted.
GRANT SELECT, INSERT, UPDATE ON charger_commands, charging_sessions TO wattwisely_app;--> statement-breakpoint
-- Boot history, the raw message log and meter readings are append-only.
GRANT SELECT, INSERT ON charger_boot_events, ocpp_messages, meter_values TO wattwisely_app;--> statement-breakpoint
-- StartTransaction takes the next OCPP transaction id from the sequence.
GRANT USAGE ON SEQUENCE ocpp_transaction_id_seq TO wattwisely_app;
