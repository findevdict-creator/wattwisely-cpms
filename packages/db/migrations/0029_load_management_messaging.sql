CREATE TYPE "public"."load_strategy" AS ENUM('equal_share', 'priority');--> statement-breakpoint
CREATE TYPE "public"."messaging_direction" AS ENUM('in', 'out');--> statement-breakpoint
CREATE TYPE "public"."messaging_message_status" AS ENUM('pending', 'sent', 'failed', 'received');--> statement-breakpoint
CREATE TYPE "public"."messaging_provider" AS ENUM('whatsapp');--> statement-breakpoint
ALTER TYPE "public"."charger_command_action" ADD VALUE 'set_charging_profile';--> statement-breakpoint
ALTER TYPE "public"."charger_command_action" ADD VALUE 'clear_charging_profile';--> statement-breakpoint
CREATE TABLE "site_load_policies" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"limit_kw" numeric(8, 1) NOT NULL,
	"strategy" "load_strategy" DEFAULT 'equal_share' NOT NULL,
	"min_power_kw" numeric(6, 1) DEFAULT 4.2 NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_load_policies_site_unique" UNIQUE("tenant_id","site_id")
);
--> statement-breakpoint
ALTER TABLE "site_load_policies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "charger_load_settings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"charger_id" uuid NOT NULL,
	"priority" integer DEFAULT 5 NOT NULL,
	"max_power_kw" numeric(7, 1),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "charger_load_settings_charger_unique" UNIQUE("tenant_id","charger_id"),
	CONSTRAINT "charger_load_settings_priority_range" CHECK ("charger_load_settings"."priority" between 1 and 10)
);
--> statement-breakpoint
ALTER TABLE "charger_load_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "charger_load_allocations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"charger_id" uuid NOT NULL,
	"limit_w" integer NOT NULL,
	"reason" text NOT NULL,
	"is_charging" boolean DEFAULT false NOT NULL,
	"command_id" uuid,
	"is_applied" boolean DEFAULT false NOT NULL,
	"applied_at" timestamp with time zone,
	"last_error" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "charger_load_allocations_charger_unique" UNIQUE("tenant_id","charger_id")
);
--> statement-breakpoint
ALTER TABLE "charger_load_allocations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "messaging_channels" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider" "messaging_provider" DEFAULT 'whatsapp' NOT NULL,
	"phone_number_id" text NOT NULL,
	"display_phone_number" text NOT NULL,
	"access_token" text DEFAULT '' NOT NULL,
	"greeting" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messaging_channels_tenant_unique" UNIQUE("tenant_id"),
	CONSTRAINT "messaging_channels_tenant_id_unique" UNIQUE("tenant_id","id")
);
--> statement-breakpoint
ALTER TABLE "messaging_channels" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "messaging_conversations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"channel_id" uuid NOT NULL,
	"contact" text NOT NULL,
	"charger_id" uuid,
	"connector_id" uuid,
	"session_id" uuid,
	"charge_key" text,
	"link_token" text NOT NULL,
	"notified_kinds" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_inbound_at" timestamp with time zone,
	"last_outbound_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messaging_conversations_contact_unique" UNIQUE("channel_id","contact"),
	CONSTRAINT "messaging_conversations_tenant_id_unique" UNIQUE("tenant_id","id")
);
--> statement-breakpoint
ALTER TABLE "messaging_conversations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "messaging_messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"direction" "messaging_direction" NOT NULL,
	"status" "messaging_message_status" NOT NULL,
	"body" text NOT NULL,
	"buttons" jsonb,
	"provider_message_id" text,
	"error" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messaging_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "site_load_policies" ADD CONSTRAINT "site_load_policies_created_by_user_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_load_policies" ADD CONSTRAINT "site_load_policies_updated_by_user_accounts_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_load_policies" ADD CONSTRAINT "site_load_policies_site_fk" FOREIGN KEY ("tenant_id","site_id") REFERENCES "public"."sites"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charger_load_settings" ADD CONSTRAINT "charger_load_settings_charger_fk" FOREIGN KEY ("tenant_id","charger_id") REFERENCES "public"."chargers"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charger_load_allocations" ADD CONSTRAINT "charger_load_allocations_charger_fk" FOREIGN KEY ("tenant_id","charger_id") REFERENCES "public"."chargers"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_channels" ADD CONSTRAINT "messaging_channels_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_channels" ADD CONSTRAINT "messaging_channels_created_by_user_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_channels" ADD CONSTRAINT "messaging_channels_updated_by_user_accounts_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_conversations" ADD CONSTRAINT "messaging_conversations_channel_fk" FOREIGN KEY ("tenant_id","channel_id") REFERENCES "public"."messaging_channels"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_messages" ADD CONSTRAINT "messaging_messages_conversation_fk" FOREIGN KEY ("tenant_id","conversation_id") REFERENCES "public"."messaging_conversations"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "charger_load_allocations_site_idx" ON "charger_load_allocations" USING btree ("tenant_id","site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "messaging_channels_phone_number_unique" ON "messaging_channels" USING btree ("provider",lower("phone_number_id"));--> statement-breakpoint
CREATE INDEX "messaging_conversations_session_idx" ON "messaging_conversations" USING btree ("tenant_id","session_id");--> statement-breakpoint
CREATE INDEX "messaging_conversations_recent_idx" ON "messaging_conversations" USING btree ("tenant_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "messaging_messages_provider_unique" ON "messaging_messages" USING btree ("tenant_id","provider_message_id") WHERE "messaging_messages"."direction" = 'in' and "messaging_messages"."provider_message_id" is not null;--> statement-breakpoint
CREATE INDEX "messaging_messages_conversation_idx" ON "messaging_messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "messaging_messages_pending_idx" ON "messaging_messages" USING btree ("tenant_id","next_attempt_at") WHERE "messaging_messages"."status" = 'pending';--> statement-breakpoint
CREATE POLICY "site_load_policies_tenant_isolation" ON "site_load_policies" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("site_load_policies"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("site_load_policies"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "charger_load_settings_tenant_isolation" ON "charger_load_settings" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("charger_load_settings"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("charger_load_settings"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "charger_load_allocations_tenant_isolation" ON "charger_load_allocations" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("charger_load_allocations"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("charger_load_allocations"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "messaging_channels_tenant_isolation" ON "messaging_channels" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("messaging_channels"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("messaging_channels"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "messaging_channels_phone_number_lookup" ON "messaging_channels" AS PERMISSIVE FOR SELECT TO "wattwisely_app" USING (lower("messaging_channels"."phone_number_id") = lower(nullif(current_setting('app.messaging_phone_number_id', true), '')));--> statement-breakpoint
CREATE POLICY "messaging_conversations_tenant_isolation" ON "messaging_conversations" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("messaging_conversations"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("messaging_conversations"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "messaging_messages_tenant_isolation" ON "messaging_messages" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("messaging_messages"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("messaging_messages"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);