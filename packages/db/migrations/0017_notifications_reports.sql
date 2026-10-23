CREATE TYPE "public"."alert_status" AS ENUM('open', 'acknowledged', 'closed');--> statement-breakpoint
CREATE TYPE "public"."alert_type" AS ENUM('charger_offline', 'connector_faulted', 'session_stuck', 'start_failures', 'reset_no_return');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('pending', 'sent', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."report_export_status" AS ENUM('queued', 'running', 'ready', 'failed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."report_frequency" AS ENUM('weekly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."report_kind" AS ENUM('sessions', 'usage', 'audit_log');--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"type" "alert_type" NOT NULL,
	"status" "alert_status" DEFAULT 'open' NOT NULL,
	"subject_key" text NOT NULL,
	"site_id" uuid NOT NULL,
	"charger_id" uuid NOT NULL,
	"connector_id" uuid,
	"session_id" uuid,
	"title" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"began_at" timestamp with time zone NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"occurrences" integer DEFAULT 1 NOT NULL,
	"acknowledged_by" uuid,
	"acknowledged_at" timestamp with time zone,
	"acknowledge_note" text DEFAULT '' NOT NULL,
	"closed_at" timestamp with time zone,
	"close_reason" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alerts_tenant_id_unique" UNIQUE("tenant_id","id")
);
--> statement-breakpoint
ALTER TABLE "alerts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "alert_rules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"alert_type" "alert_type" NOT NULL,
	"site_id" uuid,
	"role_id" uuid,
	"membership_id" uuid,
	"is_email" boolean DEFAULT true NOT NULL,
	"is_in_portal" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alert_rules_one_recipient" CHECK (("alert_rules"."role_id" is null) <> ("alert_rules"."membership_id" is null)),
	CONSTRAINT "alert_rules_some_channel" CHECK ("alert_rules"."is_email" or "alert_rules"."is_in_portal")
);
--> statement-breakpoint
ALTER TABLE "alert_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "member_notification_settings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"quiet_hours_start" text,
	"quiet_hours_end" text,
	"time_zone" text DEFAULT 'UTC' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_notification_settings_member_unique" UNIQUE("tenant_id","membership_id"),
	CONSTRAINT "member_notification_settings_quiet_hours_pair" CHECK (("member_notification_settings"."quiet_hours_start" is null) = ("member_notification_settings"."quiet_hours_end" is null))
);
--> statement-breakpoint
ALTER TABLE "member_notification_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "staff_notifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"link" text,
	"alert_id" uuid,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "staff_notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"to_address" text NOT NULL,
	"session_id" uuid,
	"alert_id" uuid,
	"export_id" uuid,
	"membership_id" uuid,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "notification_status" DEFAULT 'pending' NOT NULL,
	"send_after" timestamp with time zone DEFAULT now() NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_dedupe_unique" UNIQUE("tenant_id","dedupe_key")
);
--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "session_subscriptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"email" text NOT NULL,
	"wants_started" boolean DEFAULT true NOT NULL,
	"wants_nearly_full" boolean DEFAULT true NOT NULL,
	"wants_finished" boolean DEFAULT true NOT NULL,
	"wants_idle_warning" boolean DEFAULT true NOT NULL,
	"is_undeliverable" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_subscriptions_session_unique" UNIQUE("tenant_id","session_id")
);
--> statement-breakpoint
ALTER TABLE "session_subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "report_exports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"kind" "report_kind" NOT NULL,
	"parameters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "report_export_status" DEFAULT 'queued' NOT NULL,
	"requested_by" uuid,
	"membership_id" uuid,
	"schedule_id" uuid,
	"file_name" text NOT NULL,
	"row_count" integer,
	"size_bytes" integer,
	"data" "bytea",
	"error" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "report_exports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "report_schedules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" "report_kind" DEFAULT 'usage' NOT NULL,
	"frequency" "report_frequency" NOT NULL,
	"group_by" text DEFAULT 'site' NOT NULL,
	"site_id" uuid,
	"recipients" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"time_zone" text DEFAULT 'UTC' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"next_run_at" timestamp with time zone NOT NULL,
	"last_run_at" timestamp with time zone,
	"created_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "report_schedules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_acknowledged_by_user_accounts_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_charger_fk" FOREIGN KEY ("tenant_id","charger_id") REFERENCES "public"."chargers"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_created_by_user_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_site_fk" FOREIGN KEY ("tenant_id","site_id") REFERENCES "public"."sites"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_membership_fk" FOREIGN KEY ("tenant_id","membership_id") REFERENCES "public"."tenant_memberships"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_notification_settings" ADD CONSTRAINT "member_notification_settings_membership_fk" FOREIGN KEY ("tenant_id","membership_id") REFERENCES "public"."tenant_memberships"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_notifications" ADD CONSTRAINT "staff_notifications_membership_fk" FOREIGN KEY ("tenant_id","membership_id") REFERENCES "public"."tenant_memberships"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_subscriptions" ADD CONSTRAINT "session_subscriptions_session_fk" FOREIGN KEY ("tenant_id","session_id") REFERENCES "public"."charging_sessions"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_exports" ADD CONSTRAINT "report_exports_requested_by_user_accounts_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_created_by_user_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_site_fk" FOREIGN KEY ("tenant_id","site_id") REFERENCES "public"."sites"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "alerts_live_unique" ON "alerts" USING btree ("tenant_id","type","subject_key") WHERE "alerts"."status" <> 'closed';--> statement-breakpoint
CREATE INDEX "alerts_status_idx" ON "alerts" USING btree ("tenant_id","status","opened_at");--> statement-breakpoint
CREATE INDEX "alerts_charger_idx" ON "alerts" USING btree ("tenant_id","charger_id","began_at");--> statement-breakpoint
CREATE INDEX "alert_rules_type_idx" ON "alert_rules" USING btree ("tenant_id","alert_type");--> statement-breakpoint
CREATE INDEX "staff_notifications_member_idx" ON "staff_notifications" USING btree ("tenant_id","membership_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "notifications_pending_idx" ON "notifications" USING btree ("tenant_id","send_after") WHERE "notifications"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "notifications_session_idx" ON "notifications" USING btree ("tenant_id","session_id");--> statement-breakpoint
CREATE INDEX "report_exports_status_idx" ON "report_exports" USING btree ("tenant_id","status","created_at");--> statement-breakpoint
CREATE INDEX "report_exports_requester_idx" ON "report_exports" USING btree ("tenant_id","requested_by","created_at");--> statement-breakpoint
CREATE INDEX "report_schedules_due_idx" ON "report_schedules" USING btree ("tenant_id","is_active","next_run_at");--> statement-breakpoint
CREATE POLICY "alerts_tenant_isolation" ON "alerts" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("alerts"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("alerts"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "alert_rules_tenant_isolation" ON "alert_rules" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("alert_rules"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("alert_rules"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "member_notification_settings_tenant_isolation" ON "member_notification_settings" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("member_notification_settings"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("member_notification_settings"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "staff_notifications_tenant_isolation" ON "staff_notifications" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("staff_notifications"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("staff_notifications"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "notifications_tenant_isolation" ON "notifications" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("notifications"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("notifications"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "session_subscriptions_tenant_isolation" ON "session_subscriptions" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("session_subscriptions"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("session_subscriptions"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "report_exports_tenant_isolation" ON "report_exports" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("report_exports"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("report_exports"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "report_schedules_tenant_isolation" ON "report_schedules" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("report_schedules"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("report_schedules"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);