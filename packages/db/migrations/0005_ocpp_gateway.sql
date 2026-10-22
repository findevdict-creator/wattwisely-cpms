CREATE TYPE "public"."charger_command_action" AS ENUM('remote_start', 'remote_stop', 'reset', 'unlock', 'change_availability');--> statement-breakpoint
CREATE TYPE "public"."charger_command_status" AS ENUM('queued', 'sent', 'accepted', 'rejected', 'timed_out', 'expired', 'failed');--> statement-breakpoint
CREATE TYPE "public"."charging_session_status" AS ENUM('charging', 'ended');--> statement-breakpoint
CREATE TYPE "public"."ocpp_direction" AS ENUM('in', 'out');--> statement-breakpoint
CREATE TYPE "public"."ocpp_message_type" AS ENUM('call', 'call_result', 'call_error');--> statement-breakpoint
CREATE SEQUENCE "public"."ocpp_transaction_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1000 CACHE 1;--> statement-breakpoint
CREATE TABLE "charger_connections" (
	"charger_id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"instance_id" text NOT NULL,
	"connection_id" text NOT NULL,
	"ocpp_version" "ocpp_version" NOT NULL,
	"remote_ip" text,
	"is_booted" boolean DEFAULT false NOT NULL,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "charger_connections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "charger_boot_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"charger_id" uuid NOT NULL,
	"vendor" text NOT NULL,
	"model" text NOT NULL,
	"charge_point_serial" text,
	"charge_box_serial" text,
	"firmware_version" text,
	"iccid" text,
	"imsi" text,
	"meter_type" text,
	"meter_serial" text,
	"response_status" charger_registration_status NOT NULL,
	"reason" text,
	"booted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "charger_boot_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ocpp_messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"charger_id" uuid NOT NULL,
	"direction" "ocpp_direction" NOT NULL,
	"message_type" "ocpp_message_type" NOT NULL,
	"message_id" text NOT NULL,
	"action" text NOT NULL,
	"payload" jsonb NOT NULL,
	"error_code" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ocpp_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "charger_commands" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"charger_id" uuid NOT NULL,
	"action" charger_command_action NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" charger_command_status DEFAULT 'queued' NOT NULL,
	"queued_until" timestamp with time zone NOT NULL,
	"requested_by" uuid,
	"requested_by_label" text NOT NULL,
	"result" jsonb,
	"error" text,
	"sent_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "charger_commands" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "charging_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"charger_id" uuid NOT NULL,
	"connector_id" uuid NOT NULL,
	"ocpp_transaction_id" integer NOT NULL,
	"id_tag" text NOT NULL,
	"status" charging_session_status DEFAULT 'charging' NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"meter_start_wh" bigint NOT NULL,
	"meter_stop_wh" bigint,
	"energy_wh" bigint DEFAULT 0 NOT NULL,
	"stop_reason" text,
	"command_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "charging_sessions_transaction_unique" UNIQUE("tenant_id","charger_id","ocpp_transaction_id")
);
--> statement-breakpoint
ALTER TABLE "charging_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "meter_values" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"charger_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"measured_at" timestamp with time zone NOT NULL,
	"energy_wh" bigint,
	"power_w" integer,
	"soc_percent" smallint,
	"samples" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meter_values" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "charger_connections" ADD CONSTRAINT "charger_connections_charger_fk" FOREIGN KEY ("tenant_id","charger_id") REFERENCES "public"."chargers"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charger_boot_events" ADD CONSTRAINT "charger_boot_events_charger_fk" FOREIGN KEY ("tenant_id","charger_id") REFERENCES "public"."chargers"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ocpp_messages" ADD CONSTRAINT "ocpp_messages_charger_fk" FOREIGN KEY ("tenant_id","charger_id") REFERENCES "public"."chargers"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charger_commands" ADD CONSTRAINT "charger_commands_requested_by_user_accounts_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charger_commands" ADD CONSTRAINT "charger_commands_charger_fk" FOREIGN KEY ("tenant_id","charger_id") REFERENCES "public"."chargers"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD CONSTRAINT "charging_sessions_charger_fk" FOREIGN KEY ("tenant_id","charger_id") REFERENCES "public"."chargers"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD CONSTRAINT "charging_sessions_connector_fk" FOREIGN KEY ("tenant_id","connector_id") REFERENCES "public"."connectors"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meter_values" ADD CONSTRAINT "meter_values_charger_fk" FOREIGN KEY ("tenant_id","charger_id") REFERENCES "public"."chargers"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meter_values" ADD CONSTRAINT "meter_values_session_fk" FOREIGN KEY ("session_id") REFERENCES "public"."charging_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "charger_connections_lease_idx" ON "charger_connections" USING btree ("tenant_id","lease_expires_at");--> statement-breakpoint
CREATE INDEX "charger_boot_events_charger_idx" ON "charger_boot_events" USING btree ("tenant_id","charger_id","booted_at");--> statement-breakpoint
CREATE INDEX "ocpp_messages_charger_idx" ON "ocpp_messages" USING btree ("tenant_id","charger_id","received_at");--> statement-breakpoint
CREATE INDEX "charger_commands_charger_idx" ON "charger_commands" USING btree ("tenant_id","charger_id","created_at");--> statement-breakpoint
CREATE INDEX "charger_commands_queued_idx" ON "charger_commands" USING btree ("charger_id","created_at") WHERE "charger_commands"."status" = 'queued';--> statement-breakpoint
CREATE INDEX "charging_sessions_connector_idx" ON "charging_sessions" USING btree ("tenant_id","connector_id","status");--> statement-breakpoint
CREATE INDEX "charging_sessions_started_idx" ON "charging_sessions" USING btree ("tenant_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "meter_values_session_time_unique" ON "meter_values" USING btree ("session_id","measured_at");--> statement-breakpoint
CREATE INDEX "meter_values_charger_idx" ON "meter_values" USING btree ("tenant_id","charger_id","measured_at");--> statement-breakpoint
CREATE POLICY "charger_connections_tenant_isolation" ON "charger_connections" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("charger_connections"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("charger_connections"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "charger_boot_events_tenant_isolation" ON "charger_boot_events" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("charger_boot_events"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("charger_boot_events"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "ocpp_messages_tenant_isolation" ON "ocpp_messages" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("ocpp_messages"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("ocpp_messages"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "charger_commands_tenant_isolation" ON "charger_commands" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("charger_commands"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("charger_commands"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "charging_sessions_tenant_isolation" ON "charging_sessions" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("charging_sessions"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("charging_sessions"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "meter_values_tenant_isolation" ON "meter_values" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("meter_values"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("meter_values"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);